/**
 * Steward authority middleware (Section 6.4).
 *
 * Enforces steward role at the application layer — separate from any GitHub
 * branch-protection check. A steward's product authority (canon policy,
 * editorial decisions) is broader than "can merge a PR" and must be
 * reasoned about independently.
 *
 * Usage:
 *   router.post("/:id/accept", requireAuth, requireStewardForProposal, handler);
 */

import { type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db, stewardsTable, proposalsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Checks that req.session.userId is a steward of the given storyworld.
 * Responds 403 if not; calls next() if yes.
 */
export async function requireStewardFor(
  req: Request,
  res: Response,
  next: NextFunction,
  storyworldId: number,
): Promise<void> {
  const userId = req.session.userId!; // requireAuth must run first

  const rows = await db
    .select({ id: stewardsTable.id })
    .from(stewardsTable)
    .where(
      and(
        eq(stewardsTable.storyworldId, storyworldId),
        eq(stewardsTable.userId, userId),
      ),
    )
    .limit(1);

  if (!rows.length) {
    logger.warn(
      { userId, storyworldId },
      "Steward check failed: user is not a steward of this storyworld",
    );
    res.status(403).json({ error: "Not a steward for this storyworld" });
    return;
  }

  next();
}

/**
 * Middleware factory: extract storyworldId from req.params.id (the storyworld route param).
 */
export function requireStewardForStoryworld(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = req.params["id"];
  const storyworldId = parseInt(Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? ""), 10);
  if (isNaN(storyworldId)) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return Promise.resolve();
  }
  return requireStewardFor(req, res, next, storyworldId);
}

/**
 * Middleware: look up the proposal's storyworld, then check steward role.
 * Used on proposal-level actions where :id is the proposal id.
 */
export async function requireStewardForProposal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawId = req.params["id"];
  const proposalId = parseInt(Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? ""), 10);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }

  const rows = await db
    .select({ storyworldId: proposalsTable.storyworldId })
    .from(proposalsTable)
    .where(eq(proposalsTable.id, proposalId))
    .limit(1);

  if (!rows.length) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }

  return requireStewardFor(req, res, next, rows[0]!.storyworldId);
}
