/**
 * Proposal route handlers — editorial loop (Phase 2).
 *
 * State machine (Section 7.3 — single authoritative model):
 *   submitted → under-review → returned-with-notes → under-review (cycle)
 *   under-review → accepted-into-canon  (terminal, merge PR + provenance record)
 *   under-review → published-alternate  (terminal, close PR without merge — future)
 *
 * Steward actions (POST) require requireAuth + requireStewardForProposal.
 * Read actions (GET) are public.
 */

import { Router, type IRouter } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  db,
  proposalsTable,
  storyworldsTable,
  storyPathsTable,
  editorQuestionsTable,
  provenanceRecordsTable,
  stewardsTable,
} from "@workspace/db";
import {
  GetProposalParams,
  ListProposalsResponse,
  MarkProposalUnderReviewParams,
  MarkProposalUnderReviewResponse,
  AcceptProposalParams,
  AcceptProposalResponse,
  ReturnProposalParams,
  ReturnProposalBody,
  ReturnProposalResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireStewardForProposal } from "../middlewares/steward";
import { getGitHubClient } from "../lib/github";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Error sentinel for optimistic-concurrency conflicts
// ---------------------------------------------------------------------------

/** Thrown when a state-conditional UPDATE matched 0 rows (concurrent modification). */
class ConcurrentModificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrentModificationError";
  }
}

// ---------------------------------------------------------------------------
// Allowed state transitions for steward actions
// ---------------------------------------------------------------------------

const REVIEW_FROM: ReadonlySet<string> = new Set(["submitted", "returned-with-notes"]);
const ACCEPT_FROM: ReadonlySet<string> = new Set(["submitted", "under-review"]);
const RETURN_FROM: ReadonlySet<string> = new Set(["submitted", "under-review"]);

// ---------------------------------------------------------------------------
// GET /api/proposals — public listing (all storyworlds)
// ---------------------------------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .orderBy(desc(proposalsTable.submittedAt));
    res.json(ListProposalsResponse.parse(rows));
  } catch (err) {
    req.log.error({ err }, "listProposals DB error");
    res.status(500).json({ error: "Failed to load proposals" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/proposals/:id — public read
// ---------------------------------------------------------------------------

router.get("/:id", async (req, res) => {
  const params = GetProposalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, params.data.id))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "getProposal DB error");
    res.status(500).json({ error: "Failed to load proposal" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/review — steward marks submission as under review
// ---------------------------------------------------------------------------

router.post(
  "/:id/review",
  requireAuth,
  requireStewardForProposal,
  async (req, res) => {
    const params = MarkProposalUnderReviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid proposal id" });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.id, params.data.id))
        .limit(1);

      const proposal = rows[0];
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }

      if (!REVIEW_FROM.has(proposal.state)) {
        res.status(409).json({
          error: `Cannot mark as under review from state "${proposal.state}"`,
        });
        return;
      }

      // State-conditional update: if another steward or webhook changed the
      // state between our read and this update, 0 rows are returned → 409.
      const [updated] = await db
        .update(proposalsTable)
        .set({ state: "under-review" })
        .where(
          and(
            eq(proposalsTable.id, proposal.id),
            inArray(proposalsTable.state, ["submitted", "returned-with-notes"] as const),
          ),
        )
        .returning();

      if (!updated) {
        res.status(409).json({
          error: "Proposal state changed concurrently — reload and try again",
        });
        return;
      }

      logger.info(
        { proposalId: proposal.id, prevState: proposal.state },
        "Proposal marked under review",
      );
      res.json(MarkProposalUnderReviewResponse.parse(updated));
    } catch (err) {
      req.log.error({ err }, "markProposalUnderReview error");
      res.status(500).json({ error: "Failed to update proposal" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/accept — steward accepts into canon
// ---------------------------------------------------------------------------

router.post(
  "/:id/accept",
  requireAuth,
  requireStewardForProposal,
  async (req, res) => {
    const params = AcceptProposalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid proposal id" });
      return;
    }
    try {
      // Load proposal + storyworld in parallel
      const [proposalRows, gh] = await Promise.all([
        db
          .select()
          .from(proposalsTable)
          .where(eq(proposalsTable.id, params.data.id))
          .limit(1),
        Promise.resolve(getGitHubClient()),
      ]);

      const proposal = proposalRows[0];
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }

      // Recovery path: the webhook may have already moved the proposal to
      // "accepted-into-canon" before a retry reaches this point (e.g. the
      // initial request merged the PR on GitHub, then the DB transaction
      // failed, and the closed-PR webhook arrived first). In that case we
      // allow the retry through so it can create the missing provenance record.
      const isRecoveryAccept = proposal.state === "accepted-into-canon";

      if (!isRecoveryAccept && !ACCEPT_FROM.has(proposal.state)) {
        res.status(409).json({
          error: `Cannot accept proposal from state "${proposal.state}"`,
        });
        return;
      }

      // Load storyworld for GitHub repo coordinates
      const worldRows = await db
        .select()
        .from(storyworldsTable)
        .where(eq(storyworldsTable.id, proposal.storyworldId))
        .limit(1);

      const world = worldRows[0];
      if (!world) {
        res.status(404).json({ error: "Storyworld not found" });
        return;
      }

      // Load path for branch ref (used in commit title)
      const pathRows = await db
        .select()
        .from(storyPathsTable)
        .where(eq(storyPathsTable.id, proposal.pathId))
        .limit(1);

      const path = pathRows[0];

      // Get the merge SHA from GitHub. For the recovery path the PR is already
      // merged so we skip the merge call. For normal acceptance we merge first,
      // then fall through to the DB writes. Checking GitHub before merging
      // also handles the case where a previous request merged the PR but its
      // DB transaction failed — the retry reuses the existing SHA without
      // attempting a second merge.
      let mergeCommitSha: string;
      try {
        const prStatus = await gh.getPullRequest(
          world.repoOwner,
          world.repoName,
          proposal.prNumber,
        );

        if (prStatus?.merged && prStatus.mergeCommitSha) {
          // PR is already merged — reuse the SHA (retry or recovery path).
          logger.info(
            { prNumber: proposal.prNumber, sha: prStatus.mergeCommitSha },
            "PR already merged — reusing merge SHA",
          );
          mergeCommitSha = prStatus.mergeCommitSha;
        } else if (isRecoveryAccept) {
          // Should not happen: proposal says accepted but PR isn't merged.
          // Treat as a transient GitHub inconsistency and let the caller retry.
          res.status(502).json({
            error: "Proposal is accepted but PR is not yet reflected as merged on GitHub — try again shortly",
          });
          return;
        } else {
          mergeCommitSha = await gh.mergePullRequest({
            owner: world.repoOwner,
            repo: world.repoName,
            prNumber: proposal.prNumber,
            commitTitle: `Accept "${path?.title ?? `path #${proposal.pathId}`}" into canon`,
          });
        }
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub merge failed",
        );
        res.status(502).json({ error: "GitHub merge failed" });
        return;
      }

      const now = new Date();

      // Look up the steward record for this storyworld + acting user
      const stewardRows = await db
        .select()
        .from(stewardsTable)
        .where(
          and(
            eq(stewardsTable.storyworldId, proposal.storyworldId),
            eq(stewardsTable.userId, req.session.userId as number),
          ),
        )
        .limit(1);
      const stewardId = stewardRows[0]?.id ?? null;

      // Transition proposal state + write provenance record atomically.
      // The provenance insert checks for an existing record first so that a
      // retry after a partial failure (or a recovery after the webhook ran
      // first) never creates duplicate ledger entries.
      const { updatedProposal, provenanceRecord } = await db.transaction(
        async (tx) => {
          // State-conditional update: valid from ACCEPT_FROM states plus
          // "accepted-into-canon" (recovery path — webhook ran first).
          // If 0 rows returned, a concurrent return/review overwrote the state;
          // throw to roll back the entire transaction.
          const [updatedProposal] = await tx
            .update(proposalsTable)
            .set({ state: "accepted-into-canon", decidedAt: now })
            .where(
              and(
                eq(proposalsTable.id, proposal.id),
                inArray(proposalsTable.state, [
                  "submitted",
                  "under-review",
                  "accepted-into-canon",
                ] as const),
              ),
            )
            .returning();

          if (!updatedProposal) {
            throw new ConcurrentModificationError(
              "Proposal state changed concurrently — cannot accept",
            );
          }

          // Insert the provenance record with a DB-level idempotency guard.
          // The unique constraint on (storyworldId, canonCommitSha) is the
          // authoritative key. On retry, the same merge SHA produces a conflict
          // and we get the existing record back via RETURNING — no select-then-
          // insert race and no duplicate ledger entries.
          const [provenanceRecord] = await tx
            .insert(provenanceRecordsTable)
            .values({
              storyworldId: proposal.storyworldId,
              canonCommitSha: mergeCommitSha,
              sourcePathId: proposal.pathId,
              contributorIds: [], // populated by contributor identity task
              stewardId,
              decidedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                provenanceRecordsTable.storyworldId,
                provenanceRecordsTable.canonCommitSha,
              ],
              // No-op update on retry — all fields stay as originally written.
              // We still get the existing row back via RETURNING.
              set: { decidedAt: provenanceRecordsTable.decidedAt },
            })
            .returning();

          await tx
            .update(storyPathsTable)
            .set({ state: "published-alternate", updatedAt: now })
            .where(eq(storyPathsTable.id, proposal.pathId));

          return { updatedProposal, provenanceRecord };
        },
      );

      logger.info(
        {
          proposalId: proposal.id,
          prNumber: proposal.prNumber,
          mergeCommitSha,
          provenanceId: provenanceRecord?.id,
        },
        "Proposal accepted into canon",
      );

      const responsePayload = AcceptProposalResponse.parse({
        proposal: updatedProposal,
        provenanceRecordId: provenanceRecord?.id ?? 0,
      });
      res.json(responsePayload);
    } catch (err) {
      if (err instanceof ConcurrentModificationError) {
        res.status(409).json({
          error: "Proposal state changed concurrently — reload and try again",
        });
        return;
      }
      req.log.error({ err }, "acceptProposal error");
      res.status(500).json({ error: "Failed to accept proposal" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/return — steward returns with editor question
// ---------------------------------------------------------------------------

router.post(
  "/:id/return",
  requireAuth,
  requireStewardForProposal,
  async (req, res) => {
    const params = ReturnProposalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid proposal id" });
      return;
    }

    const body = ReturnProposalBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "editorQuestion is required" });
      return;
    }

    try {
      const proposalRows = await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.id, params.data.id))
        .limit(1);

      const proposal = proposalRows[0];
      if (!proposal) {
        res.status(404).json({ error: "Proposal not found" });
        return;
      }

      if (!RETURN_FROM.has(proposal.state)) {
        res.status(409).json({
          error: `Cannot return proposal from state "${proposal.state}"`,
        });
        return;
      }

      const worldRows = await db
        .select()
        .from(storyworldsTable)
        .where(eq(storyworldsTable.id, proposal.storyworldId))
        .limit(1);

      const world = worldRows[0];
      if (!world) {
        res.status(404).json({ error: "Storyworld not found" });
        return;
      }

      const gh = getGitHubClient();

      // Post review comment to GitHub PR — but first check whether a matching
      // REQUEST_CHANGES review was already posted. This makes the operation
      // recoverable: if a previous request successfully posted the review but
      // then failed to commit the DB records, a retry reuses the existing
      // review ID rather than posting a duplicate to GitHub.
      let reviewId: number;
      try {
        const existingReviews = await gh.listPullRequestReviews(
          world.repoOwner,
          world.repoName,
          proposal.prNumber,
        );
        // GitHub returns "CHANGES_REQUESTED" in the reviews list response,
        // even though the event is submitted as "REQUEST_CHANGES".
        const existingReview = existingReviews.find(
          (r) =>
            r.state === "CHANGES_REQUESTED" &&
            r.body === body.data.editorQuestion,
        );

        if (existingReview) {
          logger.info(
            { prNumber: proposal.prNumber, reviewId: existingReview.id },
            "Matching REQUEST_CHANGES review already exists — reusing for recovery",
          );
          reviewId = existingReview.id;
        } else {
          reviewId = await gh.createPullRequestReview({
            owner: world.repoOwner,
            repo: world.repoName,
            prNumber: proposal.prNumber,
            body: body.data.editorQuestion,
            event: "REQUEST_CHANGES",
          });
        }
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub review comment failed",
        );
        res.status(502).json({ error: "GitHub review comment failed" });
        return;
      }

      // Update proposal state + create editor_question row atomically.
      // The editor_questions insert is idempotent on reviewCommentId so that
      // if the pull_request_review webhook fires concurrently and wins the
      // race, this transaction still succeeds without a duplicate-key error.
      //
      // The proposal UPDATE is state-conditional: if another steward accepted
      // or merged the proposal between our read and this transaction (e.g. a
      // concurrent accept), 0 rows are updated, we return null, and the
      // transaction commits empty (no state is overwritten). The caller then
      // returns 409. The GitHub review that was already posted stays on the PR
      // but does not corrupt the DB ledger.
      const updatedProposal = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(proposalsTable)
          .set({ state: "returned-with-notes" })
          .where(
            and(
              eq(proposalsTable.id, proposal.id),
              inArray(proposalsTable.state, ["submitted", "under-review"] as const),
            ),
          )
          .returning();

        if (!updated) {
          // State changed concurrently — do not insert the editor question.
          // Return null to signal 409 to the caller; transaction commits empty.
          return null;
        }

        await tx
          .insert(editorQuestionsTable)
          .values({
            proposalId: proposal.id,
            reviewCommentId: reviewId,
            body: body.data.editorQuestion,
          })
          .onConflictDoUpdate({
            target: editorQuestionsTable.reviewCommentId,
            set: { body: body.data.editorQuestion },
          });

        return updated;
      });

      if (!updatedProposal) {
        res.status(409).json({
          error:
            "Proposal state changed concurrently — the GitHub review was posted but the editorial state was not updated. Reload the proposal.",
        });
        return;
      }

      logger.info(
        { proposalId: proposal.id, reviewId },
        "Proposal returned with editor question",
      );

      res.json(ReturnProposalResponse.parse(updatedProposal));
    } catch (err) {
      req.log.error({ err }, "returnProposal error");
      res.status(500).json({ error: "Failed to return proposal" });
    }
  },
);

export default router;
