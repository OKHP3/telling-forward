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
  contributionsTable,
  proposalsTable,
} from "@workspace/db";
import { getGitHubClient } from "../lib/github";
import { logger } from "../lib/logger";

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
// ---------------------------------------------------------------------------

function prToPathState(
  merged: boolean,
  closed: boolean,
): "proposed" | "published-alternate" {
  if (merged || closed) return "published-alternate";
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
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Reconcile branches → story_paths
    // -----------------------------------------------------------------------
    const branches = await gh.listBranches(owner, repo);
    summary["branches_fetched"] = branches.length;

    const canonRef = world.canonBranchRef.replace("refs/heads/", "");

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
    // 2. Reconcile commits → contributions (per branch, capped at 3 pages)
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

      const commits = await gh.listCommitsForBranch(owner, repo, branch.name, 3);
      summary["commits_fetched"] = (summary["commits_fetched"] ?? 0) + commits.length;

      for (const commit of commits) {
        const [title = commit.sha.slice(0, 7), ...rest] =
          commit.message.split("\n");
        const summaryText = rest.filter(Boolean).join("\n").trim() || null;

        const inserted = await db
          .insert(contributionsTable)
          .values({
            storyworldId: world.id,
            pathId: path.id,
            commitSha: commit.sha,
            title: title.trim(),
            summary: summaryText,
            createdAt: new Date(commit.timestamp),
          })
          .onConflictDoNothing()
          .returning({ id: contributionsTable.id });

        if (inserted.length > 0) {
          summary["contributions_upserted"] =
            (summary["contributions_upserted"] ?? 0) + 1;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3. Reconcile pull requests → proposals + story_path state corrections
    //
    //    This is where stale state is corrected: a PR that closed or merged
    //    after the last webhook delivery will have its path state and proposal
    //    state updated to reflect reality.
    // -----------------------------------------------------------------------
    const prs = await gh.listOpenPullRequests(owner, repo);
    summary["prs_fetched"] = prs.length;

    for (const pr of prs) {
      const isClosed = pr.state === "closed";
      const pathState = prToPathState(pr.merged, isClosed);
      const proposalState = prToProposalState(pr.state, pr.merged);

      // Terminal events (closed/merged) always apply GitHub's authoritative
      // outcome. Non-terminal events (open PRs) must NOT overwrite editorial
      // states a steward has already set ("under-review", "returned-with-notes")
      // or a terminal outcome ("accepted-into-canon") that was established by a
      // prior webhook delivery. This mirrors the guard in routes/webhooks.ts.
      const isTerminalEvent = isClosed;

      const pathStateSet = isTerminalEvent
        ? drizzleSql`excluded.state`
        : drizzleSql`
            CASE
              WHEN ${storyPathsTable.state} IN ('published-alternate')
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
      await db
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
        });

      summary["proposals_upserted"] = (summary["proposals_upserted"] ?? 0) + 1;
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
