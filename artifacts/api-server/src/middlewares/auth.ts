import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Middleware that rejects unauthenticated requests with 401.
 * Use on all write-path routes.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Middleware that rejects requests from unverified accounts with 403.
 * Must be placed after requireAuth (it assumes userId is set).
 * Performs a DB lookup so the check is always current.
 */
export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [user] = await db
    .select({ emailVerified: usersTable.emailVerified })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session refers to a deleted account" });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: "Email verification required",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  next();
}

/**
 * Middleware that populates req.session.userId if a session exists,
 * but does not reject unauthenticated requests.
 * Use on read routes that return richer data for logged-in users.
 */
export function optionalAuth(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Session is already populated by express-session; nothing extra needed.
  next();
}
