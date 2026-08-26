/**
 * POST /api/webhooks/github
 *
 * Receives GitHub webhook payloads, verifies HMAC-SHA256 signature, and
 * routes each event type to the appropriate Drizzle upsert handler.
 *
 * Idempotency (Section 6.5): every handler keys on the GitHub-native
 * identifier (commit SHA, PR number, review comment ID) so replaying a
 * delivery is a safe no-op.
 *
 * Security: webhook signature verification always fails closed.
 * - If GITHUB_WEBHOOK_SECRET is not set in production, the endpoint returns 503.
 * - If GITHUB_WEBHOOK_SECRET is not set in development, all requests are rejected
 *   with 401 (no anonymous ingestion is ever permitted).
 *
 * NOTE: This handler MUST be mounted with `express.raw({ type: 'application/json' })`
 * (not express.json) so req.body is a Buffer for HMAC verification.
 * See app.ts for the mount point before the global JSON middleware.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  proposalsTable,
  editorQuestionsTable,
  contributorNotificationsTable,
  provenanceRecordsTable,
  webhookDeliveryEvidenceTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { getGitHubClient } from "../lib/github";
import { proposalSyncConflictSet } from "../lib/proposal-state-sync";
import {
  contributorAttributionsForPath,
  indexSavedMoment,
  acceptanceIntentForOperation,
  acceptanceOperationIdFromCommitMessage,
  parseAcceptanceDecisionNote,
  replacePathMomentMemberships,
  resolveContributor,
  resolveContributorIdentity,
  stewardAttribution,
  verifyAcceptanceDecisionNote,
  writeAcceptedProvenance,
} from "../lib/provenance";
import { emitContributorNotification } from "../lib/contributor-notifications";

// ---------------------------------------------------------------------------
// HMAC signature verification
// ---------------------------------------------------------------------------

function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const computed = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(computed, "hex"),
    );
  } catch {
    // Lengths differ — definitely not equal
    return false;
  }
}

// ---------------------------------------------------------------------------
// Minimal webhook payload types
// ---------------------------------------------------------------------------

interface GitHubUser {
  id?: number;
  login: string;
  name?: string | null;
}

interface GitHubRepo {
  name: string;
  owner: GitHubUser;
}

interface PushPayload {
  ref: string; // e.g. "refs/heads/main"
  repository: GitHubRepo;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    author_login?: string;
    timestamp: string;
  }>;
  head_commit: { id: string } | null;
}

interface PullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    state: string;
    merged: boolean;
    merge_commit_sha?: string | null;
    created_at: string;
    closed_at: string | null;
    merged_at: string | null;
    head: { ref: string };
    base: { ref: string };
    user?: GitHubUser;
    merged_by?: GitHubUser | null;
  };
  repository: GitHubRepo;
}

interface PullRequestReviewPayload {
  action: string;
  review: {
    id: number;
    body: string | null;
    state: string;
    submitted_at: string;
    pull_request_url: string;
  };
  pull_request: { number: number };
  repository: GitHubRepo;
}

interface IssueCommentPayload {
  action: string;
  issue: {
    number: number;
    pull_request?: { url: string };
  };
  comment: {
    id: number;
    body: string;
    created_at: string;
  };
  repository: GitHubRepo;
}

// ---------------------------------------------------------------------------
// Storyworld lookup helper
// ---------------------------------------------------------------------------

async function findStoryworld(owner: string, repo: string) {
  const rows = await db
    .select()
    .from(storyworldsTable)
    .where(
      and(
        eq(storyworldsTable.repoOwner, owner),
        eq(storyworldsTable.repoName, repo),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

type WebhookProcessingResult = "processed" | "ignored" | "failed";
type WebhookReplayOutcome = "new" | "duplicate";

type WebhookEvidenceContext = {
  storyworldId: number;
  proposalId?: number;
  editorQuestionId?: number;
  notificationKey?: string;
  provenanceRecordId?: number;
};

function repositoryFromPayload(payload: unknown): { owner: string; repo: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const repository = (payload as { repository?: unknown }).repository;
  if (!repository || typeof repository !== "object") return null;
  const owner = (repository as { owner?: { login?: unknown } }).owner?.login;
  const repo = (repository as { name?: unknown }).name;
  return typeof owner === "string" && typeof repo === "string"
    ? { owner, repo }
    : null;
}

async function evidenceContextFor(
  eventType: string,
  payload: unknown,
  world: { id: number },
): Promise<WebhookEvidenceContext> {
  const context: WebhookEvidenceContext = { storyworldId: world.id };
  let prNumber: number | null = null;
  let objectId: number | null = null;
  let provenanceCommitSha: string | null = null;

  if (eventType === "pull_request") {
    const pr = (payload as PullRequestPayload).pull_request;
    prNumber = typeof pr?.number === "number" ? pr.number : null;
    if (pr?.merged && pr.merge_commit_sha) {
      provenanceCommitSha = pr.merge_commit_sha;
    }
  } else if (eventType === "pull_request_review") {
    const reviewPayload = payload as PullRequestReviewPayload;
    prNumber = typeof reviewPayload.pull_request?.number === "number"
      ? reviewPayload.pull_request.number
      : null;
    objectId = typeof reviewPayload.review?.id === "number"
      ? reviewPayload.review.id
      : null;
    const decision = reviewPayload.review?.body
      ? verifyAcceptanceDecisionNote(
          reviewPayload.review.body,
          process.env["GITHUB_WEBHOOK_SECRET"],
        )
      : null;
    if (decision) provenanceCommitSha = decision.canonCommitSha;
  } else if (eventType === "issue_comment") {
    const commentPayload = payload as IssueCommentPayload;
    prNumber = typeof commentPayload.issue?.number === "number"
      ? commentPayload.issue.number
      : null;
    objectId = typeof commentPayload.comment?.id === "number"
      ? commentPayload.comment.id
      : null;
    const decision = commentPayload.comment?.body
      ? verifyAcceptanceDecisionNote(
          commentPayload.comment.body,
          process.env["GITHUB_WEBHOOK_SECRET"],
        )
      : null;
    if (decision) provenanceCommitSha = decision.canonCommitSha;
  }

  if (prNumber !== null) {
    const [proposal] = await db
      .select({ id: proposalsTable.id })
      .from(proposalsTable)
      .where(
        and(
          eq(proposalsTable.storyworldId, world.id),
          eq(proposalsTable.prNumber, prNumber),
        ),
      )
      .limit(1);
    if (proposal) {
      context.proposalId = proposal.id;
      if (eventType === "pull_request" && (payload as PullRequestPayload).action === "opened") {
        context.notificationKey = `proposal:${proposal.id}:received`;
      } else if (eventType === "pull_request") {
        const pr = (payload as PullRequestPayload).pull_request;
        if (pr.merged && pr.merge_commit_sha) {
          context.notificationKey = `proposal:${proposal.id}:official-story:${pr.merge_commit_sha}`;
        } else if (
          (payload as PullRequestPayload).action === "closed" &&
          pr.state === "closed"
        ) {
          context.notificationKey = `proposal:${proposal.id}:alternate-path:${pr.number}`;
        }
      } else if (
        eventType === "pull_request_review" &&
        (payload as PullRequestReviewPayload).action === "submitted" &&
        Boolean((payload as PullRequestReviewPayload).review.body?.trim()) &&
        !parseAcceptanceDecisionNote(
          (payload as PullRequestReviewPayload).review.body ?? "",
        )
      ) {
        context.notificationKey = `editor-question:${objectId}`;
      }
    }
  }

  // Only retain a notification link when the idempotent notification row
  // actually exists. This prevents an evidence row from implying that a
  // contributor was notified when the proposal had no linked contributor.
  if (context.notificationKey) {
    const [notification] = await db
      .select({ eventKey: contributorNotificationsTable.eventKey })
      .from(contributorNotificationsTable)
      .where(eq(contributorNotificationsTable.eventKey, context.notificationKey))
      .limit(1);
    if (!notification) context.notificationKey = undefined;
  }

  if (objectId !== null && (eventType === "pull_request_review" || eventType === "issue_comment")) {
    const [question] = await db
      .select({ id: editorQuestionsTable.id })
      .from(editorQuestionsTable)
      .where(eq(editorQuestionsTable.reviewCommentId, objectId))
      .limit(1);
    if (question) context.editorQuestionId = question.id;
  }

  if (provenanceCommitSha) {
    const [provenance] = await db
      .select({ id: provenanceRecordsTable.id })
      .from(provenanceRecordsTable)
      .where(
        and(
          eq(provenanceRecordsTable.storyworldId, world.id),
          eq(provenanceRecordsTable.canonCommitSha, provenanceCommitSha),
        ),
      )
      .limit(1);
    if (provenance) context.provenanceRecordId = provenance.id;
  }

  return context;
}

async function recordWebhookEvidence(input: {
  deliveryId: string;
  eventType: string;
  processingResult: WebhookProcessingResult;
  replayOutcome: WebhookReplayOutcome;
  context: WebhookEvidenceContext;
}): Promise<void> {
  await db
    .insert(webhookDeliveryEvidenceTable)
    .values({
      deliveryId: input.deliveryId,
      eventType: input.eventType,
      processingResult: input.processingResult,
      replayOutcome: input.replayOutcome,
      storyworldId: input.context.storyworldId,
      proposalId: input.context.proposalId ?? null,
      editorQuestionId: input.context.editorQuestionId ?? null,
      notificationKey: input.context.notificationKey ?? null,
      provenanceRecordId: input.context.provenanceRecordId ?? null,
    })
    .onConflictDoUpdate({
      target: webhookDeliveryEvidenceTable.deliveryId,
      set: {
        processingResult: input.processingResult,
        replayOutcome: input.replayOutcome,
        proposalId: input.context.proposalId ?? null,
        editorQuestionId: input.context.editorQuestionId ?? null,
        notificationKey: input.context.notificationKey ?? null,
        provenanceRecordId: input.context.provenanceRecordId ?? null,
      },
    });
}

async function rebuildAcceptedDecision(input: {
  world: { id: number; repoOwner: string; repoName: string };
  pathId: number;
  prNumber: number;
  canonCommitSha: string;
  mergedAt: string | null;
  author?: GitHubUser | null;
  mergedBy?: GitHubUser | null;
  decisionNote?: ReturnType<typeof parseAcceptanceDecisionNote>;
}): Promise<boolean> {
  const gh = getGitHubClient();
  const details = await gh.getPullRequest(
    input.world.repoOwner,
    input.world.repoName,
    input.prNumber,
  );
  if (
    !details?.merged ||
    details.mergeCommitSha !== input.canonCommitSha
  ) {
    logger.warn(
      {
        prNumber: input.prNumber,
        expectedMergeCommitSha: input.canonCommitSha,
        actualMergeCommitSha: details?.mergeCommitSha ?? null,
      },
      "Ignoring unverified accepted-contribution decision",
    );
    return false;
  }
  const comments = await gh.listPullRequestComments(
    input.world.repoOwner,
    input.world.repoName,
    input.prNumber,
  );
  const decisionNote =
    input.decisionNote ??
    comments
      .map((comment) =>
        verifyAcceptanceDecisionNote(
          comment.body,
          process.env["GITHUB_WEBHOOK_SECRET"],
        ),
      )
      .find((note) => note?.canonCommitSha === input.canonCommitSha) ??
    null;
  const mergeRange = await gh.getMergeCommitRange(
    input.world.repoOwner,
    input.world.repoName,
    input.canonCommitSha,
  );
  const decisionRangeMatchesMerge =
    !decisionNote?.baseCommitSha ||
    !decisionNote.sourceHeadSha ||
    (mergeRange?.baseSha === decisionNote.baseCommitSha &&
      mergeRange.headSha === decisionNote.sourceHeadSha);
  if (!decisionRangeMatchesMerge) {
    logger.warn(
      { prNumber: input.prNumber, canonCommitSha: input.canonCommitSha },
      "Ignoring acceptance decision whose signed range does not match merge parents",
    );
  }
  const verifiedDecisionNote = decisionRangeMatchesMerge ? decisionNote : null;
  const acceptedRange = mergeRange;
  if (!acceptedRange) {
    logger.warn(
      { prNumber: input.prNumber, canonCommitSha: input.canonCommitSha },
      "Cannot safely reconstruct a non-merge accepted contribution",
    );
    return false;
  }
  const operationId = verifiedDecisionNote
    ? null
    : acceptanceOperationIdFromCommitMessage(
        await gh.getCommitMessage(
          input.world.repoOwner,
          input.world.repoName,
          input.canonCommitSha,
        ),
      );
  const intentNote = operationId
    ? acceptanceIntentForOperation(
        comments,
        process.env["GITHUB_WEBHOOK_SECRET"],
        operationId,
        acceptedRange.headSha,
      )
    : null;
  const attributionRecord = verifiedDecisionNote ?? intentNote;
  const commits = await gh.listCommitsBetween(
    input.world.repoOwner,
    input.world.repoName,
    acceptedRange.baseSha,
    acceptedRange.headSha,
  );

  const commitContributors = await Promise.all(
    commits.map((commit) => indexSavedMoment(input.world.id, input.pathId, commit)),
  );
  await replacePathMomentMemberships(
    input.world.id,
    input.pathId,
    commits.map((commit) => commit.sha),
  );
  const sourceContributor = await resolveContributor({
    login: details?.author?.login ?? input.author?.login ?? null,
    displayName:
      details?.author?.displayName ?? input.author?.name ?? null,
  });
  const noteContributors = await Promise.all(
    attributionRecord?.contributors.map((contributor) =>
      resolveContributorIdentity(contributor.identity, contributor.displayName),
    ) ?? [],
  );
  const savedMomentContributors = await contributorAttributionsForPath(
    input.pathId,
  );
  const notedSteward = attributionRecord?.stewardGithubIdentity?.startsWith("github:")
    ? {
        login: attributionRecord.stewardGithubIdentity.slice("github:".length),
        displayName: null,
      }
    : null;
  const steward = await stewardAttribution(
    input.world.id,
    notedSteward ??
      details?.mergedBy ??
      (input.mergedBy
        ? { login: input.mergedBy.login, displayName: input.mergedBy.name ?? null }
        : null),
  );

  await writeAcceptedProvenance({
    storyworldId: input.world.id,
    canonCommitSha: input.canonCommitSha,
    sourcePathId: input.pathId,
    sourcePrNumber: input.prNumber,
    contributors: [
      ...savedMomentContributors,
      ...commitContributors.filter(
        (value): value is Exclude<typeof value, null> => value !== null,
      ),
      ...noteContributors.filter(
        (value): value is Exclude<typeof value, null> => value !== null,
      ),
      ...(sourceContributor ? [sourceContributor] : []),
    ],
    steward,
    decidedAt: verifiedDecisionNote?.decidedAt
      ? new Date(verifiedDecisionNote.decidedAt)
      : intentNote?.intendedAt
        ? new Date(intentNote.intendedAt)
      : details?.mergedAt
        ? new Date(details.mergedAt)
        : input.mergedAt
          ? new Date(input.mergedAt)
          : new Date(),
  });
  return true;
}

// ---------------------------------------------------------------------------
// Proposal state mapping (GitHub PR state → platform state)
// ---------------------------------------------------------------------------

function prToProposalState(
  state: string,
  merged: boolean,
): "submitted" | "under-review" | "accepted-into-canon" | "published-alternate" {
  if (merged) return "accepted-into-canon";
  if (state === "closed") return "published-alternate";
  return "submitted";
}

// ---------------------------------------------------------------------------
// Story path state from PR outcome
//
// merged=true  → published-canon     (steward accepted into canon; PR was merged)
// merged=false, closed=true → published-alternate  (closed without merge)
// open → proposed
//
// These two terminal states are mutually exclusive: a merged PR must never
// produce published-alternate, and a closed-without-merge PR must never
// produce published-canon.
// ---------------------------------------------------------------------------

function prToPathState(
  merged: boolean,
  closed: boolean,
): "proposed" | "published-canon" | "published-alternate" {
  if (merged) return "published-canon";
  if (closed) return "published-alternate";
  return "proposed";
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handlePush(payload: PushPayload): Promise<void> {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const branchRef = payload.ref.replace("refs/heads/", "");

  const world = await findStoryworld(owner, repo);
  if (!world) {
    logger.debug({ owner, repo }, "push: no storyworld found for repo — skipping");
    return;
  }

  // Upsert the story path for this branch
  const [path] = await db
    .insert(storyPathsTable)
    .values({
      storyworldId: world.id,
      branchRef,
      title: branchRef,
      state: branchRef === world.canonBranchRef.replace("refs/heads/", "") ? "open" : "personal",
    })
    .onConflictDoUpdate({
      target: [storyPathsTable.storyworldId, storyPathsTable.branchRef],
      set: { updatedAt: new Date() },
    })
    .returning();

  if (!path) {
    logger.error({ owner, repo, branchRef }, "push: failed to upsert story path");
    return;
  }

  // Upsert each commit as a contribution (keyed on storyworld_id + commit_sha)
  for (const commit of payload.commits) {
    await indexSavedMoment(world.id, path.id, {
      sha: commit.id,
      message: commit.message,
      authorName: commit.author.name,
      authorEmail: commit.author.email,
      authorLogin: commit.author_login ?? null,
      timestamp: commit.timestamp,
    });
  }

  logger.info(
    { owner, repo, branchRef, commits: payload.commits.length },
    "push: upserted path and contributions",
  );
}

async function handlePullRequest(payload: PullRequestPayload): Promise<void> {
  const { action } = payload;
  if (!["opened", "closed", "reopened", "synchronize"].includes(action)) return;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const pr = payload.pull_request;

  const world = await findStoryworld(owner, repo);
  if (!world) {
    logger.debug({ owner, repo }, "pull_request: no storyworld found — skipping");
    return;
  }

  const isClosed = pr.state === "closed";
  const pathState = prToPathState(pr.merged, isClosed);

  // Terminal events (closed) always apply GitHub's authoritative outcome.
  // Non-terminal events (opened, synchronize, reopened) must never overwrite
  // an editorial or terminal state that was already established.
  const isTerminalEvent = action === "closed";

  // Upsert the story path; drive its state from the PR lifecycle.
  // Non-terminal events must not overwrite either terminal state
  // (published-canon or published-alternate) in case a prior closed/merged
  // delivery already established the authoritative outcome.
  const pathStateSet = isTerminalEvent
    ? drizzleSql`excluded.state`
    : drizzleSql`
        CASE
          WHEN ${storyPathsTable.state} IN ('published-canon', 'published-alternate')
          THEN ${storyPathsTable.state}
          ELSE excluded.state
        END`;

  const [path] = await db
    .insert(storyPathsTable)
    .values({
      storyworldId: world.id,
      branchRef: pr.head.ref,
      title: pr.head.ref,
      state: pathState,
    })
    .onConflictDoUpdate({
      target: [storyPathsTable.storyworldId, storyPathsTable.branchRef],
      set: { state: pathStateSet, updatedAt: new Date() },
    })
    .returning();

  if (!path) return;

  const proposalState = prToProposalState(pr.state, pr.merged);
  const submittedAt = new Date(pr.created_at);
  const decidedAt =
    pr.merged_at ?? pr.closed_at
      ? new Date((pr.merged_at ?? pr.closed_at)!)
      : null;
  const contributor = pr.user
    ? await resolveContributor({
        login: pr.user.login,
        name: pr.user.name ?? null,
      })
    : null;

  // GitHub terminal events apply the repository outcome unless a product-level
  // terminal decision has already been recorded. All non-terminal events must
  // NOT overwrite:
  //   - editorial states a steward has set ("under-review", "returned-with-notes")
  //   - a terminal outcome that a prior event already established ("accepted-into-canon")
  // Preserve decidedAt alongside every preserved state; otherwise use the
  // repository event timestamp.
  const { state: stateSet, decidedAt: decidedAtSet } =
    proposalSyncConflictSet(isTerminalEvent);

  const [proposal] = await db
    .insert(proposalsTable)
    .values({
      storyworldId: world.id,
      pathId: path.id,
      contributorId: contributor?.id ?? null,
      githubUserId: pr.user?.id ? String(pr.user.id) : null,
      prNumber: pr.number,
      state: proposalState,
      submittedAt,
      decidedAt,
    })
    .onConflictDoUpdate({
      target: [proposalsTable.storyworldId, proposalsTable.prNumber],
      set: {
        state: stateSet,
        decidedAt: decidedAtSet,
        // Backfill a historic proposal when its author is known, without
        // replacing an established contributor link on webhook replay.
        contributorId: drizzleSql`COALESCE(${proposalsTable.contributorId}, excluded.contributor_id)`,
        // GitHub account IDs, unlike usernames, survive renames and cannot be
        // reassigned to another account. Do not replace an existing ID.
        githubUserId: drizzleSql`COALESCE(${proposalsTable.githubUserId}, excluded.github_user_id)`,
      },
    })
    .returning();

  // A merged PR is GitHub's durable acceptance decision. Rebuild the local
  // provenance index from the PR author, merge actor, and saved moments rather
  // than relying on the account that happened to process this webhook.
  if (proposal && pr.merged && payload.pull_request.merge_commit_sha) {
    await rebuildAcceptedDecision({
      world,
      pathId: path.id,
      prNumber: pr.number,
      canonCommitSha: payload.pull_request.merge_commit_sha,
      mergedAt: pr.merged_at,
      author: pr.user ?? null,
      mergedBy: pr.merged_by ?? null,
    });
  }

  if (proposal) {
    if (pr.merged && payload.pull_request.merge_commit_sha) {
      await emitContributorNotification({
        contributorId: proposal.contributorId,
        proposalId: proposal.id,
        kind: "official-story",
        eventKey: `proposal:${proposal.id}:official-story:${payload.pull_request.merge_commit_sha}`,
      });
    } else if (action === "closed" && isClosed) {
      await emitContributorNotification({
        contributorId: proposal.contributorId,
        proposalId: proposal.id,
        kind: "alternate-path",
        eventKey: `proposal:${proposal.id}:alternate-path:${pr.number}`,
      });
    } else if (action === "opened") {
      await emitContributorNotification({
        contributorId: proposal.contributorId,
        proposalId: proposal.id,
        kind: "received",
        eventKey: `proposal:${proposal.id}:received`,
      });
    }
  }

  logger.info(
    { owner, repo, prNumber: pr.number, proposalState, pathState },
    "pull_request: upserted proposal and path state",
  );
}

async function handlePullRequestReview(
  payload: PullRequestReviewPayload,
): Promise<void> {
  if (payload.action !== "submitted") return;

  const review = payload.review;
  // Only record reviews that have a body (pure approvals with no comment are not editor questions)
  if (!review.body?.trim()) return;
  const parsedAcceptanceDecision = parseAcceptanceDecisionNote(review.body);
  const acceptanceDecision = verifyAcceptanceDecisionNote(
    review.body,
    process.env["GITHUB_WEBHOOK_SECRET"],
  );

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  const world = await findStoryworld(owner, repo);
  if (!world) return;

  const proposals = await db
    .select()
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.storyworldId, world.id),
        eq(proposalsTable.prNumber, payload.pull_request.number),
      ),
    )
    .limit(1);

  const proposal = proposals[0];
  if (!proposal) {
    logger.debug(
      { prNumber: payload.pull_request.number },
      "pull_request_review: no proposal found — skipping",
    );
    return;
  }

  if (parsedAcceptanceDecision && !acceptanceDecision) {
    logger.warn(
      { reviewId: review.id, prNumber: payload.pull_request.number },
      "Ignoring unsigned or invalid accepted-contribution decision note",
    );
    return;
  }

  if (acceptanceDecision) {
    const pathRows = await db
      .select({ id: storyPathsTable.id })
      .from(storyPathsTable)
      .where(eq(storyPathsTable.id, proposal.pathId))
      .limit(1);
    const path = pathRows[0];
    if (path) {
      await rebuildAcceptedDecision({
        world,
        pathId: path.id,
        prNumber: payload.pull_request.number,
        canonCommitSha: acceptanceDecision.canonCommitSha,
        mergedAt: acceptanceDecision.decidedAt,
        decisionNote: acceptanceDecision,
      });
    }
    return;
  }

  // review.id is a GitHub-native bigint; stored as bigint in Postgres (lossless)
  await db
    .insert(editorQuestionsTable)
    .values({
      proposalId: proposal.id,
      reviewCommentId: review.id,
      body: review.body,
    })
    .onConflictDoUpdate({
      target: editorQuestionsTable.reviewCommentId,
      set: { body: review.body },
    });
  await emitContributorNotification({
    contributorId: proposal.contributorId,
    proposalId: proposal.id,
    kind: "creative-question",
    eventKey: `editor-question:${review.id}`,
  });

  logger.info(
    { reviewId: review.id, proposalId: proposal.id },
    "pull_request_review: upserted editor question",
  );
}

async function handleIssueComment(
  payload: IssueCommentPayload,
): Promise<void> {
  if (payload.action !== "created") return;
  // Only handle comments on pull requests
  if (!payload.issue.pull_request) return;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  const world = await findStoryworld(owner, repo);
  if (!world) return;

  const proposals = await db
    .select()
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.storyworldId, world.id),
        eq(proposalsTable.prNumber, payload.issue.number),
      ),
    )
    .limit(1);

  const proposal = proposals[0];
  if (!proposal) return;
  const parsedAcceptanceDecision = parseAcceptanceDecisionNote(
    payload.comment.body,
  );
  const acceptanceDecision = verifyAcceptanceDecisionNote(
    payload.comment.body,
    process.env["GITHUB_WEBHOOK_SECRET"],
  );
  if (parsedAcceptanceDecision && !acceptanceDecision) {
    logger.warn(
      { commentId: payload.comment.id, prNumber: payload.issue.number },
      "Ignoring unsigned or invalid accepted-contribution decision comment",
    );
    return;
  }
  if (acceptanceDecision) {
    const pathRows = await db
      .select({ id: storyPathsTable.id })
      .from(storyPathsTable)
      .where(eq(storyPathsTable.id, proposal.pathId))
      .limit(1);
    const path = pathRows[0];
    if (path) {
      await rebuildAcceptedDecision({
        world,
        pathId: path.id,
        prNumber: payload.issue.number,
        canonCommitSha: acceptanceDecision.canonCommitSha,
        mergedAt: acceptanceDecision.decidedAt,
        decisionNote: acceptanceDecision,
      });
    }
    return;
  }

  // comment.id is a GitHub-native bigint; stored as bigint in Postgres (lossless)
  await db
    .insert(editorQuestionsTable)
    .values({
      proposalId: proposal.id,
      reviewCommentId: payload.comment.id,
      body: payload.comment.body,
    })
    .onConflictDoUpdate({
      target: editorQuestionsTable.reviewCommentId,
      set: { body: payload.comment.body },
    });

  logger.info(
    { commentId: payload.comment.id, proposalId: proposal.id },
    "issue_comment: upserted editor question",
  );
}

// ---------------------------------------------------------------------------
// Route handler — mounted with express.raw() in app.ts
// ---------------------------------------------------------------------------

export async function githubWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const secret = process.env["GITHUB_WEBHOOK_SECRET"];

  // Fail closed: never permit ingestion without a configured secret.
  // In production a missing secret is a configuration error → 503.
  // In development it is still rejected (401) to prevent accidental open endpoints.
  if (!secret) {
    if (process.env["NODE_ENV"] === "production") {
      logger.error("GITHUB_WEBHOOK_SECRET not set — webhook endpoint is disabled in production");
      res.status(503).json({ error: "Webhook endpoint not configured" });
    } else {
      logger.error("GITHUB_WEBHOOK_SECRET not set — rejecting all webhook requests in development");
      res.status(401).json({ error: "Webhook secret not configured; set GITHUB_WEBHOOK_SECRET" });
    }
    return;
  }

  // req.body is a Buffer when mounted with express.raw()
  const rawBody = req.body as Buffer;

  const sig = req.headers["x-hub-signature-256"] as string | undefined;
  if (!verifySignature(rawBody, sig, secret)) {
    logger.warn({ ip: req.ip }, "Webhook signature verification failed");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const eventType = req.headers["x-github-event"] as string | undefined;
  if (!eventType) {
    res.status(400).json({ error: "Missing X-GitHub-Event header" });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  // GitHub supplies this identifier for every delivery. Keep the existing
  // compatibility behavior for local callers that omit it, but only create
  // audit evidence when the identifier is present.
  const deliveryId = req.headers["x-github-delivery"] as string | undefined;
  const repository = repositoryFromPayload(payload);
  const world = deliveryId && repository
    ? await findStoryworld(repository.owner, repository.repo)
    : null;
  const previousEvidence = deliveryId
    ? await db
        .select({ id: webhookDeliveryEvidenceTable.id })
        .from(webhookDeliveryEvidenceTable)
        .where(eq(webhookDeliveryEvidenceTable.deliveryId, deliveryId))
        .limit(1)
    : [];
  const replayOutcome: WebhookReplayOutcome =
    previousEvidence.length > 0 ? "duplicate" : "new";
  let processingResult: WebhookProcessingResult = "processed";

  try {
    switch (eventType) {
      case "push":
        await handlePush(payload as PushPayload);
        break;
      case "pull_request":
        await handlePullRequest(payload as PullRequestPayload);
        break;
      case "pull_request_review":
        await handlePullRequestReview(payload as PullRequestReviewPayload);
        break;
      case "issue_comment":
        await handleIssueComment(payload as IssueCommentPayload);
        break;
      case "ping":
        logger.info("GitHub webhook ping received");
        break;
      default:
        processingResult = "ignored";
        logger.debug({ eventType }, "Unhandled webhook event type — ignoring");
    }
    if (!world && deliveryId) processingResult = "ignored";
    if (deliveryId && world) {
      const context = await evidenceContextFor(eventType, payload, world);
      await recordWebhookEvidence({
        deliveryId,
        eventType,
        processingResult,
        replayOutcome,
        context,
      });
    }
    res.status(200).json({
      ok: true,
      event: eventType,
      ...(deliveryId ? { delivery: deliveryId } : {}),
      replay: replayOutcome,
    });
  } catch (err) {
    processingResult = "failed";
    if (deliveryId && world) {
      try {
        await recordWebhookEvidence({
          deliveryId,
          eventType,
          processingResult,
          replayOutcome,
          context: await evidenceContextFor(eventType, payload, world),
        });
      } catch (evidenceError) {
        logger.error(
          { err: evidenceError, deliveryId },
          "Failed to record webhook evidence",
        );
      }
    }
    logger.error({ err, eventType }, "Webhook handler error");
    res.status(500).json({ error: "Internal handler error" });
  }
}
