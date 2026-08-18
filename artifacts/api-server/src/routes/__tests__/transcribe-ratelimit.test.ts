/**
 * Transcription per-user rate-limit tests
 *
 * Verifies that:
 * - The rate limiter uses a single atomic INSERT … ON CONFLICT DO UPDATE
 *   (no separate read step) so concurrent requests cannot race past the limit.
 * - Requests within the limit are allowed (200 / forwarded to next).
 * - Requests at or over the limit are rejected with 429.
 * - An expired window is reset atomically by the same upsert statement.
 * - Concurrent requests that all hit the pool simultaneously each call
 *   the single-statement upsert — never a separate SELECT then UPDATE.
 * - "Multi-instance equivalent" behaviour: a counter already at MAX_RPH
 *   (written by another instance) is respected and rejects further requests.
 *
 * pool.query is mocked to return configurable row data without a real DB.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

// Controls what pool.query returns for each invocation.
// Tests push objects; each call to pool.query pops the first one.
type QueryResult = { count: number; reset_at: Date };
let queryResults: QueryResult[] = [];

// Records all SQL strings passed to pool.query.
const querySqlLog: string[] = [];

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => ({
  pool: {
    query: vi.fn(async (sql: string, _params: unknown[]) => {
      querySqlLog.push(sql);
      const next = queryResults.shift();
      return { rows: next ? [next] : [] };
    }),
  },
  // Auth middleware dependencies (not used in transcribe route but imported indirectly)
  db: { select: vi.fn() },
  usersTable: {},
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireVerified: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// ---------------------------------------------------------------------------
// App fixture
// ---------------------------------------------------------------------------

async function buildApp(): Promise<Express> {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = { userId: 42 };
    (req as any).log = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    next();
  });

  const { default: transcribeRouter } = await import("../transcribe");
  app.use("/api", transcribeRouter);
  return app;
}

// Minimal valid body accepted by TranscribeAudioBody
const VALID_BODY = {
  audioBase64: Buffer.from("fake-audio").toString("base64"),
  mimeType: "audio/m4a",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("transcription rate limiter", () => {
  let app: Express;

  beforeEach(async () => {
    queryResults = [];
    querySqlLog.length = 0;
    vi.clearAllMocks();
    // Reset module so the pool mock is fresh
    app = await buildApp();
    // Suppress the missing OPENAI_API_KEY 503 by default
    process.env["OPENAI_API_KEY"] = "";
  });

  it("issues exactly ONE SQL statement per request (no separate read)", async () => {
    const { MAX_RPH } = await import("../transcribe");
    queryResults.push({ count: 1, reset_at: new Date(Date.now() + 3_600_000) });

    await request(app)
      .post("/api/transcribe")
      .send(VALID_BODY);

    // Must have called pool.query exactly once (the atomic upsert)
    expect(querySqlLog).toHaveLength(1);

    // The SQL must be an INSERT … ON CONFLICT DO UPDATE, never a bare SELECT or UPDATE
    const sql = querySqlLog[0]!;
    expect(sql.toUpperCase()).toMatch(/INSERT/);
    expect(sql.toUpperCase()).toMatch(/ON CONFLICT/);
    expect(sql.toUpperCase()).toMatch(/DO UPDATE/);
    expect(sql.toUpperCase()).not.toMatch(/^SELECT/);
  });

  it("allows requests while count <= MAX_RPH", async () => {
    const { MAX_RPH } = await import("../transcribe");
    queryResults.push({ count: MAX_RPH, reset_at: new Date(Date.now() + 3_600_000) });

    const res = await request(app)
      .post("/api/transcribe")
      .send(VALID_BODY);

    // 503 (no API key) rather than 429 means the rate limiter passed
    expect(res.status).toBe(503);
  });

  it("rejects with 429 when count > MAX_RPH (sentinel value)", async () => {
    const { MAX_RPH } = await import("../transcribe");
    // Sentinel: count = MAX_RPH + 1 signals "was already at limit"
    queryResults.push({
      count: MAX_RPH + 1,
      reset_at: new Date(Date.now() + 3_600_000),
    });

    const res = await request(app)
      .post("/api/transcribe")
      .send(VALID_BODY);

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(res.body.error).toMatch(/limit reached/i);
  });

  it("allows the first request after an expired window (count reset to 1)", async () => {
    // DB atomically resets; returns count=1 to signal a fresh window
    queryResults.push({ count: 1, reset_at: new Date(Date.now() + 3_600_000) });

    const res = await request(app)
      .post("/api/transcribe")
      .send(VALID_BODY);

    // Passed the limiter → 503 (no API key), not 429
    expect(res.status).toBe(503);
  });

  it("concurrent requests each issue one upsert — no separate SELECT", async () => {
    const { MAX_RPH } = await import("../transcribe");
    const CONCURRENT = 5;

    // Each concurrent request gets its own result (counts 1..5, all under limit)
    for (let i = 1; i <= CONCURRENT; i++) {
      queryResults.push({ count: i, reset_at: new Date(Date.now() + 3_600_000) });
    }

    await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app).post("/api/transcribe").send(VALID_BODY),
      ),
    );

    // Exactly CONCURRENT upsert calls — one per request, never more
    expect(querySqlLog).toHaveLength(CONCURRENT);
    for (const sql of querySqlLog) {
      expect(sql.toUpperCase()).toMatch(/INSERT/);
      expect(sql.toUpperCase()).toMatch(/ON CONFLICT/);
    }
  });

  it("multi-instance equivalent: respects a counter already at limit from another instance", async () => {
    const { MAX_RPH } = await import("../transcribe");
    // Another instance already wrote MAX_RPH + 1 (sentinel) to the DB
    queryResults.push({
      count: MAX_RPH + 1,
      reset_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/transcribe")
      .send(VALID_BODY);

    expect(res.status).toBe(429);
  });

  it("first-use upsert: two concurrent first requests each call one atomic statement", async () => {
    // Both requests see count=1 (DB handled the conflict atomically)
    queryResults.push(
      { count: 1, reset_at: new Date(Date.now() + 3_600_000) },
      { count: 2, reset_at: new Date(Date.now() + 3_600_000) },
    );

    const [r1, r2] = await Promise.all([
      request(app).post("/api/transcribe").send(VALID_BODY),
      request(app).post("/api/transcribe").send(VALID_BODY),
    ]);

    // Both passed the limiter (503 = no API key, not 429)
    expect(r1.status).toBe(503);
    expect(r2.status).toBe(503);

    // Two upsert calls — one per request
    expect(querySqlLog).toHaveLength(2);
  });
});
