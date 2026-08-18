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

    -- Migration: add email_verified to existing users rows.
    -- CREATE TABLE IF NOT EXISTS will not add columns to an existing table.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS
      email_verified BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS email_verifications (
      id         SERIAL      PRIMARY KEY,
      user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT        NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications (user_id);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications (token);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL      PRIMARY KEY,
      user_id    INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT        NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Migrations for existing tables created with the old schema (plaintext token,
    -- no UNIQUE on user_id). Must run BEFORE the CREATE INDEX statements below so
    -- the column exists when the index is built.
    DO $$
    BEGIN
      -- Rename token → token_hash if the old column is present.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'password_reset_tokens' AND column_name = 'token'
      ) THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN token TO token_hash;
      END IF;

      -- Add UNIQUE constraint on user_id if not already present.
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'password_reset_tokens'::regclass
          AND contype = 'u'
          AND conkey = ARRAY(
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'password_reset_tokens'::regclass
              AND attname = 'user_id'
          )
      ) THEN
        ALTER TABLE password_reset_tokens
          ADD CONSTRAINT password_reset_tokens_user_id_unique UNIQUE (user_id);
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user       ON password_reset_tokens (user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);

    -- Telling Forward enums (must mirror lib/db/src/schema/telling-forward.ts)
    DO $$ BEGIN
      CREATE TYPE story_path_state AS ENUM
        ('personal', 'open', 'proposed', 'published-alternate');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE proposal_state AS ENUM
        ('draft', 'submitted', 'under-review', 'returned-with-notes',
         'accepted-into-canon', 'published-alternate');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- Telling Forward core tables (Section 8 of platform requirements)
    CREATE TABLE IF NOT EXISTS storyworlds (
      id               SERIAL      PRIMARY KEY,
      repo_owner       TEXT        NOT NULL,
      repo_name        TEXT        NOT NULL,
      title            TEXT        NOT NULL,
      steward_id       INTEGER,
      canon_branch_ref TEXT        NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT storyworlds_repo_unique UNIQUE (repo_owner, repo_name)
    );

    CREATE TABLE IF NOT EXISTS story_paths (
      id             SERIAL      PRIMARY KEY,
      storyworld_id  INTEGER     NOT NULL REFERENCES storyworlds(id),
      branch_ref     TEXT        NOT NULL,
      title          TEXT        NOT NULL,
      origin_path_id INTEGER,
      state          story_path_state NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT story_paths_branch_unique UNIQUE (storyworld_id, branch_ref)
    );

    CREATE TABLE IF NOT EXISTS contributors (
      id                SERIAL      PRIMARY KEY,
      display_name      TEXT        NOT NULL,
      platform_identity TEXT        NOT NULL,
      github_identity   TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id             SERIAL      PRIMARY KEY,
      storyworld_id  INTEGER     NOT NULL REFERENCES storyworlds(id),
      path_id        INTEGER     NOT NULL REFERENCES story_paths(id),
      commit_sha     TEXT        NOT NULL,
      contributor_id INTEGER     REFERENCES contributors(id),
      title          TEXT        NOT NULL,
      summary        TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT contributions_commit_unique UNIQUE (storyworld_id, commit_sha)
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id            SERIAL         PRIMARY KEY,
      storyworld_id INTEGER        NOT NULL REFERENCES storyworlds(id),
      path_id       INTEGER        NOT NULL REFERENCES story_paths(id),
      pr_number     INTEGER        NOT NULL,
      state         proposal_state NOT NULL,
      submitted_at  TIMESTAMPTZ    NOT NULL,
      decided_at    TIMESTAMPTZ,
      CONSTRAINT proposals_pr_unique UNIQUE (storyworld_id, pr_number)
    );

    CREATE TABLE IF NOT EXISTS editor_questions (
      id                SERIAL      PRIMARY KEY,
      proposal_id       INTEGER     NOT NULL REFERENCES proposals(id),
      review_comment_id BIGINT      NOT NULL UNIQUE,
      body              TEXT        NOT NULL,
      resolved          BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stewards (
      id            SERIAL      PRIMARY KEY,
      storyworld_id INTEGER     NOT NULL REFERENCES storyworlds(id),
      user_id       INTEGER     NOT NULL,
      role          TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS provenance_records (
      id               SERIAL      PRIMARY KEY,
      storyworld_id    INTEGER     NOT NULL REFERENCES storyworlds(id),
      canon_commit_sha TEXT        NOT NULL,
      source_path_id   INTEGER     REFERENCES story_paths(id),
      contributor_ids  INTEGER[]   NOT NULL,
      steward_id       INTEGER     REFERENCES stewards(id),
      decided_at       TIMESTAMPTZ NOT NULL,
      CONSTRAINT provenance_canon_commit_unique UNIQUE (storyworld_id, canon_commit_sha)
    );

    -- Migration: upgrade review_comment_id from INTEGER to BIGINT if needed.
    -- GitHub review IDs are 64-bit; INTEGER silently truncates large values.
    -- CREATE TABLE IF NOT EXISTS won't alter existing columns, so we apply this
    -- explicitly. The DO block is a no-op when the column is already BIGINT.
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name   = 'editor_questions'
          AND column_name  = 'review_comment_id'
          AND data_type    = 'integer'
      ) THEN
        ALTER TABLE editor_questions
          ALTER COLUMN review_comment_id TYPE BIGINT;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_story_paths_storyworld ON story_paths (storyworld_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_path ON contributions (path_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_path ON proposals (path_id);
    CREATE INDEX IF NOT EXISTS idx_editor_questions_proposal ON editor_questions (proposal_id);
    CREATE INDEX IF NOT EXISTS idx_stewards_storyworld ON stewards (storyworld_id);
    CREATE INDEX IF NOT EXISTS idx_provenance_storyworld ON provenance_records (storyworld_id);

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
