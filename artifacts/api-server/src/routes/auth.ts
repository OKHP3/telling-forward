import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import rateLimit from "express-rate-limit";
import { db, usersTable, userGithubLinksTable, emailVerificationsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  LoginResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } from "../lib/email";
import { createRateLimitRedisStore } from "../lib/rate-limit-redis";
import { destroyUserSessions } from "../lib/session";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiters (IP-based, Redis-backed when REDIS_URL is configured)
//
// These provide a fast early rejection for obviously abusive IPs but are NOT
// the primary lockout mechanism. The primary login lockout remains account
// based and is stored in PostgreSQL.
//
// Every limiter has an endpoint-specific RedisStore but they all share the
// single ioredis connection created in lib/rate-limit-redis.ts. In development
// and tests without REDIS_URL, express-rate-limit falls back to MemoryStore;
// production fails during bootstrap rather than silently using that fallback.
// ---------------------------------------------------------------------------

function authRateLimit(
  prefix: string,
  options: Parameters<typeof rateLimit>[0],
) {
  const store = createRateLimitRedisStore(prefix);

  return rateLimit({
    ...options,
    ...(store ? { store } : {}),
    // If Redis fails after startup, reject rather than silently bypassing a
    // sign-in safeguard. The global Express error handler will surface 5xx.
    passOnStoreError: false,
  });
}

/** 10 login attempts per IP per 15 minutes (supplemental to account lockout) */
const loginLimiter = authRateLimit("telling-forward:rate-limit:login:", {
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7", // RateLimit-* + Retry-After headers (RFC 9110)
  legacyHeaders: false,
  message: { error: "Too many login attempts — please try again in 15 minutes" },
});

/** 5 registration attempts per IP per hour */
const registerLimiter = authRateLimit("telling-forward:rate-limit:register:", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts — please try again later" },
});

// ---------------------------------------------------------------------------
// Account-level login lockout constants
//
// After LOCKOUT_THRESHOLD consecutive wrong-password attempts the account is
// locked for LOCKOUT_DURATION_MS. The lock is stored in the database so it
// survives server restarts and is shared across all instances.
// ---------------------------------------------------------------------------
const LOCKOUT_THRESHOLD = 10;          // failed attempts before locking
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const BCRYPT_ROUNDS = 12;

/**
 * Precomputed 12-round bcrypt hash used when a login attempt references an
 * email that does not exist. bcrypt.compare() against this hash runs the full
 * cost function, making the response indistinguishable in timing from a
 * wrong-password attempt, preventing email enumeration.
 *
 * Value: bcrypt.hash('__dummy_password_for_enumeration_protection__', 12)
 */
const DUMMY_HASH =
  "$2b$12$SMCac2JC2kOpV3ghfapoQOo6utxALm8iJ3UHNVS47spex33LMiduS";

/** Generate a URL-safe 32-byte random verification token (64 hex chars). */
function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a password reset token pair.
 * @returns rawToken  — sent to the user in the email URL (never stored)
 * @returns tokenHash — SHA-256 digest stored in the database
 */
function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/** Hash an incoming raw reset token for safe DB lookup. */
function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Rotate the anonymous session identifier before attaching an authenticated
 * contributor. This prevents a session identifier observed before sign-in
 * from remaining valid after a privilege change.
 */
function establishAuthenticatedSession(req: Request, userId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.session.userId = userId;
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }
        resolve();
      });
    });
  });
}

/** POST /api/auth/register — create a new platform account */
router.post("/register", registerLimiter, async (req, res) => {
  // Fail fast in production when no mail transport is configured so we never
  // create an unverifiable account that is permanently locked out of submissions.
  if (process.env["NODE_ENV"] === "production" && !isEmailConfigured()) {
    res.status(503).json({
      error: "Email service not configured — contact the platform administrator",
    });
    return;
  }

  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { email, password, displayName } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(usersTable)
    .values({ email: email.toLowerCase(), passwordHash, displayName })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      emailVerified: usersTable.emailVerified,
      createdAt: usersTable.createdAt,
    });

  // Create an email verification token (expires in 24 hours)
  const token = generateVerificationToken();
  await db.insert(emailVerificationsTable).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Send verification email — non-fatal if sending fails; user can resend
  try {
    await sendVerificationEmail(user.email, token);
  } catch (emailErr) {
    req.log.error({ err: emailErr, userId: user.id }, "Failed to send verification email");
  }

  try {
    await establishAuthenticatedSession(req, user.id);
  } catch (sessionError) {
    req.log.error({ err: sessionError, userId: user.id }, "session establishment failed");
    res.status(500).json({ error: "Could not start your session" });
    return;
  }

  res.status(201).json({ user });
});

/** POST /api/auth/login — authenticate and create a session */
router.post("/login", loginLimiter, async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    // Run full 12-round bcrypt cost against the precomputed dummy hash so
    // absent-user timing matches wrong-password timing (prevents enumeration).
    await bcrypt.compare(password, DUMMY_HASH);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // ---------------------------------------------------------------------------
  // Account-level lockout check (database-backed, survives restarts)
  // ---------------------------------------------------------------------------
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 1000,
    );
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({
      error:
        "Account temporarily locked due to too many failed sign-in attempts — please try again later",
    });
    return;
  }

  // Clerk-provisioned users have no local password hash — treat as invalid credentials.
  if (!user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Atomically increment the failure counter entirely within the database.
    // Using sql`failed_login_attempts + 1` means the DB evaluates the
    // expression against the current committed row value after acquiring a
    // write lock, so two concurrent wrong-password requests each produce a
    // distinct increment — no lost-update race.
    //
    // The WHERE guard (locked_until IS NULL OR locked_until <= NOW()) is also
    // evaluated atomically: if a concurrent request just set the lock, this
    // UPDATE matches 0 rows and we still return 401 (the lock is in effect).
    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: sql`failed_login_attempts + 1`,
        lockedUntil: sql`
          CASE
            WHEN failed_login_attempts + 1 >= ${LOCKOUT_THRESHOLD}
            THEN NOW() + (${String(LOCKOUT_DURATION_MS)} || ' milliseconds')::interval
            ELSE locked_until
          END`,
      })
      .where(
        and(
          eq(usersTable.id, user.id),
          // Do not overwrite an active lock that a concurrent request just set.
          sql`(locked_until IS NULL OR locked_until <= NOW())`,
        ),
      );

    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Successful login — clear any accumulated failure state.
  // Simple unconditional write; no read-modify-write race here.
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await db
      .update(usersTable)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, user.id));
  }

  try {
    await establishAuthenticatedSession(req, user.id);
  } catch (sessionError) {
    req.log.error({ err: sessionError, userId: user.id }, "session establishment failed");
    res.status(500).json({ error: "Could not start your session" });
    return;
  }

  res.json(
    LoginResponse.parse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    }),
  );
});

/** POST /api/auth/logout — destroy the current session */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "session destroy failed");
      res.status(500).json({ error: "Could not log out" });
      return;
    }
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

/** GET /api/auth/me — return the current user (requires session) */
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      emailVerified: usersTable.emailVerified,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session refers to a deleted account" });
    return;
  }

  const [githubLink] = await db
    .select({
      githubUsername: userGithubLinksTable.githubUsername,
      githubEmail: userGithubLinksTable.githubEmail,
      linkedAt: userGithubLinksTable.linkedAt,
    })
    .from(userGithubLinksTable)
    .where(eq(userGithubLinksTable.userId, user.id))
    .limit(1);

  res.json(
    GetMeResponse.parse({
      user,
      github: githubLink ?? null,
    }),
  );
});

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/verify-email?token=...
 * Exchanges a verification token for a verified account.
 * Safe to call without an active session (e.g. from email link in any browser).
 */
router.get("/verify-email", async (req, res) => {
  const token = typeof req.query["token"] === "string" ? req.query["token"] : null;
  if (!token) {
    res.status(400).json({ error: "token query parameter is required" });
    return;
  }

  const now = new Date();

  const [verification] = await db
    .select()
    .from(emailVerificationsTable)
    .where(
      and(
        eq(emailVerificationsTable.token, token),
        gt(emailVerificationsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!verification) {
    res.status(400).json({ error: "Verification link is invalid or has expired" });
    return;
  }

  // Mark the user as verified and delete the token atomically
  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ emailVerified: true })
      .where(eq(usersTable.id, verification.userId));

    await tx
      .delete(emailVerificationsTable)
      .where(eq(emailVerificationsTable.userId, verification.userId));
  });

  req.log.info({ userId: verification.userId }, "Email verified");
  res.json({ ok: true, message: "Email verified successfully" });
});

/** 3 resend requests per IP per hour — prevents email flooding */
const resendLimiter = authRateLimit("telling-forward:rate-limit:resend-verification:", {
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many resend requests — please try again later" },
});

/**
 * POST /api/auth/resend-verification
 * Re-sends the verification email for the logged-in user.
 */
router.post("/resend-verification", resendLimiter, requireAuth, async (req, res) => {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, emailVerified: usersTable.emailVerified })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session refers to a deleted account" });
    return;
  }

  if (user.emailVerified) {
    res.status(400).json({ error: "Email address is already verified" });
    return;
  }

  // Fail fast in production when no mail transport is configured
  if (process.env["NODE_ENV"] === "production" && !isEmailConfigured()) {
    res.status(503).json({
      error: "Email service not configured — contact the platform administrator",
    });
    return;
  }

  // Replace any existing tokens for this user with a fresh one
  await db
    .delete(emailVerificationsTable)
    .where(eq(emailVerificationsTable.userId, user.id));

  const token = generateVerificationToken();
  await db.insert(emailVerificationsTable).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  try {
    await sendVerificationEmail(user.email, token);
  } catch (emailErr) {
    req.log.error({ err: emailErr, userId: user.id }, "Failed to resend verification email");
    res.status(502).json({ error: "Failed to send verification email — please try again" });
    return;
  }

  res.json({ ok: true, message: "Verification email sent" });
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** 5 forgot-password requests per IP per hour — limits token generation rate */
const forgotPasswordLimiter = authRateLimit("telling-forward:rate-limit:forgot-password:", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many password reset requests — please try again later" },
});

/** 5 reset attempts per IP per hour — limits brute-force on the token */
const resetPasswordLimiter = authRateLimit("telling-forward:rate-limit:reset-password:", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many password reset attempts — please try again later" },
});

/**
 * POST /api/auth/forgot-password
 * Accepts an email address, creates a 1-hour reset token, and sends a
 * password reset link.  Always returns 200 regardless of whether the email
 * exists in the database — this prevents email-enumeration attacks.
 */
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  // Normalise and basic-validate the email without revealing account existence.
  const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
  if (!isValidEmail) {
    // Still 200 — callers must not be able to enumerate valid emails.
    res.json({ ok: true, message: "If that email is registered you will receive a reset link shortly" });
    return;
  }
  const email = rawEmail;

  // Always respond 200 before doing any work that could leak timing info
  // about whether the account exists.
  res.json({ ok: true, message: "If that email is registered you will receive a reset link shortly" });

  // --- background: look up user, create token, send email ---
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) return; // no account — silently done

    if (process.env["NODE_ENV"] === "production" && !isEmailConfigured()) {
      req.log.error({ email }, "Forgot-password: email service not configured");
      return;
    }

    // Generate a token pair: raw token for the email URL, hash for the DB.
    // The raw token is never stored — a DB read cannot yield a usable credential.
    const { rawToken, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Atomically replace any existing token for this user via an upsert on the
    // UNIQUE (user_id) constraint. Two concurrent forgot-password requests will
    // serialize at the DB level; only one token is ever live per account.
    await db
      .insert(passwordResetTokensTable)
      .values({ userId: user.id, tokenHash, expiresAt })
      .onConflictDoUpdate({
        target: passwordResetTokensTable.userId,
        set: { tokenHash, expiresAt, createdAt: new Date() },
      });

    await sendPasswordResetEmail(user.email, rawToken);
  } catch (err) {
    req.log.error({ err }, "Forgot-password background processing failed");
  }
});

/**
 * POST /api/auth/reset-password
 * Validates a reset token and replaces the user's password.
 * The token is single-use and deleted immediately on success.
 * Returns 400 for expired/invalid tokens; does not reveal which.
 */
router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const rawToken = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!rawToken) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Hash the incoming raw token before any DB access — the stored value is
  // always the digest, never the credential itself.
  const tokenHash = hashResetToken(rawToken);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Atomically consume the token and update the password inside one
  // transaction. The DELETE…RETURNING is the critical section: only one
  // concurrent request can successfully delete a given token_hash row.
  // The second concurrent request gets an empty .returning() result and
  // returns 400 without touching the password — closing the TOCTOU race.
  let resetUserId: number | undefined;

  await db.transaction(async (tx) => {
    const [consumed] = await tx
      .delete(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.tokenHash, tokenHash),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      )
      .returning({ userId: passwordResetTokensTable.userId });

    if (!consumed) return; // invalid or expired — nothing to do

    resetUserId = consumed.userId;

    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, consumed.userId));
  });

  if (!resetUserId) {
    res.status(400).json({ error: "Reset link is invalid or has expired" });
    return;
  }

  try {
    await destroyUserSessions(resetUserId);
  } catch (err) {
    req.log.error(
      { err, userId: resetUserId },
      "Password reset completed but session invalidation failed",
    );
    res.status(500).json({ error: "Password updated but active sessions could not be ended" });
    return;
  }

  req.log.info({ userId: resetUserId }, "Password reset completed");
  res.json({ ok: true, message: "Password updated successfully" });
});

// ---------------------------------------------------------------------------
// GitHub OAuth account linking (optional, post-signup)
// Requires env vars: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_OAUTH_CALLBACK_URL
// ---------------------------------------------------------------------------

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_OAUTH_CALLBACK_URL =
  process.env.GITHUB_OAUTH_CALLBACK_URL ??
  "http://localhost:3000/api/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "/";

/**
 * GET /api/auth/github/authorize
 * Starts the GitHub OAuth flow to link a GitHub account.
 * The user must already be logged in. Redirects to GitHub.
 *
 * Session cookie is SameSite=Lax (not Strict) so it is included on
 * GitHub's top-level redirect back to /callback. The oauthState value
 * stored in the session provides CSRF protection.
 */
router.get("/github/authorize", requireAuth, (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    res.status(503).json({ error: "GitHub linking is not configured" });
    return;
  }

  const state = crypto.randomUUID();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_OAUTH_CALLBACK_URL,
    scope: "read:user user:email",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after the user authorizes the app.
 * Links the GitHub identity to the current platform account.
 * Does NOT store the OAuth access token (the sync layer uses the platform PAT).
 */
router.get("/github/callback", requireAuth, async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    req.log.warn({ error }, "GitHub OAuth denied by user");
    res.redirect(`${FRONTEND_URL}?github_link=denied`);
    return;
  }

  if (!state || state !== req.session.oauthState) {
    res.status(400).json({ error: "Invalid OAuth state — possible CSRF" });
    return;
  }
  delete req.session.oauthState;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.status(503).json({ error: "GitHub linking is not configured" });
    return;
  }

  // Exchange code for access token (token is used only to fetch the user profile)
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_OAUTH_CALLBACK_URL,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    req.log.error({ tokenError: tokenData.error }, "GitHub token exchange failed");
    res.redirect(`${FRONTEND_URL}?github_link=error`);
    return;
  }

  // Fetch GitHub user profile — token used here only, NOT stored
  const ghUserRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  const ghUser = (await ghUserRes.json()) as {
    id?: number;
    login?: string;
    email?: string | null;
  };

  if (!ghUser.id || !ghUser.login) {
    req.log.error({ ghUser }, "GitHub user profile missing id or login");
    res.redirect(`${FRONTEND_URL}?github_link=error`);
    return;
  }

  const githubUserId = String(ghUser.id);
  const userId = req.session.userId!;

  // Check whether this GitHub account is already linked to a *different* platform user.
  // If so, we cannot link it here — a GitHub identity must be unique across the platform.
  const [existingLink] = await db
    .select({ userId: userGithubLinksTable.userId })
    .from(userGithubLinksTable)
    .where(eq(userGithubLinksTable.githubUserId, githubUserId))
    .limit(1);

  if (existingLink && existingLink.userId !== userId) {
    req.log.warn(
      { githubUserId, requestingUserId: userId, owningUserId: existingLink.userId },
      "GitHub account already linked to a different platform user",
    );
    res.redirect(`${FRONTEND_URL}?github_link=already_claimed`);
    return;
  }

  // Upsert the link — identity only, no token persisted.
  // Conflict target is user_id (current user re-linking or updating their GitHub identity).
  await db
    .insert(userGithubLinksTable)
    .values({
      userId,
      githubUserId,
      githubUsername: ghUser.login,
      githubEmail: ghUser.email ?? null,
    })
    .onConflictDoUpdate({
      target: userGithubLinksTable.userId,
      set: {
        githubUserId,
        githubUsername: ghUser.login,
        githubEmail: ghUser.email ?? null,
        linkedAt: new Date(),
      },
    });

  res.redirect(`${FRONTEND_URL}?github_link=success`);
});

// PATCH /api/auth/profile — update display name
router.patch("/profile", requireAuth, async (req, res) => {
  const { displayName } = req.body as Record<string, unknown>;
  if (
    typeof displayName !== "string" ||
    displayName.trim().length === 0 ||
    displayName.length > 80
  ) {
    res.status(400).json({ error: "displayName must be 1–80 characters" });
    return;
  }
  const userId = req.session.userId!;
  try {
    const [updated] = await db
      .update(usersTable)
      .set({ displayName: displayName.trim() })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        emailVerified: usersTable.emailVerified,
        createdAt: usersTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: updated });
  } catch (err) {
    req.log.error({ err }, "updateProfile DB error");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
