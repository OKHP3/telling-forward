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
        ('personal', 'open', 'proposed', 'published-canon', 'published-alternate');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    -- Add published-canon to the enum if this is an existing database that
    -- predates this value (ALTER TYPE is idempotent via DO/EXCEPTION).
    DO $$ BEGIN
      ALTER TYPE story_path_state ADD VALUE IF NOT EXISTS 'published-canon';
    EXCEPTION WHEN others THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE proposal_state AS ENUM
        ('draft', 'submitted', 'under-review', 'returned-with-notes',
         'accepted-into-canon', 'published-alternate', 'restricted',
         'withdrawn', 'archived');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    -- Add lifecycle outcomes for databases created before the expanded model.
    DO $$ BEGIN
      ALTER TYPE proposal_state ADD VALUE IF NOT EXISTS 'restricted';
      ALTER TYPE proposal_state ADD VALUE IF NOT EXISTS 'withdrawn';
      ALTER TYPE proposal_state ADD VALUE IF NOT EXISTS 'archived';
    EXCEPTION WHEN others THEN NULL; END $$;

    -- Telling Forward core tables (Section 8 of platform requirements)
    CREATE TABLE IF NOT EXISTS storyworlds (
      id               SERIAL      PRIMARY KEY,
      repo_owner       TEXT        NOT NULL,
      repo_name        TEXT        NOT NULL,
      title            TEXT        NOT NULL,
      steward_id       INTEGER,
      canon_branch_ref TEXT        NOT NULL,
      reader_theme     TEXT        NOT NULL DEFAULT 'editorial',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT storyworlds_repo_unique UNIQUE (repo_owner, repo_name),
      CONSTRAINT storyworlds_reader_theme_check
        CHECK (reader_theme IN ('editorial', 'terminal', 'archive', 'dispatch', 'signal'))
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
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT contributors_platform_identity_unique UNIQUE (platform_identity)
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

    CREATE TABLE IF NOT EXISTS contribution_path_memberships (
      contribution_id INTEGER NOT NULL REFERENCES contributions(id),
      path_id         INTEGER NOT NULL REFERENCES story_paths(id),
      CONSTRAINT contribution_path_membership_unique UNIQUE (contribution_id, path_id)
    );

    -- Existing contribution rows predate multi-path membership. Their original
    -- path remains a valid membership and gives the new table a complete base
    -- before reconciliation adds shared-commit memberships.
    INSERT INTO contribution_path_memberships (contribution_id, path_id)
      SELECT id, path_id FROM contributions
      ON CONFLICT (contribution_id, path_id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS proposals (
      id            SERIAL         PRIMARY KEY,
      storyworld_id INTEGER        NOT NULL REFERENCES storyworlds(id),
      path_id       INTEGER        NOT NULL REFERENCES story_paths(id),
      contributor_id INTEGER       REFERENCES contributors(id),
      github_user_id TEXT,
      pr_number     INTEGER        NOT NULL,
      state         proposal_state NOT NULL,
      submitted_at  TIMESTAMPTZ    NOT NULL,
      decided_at    TIMESTAMPTZ,
      decision_reason TEXT,
      CONSTRAINT proposals_pr_unique UNIQUE (storyworld_id, pr_number)
    );

    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS decision_reason TEXT;
    -- A proposal is visible in a contributor's activity only through this
    -- explicit PR-author link. Historic proposals may remain unattributable.
    ALTER TABLE proposals
      ADD COLUMN IF NOT EXISTS contributor_id INTEGER REFERENCES contributors(id);
    -- GitHub login names can change or be reassigned. Store the immutable
    -- account ID with each imported proposal before making it user-visible.
    ALTER TABLE proposals ADD COLUMN IF NOT EXISTS github_user_id TEXT;

    CREATE TABLE IF NOT EXISTS editor_questions (
      id                SERIAL      PRIMARY KEY,
      proposal_id       INTEGER     NOT NULL REFERENCES proposals(id),
      review_comment_id BIGINT      NOT NULL UNIQUE,
      body              TEXT        NOT NULL,
      resolved          BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE editor_questions
      ADD COLUMN IF NOT EXISTS addressed_at TIMESTAMPTZ;

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
      source_pr_number INTEGER,
      contributor_ids  INTEGER[]   NOT NULL,
      contributor_identities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      steward_id       INTEGER     REFERENCES stewards(id),
      steward_github_identity TEXT,
      decision         TEXT        NOT NULL DEFAULT 'accepted-into-canon',
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

    -- Migration: add storyworlds.seed (nullable) introduced for Reader discovery cards.
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name  = 'storyworlds'
          AND column_name = 'seed'
      ) THEN
        ALTER TABLE storyworlds ADD COLUMN seed TEXT;
      END IF;
    END $$;

    -- Migration: add the finite Reader theme catalog to existing worlds.
    ALTER TABLE storyworlds
      ADD COLUMN IF NOT EXISTS reader_theme TEXT NOT NULL DEFAULT 'editorial';

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'storyworlds_reader_theme_check'
          AND conrelid = 'storyworlds'::regclass
      ) THEN
        ALTER TABLE storyworlds
          ADD CONSTRAINT storyworlds_reader_theme_check
          CHECK (reader_theme IN ('editorial', 'terminal', 'archive', 'dispatch', 'signal'));
      END IF;
    END $$;

    -- Provenance migrations. These fields preserve the GitHub-native
    -- attribution record so Postgres can be rebuilt without depending on its
    -- previous serial IDs.
    ALTER TABLE provenance_records
      ADD COLUMN IF NOT EXISTS source_pr_number INTEGER;
    ALTER TABLE provenance_records
      ADD COLUMN IF NOT EXISTS contributor_identities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE provenance_records
      ADD COLUMN IF NOT EXISTS steward_github_identity TEXT;
    ALTER TABLE provenance_records
      ADD COLUMN IF NOT EXISTS decision TEXT NOT NULL DEFAULT 'accepted-into-canon';

    -- A GitHub identity maps to one local contributor record. PostgreSQL permits
    -- multiple NULL values, so contributors without a GitHub identity remain
    -- supported.
    DO $$ BEGIN
      -- A prior deployment may have created the backing unique index before
      -- this named constraint migration ran. Either database object enforces
      -- the required identity uniqueness; avoid trying to recreate it.
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contributors_github_identity_unique'
          AND conrelid = 'contributors'::regclass
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'contributors_github_identity_unique'
      ) THEN
        ALTER TABLE contributors
          ADD CONSTRAINT contributors_github_identity_unique UNIQUE (github_identity);
      END IF;
    END $$;

    -- One contributor row per platform identity. Required as the conflict
    -- target for the atomic upsert in the contribution submission route;
    -- without it PostgreSQL rejects ON CONFLICT (platform_identity).
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contributors_platform_identity_unique'
          AND conrelid = 'contributors'::regclass
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'contributors_platform_identity_unique'
      ) THEN
        ALTER TABLE contributors
          ADD CONSTRAINT contributors_platform_identity_unique UNIQUE (platform_identity);
      END IF;
    END $$;

    -- Migration: add contributions.agent_assisted (boolean, default false) for AI-assistance disclosure.
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name  = 'contributions'
          AND column_name = 'agent_assisted'
      ) THEN
        ALTER TABLE contributions ADD COLUMN agent_assisted BOOLEAN NOT NULL DEFAULT FALSE;
      END IF;
    END $$;

    -- Migration: add account-level login lockout columns to users.
    -- These survive server restarts (unlike the old in-memory express-rate-limit
    -- store) and are shared across all server instances.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS
      failed_login_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS
      locked_until TIMESTAMPTZ;

    -- Per-user transcription rate-limit tracking.
    -- Replaces the original in-memory Map in transcribe.ts so that counters
    -- survive restarts and are consistent across instances.
    CREATE TABLE IF NOT EXISTS transcribe_usage (
      user_id  INTEGER     NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      count    INTEGER     NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consent_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contributor_id INTEGER REFERENCES contributors(id) ON DELETE SET NULL,
      storyworld_id INTEGER REFERENCES storyworlds(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      scope_kind TEXT NOT NULL,
      scope_reference TEXT,
      status TEXT NOT NULL,
      policy_document_ref TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      policy_hash TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ,
      supersedes_consent_id UUID,
      recorded_via TEXT NOT NULL,
      request_id TEXT
    );
    CREATE INDEX IF NOT EXISTS consent_records_subject_scope_action_idx
      ON consent_records (subject_user_id, storyworld_id, action_type, recorded_at);
    CREATE INDEX IF NOT EXISTS consent_records_contributor_idx
      ON consent_records (contributor_id, recorded_at);

    DO $$ BEGIN
      CREATE TYPE moderation_case_status AS ENUM
        ('open', 'triaged', 'awaiting-steward', 'resolved', 'dismissed', 'appealed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE moderation_visibility_action AS ENUM
        ('none', 'hold', 'restricted', 'muted', 'blocked');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE moderation_subject_kind AS ENUM
        ('proposal', 'contribution', 'capsule', 'reaction', 'theory', 'account');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE moderation_reason_code AS ENUM
        ('spam', 'harassment', 'nsfw', 'plagiarism-review', 'rights-concern', 'safety', 'other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS moderation_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      storyworld_id INTEGER NOT NULL REFERENCES storyworlds(id) ON DELETE CASCADE,
      subject_kind moderation_subject_kind NOT NULL,
      subject_reference TEXT NOT NULL,
      opened_by_user_id INTEGER REFERENCES users(id),
      assigned_steward_id INTEGER REFERENCES stewards(id),
      status moderation_case_status NOT NULL DEFAULT 'open',
      visibility_action moderation_visibility_action NOT NULL DEFAULT 'none',
      primary_reason_code moderation_reason_code NOT NULL,
      contributor_message TEXT,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_moderation_cases_storyworld ON moderation_cases (storyworld_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases (status);

    CREATE TABLE IF NOT EXISTS moderation_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id UUID NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
      actor_user_id INTEGER REFERENCES users(id),
      event_type TEXT NOT NULL,
      reason_code moderation_reason_code,
      private_note TEXT,
      evidence_reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_moderation_events_case ON moderation_events (case_id);

    CREATE TABLE IF NOT EXISTS storyworld_moderation_controls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      storyworld_id INTEGER NOT NULL REFERENCES storyworlds(id) ON DELETE CASCADE,
      subject_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      control_kind TEXT NOT NULL CHECK (control_kind IN ('mute', 'block')),
      applies_to TEXT NOT NULL CHECK (applies_to IN ('reaction', 'theory', 'submission', 'contact', 'all-contributions')),
      reason_code moderation_reason_code NOT NULL,
      imposed_by_user_id INTEGER NOT NULL REFERENCES users(id),
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      lifted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_moderation_controls_storyworld ON storyworld_moderation_controls (storyworld_id);

    CREATE INDEX IF NOT EXISTS idx_story_paths_storyworld ON story_paths (storyworld_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_path ON contributions (path_id);
    CREATE INDEX IF NOT EXISTS idx_contribution_path_memberships_path ON contribution_path_memberships (path_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_path ON proposals (path_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_contributor ON proposals (contributor_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_github_user ON proposals (github_user_id);
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

    -- Clerk authentication support.
    -- password_hash is now nullable: Clerk-only users have no local bcrypt hash.
    -- clerk_id links the Clerk user identity to this local account row.
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
  `);
}
