import { pool } from "@workspace/db";

/**
 * Ensures all application tables exist before the server starts accepting
 * requests. Runs CREATE TABLE IF NOT EXISTS for every table, making the
 * server self-provisioning on a clean deployment without requiring an
 * out-of-band drizzle-kit push.
 *
 * Table definitions here must stay in sync with lib/db/src/schema/*.
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    -- Auth tables
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL      PRIMARY KEY,
      email         TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      display_name  TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_github_links (
      id              SERIAL      PRIMARY KEY,
      user_id         INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      github_user_id  TEXT        NOT NULL UNIQUE,
      github_username TEXT        NOT NULL,
      github_email    TEXT,
      linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Session store (managed by connect-pg-simple, excluded from Drizzle)
    CREATE TABLE IF NOT EXISTS sessions (
      sid    VARCHAR        NOT NULL COLLATE "default",
      sess   JSON           NOT NULL,
      expire TIMESTAMP(6)   NOT NULL,
      CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
    );
    CREATE INDEX IF NOT EXISTS IDX_sessions_expire ON sessions (expire);
  `);
}
