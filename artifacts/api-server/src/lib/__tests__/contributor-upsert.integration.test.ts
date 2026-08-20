import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * This test deliberately exercises PostgreSQL rather than a Drizzle mock.
 * The submission route relies on this exact unique constraint for its atomic
 * contributor upsert; checking only a mocked fluent query would miss a fresh
 * deployment where the constraint was absent.
 *
 * All fixtures are created in one transaction and rolled back afterwards.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDatabase)(
  "contributor submission schema integration",
  () => {
    let client: {
      query: (
        sql: string,
        values?: readonly unknown[],
      ) => Promise<{ rows: Array<Record<string, unknown>> }>;
      release: () => void;
    };
    let storyworldId: number;
    let pathId: number;
    let contributionId: number;

    beforeAll(async () => {
      const { pool } = await import("@workspace/db");
      client = await pool.connect();
      await client.query("BEGIN");

      const suffix = `contribution-upsert-test-${Date.now()}`;
      const storyworld = await client.query(
        `INSERT INTO storyworlds
          (repo_owner, repo_name, title, canon_branch_ref)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [suffix, suffix, "Contributor upsert test", "main"],
      );
      storyworldId = Number(storyworld.rows[0]?.["id"]);

      const path = await client.query(
        `INSERT INTO story_paths (storyworld_id, branch_ref, title, state)
         VALUES ($1, $2, $3, 'open')
         RETURNING id`,
        [storyworldId, `path/${suffix}`, "Open test path"],
      );
      pathId = Number(path.rows[0]?.["id"]);
    });

    afterAll(async () => {
      await client.query("ROLLBACK");
      client.release();
    });

    it("upserts a first contributor and indexes its GitHub-backed contribution", async () => {
      const identity = `platform:integration-${Date.now()}`;
      const commitSha = `integration-${Date.now()}`;

      const contributor = await client.query(
        `INSERT INTO contributors (display_name, platform_identity, github_identity)
         VALUES ($1, $2, NULL)
         ON CONFLICT (platform_identity)
         DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id, platform_identity`,
        ["Integration Narrator", identity],
      );
      const contributorId = Number(contributor.rows[0]?.["id"]);
      expect(contributor.rows[0]?.["platform_identity"]).toBe(identity);

      const contribution = await client.query(
        `INSERT INTO contributions
          (storyworld_id, path_id, commit_sha, contributor_id, title, summary, agent_assisted)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING id, contributor_id, commit_sha`,
        [
          storyworldId,
          pathId,
          commitSha,
          contributorId,
          "A durable scene",
          "Indexed after its GitHub commit succeeds.",
        ],
      );
      contributionId = Number(contribution.rows[0]?.["id"]);

      await client.query(
        `INSERT INTO contribution_path_memberships (contribution_id, path_id)
         VALUES ($1, $2)`,
        [contributionId, pathId],
      );

      const indexed = await client.query(
        `SELECT c.commit_sha, c.contributor_id, cp.path_id
         FROM contributions c
         JOIN contribution_path_memberships cp ON cp.contribution_id = c.id
         WHERE c.id = $1`,
        [contributionId],
      );
      expect(indexed.rows).toEqual([
        {
          commit_sha: commitSha,
          contributor_id: contributorId,
          path_id: pathId,
        },
      ]);
    });
  },
);