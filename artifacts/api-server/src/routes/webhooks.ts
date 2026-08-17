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
import { eq, and } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  contributionsTable,
  proposalsTable,
  editorQuestionsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

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
  login: string;
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
    created_at: string;
    closed_at: string | null;
    merged_at: string | null;
    head: { ref: string };
    base: { ref: string };
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
// ---------------------------------------------------------------------------

function prToPathState(
  merged: boolean,
  closed: boolean,
): "proposed" | "published-alternate" {
  if (merged || closed) return "published-alternate";
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
    const [title = commit.id.slice(0, 7), ...rest] = commit.message.split("\n");
    const summary = rest.filter(Boolean).join("\n").trim() || null;

    await db
      .insert(contributionsTable)
      .values({
        storyworldId: world.id,
        pathId: path.id,
        commitSha: commit.id,
        title: title.trim(),
        summary,
        createdAt: new Date(commit.timestamp),
      })
      .onConflictDoNothing();
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

  // Upsert the story path; drive its state from the PR lifecycle
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
      set: { state: pathState, updatedAt: new Date() },
    })
    .returning();

  if (!path) return;

  const proposalState = prToProposalState(pr.state, pr.merged);
  const submittedAt = new Date(pr.created_at);
  const decidedAt =
    pr.merged_at ?? pr.closed_at
      ? new Date((pr.merged_at ?? pr.closed_at)!)
      : null;

  await db
    .insert(proposalsTable)
    .values({
      storyworldId: world.id,
      pathId: path.id,
      prNumber: pr.number,
      state: proposalState,
      submittedAt,
      decidedAt,
    })
    .onConflictDoUpdate({
      target: [proposalsTable.storyworldId, proposalsTable.prNumber],
      set: { state: proposalState, decidedAt },
    });

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
        logger.debug({ eventType }, "Unhandled webhook event type — ignoring");
    }
    res.status(200).json({ ok: true, event: eventType });
  } catch (err) {
    logger.error({ err, eventType }, "Webhook handler error");
    res.status(500).json({ error: "Internal handler error" });
  }
}
