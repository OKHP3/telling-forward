/**
 * POST /api/transcribe
 *
 * Transcribes base64-encoded audio using OpenAI Whisper.
 * Requires an authenticated session and enforces per-user rate limiting.
 * Returns 503 when OPENAI_API_KEY is not set so the mobile client can fall
 * back to manual text entry gracefully.
 */
import { Router, type IRouter } from "express";
import { TranscribeAudioBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Per-user rate limit: MAX_RPH requests per rolling hour
const MAX_RPH = 20;
const userWindows = new Map<number, { count: number; resetAt: number }>();

function transcribeRateLimit(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const userId = req.session.userId!;
  const now = Date.now();
  const win = userWindows.get(userId);

  if (!win || now >= win.resetAt) {
    userWindows.set(userId, { count: 1, resetAt: now + 3_600_000 });
    next();
    return;
  }
  if (win.count >= MAX_RPH) {
    res.status(429).json({
      error: `Transcription limit reached (${MAX_RPH} per hour). Try again later.`,
    });
    return;
  }
  win.count++;
  next();
}

// The app-level JSON middleware is configured for 20 MB (see app.ts) to
// accommodate base64 audio payloads. The per-route size guard below is the
// authoritative cap; the global limit is a backstop against unbounded reads.
router.post(
  "/transcribe",
  requireAuth,
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
