import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import rateLimit from "express-rate-limit";
import { db, usersTable, userGithubLinksTable, emailVerificationsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  LoginResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendVerificationEmail, isEmailConfigured } from "../lib/email";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiters
//
// Both limiters use in-memory storage (suitable for a single-process server
// or prototype; swap to a Redis store when horizontally scaling).
// The `Retry-After` header is set automatically by express-rate-limit.
// ---------------------------------------------------------------------------

/** 10 login attempts per IP per 15 minutes */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7", // RateLimit-* + Retry-After headers (RFC 9110)
  legacyHeaders: false,
  message: { error: "Too many login attempts — please try again in 15 minutes" },
});

/** 5 registration attempts per IP per hour */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts — please try again later" },
});

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

  req.session.userId = user.id;
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

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;

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
const resendLimiter = rateLimit({
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

export default router;
