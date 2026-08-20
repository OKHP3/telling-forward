/**
 * Proposal route handlers — editorial loop (Phase 2).
 *
 * State machine (Section 7.3 — single authoritative model):
 *   submitted → under-review → returned-with-notes → under-review (cycle)
 *   under-review → accepted-into-canon  (terminal, merge PR + provenance record)
 *   under-review → published-alternate  (terminal, close PR without merge — future)
 *   active → restricted                 (terminal steward decision)
 *   active → withdrawn                  (terminal, proposal author only)
 *   terminal → archived                 (terminal steward housekeeping)
 *
 * Steward actions (POST) require requireAuth + requireStewardForProposal.
 * Read actions (GET) are public.
 */

import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import {
  db,
  proposalsTable,
  storyworldsTable,
  storyPathsTable,
  editorQuestionsTable,
  stewardsTable,
  userGithubLinksTable,
} from "@workspace/db";
import {
  GetProposalParams,
  GetProposalResponse,
  ListProposalsResponse,
  MarkProposalUnderReviewParams,
  MarkProposalUnderReviewResponse,
  AcceptProposalParams,
  AcceptProposalResponse,
  ReturnProposalParams,
  ReturnProposalBody,
  ReturnProposalResponse,
  RestrictProposalParams,
  RestrictProposalBody,
  RestrictProposalResponse,
  WithdrawProposalParams,
  WithdrawProposalResponse,
  ArchiveProposalParams,
  ArchiveProposalResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireStewardForProposal } from "../middlewares/steward";
import {
  getGitHubClient,
  type GitHubCommit,
  type GitHubPullRequest,
} from "../lib/github";
import { logger } from "../lib/logger";
import {
  buildAcceptanceDecisionNote,
  buildAcceptanceIntentNote,
  acceptanceIntentForOperation,
  acceptanceOperationIdFromCommitMessage,
  contributorAttributionsForPath,
  indexSavedMoment,
  replacePathMomentMemberships,
  resolveContributor,
  resolveContributorIdentity,
  stewardAttribution,
  verifyAcceptanceDecisionNote,
  writeAcceptedProvenance,
} from "../lib/provenance";

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
// Restriction is an editorial decision for a proposal that is still active.
// It intentionally excludes drafts: a steward can only restrict a submission
// that has entered the review loop.
const RESTRICT_FROM: ReadonlySet<string> = new Set([
  "submitted",
  "under-review",
  "returned-with-notes",
]);
// A contributor can retract an active proposal, including a draft that has
// already acquired a backing PR. No terminal decision may be withdrawn.
const WITHDRAW_FROM: ReadonlySet<string> = new Set([
  "draft",
  "submitted",
  "under-review",
  "returned-with-notes",
]);
// Archiving preserves the result of a prior terminal decision while removing
// it from active editorial work. It is not a substitute for acceptance.
const ARCHIVE_FROM: ReadonlySet<string> = new Set([
  "accepted-into-canon",
  "published-alternate",
  "restricted",
  "withdrawn",
]);

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
    const proposal = rows[0];
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const editorQuestions = await db
      .select()
      .from(editorQuestionsTable)
      .where(eq(editorQuestionsTable.proposalId, proposal.id))
      .orderBy(asc(editorQuestionsTable.createdAt), asc(editorQuestionsTable.id));

    res.json(GetProposalResponse.parse({ ...proposal, editorQuestions }));
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
      const provenanceSigningSecret = process.env["GITHUB_WEBHOOK_SECRET"];
      if (!provenanceSigningSecret) {
        res.status(503).json({
          error: "Story acceptance is temporarily unavailable because its durable decision record cannot be secured.",
        });
        return;
      }

      // Load path for branch ref (used in commit title)
      const pathRows = await db
        .select()
        .from(storyPathsTable)
        .where(eq(storyPathsTable.id, proposal.pathId))
        .limit(1);

      const path = pathRows[0];
      // The API service account performs the GitHub merge, so it cannot stand
      // in for the human who made the editorial decision. Require the acting
      // steward's linked identity before any irreversible merge is attempted.
      const actingStewardRows = await db
        .select({
          id: stewardsTable.id,
          githubUsername: userGithubLinksTable.githubUsername,
        })
        .from(stewardsTable)
        .innerJoin(
          userGithubLinksTable,
          eq(stewardsTable.userId, userGithubLinksTable.userId),
        )
        .where(
          and(
            eq(stewardsTable.storyworldId, proposal.storyworldId),
            eq(stewardsTable.userId, req.session.userId as number),
          ),
        )
        .limit(1);
      const actingSteward = actingStewardRows[0];
      if (!actingSteward) {
        res.status(422).json({
          error: "Link your GitHub account before accepting a path into canon so your editorial decision can be credited.",
        });
        return;
      }

      // Get the merge SHA from GitHub. For the recovery path the PR is already
      // merged so we skip the merge call. For normal acceptance we merge first,
      // then fall through to the DB writes. Checking GitHub before merging
      // also handles the case where a previous request merged the PR but its
      // DB transaction failed — the retry reuses the existing SHA without
      // attempting a second merge.
      let mergeCommitSha: string;
      let mergedPullRequest: GitHubPullRequest | null = null;
      let pullRequestCommits: GitHubCommit[] = [];
      let acceptedRange: { baseSha: string; headSha: string } | null = null;
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
          mergedPullRequest = prStatus;
          acceptedRange = await gh.getMergeCommitRange(
            world.repoOwner,
            world.repoName,
            mergeCommitSha,
          );
        } else if (isRecoveryAccept) {
          // Should not happen: proposal says accepted but PR isn't merged.
          // Treat as a transient GitHub inconsistency and let the caller retry.
          res.status(502).json({
            error: "Proposal is accepted but PR is not yet reflected as merged on GitHub — try again shortly",
          });
          return;
        } else {
          if (!prStatus) {
            throw new Error("Pull request details are unavailable");
          }
          // Establish a recoverable, steward-bound intent while the PR is
          // still open. If the post-merge final comment is interrupted, this
          // record lets webhook replay and reconciliation repair attribution.
          const intentCommits = await gh.listCommitsBetween(
            world.repoOwner,
            world.repoName,
            prStatus.baseSha,
            prStatus.headSha,
          );
          const intentContributors = await Promise.all(
            intentCommits.map((commit) =>
              resolveContributor({
                login: commit.authorLogin,
                name: commit.authorName,
                email: commit.authorEmail,
              }),
            ),
          );
          const intentSourceContributor = prStatus.author
            ? await resolveContributor(prStatus.author)
            : null;
          const operationId = randomUUID();
          const intent = buildAcceptanceIntentNote({
            operationId,
            sourceHeadSha: prStatus.headSha,
            stewardGithubIdentity: `github:${actingSteward.githubUsername.toLowerCase()}`,
            contributors: [
              ...intentContributors.filter(
                (value): value is Exclude<typeof value, null> => value !== null,
              ),
              ...(intentSourceContributor ? [intentSourceContributor] : []),
            ].map((contributor) => ({
              identity: contributor.identity,
              displayName: contributor.displayName,
            })),
            intendedAt: new Date(),
          }, provenanceSigningSecret);
          await gh.createPullRequestComment({
            owner: world.repoOwner,
            repo: world.repoName,
            prNumber: proposal.prNumber,
            body: intent,
          });
          mergeCommitSha = await gh.mergePullRequest({
            owner: world.repoOwner,
            repo: world.repoName,
            prNumber: proposal.prNumber,
            commitTitle: `Accept "${path?.title ?? `path #${proposal.pathId}`}" into canon [telling-forward-acceptance:${operationId}]`,
            expectedHeadSha: prStatus.headSha,
          });
          mergedPullRequest = await gh.getPullRequest(
            world.repoOwner,
            world.repoName,
            proposal.prNumber,
          );
          acceptedRange = await gh.getMergeCommitRange(
            world.repoOwner,
            world.repoName,
            mergeCommitSha,
          );
        }

        if (!mergedPullRequest || !acceptedRange) {
          throw new Error("Merged pull request details are unavailable");
        }
        pullRequestCommits = await gh.listCommitsBetween(
          world.repoOwner,
          world.repoName,
          acceptedRange.baseSha,
          acceptedRange.headSha,
        );
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub merge failed",
        );
        res.status(502).json({ error: "GitHub merge failed" });
        return;
      }

      const now = new Date();

      // First index every saved moment GitHub associates with this proposal.
      // This works even if the source branch has been deleted after merge.
      const commitContributors = await Promise.all(
        pullRequestCommits.map((commit) =>
          indexSavedMoment(proposal.storyworldId, proposal.pathId, commit),
        ),
      );
      await replacePathMomentMemberships(
        proposal.storyworldId,
        proposal.pathId,
        pullRequestCommits.map((commit) => commit.sha),
      );
      const sourceContributor = mergedPullRequest?.author
        ? await resolveContributor(mergedPullRequest.author)
        : null;
      const savedMomentContributors = await contributorAttributionsForPath(
        proposal.pathId,
      );
      let steward = await stewardAttribution(
        proposal.storyworldId,
        { login: actingSteward.githubUsername, displayName: null },
        actingSteward.id,
      );
      let provenanceContributors = [
        ...savedMomentContributors,
        ...commitContributors.filter(
          (value): value is Exclude<typeof value, null> => value !== null,
        ),
        ...(sourceContributor ? [sourceContributor] : []),
      ];

      // The server may merge with its service identity. Preserve the steward's
      // real linked identity and all contributors in the PR itself so a clean
      // reconciliation can recover this decision without a prior DB snapshot.
      try {
        // Issue/PR conversation comments remain writable after a PR is merged;
        // reviews do not. This is the durable home for the acceptance record.
        const comments = await gh.listPullRequestComments(
          world.repoOwner,
          world.repoName,
          proposal.prNumber,
        );
        const recoveryOperationId = isRecoveryAccept
          ? acceptanceOperationIdFromCommitMessage(
              await gh.getCommitMessage(
                world.repoOwner,
                world.repoName,
                mergeCommitSha,
              ),
            )
          : null;
        const recoveryIntent = recoveryOperationId
          ? acceptanceIntentForOperation(
              comments,
              provenanceSigningSecret,
              recoveryOperationId,
              acceptedRange.headSha,
            )
          : null;
        if (recoveryIntent) {
          steward = await stewardAttribution(proposal.storyworldId, {
            login: recoveryIntent.stewardGithubIdentity.replace(/^github:/, ""),
            displayName: null,
          });
          provenanceContributors = (
            await Promise.all(
              recoveryIntent.contributors.map((contributor) =>
                resolveContributorIdentity(
                  contributor.identity,
                  contributor.displayName,
                ),
              ),
            )
          ).filter(
            (value): value is Exclude<typeof value, null> => value !== null,
          );
        }
        const note = buildAcceptanceDecisionNote({
          canonCommitSha: mergeCommitSha,
          baseCommitSha: acceptedRange.baseSha,
          sourceHeadSha: acceptedRange.headSha,
          stewardGithubIdentity: steward.githubIdentity,
          contributors: provenanceContributors.map((contributor) => ({
            identity: contributor.identity,
            displayName: contributor.displayName,
          })),
          decidedAt: mergedPullRequest?.mergedAt
            ? new Date(mergedPullRequest.mergedAt)
            : now,
        }, provenanceSigningSecret);
        const hasSignedDecisionRecord = comments.some(
          (comment) =>
            verifyAcceptanceDecisionNote(
              comment.body,
              provenanceSigningSecret,
            )?.canonCommitSha === mergeCommitSha,
        );
        if (!hasSignedDecisionRecord) {
          await gh.createPullRequestComment({
            owner: world.repoOwner,
            repo: world.repoName,
            prNumber: proposal.prNumber,
            body: note,
          });
        }
      } catch (ghErr) {
        logger.error(
          { err: ghErr, prNumber: proposal.prNumber },
          "GitHub acceptance decision record failed",
        );
        res.status(502).json({
          error: "The story was accepted, but its attribution record could not be saved. Retry to finish recording the decision.",
        });
        return;
      }

      // Transition proposal state atomically. The provenance index is then
      // upserted by its GitHub merge SHA, so retries and the concurrent webhook
      // write converge on one complete ledger record.
      const updatedProposal = await db.transaction(
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

          // Mark the path as canon, not as an alternate. published-canon and
          // published-alternate are mutually exclusive terminal outcomes of
          // canon review; a path accepted into canon must never carry the
          // published-alternate state.
          await tx
            .update(storyPathsTable)
            .set({ state: "published-canon", updatedAt: now })
            .where(eq(storyPathsTable.id, proposal.pathId));

          return updatedProposal;
        },
      );

      const provenanceRecordId = await writeAcceptedProvenance({
        storyworldId: proposal.storyworldId,
        canonCommitSha: mergeCommitSha,
        sourcePathId: proposal.pathId,
        sourcePrNumber: proposal.prNumber,
        contributors: provenanceContributors,
        steward,
        decidedAt: mergedPullRequest?.mergedAt
          ? new Date(mergedPullRequest.mergedAt)
          : now,
      });

      logger.info(
        {
          proposalId: proposal.id,
          prNumber: proposal.prNumber,
          mergeCommitSha,
        },
        "Proposal accepted into canon",
      );

      const responsePayload = AcceptProposalResponse.parse({
        proposal: updatedProposal,
        provenanceRecordId: provenanceRecordId ?? 0,
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

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/restrict — steward ends active editorial review
// ---------------------------------------------------------------------------

router.post(
  "/:id/restrict",
  requireAuth,
  requireStewardForProposal,
  async (req, res) => {
    const params = RestrictProposalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid proposal id" });
      return;
    }
    const body = RestrictProposalBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: "Restriction reason must be 2,000 characters or fewer" });
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
      if (!RESTRICT_FROM.has(proposal.state)) {
        res.status(409).json({
          error: `Cannot restrict proposal from state "${proposal.state}"`,
        });
        return;
      }

      const [updated] = await db
        .update(proposalsTable)
        .set({
          state: "restricted",
          decidedAt: new Date(),
          decisionReason: body.data.reason?.trim() || null,
        })
        .where(
          and(
            eq(proposalsTable.id, proposal.id),
            inArray(
              proposalsTable.state,
              ["submitted", "under-review", "returned-with-notes"] as const,
            ),
          ),
        )
        .returning();

      if (!updated) {
        res.status(409).json({
          error: "Proposal state changed concurrently — reload and try again",
        });
        return;
      }

      logger.info({ proposalId: proposal.id }, "Proposal restricted by steward");
      res.json(RestrictProposalResponse.parse(updated));
    } catch (err) {
      req.log.error({ err }, "restrictProposal error");
      res.status(500).json({ error: "Failed to restrict proposal" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/withdraw — proposal author retracts an active submission
// ---------------------------------------------------------------------------

router.post("/:id/withdraw", requireAuth, async (req, res) => {
  const params = WithdrawProposalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid proposal id" });
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
    if (!WITHDRAW_FROM.has(proposal.state)) {
      res.status(409).json({
        error: `Cannot withdraw proposal from state "${proposal.state}"`,
      });
      return;
    }

    // A proposal is a durable GitHub pull request record, so the PR author is
    // the source of truth for ownership. Never trust a caller-provided author
    // or branch name; compare the live PR author to the signed-in user's linked
    // GitHub identity server-side.
    const [worldRows, githubLinkRows] = await Promise.all([
      db
        .select()
        .from(storyworldsTable)
        .where(eq(storyworldsTable.id, proposal.storyworldId))
        .limit(1),
      db
        .select({ githubUsername: userGithubLinksTable.githubUsername })
        .from(userGithubLinksTable)
        .where(eq(userGithubLinksTable.userId, req.session.userId as number))
        .limit(1),
    ]);
    const world = worldRows[0];
    const githubLink = githubLinkRows[0];
    if (!world) {
      res.status(404).json({ error: "Storyworld not found" });
      return;
    }
    if (!githubLink) {
      res.status(403).json({
        error: "Link your GitHub account before withdrawing a submission so ownership can be verified.",
      });
      return;
    }

    let pullRequest: GitHubPullRequest | null;
    try {
      pullRequest = await getGitHubClient().getPullRequest(
        world.repoOwner,
        world.repoName,
        proposal.prNumber,
      );
    } catch (err) {
      logger.error({ err, prNumber: proposal.prNumber }, "GitHub author lookup failed");
      res.status(502).json({ error: "Could not verify the submission author on GitHub" });
      return;
    }

    if (
      !pullRequest?.author ||
      pullRequest.author.login.toLowerCase() !== githubLink.githubUsername.toLowerCase()
    ) {
      res.status(403).json({
        error: "Only the contributor who opened this submission can withdraw it.",
      });
      return;
    }

    const [updated] = await db
      .update(proposalsTable)
      .set({ state: "withdrawn", decidedAt: new Date() })
      .where(
        and(
          eq(proposalsTable.id, proposal.id),
          inArray(
            proposalsTable.state,
            ["draft", "submitted", "under-review", "returned-with-notes"] as const,
          ),
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
      { proposalId: proposal.id, githubUsername: githubLink.githubUsername },
      "Proposal withdrawn by contributor",
    );
    res.json(WithdrawProposalResponse.parse(updated));
  } catch (err) {
    req.log.error({ err }, "withdrawProposal error");
    res.status(500).json({ error: "Failed to withdraw proposal" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/proposals/:id/archive — steward archives a terminal proposal
// ---------------------------------------------------------------------------

router.post(
  "/:id/archive",
  requireAuth,
  requireStewardForProposal,
  async (req, res) => {
    const params = ArchiveProposalParams.safeParse(req.params);
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
      if (!ARCHIVE_FROM.has(proposal.state)) {
        res.status(409).json({
          error: `Cannot archive proposal from state "${proposal.state}"`,
        });
        return;
      }

      const [updated] = await db
        .update(proposalsTable)
        .set({
          state: "archived",
          // Keep the original terminal-decision time when it exists. Archive is
          // filing, not a replacement editorial decision.
          decidedAt: proposal.decidedAt ?? new Date(),
        })
        .where(
          and(
            eq(proposalsTable.id, proposal.id),
            inArray(
              proposalsTable.state,
              [
                "accepted-into-canon",
                "published-alternate",
                "restricted",
                "withdrawn",
              ] as const,
            ),
          ),
        )
        .returning();

      if (!updated) {
        res.status(409).json({
          error: "Proposal state changed concurrently — reload and try again",
        });
        return;
      }

      logger.info({ proposalId: proposal.id }, "Proposal archived by steward");
      res.json(ArchiveProposalResponse.parse(updated));
    } catch (err) {
      req.log.error({ err }, "archiveProposal error");
      res.status(500).json({ error: "Failed to archive proposal" });
    }
  },
);

export default router;
