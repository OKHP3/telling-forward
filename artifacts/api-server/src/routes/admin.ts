/**
 * POST /api/admin/reconcile
 *
 * On-demand reconciliation job: queries GitHub for a storyworld's current
 * branches, commits, and pull requests, then diffs against Postgres and
 * upserts any missing or stale rows.
 *
 * Pattern mirrors the sync_skill_mirror.py approach (Section 9):
 *   - Inventory the canonical source (GitHub)
 *   - Inventory the cache (Postgres)
 *   - Upsert missing/stale rows; update existing rows whose state has drifted
 *   - Log a summary of what changed
 *   - Safe to re-run (idempotent — Section 6.5)
 *
 * Auth: requires `X-Admin-Secret` header matching `ADMIN_SECRET` env var.
 * In production, a missing ADMIN_SECRET disables the endpoint (503).
 */

import { Router, type IRouter } from "express";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  proposalsTable,
  editorQuestionsTable,
} from "@workspace/db";
import { getGitHubClient } from "../lib/github";
import { logger } from "../lib/logger";
import {
  contributorAttributionsForPath,
  indexSavedMoment,
  acceptanceIntentForOperation,
  acceptanceOperationIdFromCommitMessage,
  parseAcceptanceDecisionNote,
  isAcceptanceIntentNote,
  resolveContributor,
  resolveContributorIdentity,
  replacePathMomentMemberships,
  stewardAttribution,
  verifyAcceptanceDecisionNote,
  writeAcceptedProvenance,
} from "../lib/provenance";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Admin secret guard middleware — always fails closed
// ---------------------------------------------------------------------------

function requireAdminSecret(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const secret = process.env["ADMIN_SECRET"];

  if (!secret) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ error: "Admin routes not configured" });
      return;
    }
    // Development: allow without secret but log a warning so it is visible
    logger.warn("ADMIN_SECRET not set — admin routes are unprotected in development");
    next();
    return;
  }

  const provided = req.headers["x-admin-secret"];
  if (provided !== secret) {
    res.status(401).json({ error: "Invalid admin secret" });
    return;
  }
  next();
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
// POST /api/admin/reconcile
// ---------------------------------------------------------------------------

router.post("/reconcile", requireAdminSecret, async (req, res) => {
  const { storyworld_id } = req.body as { storyworld_id?: number };

  if (!storyworld_id || typeof storyworld_id !== "number") {
    res.status(400).json({ error: "storyworld_id (number) is required" });
    return;
  }

  const worlds = await db
    .select()
    .from(storyworldsTable)
    .where(eq(storyworldsTable.id, storyworld_id))
    .limit(1);

  const world = worlds[0];
  if (!world) {
    res.status(404).json({ error: "Storyworld not found" });
    return;
  }

  const { repoOwner: owner, repoName: repo } = world;
  const gh = getGitHubClient();
  const summary: Record<string, number> = {
    branches_fetched: 0,
    paths_upserted: 0,
    paths_state_updated: 0,
    commits_fetched: 0,
    contributions_upserted: 0,
    prs_fetched: 0,
    proposals_upserted: 0,
    editor_questions_upserted: 0,
    provenance_records_upserted: 0,
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Reconcile branches → story_paths
    // -----------------------------------------------------------------------
    const branches = await gh.listBranches(owner, repo);
    summary["branches_fetched"] = branches.length;

    const canonRef = world.canonBranchRef.replace("refs/heads/", "");
    const prs = await gh.listOpenPullRequests(owner, repo);
    summary["prs_fetched"] = prs.length;
    const baseRefByHead = new Map(
      prs.map((pr) => [pr.headRef, pr.baseRef]),
    );

    for (const branch of branches) {
      const isCanon = branch.name === canonRef;
      await db
        .insert(storyPathsTable)
        .values({
          storyworldId: world.id,
          branchRef: branch.name,
          title: branch.name,
          state: isCanon ? "open" : "personal",
        })
        .onConflictDoUpdate({
          target: [storyPathsTable.storyworldId, storyPathsTable.branchRef],
          set: { updatedAt: new Date() },
          // Note: branch-only reconciliation does NOT overwrite state here;
          // PR reconciliation below drives the state for proposed/published paths.
        });
      summary["paths_upserted"] = (summary["paths_upserted"] ?? 0) + 1;
    }

    // -----------------------------------------------------------------------
    // 2. Reconcile only moments introduced by each path. Listing every commit
    // reachable from a branch would incorrectly credit inherited canon work.
    // -----------------------------------------------------------------------
    for (const branch of branches) {
      const pathRows = await db
        .select()
        .from(storyPathsTable)
        .where(
          and(
            eq(storyPathsTable.storyworldId, world.id),
            eq(storyPathsTable.branchRef, branch.name),
          ),
        )
        .limit(1);

      const path = pathRows[0];
      if (!path) continue;

      const baseRef = baseRefByHead.get(branch.name) ?? canonRef;
      if (baseRef === branch.name) continue;
      const commits = await gh.listCommitsBetween(
        owner,
        repo,
        baseRef,
        branch.name,
      );
      summary["commits_fetched"] = (summary["commits_fetched"] ?? 0) + commits.length;

      for (const commit of commits) {
        await indexSavedMoment(world.id, path.id, commit);
        summary["contributions_upserted"] =
          (summary["contributions_upserted"] ?? 0) + 1;
      }
      await replacePathMomentMemberships(
        world.id,
        path.id,
        commits.map((commit) => commit.sha),
      );
    }

    // -----------------------------------------------------------------------
    // 3. Reconcile pull requests → proposals + story_path state corrections
    //
    //    This is where stale state is corrected: a PR that closed or merged
    //    after the last webhook delivery will have its path state and proposal
    //    state updated to reflect reality.
    // -----------------------------------------------------------------------
    for (const pr of prs) {
      const isClosed = pr.state === "closed";
      const pathState = prToPathState(pr.merged, isClosed);
      const proposalState = prToProposalState(pr.state, pr.merged);

      // Terminal events (closed/merged) always apply GitHub's authoritative
      // outcome. Non-terminal events (open PRs) must NOT overwrite editorial
      // states a steward has already set ("under-review", "returned-with-notes")
      // or either terminal path outcome ("published-canon", "published-alternate")
      // that was established by a prior webhook delivery or acceptance.
      // This mirrors the guard in routes/webhooks.ts.
      const isTerminalEvent = isClosed;

      const pathStateSet = isTerminalEvent
        ? drizzleSql`excluded.state`
        : drizzleSql`
            CASE
              WHEN ${storyPathsTable.state} IN ('published-canon', 'published-alternate')
              THEN ${storyPathsTable.state}
              ELSE excluded.state
            END`;

      // Ensure the head branch has a story path with the correct state
      const [path] = await db
        .insert(storyPathsTable)
        .values({
          storyworldId: world.id,
          branchRef: pr.headRef,
          title: pr.headRef,
          state: pathState,
        })
        .onConflictDoUpdate({
          target: [storyPathsTable.storyworldId, storyPathsTable.branchRef],
          set: { state: pathStateSet, updatedAt: new Date() },
        })
        .returning();

      if (!path) continue;
      summary["paths_state_updated"] = (summary["paths_state_updated"] ?? 0) + 1;
      const basePathRows = await db
        .select({ id: storyPathsTable.id })
        .from(storyPathsTable)
        .where(
          and(
            eq(storyPathsTable.storyworldId, world.id),
            eq(storyPathsTable.branchRef, pr.baseRef),
          ),
        )
        .limit(1);
      const basePath = basePathRows[0];
      if (basePath && basePath.id !== path.id) {
        await db
          .update(storyPathsTable)
          .set({ originPathId: basePath.id, updatedAt: new Date() })
          .where(eq(storyPathsTable.id, path.id));
      }

      const decidedAt =
        pr.mergedAt ?? pr.closedAt
          ? new Date((pr.mergedAt ?? pr.closedAt)!)
          : null;

      const proposalStateSet = isTerminalEvent
        ? drizzleSql`excluded.state`
        : drizzleSql`
            CASE
              WHEN ${proposalsTable.state} IN ('under-review', 'returned-with-notes', 'accepted-into-canon')
              THEN ${proposalsTable.state}
              ELSE excluded.state
            END`;
      const decidedAtSet = isTerminalEvent
        ? decidedAt
        : drizzleSql`
            CASE
              WHEN ${proposalsTable.state} IN ('under-review', 'returned-with-notes', 'accepted-into-canon')
              THEN ${proposalsTable.decidedAt}
              ELSE excluded.decided_at
            END`;

      // Upsert proposal; only overwrite state when GitHub's outcome is terminal.
      const [proposal] = await db
        .insert(proposalsTable)
        .values({
          storyworldId: world.id,
          pathId: path.id,
          prNumber: pr.number,
          state: proposalState,
          submittedAt: new Date(pr.createdAt),
          decidedAt,
        })
        .onConflictDoUpdate({
          target: [proposalsTable.storyworldId, proposalsTable.prNumber],
          set: { state: proposalStateSet, decidedAt: decidedAtSet },
        })
        .returning();

      summary["proposals_upserted"] = (summary["proposals_upserted"] ?? 0) + 1;
      if (!proposal) continue;

      // A pull request remains queryable after its source branch is deleted, so
      // it is the reliable reconstruction source for every saved moment,
      // editor question, and accepted-into-canon decision.
      const [details, reviews, comments] = await Promise.all([
        gh.getPullRequest(owner, repo, pr.number),
        gh.listPullRequestReviews(owner, repo, pr.number),
        gh.listPullRequestComments(owner, repo, pr.number),
      ]);
      const acceptedPr = details ?? pr;
      const decisionNote =
        acceptedPr.merged && acceptedPr.mergeCommitSha
          ? comments
              .map((comment) =>
                verifyAcceptanceDecisionNote(
                  comment.body,
                  process.env["GITHUB_WEBHOOK_SECRET"],
                ),
              )
              .find(
                (note) => note?.canonCommitSha === acceptedPr.mergeCommitSha,
              ) ?? null
          : null;
      const mergeRange = acceptedPr.merged && acceptedPr.mergeCommitSha
        ? await gh.getMergeCommitRange(owner, repo, acceptedPr.mergeCommitSha)
        : null;
      const decisionRangeMatchesMerge =
        !decisionNote?.baseCommitSha ||
        !decisionNote.sourceHeadSha ||
        (mergeRange?.baseSha === decisionNote.baseCommitSha &&
          mergeRange.headSha === decisionNote.sourceHeadSha);
      if (!decisionRangeMatchesMerge) {
        logger.warn(
          { prNumber: pr.number, canonCommitSha: acceptedPr.mergeCommitSha },
          "Ignoring acceptance decision whose signed range does not match merge parents",
        );
      }
      const verifiedDecisionNote = decisionRangeMatchesMerge ? decisionNote : null;
      const acceptedRange = acceptedPr.merged
        ? mergeRange
        : { baseSha: pr.baseSha, headSha: pr.headSha };
      const operationId =
        !verifiedDecisionNote && acceptedPr.merged && acceptedPr.mergeCommitSha
          ? acceptanceOperationIdFromCommitMessage(
              await gh.getCommitMessage(owner, repo, acceptedPr.mergeCommitSha),
            )
          : null;
      const intentNote = operationId
        ? acceptanceIntentForOperation(
            comments,
            process.env["GITHUB_WEBHOOK_SECRET"],
            operationId,
            acceptedRange?.headSha ?? "",
          )
        : null;
      const attributionRecord = verifiedDecisionNote ?? intentNote;
      const commits = acceptedRange
        ? await gh.listCommitsBetween(
            owner,
            repo,
            acceptedRange.baseSha,
            acceptedRange.headSha,
          )
        : [];

      for (const commit of commits) {
        await indexSavedMoment(world.id, path.id, commit);
        summary["contributions_upserted"] =
          (summary["contributions_upserted"] ?? 0) + 1;
      }
      if (acceptedRange) {
        await replacePathMomentMemberships(
          world.id,
          path.id,
          commits.map((commit) => commit.sha),
        );
      } else {
        logger.warn(
          { prNumber: pr.number },
          "Skipped destructive membership reconciliation for a non-merge PR",
        );
      }

      for (const review of reviews) {
        if (!review.body.trim()) continue;
        if (parseAcceptanceDecisionNote(review.body)) continue;
        await db
          .insert(editorQuestionsTable)
          .values({
            proposalId: proposal.id,
            reviewCommentId: review.id,
            body: review.body,
            ...(review.submittedAt
              ? { createdAt: new Date(review.submittedAt) }
              : {}),
          })
          .onConflictDoUpdate({
            target: editorQuestionsTable.reviewCommentId,
            set: { body: review.body },
          });
        summary["editor_questions_upserted"] =
          (summary["editor_questions_upserted"] ?? 0) + 1;
      }

      for (const comment of comments) {
        if (!comment.body.trim()) continue;
        if (
          parseAcceptanceDecisionNote(comment.body) ||
          isAcceptanceIntentNote(comment.body)
        ) continue;
        await db
          .insert(editorQuestionsTable)
          .values({
            proposalId: proposal.id,
            reviewCommentId: comment.id,
            body: comment.body,
            createdAt: new Date(comment.createdAt),
          })
          .onConflictDoUpdate({
            target: editorQuestionsTable.reviewCommentId,
            set: { body: comment.body },
          });
        summary["editor_questions_upserted"] =
          (summary["editor_questions_upserted"] ?? 0) + 1;
      }

      if (acceptedPr.merged && acceptedPr.mergeCommitSha) {
        const sourceContributor = acceptedPr.author
          ? await resolveContributor(acceptedPr.author)
          : null;
        const decisionContributors = await Promise.all(
          attributionRecord?.contributors.map((contributor) =>
            resolveContributorIdentity(
              contributor.identity,
              contributor.displayName,
            ),
          ) ?? [],
        );
        const savedMomentContributors = await contributorAttributionsForPath(
          path.id,
        );
        const notedSteward = attributionRecord?.stewardGithubIdentity?.startsWith(
          "github:",
        )
          ? {
              login: attributionRecord.stewardGithubIdentity.slice("github:".length),
              displayName: null,
            }
          : null;
        const steward = await stewardAttribution(
          world.id,
          notedSteward ?? acceptedPr.mergedBy,
        );
        await writeAcceptedProvenance({
          storyworldId: world.id,
          canonCommitSha: acceptedPr.mergeCommitSha,
          sourcePathId: path.id,
          sourcePrNumber: acceptedPr.number,
          contributors: [
            ...savedMomentContributors,
            ...decisionContributors.filter(
              (value): value is Exclude<typeof value, null> => value !== null,
            ),
            ...(sourceContributor ? [sourceContributor] : []),
          ],
          steward,
          decidedAt: verifiedDecisionNote?.decidedAt
            ? new Date(verifiedDecisionNote.decidedAt)
            : intentNote?.intendedAt
              ? new Date(intentNote.intendedAt)
            : acceptedPr.mergedAt
            ? new Date(acceptedPr.mergedAt)
            : (decidedAt ?? new Date()),
        });
        summary["provenance_records_upserted"] =
          (summary["provenance_records_upserted"] ?? 0) + 1;
      }
    }

    logger.info(
      { storyworldId: storyworld_id, owner, repo, summary },
      "Reconciliation complete",
    );
    res.json({ ok: true, storyworld_id, owner, repo, summary });
  } catch (err) {
    logger.error({ err, storyworldId: storyworld_id }, "Reconciliation error");
    res.status(500).json({ error: "Reconciliation failed" });
  }
});

export default router;
