import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  db,
  contributorsTable,
  contributorNotificationsTable,
  userGithubLinksTable,
} from "@workspace/db";
import { ListContributorNotificationsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function contributorIdsForUser(userId: number): Promise<number[]> {
  const [platformRows, githubRows] = await Promise.all([
    db
      .select({ id: contributorsTable.id })
      .from(contributorsTable)
      .where(eq(contributorsTable.platformIdentity, `platform:${userId}`)),
    db
      .select({ githubUsername: userGithubLinksTable.githubUsername })
      .from(userGithubLinksTable)
      .where(eq(userGithubLinksTable.userId, userId))
      .limit(1),
  ]);
  const linkedGithubRows = githubRows[0]?.githubUsername
    ? await db
        .select({ id: contributorsTable.id })
        .from(contributorsTable)
        .where(
          eq(
            contributorsTable.githubIdentity,
            `github:${githubRows[0].githubUsername.toLowerCase()}`,
          ),
        )
    : [];
  return [
    ...new Set([
      ...platformRows.map((row) => row.id),
      ...linkedGithubRows.map((row) => row.id),
    ]),
  ];
}

// GET /api/me/notifications/unread-count — lightweight poll for the nav badge.
router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const contributorIds = await contributorIdsForUser(userId);
    if (contributorIds.length === 0) {
      res.json({ count: 0 });
      return;
    }
    const rows = await db
      .select({ id: contributorNotificationsTable.id })
      .from(contributorNotificationsTable)
      .where(
        and(
          isNull(contributorNotificationsTable.readAt),
          or(
            ...contributorIds.map((id) =>
              eq(contributorNotificationsTable.contributorId, id),
            ),
          ),
        ),
      );
    res.json({ count: rows.length });
  } catch (err) {
    req.log.error({ err, userId }, "unread notifications count error");
    res.status(500).json({ error: "Failed to load notification count" });
  }
});

// GET /api/me/notifications — the calm, contributor-facing inbox.
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const contributorIds = await contributorIdsForUser(userId);
    if (contributorIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select()
      .from(contributorNotificationsTable)
      .where(
        or(
          ...contributorIds.map((id) =>
            eq(contributorNotificationsTable.contributorId, id),
          ),
        ),
      )
      .orderBy(desc(contributorNotificationsTable.createdAt));
    res.json(ListContributorNotificationsResponse.parse(rows));
  } catch (err) {
    req.log.error({ err, userId }, "list contributor notifications error");
    res.status(500).json({ error: "Failed to load your notifications" });
  }
});

// POST /api/me/notifications/:id/read — only the owning contributor can read.
router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const notificationId = Number(req.params.id);
  if (!userId || !Number.isSafeInteger(notificationId)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  try {
    const contributorIds = await contributorIdsForUser(userId);
    if (contributorIds.length === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    const [updated] = await db
      .update(contributorNotificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(contributorNotificationsTable.id, notificationId),
          or(
            ...contributorIds.map((id) =>
              eq(contributorNotificationsTable.contributorId, id),
            ),
          ),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err, userId, notificationId }, "mark notification read error");
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;