/**
 * POST /api/transcribe
 *
 * Transcribes base64-encoded audio using OpenAI Whisper.
 * Requires an authenticated session and enforces per-user rate limiting.
 * Returns 503 when OPENAI_API_KEY is not set so the mobile client can fall
 * back to manual text entry gracefully.
 *
 * Rate limiting is database-backed (transcribe_usage table) using a single
 * atomic INSERT … ON CONFLICT DO UPDATE statement so:
 *   - Counters survive server restarts and are consistent across instances.
 *   - Concurrent requests from the same user are serialized by the row-level
 *     write lock that Postgres acquires during the upsert, preventing
 *     lost-update races that could allow more than MAX_RPH requests per hour.
 */
import { Router, type IRouter } from "express";
import { TranscribeAudioBody } from "@workspace/api-zod";
import { requireAuth, requireVerified } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// Per-user rate limit: MAX_RPH requests per rolling hour.
// Exported for testing.
export const MAX_RPH = 20;

/**
 * Single-statement atomic per-user transcription rate limiter.
 *
 * The INSERT … ON CONFLICT DO UPDATE acquires a row-level write lock on the
 * user's transcribe_usage row before evaluating the CASE expression, so
 * concurrent requests from the same user (or the same user across scaled
 * instances) serialize at the database level.
 *
 * The CASE logic:
 *   - Window expired → reset count to 1 and start a new window (allowed).
 *   - count < MAX_RPH → increment (allowed).
 *   - count >= MAX_RPH → set count = MAX_RPH + 1 as a sentinel (rejected).
 *
 * Reading count > MAX_RPH in RETURNING means the request was rejected without
 * actually incrementing; MAX_RPH + 1 stays until the window resets, after
 * which the first request resets it to 1. No separate read is needed.
 */
async function transcribeRateLimit(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): Promise<void> {
  const userId = req.session.userId!;
  const resetAt = new Date(Date.now() + 3_600_000); // 1 hour from now

  const { rows } = await pool.query<{ count: number; reset_at: Date }>(
    `INSERT INTO transcribe_usage (user_id, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (user_id) DO UPDATE SET
       count = CASE
                 WHEN transcribe_usage.reset_at <= NOW()         THEN 1
                 WHEN transcribe_usage.count    <  $3            THEN transcribe_usage.count + 1
                 ELSE                                                 $3 + 1
               END,
       reset_at = CASE
                    WHEN transcribe_usage.reset_at <= NOW() THEN $2
                    ELSE                                         transcribe_usage.reset_at
                  END
     RETURNING count, reset_at`,
    [userId, resetAt, MAX_RPH],
  );

  const row = rows[0];
  if (!row || row.count > MAX_RPH) {
    const windowEnds = row ? row.reset_at : resetAt;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowEnds.getTime() - Date.now()) / 1000),
    );
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({
      error: `Transcription limit reached (${MAX_RPH} per hour). Try again later.`,
    });
    return;
  }

  next();
}

// The app-level path-conditional JSON middleware (see app.ts) applies 20 MB
// specifically for this route and 64 KB for all others. The per-route payload
// size check below is an additional defence against requests just under the
// parser limit that are still too large for Whisper.
router.post(
  "/transcribe",
  requireAuth,
  requireVerified,
  transcribeRateLimit,
  async (req, res) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      res.status(503).json({
        error:
          "Transcription service not configured. Set OPENAI_API_KEY to enable Whisper transcription.",
      });
      return;
    }

    const body = TranscribeAudioBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "audioBase64 and mimeType are required" });
      return;
    }

    const { audioBase64, mimeType } = body.data;

    // Guard against oversized payloads (20 MB base64 ≈ ~15 MB audio)
    const MAX_B64_CHARS = 20 * 1024 * 1024;
    if (audioBase64.length > MAX_B64_CHARS) {
      res.status(413).json({
        error:
          "Audio is too long. Maximum recording length is approximately 2 minutes.",
      });
      return;
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: mimeType });
      const ext = mimeType.split("/")[1]?.split(";")[0] ?? "m4a";
      formData.append("file", audioBlob, `recording.${ext}`);
      formData.append("model", "whisper-1");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        },
      );

      if (!response.ok) {
        const text = await response.text();
        req.log.error(
          { status: response.status, body: text },
          "Whisper API error",
        );
        res.status(502).json({ error: "Transcription failed. Please try again." });
        return;
      }

      const data = (await response.json()) as { text: string };
      res.json({ text: data.text ?? "" });
    } catch (err) {
      req.log.error({ err }, "Transcription error");
      res.status(500).json({ error: "Transcription failed unexpectedly" });
    }
  },
);

export default router;
