import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
