import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { pool } from "@workspace/db";
import router from "./routes";
import { githubWebhookHandler } from "./routes/webhooks";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

// Session store backed by PostgreSQL — survives server restarts
const PgStore = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

const app: Express = express();

// Trust the first proxy in front of this server (the platform's TLS terminator).
// Required for express-session to emit secure cookies in production:
// without this, Express sees the proxied HTTP connection as insecure and
// suppresses the Set-Cookie header entirely.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: credentials require an explicit origin allowlist — never reflect all
// origins (origin: true) with credentials: true.
// - If FRONTEND_URL is set, allow only that origin (works in all environments).
// - Otherwise in development, allow all origins for convenience (no prod risk).
// - Otherwise in production, disable cross-origin requests entirely (same-origin only).
const corsOrigin: cors.CorsOptions["origin"] =
  process.env.FRONTEND_URL ??
  (process.env.NODE_ENV !== "production" ? true : false);

app.use(cors({ origin: corsOrigin, credentials: true }));

// Webhook endpoint MUST be mounted before express.json() so it receives the
// raw body Buffer needed for HMAC-SHA256 signature verification.
// express.raw() gives req.body as Buffer; the handler parses JSON itself.
app.post(
  "/api/webhooks/github",
  express.raw({ type: "application/json" }),
  githubWebhookHandler,
);

// Clerk Frontend API proxy — streams raw bytes to Clerk's CDN and must be
// mounted BEFORE body parsers (express.json parses the body into memory;
// the proxy needs to stream the raw bytes through to Clerk's servers).
// In development the proxy is a no-op (see clerkProxyMiddleware).
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Path-conditional body parser — exactly one JSON parse per request.
// /api/transcribe needs 20 MB for base64-encoded audio blobs (~15 MB audio).
// Every other endpoint is capped at 64 KB; large payloads are rejected before
// they are buffered, preventing memory-exhaustion via oversized request bodies.
app.use((req, res, next) => {
  const isManuscriptUpload =
    req.path.startsWith("/api/storyworlds/") &&
    req.path.endsWith("/manuscript-ingestion");
  const limit = req.path === "/api/transcribe" || isManuscriptUpload ? "20mb" : "64kb";
  express.json({ limit })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// Clerk middleware — parses the Clerk session JWT (cookie or Authorization
// bearer) and populates req.auth. Must come after body parsers because it
// reads body-parsed cookies, and before route handlers so getAuth(req) works.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Express session — kept as the "bridge" layer between Clerk identity and the
// numeric req.session.userId that all existing route handlers expect.
// requireAuth (in middlewares/auth.ts) reads the Clerk userId, looks up the
// local user row, and sets req.session.userId for the current request.
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // "lax" is required for the GitHub OAuth redirect flow:
      // GitHub redirects back via top-level navigation which "strict" blocks.
      // The oauthState session value provides CSRF protection instead.
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
);

app.use("/api", router);

export default app;
