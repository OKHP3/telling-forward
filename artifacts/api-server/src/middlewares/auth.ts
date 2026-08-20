import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";

/**
 * JIT-provision a local user account for a Clerk user seen for the first time.
 *
 * Fetches the Clerk user profile to get their verified email and display name,
 * then either:
 * - Links an existing local account that shares the same email address
 *   (silent migration for bcrypt-era users who sign in via Clerk), or
 * - Creates a new local account (Clerk-only, no bcrypt password hash).
 *
 * Called inside requireAuth so every protected route gets a local user ID
 * without the frontend needing a separate provision step.
 */
async function jitProvisionLocalUser(
  clerkUserId: string,
  log?: { error: (obj: unknown, msg: string) => void },
): Promise<{ id: number } | null> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    const email = primaryEmail?.emailAddress?.toLowerCase();
    if (!email) {
      log?.error({ clerkUserId }, "Clerk user has no primary email address");
      return null;
    }

    const displayName =
      [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      clerkUser.username ||
      email.split("@")[0]!;

    // Check whether a legacy account with this email already exists.
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      // Link the existing bcrypt account to this Clerk identity.
      const [linked] = await db
        .update(usersTable)
        .set({ clerkId: clerkUserId, emailVerified: true })
        .where(eq(usersTable.id, existing.id))
        .returning({ id: usersTable.id });
      return linked ?? null;
    }

    // First-ever sign-in — create a new local account with no password hash.
    const [created] = await db
      .insert(usersTable)
      .values({ email, displayName, emailVerified: true, clerkId: clerkUserId })
      .returning({ id: usersTable.id });
    return created ?? null;
  } catch (err) {
    log?.error({ err, clerkUserId }, "JIT provisioning failed");
    return null;
  }
}

/**
 * Middleware that rejects unauthenticated requests with 401.
 *
 * Reads the Clerk JWT from the incoming request (set by clerkMiddleware in
 * app.ts), looks up the corresponding local user, and bridges the Clerk
 * identity to the numeric req.session.userId that all downstream route
 * handlers rely on.  First-time Clerk users are provisioned transparently.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Password-authenticated contributors already have a server-side session.
  // Preserve that path before attempting the Clerk bridge so the API's
  // login/register endpoints remain valid for the web reader.
  if (req.session.userId) {
    next();
    return;
  }

  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (!user) {
    const provisioned = await jitProvisionLocalUser(clerkUserId, req.log as { error: (obj: unknown, msg: string) => void });
    if (!provisioned) {
      res.status(401).json({ error: "Could not provision local account" });
      return;
    }
    user = provisioned;
  }

  // Bridge: downstream handlers read req.session.userId for the numeric PK.
  req.session.userId = user.id;
  next();
}

/**
 * Middleware that rejects requests from users whose email is not verified.
 * Must be placed after requireAuth.
 *
 * Clerk enforces email verification before activating accounts, so any
 * user who has authenticated via Clerk will have emailVerified = true in
 * the local account row (set during JIT provisioning).
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
 * Middleware that does not reject unauthenticated requests.
 * Use on read routes that return richer data for logged-in users.
 * Clerk auth state is available via getAuth(req) if needed.
 */
export function optionalAuth(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
}
