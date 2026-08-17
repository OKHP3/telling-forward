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
import { eq, desc } from "drizzle-orm";
import {
  db,
  proposalsTable,
  storyworldsTable,
  storyPathsTable,
  editorQuestionsTable,
  provenanceRecordsTable,
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

      const [updated] = await db
        .update(proposalsTable)
        .set({ state: "under-review" })
        .where(eq(proposalsTable.id, proposal.id))
        .returning();

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

      if (!ACCEPT_FROM.has(proposal.state)) {
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

      // Merge the PR on GitHub
      let mergeCommitSha: string;
      try {
        mergeCommitSha = await gh.mergePullRequest({
          owner: world.repoOwner,
          repo: world.repoName,
          prNumber: proposal.prNumber,
          commitTitle: `Accept "${path?.title ?? `path #${proposal.pathId}`}" into canon`,
        });
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub merge failed",
        );
        res.status(502).json({
          error: "GitHub merge failed",
          detail: String(ghErr),
        });
        return;
      }

      const now = new Date();

      // Transition proposal state + write provenance record (atomic via Promise.all)
      const [[updatedProposal], [provenanceRecord]] = await Promise.all([
        db
          .update(proposalsTable)
          .set({ state: "accepted-into-canon", decidedAt: now })
          .where(eq(proposalsTable.id, proposal.id))
          .returning(),
        db
          .insert(provenanceRecordsTable)
          .values({
            storyworldId: proposal.storyworldId,
            canonCommitSha: mergeCommitSha,
            sourcePathId: proposal.pathId,
            contributorIds: [], // populated by contributor identity task
            stewardId: null, // steward lookup deferred to steward identity task
            decidedAt: now,
          })
          .returning(),
      ]);

      // Also update the story path state to published-alternate (merged)
      await db
        .update(storyPathsTable)
        .set({ state: "published-alternate", updatedAt: now })
        .where(eq(storyPathsTable.id, proposal.pathId));

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

      // Post review comment to GitHub PR
      let reviewId: number;
      try {
        reviewId = await gh.createPullRequestReview({
          owner: world.repoOwner,
          repo: world.repoName,
          prNumber: proposal.prNumber,
          body: body.data.editorQuestion,
          event: "REQUEST_CHANGES",
        });
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub review comment failed",
        );
        res.status(502).json({
          error: "GitHub review comment failed",
          detail: String(ghErr),
        });
        return;
      }

      // Update proposal state + create editor_question row (atomic via Promise.all)
      const [[updatedProposal]] = await Promise.all([
        db
          .update(proposalsTable)
          .set({ state: "returned-with-notes" })
          .where(eq(proposalsTable.id, proposal.id))
          .returning(),
        db.insert(editorQuestionsTable).values({
          proposalId: proposal.id,
          reviewCommentId: reviewId,
          body: body.data.editorQuestion,
        }),
      ]);

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
