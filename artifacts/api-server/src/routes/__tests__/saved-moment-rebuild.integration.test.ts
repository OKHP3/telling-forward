import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const describeWithDatabase = process.env["DATABASE_URL"] ? describe : describe.skip;

vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: {} }));

import { pool } from "@workspace/db";
import {
  indexSavedMoment,
  replacePathMomentMemberships,
} from "../../lib/provenance";
import storyworldsRouter from "../storyworlds";

describeWithDatabase("saved moment discovery after reconciliation", () => {
  let client: {
    query: (
      sql: string,
      values?: readonly unknown[],
    ) => Promise<{ rows: Array<Record<string, unknown>> }>;
    release: () => void;
  };
  let storyworldId: number;
  let firstPathId: number;
  let secondPathId: number;
  let contributorId: number;
  let stewardUserId: number;
  let app: express.Express;

  beforeAll(async () => {
    client = await pool.connect();
    const suffix = `saved-moment-rebuild-${Date.now()}`;

    const world = await client.query(
      `INSERT INTO storyworlds
        (repo_owner, repo_name, title, canon_branch_ref)
       VALUES ($1, $2, $3, 'main')
       RETURNING id`,
      [suffix, `${suffix}-repo`, "Saved Moment Rebuild"],
    );
    storyworldId = Number(world.rows[0]?.["id"]);

    const user = await client.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`${suffix}-steward@example.test`, "test-only-password-hash", "Rebuild Steward"],
    );
    stewardUserId = Number(user.rows[0]?.["id"]);

    await client.query(
      `INSERT INTO stewards (storyworld_id, user_id, role)
       VALUES ($1, $2, 'steward')`,
      [storyworldId, stewardUserId],
    );

    const paths = await client.query(
      `INSERT INTO story_paths
        (storyworld_id, branch_ref, title, state)
       VALUES ($1, $2, $3, 'open'), ($1, $4, $5, 'proposed')
       RETURNING id, branch_ref`,
      [
        storyworldId,
        `${suffix}-path-a`,
        "Path A",
        `${suffix}-path-b`,
        "Path B",
      ],
    );
    firstPathId = Number(
      paths.rows.find((row) => row["branch_ref"] === `${suffix}-path-a`)?.["id"],
    );
    secondPathId = Number(
      paths.rows.find((row) => row["branch_ref"] === `${suffix}-path-b`)?.["id"],
    );

    const contributor = await client.query(
      `INSERT INTO contributors
        (display_name, platform_identity, github_identity)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Rebuild Contributor",
        `${suffix}-platform`,
        `github:rebuild-${storyworldId}`,
      ],
    );
    contributorId = Number(contributor.rows[0]?.["id"]);

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.session = { userId: stewardUserId };
      next();
    });
    app.use("/", storyworldsRouter);
  });

  afterAll(async () => {
    await client.query(
      `DELETE FROM contribution_path_memberships
       WHERE contribution_id IN (
         SELECT id FROM contributions WHERE storyworld_id = $1
       )`,
      [storyworldId],
    );
    await client.query(
      `DELETE FROM contributions WHERE storyworld_id = $1`,
      [storyworldId],
    );
    await client.query(
      `DELETE FROM story_paths WHERE storyworld_id = $1`,
      [storyworldId],
    );
    await client.query(
      `DELETE FROM stewards WHERE storyworld_id = $1`,
      [storyworldId],
    );
    await client.query(
      `DELETE FROM storyworlds WHERE id = $1`,
      [storyworldId],
    );
    await client.query(
      `DELETE FROM users WHERE id = $1`,
      [stewardUserId],
    );
    await client.query(
      `DELETE FROM contributors WHERE id = $1`,
      [contributorId],
    );
    client.release();
  });

  it("stops counting a saved moment after its last path membership is removed", async () => {
    const commit = {
      sha: `orphaned-rebuild-commit-${storyworldId}`,
      message: "An orphaned saved moment",
      authorName: "Rebuild Contributor",
      authorEmail: "rebuild@example.test",
      authorLogin: `rebuild-${storyworldId}`,
      timestamp: "2026-08-20T12:00:00.000Z",
    };

    await indexSavedMoment(storyworldId, firstPathId, commit);
    await replacePathMomentMemberships(storyworldId, firstPathId, []);

    const discovery = await request(app).get("/");
    const detail = await request(app).get(`/${storyworldId}`);
    const update = await request(app)
      .patch(`/${storyworldId}`)
      .send({ seed: "The last path has gone quiet." });

    expect(discovery.status).toBe(200);
    expect(discovery.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: storyworldId,
          savedMomentCount: 0,
        }),
      ]),
    );
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: storyworldId,
      savedMomentCount: 0,
    });
    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({
      id: storyworldId,
      savedMomentCount: 0,
    });
  });

  it("counts one shared saved moment after one path membership is removed", async () => {
    const commit = {
      sha: `shared-rebuild-commit-${storyworldId}`,
      message: "A shared saved moment",
      authorName: "Rebuild Contributor",
      authorEmail: "rebuild@example.test",
      authorLogin: `rebuild-${storyworldId}`,
      timestamp: "2026-08-20T12:00:00.000Z",
    };

    await indexSavedMoment(storyworldId, firstPathId, commit);
    await indexSavedMoment(storyworldId, secondPathId, commit);
    await replacePathMomentMemberships(storyworldId, firstPathId, []);

    const discovery = await request(app).get("/");
    const detail = await request(app).get(`/${storyworldId}`);
    const update = await request(app)
      .patch(`/${storyworldId}`)
      .send({ seed: "One path still carries the moment." });

    expect(discovery.status).toBe(200);
    expect(discovery.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: storyworldId,
          pathCount: 2,
          savedMomentCount: 1,
        }),
      ]),
    );
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: storyworldId,
      savedMomentCount: 1,
    });
    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({
      id: storyworldId,
      savedMomentCount: 1,
    });

    const membershipCount = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM contribution_path_memberships m
       INNER JOIN contributions c ON c.id = m.contribution_id
       WHERE c.storyworld_id = $1`,
      [storyworldId],
    );
    expect(Number(membershipCount.rows[0]?.["count"])).toBe(1);

    const contributionCount = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM contributions
       WHERE storyworld_id = $1`,
      [storyworldId],
    );
    // Reconciliation removes the path membership, not the durable contribution
    // record, so it remains available for a future re-index.
    expect(Number(contributionCount.rows[0]?.["count"])).toBe(2);
  });
});