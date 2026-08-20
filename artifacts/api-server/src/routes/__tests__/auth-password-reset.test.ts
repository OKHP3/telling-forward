/**
 * Password-reset security tests.
 *
 * These tests keep the route boundary real while replacing the database,
 * password hashing, and email transport with deterministic test doubles. They
 * cover the public guarantees that matter to a reset-link recipient:
 * expiry, single use, non-enumerating forgot-password responses, and the
 * resulting password change.
 */

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import type { NextFunction, Request, Response } from "express";

interface MockUser {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockResetToken {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

const testState = vi.hoisted(() => ({
  user: null as MockUser | null,
  resetToken: null as MockResetToken | null,
  sentResetTokens: [] as string[],
  lastResetDeleteCondition: null as unknown,
}));

const usersTable = {
  id: "users.id",
  email: "users.email",
  passwordHash: "users.password_hash",
};
const userGithubLinksTable = { userId: "user_github_links.user_id" };
const emailVerificationsTable = { userId: "email_verifications.user_id" };
const passwordResetTokensTable = {
  userId: "password_reset_tokens.user_id",
  tokenHash: "password_reset_tokens.token_hash",
  expiresAt: "password_reset_tokens.expires_at",
};

function findEqValue(condition: unknown, column: unknown): unknown {
  if (
    typeof condition === "object" &&
    condition !== null &&
    "kind" in condition &&
    condition.kind === "eq" &&
    "column" in condition &&
    condition.column === column &&
    "value" in condition
  ) {
    return condition.value;
  }

  if (
    typeof condition === "object" &&
    condition !== null &&
    "kind" in condition &&
    condition.kind === "and" &&
    "conditions" in condition &&
    Array.isArray(condition.conditions)
  ) {
    for (const nested of condition.conditions) {
      const value = findEqValue(nested, column);
      if (value !== undefined) return value;
    }
  }

  return undefined;
}

function valueForResetTokenColumn(
  token: MockResetToken,
  column: unknown,
): unknown {
  if (column === passwordResetTokensTable.userId) return token.userId;
  if (column === passwordResetTokensTable.tokenHash) return token.tokenHash;
  if (column === passwordResetTokensTable.expiresAt) return token.expiresAt;
  return undefined;
}

/**
 * Mimics the database's WHERE evaluation only from the predicate supplied by
 * the route. This is intentionally not a second expiry rule: if auth.ts drops
 * or misstates its expiresAt > now predicate, an expired token matches the
 * remaining predicate and the expired-token test fails with a 200 response.
 */
function resetTokenMatchesWhere(
  token: MockResetToken,
  condition: unknown,
): boolean {
  if (
    typeof condition !== "object" ||
    condition === null ||
    !("kind" in condition)
  ) {
    return false;
  }

  if (condition.kind === "and" && "conditions" in condition) {
    return Array.isArray(condition.conditions) &&
      condition.conditions.every((nested) =>
        resetTokenMatchesWhere(token, nested),
      );
  }

  if (
    condition.kind === "eq" &&
    "column" in condition &&
    "value" in condition
  ) {
    return valueForResetTokenColumn(token, condition.column) === condition.value;
  }

  if (
    condition.kind === "gt" &&
    "column" in condition &&
    "value" in condition
  ) {
    const storedValue = valueForResetTokenColumn(token, condition.column);
    return (
      storedValue instanceof Date &&
      condition.value instanceof Date &&
      storedValue > condition.value
    );
  }

  return false;
}

function hasExpiryPredicate(condition: unknown): boolean {
  if (
    typeof condition !== "object" ||
    condition === null ||
    !("kind" in condition)
  ) {
    return false;
  }

  if (
    condition.kind === "gt" &&
    "column" in condition &&
    "value" in condition
  ) {
    return (
      condition.column === passwordResetTokensTable.expiresAt &&
      condition.value instanceof Date
    );
  }

  return (
    condition.kind === "and" &&
    "conditions" in condition &&
    Array.isArray(condition.conditions) &&
    condition.conditions.some(hasExpiryPredicate)
  );
}

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
  eq: (column: unknown, value: unknown) => ({ kind: "eq", column, value }),
  gt: (column: unknown, value: unknown) => ({ kind: "gt", column, value }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    kind: "sql",
    strings: [...strings],
    values,
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (password: string) => `hash:${password}`),
    compare: vi.fn(async (password: string, passwordHash: string) => {
      return passwordHash === `hash:${password}`;
    }),
  },
}));

vi.mock("ioredis", () => ({
  default: vi.fn(),
}));

vi.mock("rate-limit-redis", () => ({
  RedisStore: vi.fn(),
}));

vi.mock("../../lib/email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(async (_email: string, rawToken: string) => {
    testState.sentResetTokens.push(rawToken);
  }),
  isEmailConfigured: vi.fn(() => false),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where: (condition: unknown) => ({
          limit: async () => {
            if (table !== usersTable || !testState.user) return [];

            const email = findEqValue(condition, usersTable.email);
            if (typeof email === "string") {
              return email.toLowerCase() === testState.user.email
                ? [testState.user]
                : [];
            }

            const userId = findEqValue(condition, usersTable.id);
            return userId === testState.user.id ? [testState.user] : [];
          },
        }),
      }),
    })),
    insert: vi.fn(() => ({
      values: (values: MockResetToken) => ({
        onConflictDoUpdate: async () => {
          testState.resetToken = {
            userId: values.userId,
            tokenHash: values.tokenHash,
            expiresAt: values.expiresAt,
          };
        },
        returning: async () => [],
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        delete: () => ({
          where: (condition: unknown) => ({
            returning: async () => {
              testState.lastResetDeleteCondition = condition;
              const token = testState.resetToken;

              if (!token || !resetTokenMatchesWhere(token, condition)) {
                return [];
              }

              testState.resetToken = null;
              return [{ userId: token.userId }];
            },
          }),
        }),
        update: () => ({
          set: (values: { passwordHash?: string }) => ({
            where: vi.fn(async () => {
              if (testState.user && values.passwordHash) {
                testState.user.passwordHash = values.passwordHash;
              }
              return [];
            }),
          }),
        }),
      };

      await callback(tx);
    }),
  },
  usersTable,
  userGithubLinksTable,
  emailVerificationsTable,
  passwordResetTokensTable,
}));

async function buildApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = {
      userId: undefined,
      destroy: (callback: () => void) => callback(),
      regenerate: (callback: () => void) => callback(),
      save: (callback: () => void) => callback(),
    };
    (req as any).log = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    next();
  });

  const { default: authRouter } = await import("../auth");
  app.use("/api/auth", authRouter);
  return app;
}

function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    email: "reset-user@example.com",
    passwordHash: "hash:old-password",
    displayName: "Reset User",
    emailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function seedResetToken(rawToken: string, expiresAt: Date): void {
  testState.resetToken = {
    userId: testState.user!.id,
    tokenHash: hashResetToken(rawToken),
    expiresAt,
  };
}

describe("password reset security", () => {
  let app: Express;

  beforeEach(async () => {
    testState.user = makeUser();
    testState.resetToken = null;
    testState.sentResetTokens.length = 0;
    testState.lastResetDeleteCondition = null;
    delete process.env["REDIS_URL"];
    vi.clearAllMocks();
    vi.resetModules();
    app = await buildApp();
  });

  it("rejects a reset token when it is used a second time", async () => {
    const rawToken = "single-use-reset-token";
    seedResetToken(rawToken, new Date(Date.now() + 60 * 60 * 1000));

    const firstAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "new-password" });
    const secondAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "another-password" });

    expect(firstAttempt.status).toBe(200);
    expect(secondAttempt.status).toBe(400);
    expect(secondAttempt.body).toEqual({
      error: "Reset link is invalid or has expired",
    });
  });

  it("rejects a reset token whose expiry is in the past", async () => {
    const rawToken = "expired-reset-token";
    seedResetToken(rawToken, new Date(Date.now() - 1));

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "new-password" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Reset link is invalid or has expired",
    });
    expect(hasExpiryPredicate(testState.lastResetDeleteCondition)).toBe(true);
    expect(testState.user?.passwordHash).toBe("hash:old-password");
  });

  it("returns the same successful response shape for unknown and registered emails", async () => {
    const registeredResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: testState.user!.email });
    const unknownResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(registeredResponse.status).toBe(200);
    expect(unknownResponse.status).toBe(200);
    expect(unknownResponse.body).toEqual(registeredResponse.body);
    expect(Object.keys(unknownResponse.body)).toEqual(
      Object.keys(registeredResponse.body),
    );
  });

  it("allows login with the new password and rejects the old password", async () => {
    const rawToken = "password-change-reset-token";
    seedResetToken(rawToken, new Date(Date.now() + 60 * 60 * 1000));

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "new-password" });
    const oldPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: testState.user!.email,
        password: "old-password",
      });
    const newPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: testState.user!.email,
        password: "new-password",
      });

    expect(resetResponse.status).toBe(200);
    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
    expect(testState.user?.passwordHash).toBe("hash:new-password");
  });
});