import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const describeWithDatabase = process.env["DATABASE_URL"] ? describe : describe.skip;
const authState = vi.hoisted(() => ({ userId: 0 }));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: authState.userId };
    next();
  },
}));

import moderationRouter from "../moderation";

describeWithDatabase("private moderation storyworld isolation", () => {
  let client: {
    query: (
      sql: string,
      values?: readonly unknown[],
    ) => Promise<{ rows: Array<Record<string, unknown>> }>;
    release: () => void;
  };
  let stewardUserId: number;
  let subjectUserId: number;
  let storyworldOneId: number;
  let storyworldTwoId: number;
  let worldOneCaseId: string;
  let worldTwoCaseId: string;
  let worldOneSpamCaseId: string;
  let worldOneHarassmentCaseId: string;
  let worldOneStaleCaseId: string;
  let worldTwoSpamCaseId: string;
  let worldOneControlId: string;
  let worldTwoControlId: string;
  let app: express.Express;

  beforeAll(async () => {
    const { pool } = await import("@workspace/db");
    client = await pool.connect();
    const suffix = `moderation-isolation-${Date.now()}`;

    const users = await client.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3), ($4, $5, $6)
       RETURNING id, email`,
      [
        `${suffix}-steward@example.test`,
        "test-only-password-hash",
        "Moderation Steward",
        `${suffix}-subject@example.test`,
        "test-only-password-hash",
        "Moderation Subject",
      ],
    );
    stewardUserId = Number(
      users.rows.find((row) => row["email"] === `${suffix}-steward@example.test`)?.["id"],
    );
    subjectUserId = Number(
      users.rows.find((row) => row["email"] === `${suffix}-subject@example.test`)?.["id"],
    );

    const worlds = await client.query(
      `INSERT INTO storyworlds
        (repo_owner, repo_name, title, canon_branch_ref)
       VALUES ($1, $2, $3, 'main'), ($4, $5, $6, 'main')
       RETURNING id, repo_owner`,
      [
        suffix,
        `${suffix}-one`,
        "Moderation Isolation One",
        `${suffix}-two`,
        `${suffix}-two`,
        "Moderation Isolation Two",
      ],
    );
    storyworldOneId = Number(
      worlds.rows.find((row) => row["repo_owner"] === suffix)?.["id"],
    );
    storyworldTwoId = Number(
      worlds.rows.find((row) => row["repo_owner"] === `${suffix}-two`)?.["id"],
    );

    await client.query(
      `INSERT INTO stewards (storyworld_id, user_id, role)
       VALUES ($1, $2, 'steward')`,
      [storyworldOneId, stewardUserId],
    );

    async function addCase(values: {
      storyworldId: number;
      status?: string;
      reason?: string;
      subjectReference: string;
    }): Promise<string> {
      const result = await client.query(
        `INSERT INTO moderation_cases
          (storyworld_id, subject_kind, subject_reference, opened_by_user_id,
           primary_reason_code, status, visibility_action)
         VALUES ($1, 'contribution', $2, $3, $4, $5, 'none')
         RETURNING id`,
        [
          values.storyworldId,
          values.subjectReference,
          stewardUserId,
          values.reason ?? "spam",
          values.status ?? "open",
        ],
      );
      return String(result.rows[0]?.["id"]);
    }

    worldOneCaseId = await addCase({
      storyworldId: storyworldOneId,
      subjectReference: `${suffix}-world-one-case`,
    });
    worldTwoCaseId = await addCase({
      storyworldId: storyworldTwoId,
      subjectReference: `${suffix}-world-two-case`,
    });
    worldOneSpamCaseId = await addCase({
      storyworldId: storyworldOneId,
      subjectReference: `${suffix}-world-one-spam`,
    });
    worldOneHarassmentCaseId = await addCase({
      storyworldId: storyworldOneId,
      reason: "harassment",
      subjectReference: `${suffix}-world-one-harassment`,
    });
    worldOneStaleCaseId = await addCase({
      storyworldId: storyworldOneId,
      status: "dismissed",
      subjectReference: `${suffix}-world-one-stale`,
    });
    worldTwoSpamCaseId = await addCase({
      storyworldId: storyworldTwoId,
      subjectReference: `${suffix}-world-two-spam`,
    });

    const controls = await client.query(
      `INSERT INTO storyworld_moderation_controls
        (storyworld_id, subject_user_id, control_kind, applies_to,
         reason_code, imposed_by_user_id)
       VALUES ($1, $2, 'mute', 'reaction', 'spam', $3),
              ($4, $2, 'block', 'all-contributions', 'safety', $3)
       RETURNING id, storyworld_id`,
      [storyworldOneId, subjectUserId, stewardUserId, storyworldTwoId],
    );
    worldOneControlId = String(
      controls.rows.find((row) => Number(row["storyworld_id"]) === storyworldOneId)?.["id"],
    );
    worldTwoControlId = String(
      controls.rows.find((row) => Number(row["storyworld_id"]) === storyworldTwoId)?.["id"],
    );

    authState.userId = stewardUserId;
    app = express();
    app.use(express.json());
    app.use("/", moderationRouter);
  });

  afterAll(async () => {
    await client.query(
      `DELETE FROM storyworld_moderation_controls
       WHERE id IN ($1, $2)`,
      [worldOneControlId, worldTwoControlId],
    );
    await client.query(
      `DELETE FROM moderation_cases
       WHERE id = ANY($1::uuid[])`,
      [[
        worldOneCaseId,
        worldTwoCaseId,
        worldOneSpamCaseId,
        worldOneHarassmentCaseId,
        worldOneStaleCaseId,
        worldTwoSpamCaseId,
      ]],
    );
    await client.query(
      `DELETE FROM stewards WHERE storyworld_id IN ($1, $2)`,
      [storyworldOneId, storyworldTwoId],
    );
    await client.query(
      `DELETE FROM storyworlds WHERE id IN ($1, $2)`,
      [storyworldOneId, storyworldTwoId],
    );
    await client.query(
      `DELETE FROM users WHERE id IN ($1, $2)`,
      [stewardUserId, subjectUserId],
    );
    client.release();
  });

  async function caseState(caseId: string) {
    const result = await client.query(
      `SELECT status, visibility_action
       FROM moderation_cases WHERE id = $1`,
      [caseId],
    );
    return result.rows[0];
  }

  it("lists only the steward's storyworld and denies another storyworld", async () => {
    const own = await request(app).get(`/storyworlds/${storyworldOneId}/moderation/cases`);
    expect(own.status).toBe(200);
    expect(own.body).toHaveLength(4);
    expect(own.body.every((item: { id: string }) =>
      [
        worldOneCaseId,
        worldOneSpamCaseId,
        worldOneHarassmentCaseId,
        worldOneStaleCaseId,
      ].includes(item.id),
    )).toBe(true);

    const ownAction = await request(app)
      .post(`/moderation/cases/${worldOneCaseId}/action`)
      .send({ status: "triaged", visibilityAction: "hold" });
    expect(ownAction.status).toBe(200);
    expect(await caseState(worldOneCaseId)).toMatchObject({
      status: "triaged",
      visibility_action: "hold",
    });

    const ownControls = await request(app)
      .get(`/storyworlds/${storyworldOneId}/moderation/controls`);
    expect(ownControls.status).toBe(200);
    expect(ownControls.body).toHaveLength(1);
    expect(ownControls.body[0].id).toBe(worldOneControlId);

    const other = await request(app).get(`/storyworlds/${storyworldTwoId}/moderation/cases`);
    expect(other.status).toBe(403);
    expect(other.body.error).toMatch(/not a steward/i);
  });

  it("blocks cross-world case, event, and moderation-control access without changing data", async () => {
    const crossWorldAction = await request(app)
      .post(`/moderation/cases/${worldTwoCaseId}/action`)
      .send({ status: "dismissed", visibilityAction: "none" });
    expect(crossWorldAction.status).toBe(403);
    expect(await caseState(worldTwoCaseId)).toMatchObject({
      status: "open",
      visibility_action: "none",
    });

    const crossWorldEvent = await request(app)
      .post(`/moderation/cases/${worldTwoCaseId}/events`)
      .send({ eventType: "case-triaged", reasonCode: "spam" });
    expect(crossWorldEvent.status).toBe(403);

    const otherControls = await request(app)
      .get(`/storyworlds/${storyworldTwoId}/moderation/controls`);
    expect(otherControls.status).toBe(403);

    const crossWorldLift = await request(app)
      .post(`/moderation/controls/${worldTwoControlId}/lift`)
      .send({});
    expect(crossWorldLift.status).toBe(403);
    const control = await client.query(
      `SELECT lifted_at FROM storyworld_moderation_controls WHERE id = $1`,
      [worldTwoControlId],
    );
    expect(control.rows[0]?.["lifted_at"]).toBeNull();
  });

  it("rejects mixed, stale, and cross-world batch dismissals atomically", async () => {
    const mixed = await request(app)
      .post(`/storyworlds/${storyworldOneId}/moderation/batch-dismiss`)
      .send({
        caseIds: [worldOneSpamCaseId, worldOneHarassmentCaseId],
        reasonCode: "spam",
        confirm: true,
      });
    expect(mixed.status).toBe(409);

    const stale = await request(app)
      .post(`/storyworlds/${storyworldOneId}/moderation/batch-dismiss`)
      .send({
        caseIds: [worldOneSpamCaseId, worldOneStaleCaseId],
        reasonCode: "spam",
        confirm: true,
      });
    expect(stale.status).toBe(409);

    const crossWorld = await request(app)
      .post(`/storyworlds/${storyworldOneId}/moderation/batch-dismiss`)
      .send({
        caseIds: [worldOneSpamCaseId, worldTwoSpamCaseId],
        reasonCode: "spam",
        confirm: true,
      });
    expect(crossWorld.status).toBe(409);

    expect(await caseState(worldOneSpamCaseId)).toMatchObject({
      status: "open",
      visibility_action: "none",
    });
    expect(await caseState(worldOneHarassmentCaseId)).toMatchObject({
      status: "open",
      visibility_action: "none",
    });
    expect(await caseState(worldOneStaleCaseId)).toMatchObject({
      status: "dismissed",
      visibility_action: "none",
    });
    expect(await caseState(worldTwoSpamCaseId)).toMatchObject({
      status: "open",
      visibility_action: "none",
    });
  });
});