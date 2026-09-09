/**
 * Prove that the private-pilot GitHub App can update a workflow file.
 *
 * This is intentionally App-only. It uses the same GitHub client as the API
 * service for branch creation and the workflow-only commit, and never reads
 * GITHUB_PAT. The temporary branch is deleted in every cleanup path.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run test:github-app:smoke
 */

import assert from "node:assert/strict";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import {
  getGitHubClient,
  resolveGitHubAuth,
} from "../src/lib/github";

const owner = "OKHP3";
const repo = "telling-forward-pilot-grove";
const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
const appId = process.env.GITHUB_APP_ID;
const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
const privateKey = rawPrivateKey
  ?.replace(/\\r/g, "\r")
  .replace(/\\n/g, "\n")
  .replace(/(-----BEGIN [^-]+-----)\s*/, "$1\n")
  .replace(/\s*(-----END [^-]+-----)\s*$/, "\n$1\n");

assert.ok(appId && installationId && privateKey, "GitHub App secrets are incomplete");
assert.deepEqual(
  resolveGitHubAuth(),
  {
    kind: "app",
    credentials: { appId, installationId, privateKey },
  },
  "The workflow smoke must use complete App authentication and never the PAT fallback",
);

const auth = createAppAuth({ appId, installationId, privateKey });
const appAuthentication = await auth({ type: "app" });
const appClient = new Octokit({ auth: appAuthentication.token });
const appIdentity = await appClient.rest.apps.getAuthenticated();
const installation = await appClient.rest.apps.getInstallation({
  installation_id: installationId,
});

assert.equal(
  appIdentity.data.id,
  Number(appId),
  "App identity does not match GITHUB_APP_ID",
);
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
assert.equal(
  installation.data.permissions?.contents,
  "write",
  "Pilot installation does not have the contents write permission required by the platform",
);
assert.equal(
  installation.data.permissions?.workflows,
  "write",
  "Pilot installation needs the separate Workflows repository permission before the service can update .github/workflows files",
);

const installationAuth = await auth({
  type: "installation",
  installationId,
  refresh: true,
});
const cleanupClient = new Octokit({ auth: installationAuth.token });
const repository = await cleanupClient.rest.repos.get({ owner, repo });
const accessible = await cleanupClient.rest.apps.listReposAccessibleToInstallation({
  per_page: 100,
});
const accessibleNames = accessible.data.repositories.map((item) => item.full_name);

assert.ok(
  accessibleNames.includes(`${owner}/${repo}`),
  "Pilot repository is not accessible to the installation token",
);
assert.equal(repository.data.full_name, `${owner}/${repo}`);
assert.equal(repository.data.private, true, "Pilot repository is not private");

const branch = `pilot/app-workflow-acceptance-${Date.now()}`;
const workflowPath = ".github/workflows/pilot-app-acceptance.yml";
const workflowContent = [
  "# Temporary service-authored permission smoke fixture.",
  "name: pilot-app-acceptance",
  "on:",
  "  workflow_dispatch:",
  "permissions:",
  "  contents: read",
  "jobs:",
  "  acceptance:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - run: echo workflow-permission-boundary",
  "",
].join("\n");
const serviceClient = getGitHubClient();
let branchCreated = false;
let commitSha: string | null = null;

try {
  await serviceClient.createBranch({
    owner,
    repo,
    branchName: branch,
    fromRef: repository.data.default_branch,
  });
  branchCreated = true;

  commitSha = await serviceClient.createCommit({
    owner,
    repo,
    branch,
    files: { [workflowPath]: workflowContent },
    message: "test: prove service-authored workflow update",
    authorName: "Telling Forward platform",
    authorEmail: "noreply@tellingforward.app",
  });
  const writtenContent = await serviceClient.getFileContent(
    owner,
    repo,
    workflowPath,
    branch,
  );
  assert.equal(writtenContent, workflowContent);
} finally {
  if (branchCreated) {
    await cleanupClient.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    branchCreated = false;
  }
}

console.log(
  JSON.stringify({
    result: "passed",
    app: {
      id: appIdentity.data.id,
      slug: appIdentity.data.slug,
    },
    installation: {
      id: installation.data.id,
      account: installation.data.account?.login ?? null,
      repositorySelection: installation.data.repository_selection,
      permissions: installation.data.permissions,
      accessibleRepositories: accessibleNames,
    },
    pilotRepository: {
      fullName: repository.data.full_name,
      private: repository.data.private,
      defaultBranch: repository.data.default_branch,
    },
    write: {
      operation: "service-client-createCommit-workflow-only",
      path: workflowPath,
      commitSha,
      actor: `${appIdentity.data.slug}[bot]`,
      branchDeleted: !branchCreated,
    },
    credentialBoundary:
      "Complete App authentication is required; GITHUB_PAT is never read by this smoke",
  }),
);