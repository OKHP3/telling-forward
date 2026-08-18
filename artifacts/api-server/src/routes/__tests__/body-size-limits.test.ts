/**
 * Body-size limit integration tests
 *
 * Verifies the path-conditional JSON body parser in app.ts:
 * - /api/transcribe: accepts bodies up to 20 MB (for base64 audio)
 * - All other /api/* routes: rejects bodies larger than 64 KB with 413
 *
 * Uses a real Express instance with the same middleware chain as app.ts
 * (minus the database / session / pino dependencies) so the body-parser
 * behaviour is tested exactly as it runs in production.
 */

import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response } from "express";

// ---------------------------------------------------------------------------
// Build a minimal app that mirrors app.ts's body-parser setup exactly
// ---------------------------------------------------------------------------

function buildApp(): Express {
  const app = express();

  // Mirror the path-conditional body-parser from app.ts
  app.use((req, res, next) => {
    const limit = req.path === "/api/transcribe" ? "20mb" : "64kb";
    express.json({ limit })(req, res, next);
  });

  // Echo endpoint for transcription path
  app.post("/api/transcribe", (req: Request, res: Response) => {
    res.json({ received: true, bodySize: JSON.stringify(req.body).length });
  });

  // Echo endpoint for a generic (small-limit) path
  app.post("/api/auth/login", (req: Request, res: Response) => {
    res.json({ received: true });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

/** Generate a JSON object whose serialised size is approximately `targetBytes`. */
function jsonPayloadOfSize(targetBytes: number): object {
  // Each char in the string is 1 byte in UTF-8; account for {"data":"..."} overhead
  const overhead = '{"data":"","audioBase64":""}'.length;
  const fill = "A".repeat(Math.max(0, targetBytes - overhead));
  return { data: "", audioBase64: fill };
}

const KB = 1024;
const MB = 1024 * KB;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("path-conditional JSON body size limits", () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  // ---- /api/transcribe (20 MB limit) ----------------------------------------

  it("accepts a small body on /api/transcribe", async () => {
    const res = await request(app)
      .post("/api/transcribe")
      .send({ audioBase64: "dGVzdA==", mimeType: "audio/m4a" });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("accepts a 65 KB body on /api/transcribe (over the 64 KB non-transcribe cap)", async () => {
    const payload = jsonPayloadOfSize(65 * KB);

    const res = await request(app)
      .post("/api/transcribe")
      .send(payload);

    expect(res.status).toBe(200);
  });

  it("accepts a ~1 MB body on /api/transcribe", async () => {
    const payload = jsonPayloadOfSize(1 * MB);

    const res = await request(app)
      .post("/api/transcribe")
      .send(payload);

    expect(res.status).toBe(200);
  });

  it("rejects a body over 20 MB on /api/transcribe with 413", async () => {
    // 21 MB — over the transcription-specific limit
    const payload = jsonPayloadOfSize(21 * MB);

    const res = await request(app)
      .post("/api/transcribe")
      .send(payload);

    expect(res.status).toBe(413);
  });

  // ---- /api/auth/login (64 KB limit) ----------------------------------------

  it("accepts a small body on /api/auth/login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "secret" });

    expect(res.status).toBe(200);
  });

  it("rejects a body just over 64 KB on /api/auth/login with 413", async () => {
    // 65 KB — just over the general limit
    const payload = jsonPayloadOfSize(65 * KB);

    const res = await request(app)
      .post("/api/auth/login")
      .send(payload);

    expect(res.status).toBe(413);
  });

  it("rejects a 1 MB body on /api/auth/login with 413", async () => {
    const payload = jsonPayloadOfSize(1 * MB);

    const res = await request(app)
      .post("/api/auth/login")
      .send(payload);

    expect(res.status).toBe(413);
  });

  // ---- boundary at exactly one per-route parser per request -----------------

  it("uses exactly the transcribe limit for /api/transcribe, not the global one", async () => {
    // 128 KB — over 64 KB but well under 20 MB: only allowed if the
    // 20 MB branch was selected, not the 64 KB fallback
    const payload = jsonPayloadOfSize(128 * KB);

    const transcribeRes = await request(app)
      .post("/api/transcribe")
      .send(payload);
    expect(transcribeRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send(payload);
    expect(loginRes.status).toBe(413);
  });
});
