import { Router, type IRouter } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  contributionsTable,
  proposalsTable,
} from "@workspace/db";
import {
  GetStoryworldParams,
  ListStoryPathsParams,
  ListContributionsParams,
  ListStoryworldProposalsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireStewardForStoryworld } from "../middlewares/steward";

const router: IRouter = Router();

// GET /api/storyworlds
router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(storyworldsTable)
      .orderBy(desc(storyworldsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listStoryworlds DB error");
    res.status(500).json({ error: "Failed to load storyworlds" });
  }
});

// GET /api/storyworlds/:id
router.get("/:id", async (req, res) => {
  const params = GetStoryworldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(storyworldsTable)
      .where(eq(storyworldsTable.id, params.data.id))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Storyworld not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "getStoryworld DB error");
    res.status(500).json({ error: "Failed to load storyworld" });
  }
});

// GET /api/storyworlds/:id/paths
router.get("/:id/paths", async (req, res) => {
  const params = ListStoryPathsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(storyPathsTable)
      .where(eq(storyPathsTable.storyworldId, params.data.id))
      .orderBy(desc(storyPathsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listStoryPaths DB error");
    res.status(500).json({ error: "Failed to load story paths" });
  }
});

// GET /api/storyworlds/:id/paths/:pathId/contributions
router.get("/:id/paths/:pathId/contributions", async (req, res) => {
  const params = ListContributionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld or path id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(contributionsTable)
      .where(
        and(
          eq(contributionsTable.storyworldId, params.data.id),
          eq(contributionsTable.pathId, params.data.pathId),
        ),
      )
      .orderBy(asc(contributionsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listContributions DB error");
    res.status(500).json({ error: "Failed to load contributions" });
  }
});

// GET /api/storyworlds/:id/proposals — steward dashboard data
router.get(
  "/:id/proposals",
  requireAuth,
  requireStewardForStoryworld,
  async (req, res) => {
    const params = ListStoryworldProposalsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid storyworld id" });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.storyworldId, params.data.id))
        .orderBy(desc(proposalsTable.submittedAt));
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "listStoryworldProposals DB error");
      res.status(500).json({ error: "Failed to load proposals" });
    }
  },
);

export default router;
