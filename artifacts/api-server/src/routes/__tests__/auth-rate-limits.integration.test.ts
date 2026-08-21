/**
 * Auth IP rate-limit integration tests.
 *
 * These tests import the production Express app rather than mounting the auth
 * router on a small fixture. That keeps the complete request chain under test:
 * trust-proxy IP resolution, body parsing, Clerk/session middleware, routing,
 * and express-rate-limit.
 *
 * Database, email, Clerk, and the PostgreSQL session store are replaced only
 * because they are external dependencies of the production app. The rate-limit
 * middleware itself deliberately uses its real MemoryStore in this test.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { SessionData } from "express-session";

const TEST_CLIENT_IP = "203.0.113.42";
const UNTRUSTED_FORWARDED_IP = "198.51.100.7";

vi.mock("@workspace/db", () => {
  const table = new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  );

  return {
    pool: { query: vi.fn() },
    db: {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            // Login receives no account so it takes the normal 401 path.
            // Register receives no duplicate email and can create an account.
            limit: async () => [],
          }),
        }),
      })),
      insert: vi.fn(() => ({
        values: () => ({
          returning: async () => [
            {
              id: 1,
              email: "rate-limit@example.test",
              displayName: "Rate Limit Test",
              emailVerified: false,
              createdAt: new Date(),
            },
          ],
        }),
      })),
    },
    usersTable: table,
    userGithubLinksTable: table,
    emailVerificationsTable: table,
    passwordResetTokensTable: table,
    stewardsTable: table,
    proposalsTable: table,
  };
});

vi.mock("../../lib/email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  isEmailConfigured: vi.fn(() => false),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: vi.fn(() => undefined),
}));

vi.mock("connect-pg-simple", () => ({
  default: (session: typeof import("express-session")) =>
    class TestSessionStore extends session.Store {
      private readonly sessions = new Map<string, SessionData>();

      get(sid: string, callback: (error: Error | null, session?: SessionData | null) => void) {
        callback(null, this.sessions.get(sid) ?? null);
      }

      set(sid: string, value: SessionData, callback?: (error?: Error | null) => void) {
        this.sessions.set(sid, value);
        callback?.(null);
      }

      destroy(sid: string, callback?: (error?: Error | null) => void) {
        this.sessions.delete(sid);
        callback?.(null);
      }

      touch(sid: string, value: SessionData, callback?: (error?: Error | null) => void) {
        this.sessions.set(sid, value);
        callback?.(null);
      }
    },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "test-password-hash"),
    compare: vi.fn(async () => false),
  },
}));

// These packages are optional at runtime for this test because REDIS_URL is
// intentionally absent. Mock their module boundaries so the production helper
// can select express-rate-limit's real in-memory store in this checkout.
vi.mock("ioredis", () => ({
  default: vi.fn(),
}));

vi.mock("rate-limit-redis", () => ({
  RedisStore: vi.fn(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: {} }));

const originalNodeEnv = process.env["NODE_ENV"];
const originalRedisUrl = process.env["REDIS_URL"];
const originalSessionSecret = process.env["SESSION_SECRET"];

function forwardedForVariant(attempt: number): string {
  // With app.ts's one trusted proxy, Express resolves the rightmost forwarded
  // address as req.ip. The extra leftmost address varies request formatting but
  // must not create another quota bucket for the same client.
  return attempt % 2 === 0
    ? TEST_CLIENT_IP
    : `${UNTRUSTED_FORWARDED_IP}, ${TEST_CLIENT_IP}`;
}

describe("authentication IP rate limits", () => {
  let app: Express;

  beforeEach(async () => {
    process.env["NODE_ENV"] = "test";
    process.env["SESSION_SECRET"] = "auth-rate-limit-integration-test-secret";
    delete process.env["REDIS_URL"];

    // Auth limiters are constructed when the router is imported. A fresh app
    // gives each assertion an independent in-memory rate-limit window.
    vi.resetModules();
    app = (await import("../../app")).default;
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) {
      delete process.env["NODE_ENV"];
    } else {
      process.env["NODE_ENV"] = originalNodeEnv;
    }

    if (originalRedisUrl === undefined) {
      delete process.env["REDIS_URL"];
    } else {
      process.env["REDIS_URL"] = originalRedisUrl;
    }

    if (originalSessionSecret === undefined) {
      delete process.env["SESSION_SECRET"];
    } else {
      process.env["SESSION_SECRET"] = originalSessionSecret;
    }
  });

  it("locks login after ten failed requests from the same resolved client IP", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", forwardedForVariant(attempt))
        .send({
          email: `missing-login-${attempt}@example.test`,
          password: "incorrect-password",
        });

      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", forwardedForVariant(10))
      .send({
        email: "missing-login-final@example.test",
        password: "incorrect-password",
      });

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toMatch(/^\d+$/);
  });

  it("locks registration after five requests from the same resolved client IP", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", forwardedForVariant(attempt))
        .send({
          email: `rate-limit-register-${attempt}@example.test`,
          password: "valid-test-password",
          displayName: "Rate Limit Test",
        });

      expect(response.status).toBe(201);
    }

    const blocked = await request(app)
      .post("/api/auth/register")
      .set("X-Forwarded-For", forwardedForVariant(5))
      .send({
        email: "rate-limit-register-final@example.test",
        password: "valid-test-password",
        displayName: "Rate Limit Test",
      });

    expect(blocked.status).toBe(429);
  });
});
