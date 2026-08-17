import { type Request, type Response, type NextFunction } from "express";

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
