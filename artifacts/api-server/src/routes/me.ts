import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  contributionsTable,
  contributorsTable,
  storyPathsTable,
  storyworldsTable,
} from "@workspace/db";
import { ListMyContributionsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/me/contributions
// Authenticated contributor activity, limited to durable narration records
// created under the current platform identity.
router.get("/contributions", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const rows = await db
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

    res.json(
      ListMyContributionsResponse.parse(
        rows.map((row) => ({ ...row, status: "accepted" as const })),
      ),
    );
  } catch (err) {
    req.log.error({ err, userId }, "listMyContributions DB error");
    res.status(500).json({ error: "Failed to load your contributions" });
  }
});

export default router;