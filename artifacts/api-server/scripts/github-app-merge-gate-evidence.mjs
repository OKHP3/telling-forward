/**
 * Run a disposable, service-authored pull request through the private pilot's
 * protected-branch gate and emit appendable Markdown evidence.
 *
 * This is intentionally a standalone maintainer command rather than an API
 * route. It requires GitHub App credentials, refuses non-private or
 * non-canonical targets, never calls the merge endpoint, and cleans up the
 * temporary branch in every path.
 *
 * The owner review is the one human step in the exercise. The command pauses
 * after recording the no-review blocked state and waits for the configured
 * steward to approve the pull request.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run test:github-app:merge-gate
 *   ... -- --approval-timeout-seconds 900 --output /tmp/merge-gate.md
 */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

const PILOT_OWNER = "OKHP3";
const PILOT_REPO = "telling-forward-pilot-grove";
const DEFAULT_STEWARD = "OKHP3";
const DEFAULT_POLL_SECONDS = 10;
const DEFAULT_CHECK_TIMEOUT_SECONDS = 900;
const DEFAULT_APPROVAL_TIMEOUT_SECONDS = 1800;

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const appId = process.env.GITHUB_APP_ID;
const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
const privateKey = normalizePrivateKey(rawPrivateKey);
assert.ok(
  appId && installationId && privateKey,
  "GitHub App secrets are incomplete; this maintainer command never uses the PAT fallback",
);

const stewardLogin = process.env.PILOT_STEWARD_LOGIN ?? DEFAULT_STEWARD;
const pollSeconds = positiveInteger(
  args["poll-seconds"],
  DEFAULT_POLL_SECONDS,
  "poll-seconds",
);
const checkTimeoutSeconds = positiveInteger(
  args["check-timeout-seconds"],
  DEFAULT_CHECK_TIMEOUT_SECONDS,
  "check-timeout-seconds",
);
const approvalTimeoutSeconds = positiveInteger(
  args["approval-timeout-seconds"],
  DEFAULT_APPROVAL_TIMEOUT_SECONDS,
  "approval-timeout-seconds",
);
const outputPath = args.output;
const runId = `merge-gate-${timestampSlug()}`;
const syntheticPath = `content/pilot-storyworld/.synthetic-${runId}.md`;
const branch = `pilot/${runId}`;
const startedAt = new Date().toISOString();

const appAuth = createAppAuth({ appId, installationId, privateKey });
const appAuthentication = await appAuth({ type: "app" });
const appClient = new Octokit({ auth: appAuthentication.token });
const appIdentity = await appClient.rest.apps.getAuthenticated();
assert.equal(
  appIdentity.data.id,
  Number(appId),
  "App identity does not match GITHUB_APP_ID",
);

const installation = await appClient.rest.apps.getInstallation({
  installation_id: installationId,
});
assert.equal(
  installation.data.id,
  Number(installationId),
  "Installation identity does not match configured installation",
);
assert.equal(
  installation.data.repository_selection,
  "selected",
  "Pilot installation is not selected-repository scoped",
);

const installationAuth = await appAuth({
  type: "installation",
  installationId,
  refresh: true,
});
const client = new Octokit({ auth: installationAuth.token });
const repository = await client.rest.repos.get({
  owner: PILOT_OWNER,
  repo: PILOT_REPO,
});
assert.equal(
  repository.data.full_name,
  `${PILOT_OWNER}/${PILOT_REPO}`,
  "GitHub App is not connected to the expected private pilot",
);
assert.equal(repository.data.private, true, "Merge-gate evidence requires a private pilot");

const defaultBranch = repository.data.default_branch;
const protectedBranch = await client.rest.repos.getBranchProtection({
  owner: PILOT_OWNER,
  repo: PILOT_REPO,
  branch: defaultBranch,
});
const requiredContexts = requiredCheckContexts(protectedBranch.data);
assert.ok(
  requiredContexts.length > 0,
  `No required status contexts are configured on ${defaultBranch}; refusing to claim gate evidence`,
);

const baseBefore = await branchHead(client, defaultBranch);
let branchCreated = false;
let pullRequestNumber = null;
let pullRequestUrl = null;
let pullRequest = null;
let observations = {};
let cleanupErrors = [];
let runError = null;
let finalPullRequest = null;
let baseAfter = null;
let branchDeleted = false;

try {
  await client.rest.git.createRef({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    ref: `refs/heads/${branch}`,
    sha: baseBefore,
  });
  branchCreated = true;

  const syntheticContent = [
    "# Disposable merge-gate evidence fixture",
    "",
    `This file belongs to ${runId} and must never enter canon.`,
    "It is deleted with the temporary branch after the gate exercise.",
    "",
  ].join("\n");
  const commit = await createServiceCommit({
    client,
    branch,
    path: syntheticPath,
    content: syntheticContent,
    appSlug: appIdentity.data.slug,
  });

  const created = await client.rest.pulls.create({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    title: `[synthetic] private-pilot merge-gate evidence ${runId}`,
    head: branch,
    base: defaultBranch,
    body: [
      "Maintainer-only synthetic merge-gate exercise.",
      "",
      "This pull request must not be merged. It contains no story material.",
      `Run: ${runId}`,
    ].join("\n"),
  });
  pullRequestNumber = created.data.number;
  pullRequestUrl = created.data.html_url;
  pullRequest = created.data;

  assert.equal(
    created.data.user?.login,
    `${appIdentity.data.slug}[bot]`,
    "Disposable pull request was not authored by the configured GitHub App",
  );
  assert.equal(
    created.data.base.ref,
    defaultBranch,
    "Disposable pull request does not target the repository default branch",
  );

  observations.created = await snapshot(client, pullRequestNumber, requiredContexts);
  if (observations.created.merged) {
    throw new Error("Disposable pull request was merged immediately; stopping");
  }

  observations.blockedBeforeChecks = await waitForSnapshot(
    client,
    pullRequestNumber,
    requiredContexts,
    checkTimeoutSeconds,
    (current) =>
      current.mergeableState === "blocked" &&
      current.approval.approved === false,
    "an explicit blocked, no-review state before required checks complete",
  );

  observations.blockedBeforeApproval = await waitForSnapshot(
    client,
    pullRequestNumber,
    requiredContexts,
    checkTimeoutSeconds,
    (current) =>
      current.mergeableState === "blocked" &&
      current.approval.approved === false &&
      current.requiredChecks.every((check) => check.conclusion === "success"),
    "a blocked, no-review state with successful required checks",
  );

  if (observations.blockedBeforeApproval.approval.approved) {
    throw new Error(
      `Steward ${stewardLogin} approved before the blocked state was captured`,
    );
  }

  console.error(
    [
      `Created ${pullRequestUrl}.`,
      `Required check context(s): ${requiredContexts.join(", ")}`,
      `Approve this PR as @${stewardLogin} to continue; it will be closed, never merged.`,
    ].join(" "),
  );

  observations.cleanAfterApproval = await waitForSnapshot(
    client,
    pullRequestNumber,
    requiredContexts,
    approvalTimeoutSeconds,
    (current) =>
      current.mergeableState === "clean" &&
      current.approval.approved === true &&
      current.requiredChecks.every((check) => check.conclusion === "success"),
    `a clean state after an APPROVED review from @${stewardLogin}`,
  );
} catch (error) {
  runError = error instanceof Error ? error.message : String(error);
} finally {
  if (pullRequestNumber !== null) {
    try {
      finalPullRequest = await getPullRequest(client, pullRequestNumber);
      if (finalPullRequest?.state === "open") {
        await client.rest.pulls.update({
          owner: PILOT_OWNER,
          repo: PILOT_REPO,
          pull_number: pullRequestNumber,
          state: "closed",
        });
      }
      finalPullRequest = await getPullRequest(client, pullRequestNumber);
    } catch (error) {
      cleanupErrors.push(
        `pull request closure failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (branchCreated) {
    try {
      await client.rest.git.deleteRef({
        owner: PILOT_OWNER,
        repo: PILOT_REPO,
        ref: `heads/${branch}`,
      });
      if (await branchExists(client, branch)) {
        throw new Error("temporary branch still exists after delete request");
      }
      branchDeleted = true;
    } catch (error) {
      cleanupErrors.push(
        `temporary branch deletion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  try {
    baseAfter = await branchHead(client, defaultBranch);
  } catch (error) {
    cleanupErrors.push(
      `final default-branch read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const merged = finalPullRequest?.merged === true;
const mainUnchanged = baseAfter !== null && baseAfter === baseBefore;
const closedWithoutMerge =
  finalPullRequest?.state === "closed" && finalPullRequest.merged === false;
const cleanupPassed =
  branchDeleted &&
  closedWithoutMerge &&
  !merged &&
  mainUnchanged &&
  cleanupErrors.length === 0;
const gatePassed =
  observations.blockedBeforeApproval?.mergeableState === "blocked" &&
  observations.blockedBeforeApproval?.approval.approved === false &&
  observations.cleanAfterApproval?.mergeableState === "clean" &&
  observations.cleanAfterApproval?.approval.approved === true;
const passed = !runError && gatePassed && cleanupPassed;

const evidence = {
  schemaVersion: 1,
  result: passed ? "passed" : "failed",
  startedAt,
  completedAt: new Date().toISOString(),
  target: {
    repository: repository.data.full_name,
    private: repository.data.private,
    defaultBranch,
    stewardLogin,
    requiredContexts,
    baseShaBefore: baseBefore,
    baseShaAfter: baseAfter,
    mainUnchanged,
  },
  service: {
    appId: appIdentity.data.id,
    appSlug: appIdentity.data.slug,
    actor: `${appIdentity.data.slug}[bot]`,
    installationId: Number(installationId),
  },
  fixture: {
    branch,
    commitSha: pullRequest?.head?.sha ?? null,
    path: syntheticPath,
    pullRequestNumber,
    pullRequestUrl,
    authorLogin: pullRequest?.user?.login ?? null,
  },
  observations,
  closure: {
    pullRequestState: finalPullRequest?.state ?? null,
    merged,
    mergeCommitSha: finalPullRequest?.merge_commit_sha ?? null,
    branchDeleted,
    closedWithoutMerge,
    cleanupErrors,
  },
  error: runError,
};

const markdown = renderEvidence(evidence);
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
  console.error(`Wrote merge-gate evidence to ${outputPath}`);
}
process.stdout.write(markdown);
if (!passed) process.exitCode = 1;

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Argument --${key} requires a value`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

function normalizePrivateKey(value) {
  return value
    ?.replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/(-----BEGIN [^-]+-----)\s*/, "$1\n")
    .replace(/\s*(-----END [^-]+-----)\s*$/, "\n$1\n");
}

function timestampSlug() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .toLowerCase();
}

function requiredCheckContexts(protection) {
  const legacy = protection.required_status_checks?.contexts ?? [];
  const modern =
    protection.required_status_checks?.checks
      ?.map((check) => check.context)
      .filter(Boolean) ?? [];
  return [...new Set([...legacy, ...modern])].sort();
}

async function branchHead(client, branchName) {
  const response = await client.rest.repos.getBranch({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    branch: branchName,
  });
  return response.data.commit.sha;
}

async function branchExists(client, branchName) {
  try {
    await client.rest.repos.getBranch({
      owner: PILOT_OWNER,
      repo: PILOT_REPO,
      branch: branchName,
    });
    return true;
  } catch (error) {
    if (error?.status === 404) return false;
    throw error;
  }
}

async function createServiceCommit({ client, branch, path, content, appSlug }) {
  const branchRef = await client.rest.git.getRef({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    ref: `heads/${branch}`,
  });
  const parentSha = branchRef.data.object.sha;
  const parent = await client.rest.git.getCommit({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    commit_sha: parentSha,
  });
  const blob = await client.rest.git.createBlob({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    content,
    encoding: "utf-8",
  });
  const tree = await client.rest.git.createTree({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    base_tree: parent.data.tree.sha,
    tree: [
      {
        path,
        mode: "100644",
        type: "blob",
        sha: blob.data.sha,
      },
    ],
  });
  const authorName = `${appSlug}[bot]`;
  const authorEmail = `${appId}+${appSlug}[bot]@users.noreply.github.com`;
  const commit = await client.rest.git.createCommit({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    message: `[synthetic] merge-gate evidence ${timestampSlug()}`,
    tree: tree.data.sha,
    parents: [parentSha],
    author: { name: authorName, email: authorEmail },
    committer: { name: authorName, email: authorEmail },
  });
  await client.rest.git.updateRef({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });
  return commit.data;
}

async function getPullRequest(client, number) {
  const response = await client.rest.pulls.get({
    owner: PILOT_OWNER,
    repo: PILOT_REPO,
    pull_number: number,
  });
  return response.data;
}

async function snapshot(client, number, requiredContexts) {
  const pullRequest = await getPullRequest(client, number);
  const [checksResponse, reviewsResponse] = await Promise.all([
    client.rest.checks.listForRef({
      owner: PILOT_OWNER,
      repo: PILOT_REPO,
      ref: pullRequest.head.sha,
      filter: "latest",
      per_page: 100,
    }),
    client.rest.pulls.listReviews({
      owner: PILOT_OWNER,
      repo: PILOT_REPO,
      pull_number: number,
      per_page: 100,
    }),
  ]);
  const checkRuns = checksResponse.data.check_runs.map((check) => ({
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
    completedAt: check.completed_at,
    htmlUrl: check.html_url,
  }));
  const latestReviews = latestReviewsByUser(reviewsResponse.data);
  const stewardReview = latestReviews.find(
    (review) => review.user?.login === stewardLogin,
  );
  const requiredChecks = requiredContexts.map((context) => {
    const matching = checkRuns
      .filter((check) => check.name === context)
      .at(-1);
    return {
      context,
      status: matching?.status ?? "missing",
      conclusion: matching?.conclusion ?? null,
      completedAt: matching?.completedAt ?? null,
      htmlUrl: matching?.htmlUrl ?? null,
    };
  });
  return {
    capturedAt: new Date().toISOString(),
    pullRequestState: pullRequest.state,
    mergeable: pullRequest.mergeable,
    mergeableState: pullRequest.mergeable_state,
    merged: pullRequest.merged_at !== null,
    headSha: pullRequest.head.sha,
    baseSha: pullRequest.base.sha,
    emittedCheckNames: [...new Set(checkRuns.map((check) => check.name))].sort(),
    checkRuns,
    requiredChecks,
    approval: {
      steward: stewardLogin,
      approved: stewardReview?.state === "APPROVED",
      latestState: stewardReview?.state ?? null,
      submittedAt: stewardReview?.submitted_at ?? null,
    },
  };
}

function latestReviewsByUser(reviews) {
  const latest = new Map();
  for (const review of reviews) {
    const login = review.user?.login;
    if (!login) continue;
    const previous = latest.get(login);
    if (
      !previous ||
      new Date(review.submitted_at ?? 0) >=
        new Date(previous.submitted_at ?? 0)
    ) {
      latest.set(login, review);
    }
  }
  return [...latest.values()];
}

async function waitForSnapshot(
  client,
  number,
  requiredContexts,
  timeoutSeconds,
  predicate,
  description,
) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let latest;
  while (Date.now() <= deadline) {
    latest = await snapshot(client, number, requiredContexts);
    if (latest.merged) {
      throw new Error(
        `Pull request #${number} was merged while waiting for ${description}`,
      );
    }
    if (predicate(latest)) return latest;
    await sleep(pollSeconds * 1000);
  }
  throw new Error(
    `Timed out after ${timeoutSeconds}s waiting for ${description}; last snapshot: ${JSON.stringify(
      latest,
    )}`,
  );
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function renderEvidence(evidence) {
  const target = evidence.target;
  const fixture = evidence.fixture;
  const closure = evidence.closure;
  const observations = evidence.observations;
  const link = fixture.pullRequestUrl
    ? `[#${fixture.pullRequestNumber}](${fixture.pullRequestUrl})`
    : "not created";
  const observationRows = [
    ["Created", observations.created],
    ["Blocked before checks", observations.blockedBeforeChecks],
    ["Blocked before approval", observations.blockedBeforeApproval],
    ["Clean after approval", observations.cleanAfterApproval],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `| ${label} | \`${value.mergeableState ?? "unknown"}\` | ${
          value.approval.approved ? "approved" : "not approved"
        } | ${value.requiredChecks
          .map((check) => `${check.context}: ${check.conclusion ?? check.status}`)
          .join("<br>")} |`,
    )
    .join("\n");
  return [
    `## Automated private-pilot merge-gate evidence — ${evidence.result}`,
    "",
    `- Run: \`${evidence.startedAt}\` → \`${evidence.completedAt}\``,
    `- Repository: \`${target.repository}\` (private)`,
    `- Default branch: \`${target.defaultBranch}\``,
    `- Required contexts: ${target.requiredContexts.map((context) => `\`${context}\``).join(", ")}`,
    `- Steward: \`@${target.stewardLogin}\``,
    `- Service actor: \`${evidence.service.actor}\``,
    `- Disposable PR: ${link}`,
    `- Temporary branch: \`${fixture.branch}\``,
    `- Synthetic path: \`${fixture.path}\``,
    "",
    "| Observation | Mergeable state | Steward approval | Required checks |",
    "| --- | --- | --- | --- |",
    observationRows || "| No observations captured | — | — | — |",
    "",
    "### Emitted check names",
    "",
    ...Object.entries(observations)
      .filter(([, value]) => value)
      .map(
        ([label, value]) =>
          `- ${label}: ${value.emittedCheckNames.map((name) => `\`${name}\``).join(", ") || "none"}`,
      ),
    "",
    "### Closure assertions",
    "",
    `- Pull request closed without merge: **${closure.closedWithoutMerge}**`,
    `- Merged: **${closure.merged}**`,
    `- Temporary branch deleted: **${closure.branchDeleted}**`,
    `- Default branch unchanged: **${target.mainUnchanged}**`,
    `- Default branch before: \`${target.baseShaBefore}\``,
    `- Default branch after: \`${target.baseShaAfter ?? "unavailable"}\``,
    closure.cleanupErrors.length
      ? `- Cleanup errors: ${closure.cleanupErrors.join("; ")}`
      : "- Cleanup errors: none",
    evidence.error ? `- Run error: ${evidence.error}` : "- Run error: none",
    "",
    "```json",
    JSON.stringify(evidence, null, 2),
    "```",
    "",
  ].join("\n");
}

function printHelp() {
  console.log(`Maintainer-only private-pilot merge-gate evidence harness

Creates a service-authored synthetic PR, records required and emitted check
contexts, captures blocked and clean states around the steward review, then
closes the PR and deletes its temporary branch without ever merging it.

Options:
  --poll-seconds N                 Poll interval (default: ${DEFAULT_POLL_SECONDS})
  --check-timeout-seconds N        Wait for the blocked check state (default: ${DEFAULT_CHECK_TIMEOUT_SECONDS})
  --approval-timeout-seconds N     Wait for steward approval and clean state (default: ${DEFAULT_APPROVAL_TIMEOUT_SECONDS})
  --output PATH                    Also write appendable Markdown evidence to PATH
  --help                           Show this help

Target is fixed to the private pilot ${PILOT_OWNER}/${PILOT_REPO}.
`);
}