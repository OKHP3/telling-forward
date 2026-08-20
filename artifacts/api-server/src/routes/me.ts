import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  contributionsTable,
  contributorsTable,
  proposalsTable,
  storyPathsTable,
  storyworldsTable,
  userGithubLinksTable,
} from "@workspace/db";
import { ListMyContributionsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/me/contributions
// Authenticated contributor activity. Narrations belong to a platform
// identity; imported PR submissions appear only when their explicit
// contributor link matches the user's explicitly linked GitHub identity.
router.get("/contributions", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const narrationRowsPromise = db
      .select({
        id: contributionsTable.id,
        storyworldId: contributionsTable.storyworldId,
        storyworldTitle: storyworldsTable.title,
        pathId: contributionsTable.pathId,
        pathTitle: storyPathsTable.title,
        title: contributionsTable.title,
        submittedAt: contributionsTable.createdAt,
      })
      .from(contributionsTable)
      .innerJoin(
        contributorsTable,
        eq(contributionsTable.contributorId, contributorsTable.id),
      )
      .innerJoin(
        storyworldsTable,
        eq(contributionsTable.storyworldId, storyworldsTable.id),
      )
      .innerJoin(
        storyPathsTable,
        and(
          eq(contributionsTable.pathId, storyPathsTable.id),
          eq(contributionsTable.storyworldId, storyPathsTable.storyworldId),
        ),
      )
      .where(
        eq(
          contributorsTable.platformIdentity,
          `platform:${userId}`,
        ),
      )
      .orderBy(desc(contributionsTable.createdAt));

    const proposalRowsPromise = db
      .select({
        id: proposalsTable.id,
        storyworldId: proposalsTable.storyworldId,
        storyworldTitle: storyworldsTable.title,
        pathId: proposalsTable.pathId,
        pathTitle: storyPathsTable.title,
        prNumber: proposalsTable.prNumber,
        state: proposalsTable.state,
        submittedAt: proposalsTable.submittedAt,
      })
      .from(proposalsTable)
      .innerJoin(
        contributorsTable,
        eq(proposalsTable.contributorId, contributorsTable.id),
      )
      .innerJoin(
        userGithubLinksTable,
        eq(proposalsTable.githubUserId, userGithubLinksTable.githubUserId),
      )
      .innerJoin(
        storyworldsTable,
        eq(proposalsTable.storyworldId, storyworldsTable.id),
      )
      .innerJoin(
        storyPathsTable,
        and(
          eq(proposalsTable.pathId, storyPathsTable.id),
          eq(proposalsTable.storyworldId, storyPathsTable.storyworldId),
        ),
      )
      .where(
        and(
          eq(userGithubLinksTable.userId, userId),
          inArray(proposalsTable.state, [
            "submitted",
            "under-review",
            "returned-with-notes",
          ]),
        ),
      )
      .orderBy(desc(proposalsTable.submittedAt));

    const [narrationRows, proposalRows] = await Promise.all([
      narrationRowsPromise,
      proposalRowsPromise,
    ]);

    const rows = [
      ...narrationRows.map((row) => ({
        ...row,
        source: "narration" as const,
        status: "accepted" as const,
      })),
      ...proposalRows.map((row) => ({
        id: row.id,
        storyworldId: row.storyworldId,
        storyworldTitle: row.storyworldTitle,
        pathId: row.pathId,
        pathTitle: row.pathTitle,
        title: `Submission #${row.prNumber}`,
        submittedAt: row.submittedAt,
        source: "proposal" as const,
        status:
          row.state === "returned-with-notes"
            ? ("returned" as const)
            : ("pending" as const),
      })),
    ].sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime());

    res.json(
      ListMyContributionsResponse.parse(
        rows,
      ),
    );
  } catch (err) {
    req.log.error({ err, userId }, "listMyContributions DB error");
    res.status(500).json({ error: "Failed to load your contributions" });
  }
});

export default router;