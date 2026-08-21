import { afterAll, beforeAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env["DATABASE_URL"] ? describe : describe.skip;

describeWithDatabase("consent contribution gate", () => {
  let client: {
    query: (
      sql: string,
      values?: readonly unknown[],
    ) => Promise<{ rows: Array<Record<string, unknown>> }>;
    release: () => void;
  };
  let userId: number;
  let otherUserId: number;
  let storyworldId: number;
  let otherStoryworldId: number;

  beforeAll(async () => {
    const { pool } = await import("@workspace/db");
    client = await pool.connect();

    const suffix = `consent-gate-${Date.now()}`;
    const users = await client.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3), ($4, $5, $6)
       RETURNING id, email`,
      [
        `${suffix}-one@example.test`,
        "test-only-password-hash",
        "Consent One",
        `${suffix}-two@example.test`,
        "test-only-password-hash",
        "Consent Two",
      ],
    );
    userId = Number(users.rows.find((row) => row["email"] === `${suffix}-one@example.test`)?.["id"]);
    otherUserId = Number(users.rows.find((row) => row["email"] === `${suffix}-two@example.test`)?.["id"]);

    const worlds = await client.query(
      `INSERT INTO storyworlds
        (repo_owner, repo_name, title, canon_branch_ref)
       VALUES ($1, $2, $3, 'main'), ($4, $5, $6, 'main')
       RETURNING id, repo_owner`,
      [
        suffix,
        `${suffix}-one`,
        "Consent Gate One",
        `${suffix}-two`,
        `${suffix}-two`,
        "Consent Gate Two",
      ],
    );
    storyworldId = Number(worlds.rows.find((row) => row["repo_owner"] === suffix)?.["id"]);
    otherStoryworldId = Number(
      worlds.rows.find((row) => row["repo_owner"] === `${suffix}-two`)?.["id"],
    );
  });

  afterAll(async () => {
    await client.query("DELETE FROM consent_records WHERE storyworld_id IN ($1, $2)", [
      storyworldId,
      otherStoryworldId,
    ]);
    await client.query("DELETE FROM storyworlds WHERE id IN ($1, $2)", [
      storyworldId,
      otherStoryworldId,
    ]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2)", [
      userId,
      otherUserId,
    ]);
    client.release();
  });

  async function addConsent(values: {
    subjectUserId: number;
    storyworldId: number;
    actionType?: string;
    status?: string;
    supersedesConsentId?: string;
  }): Promise<string> {
    const result = await client.query(
      `INSERT INTO consent_records
        (subject_user_id, storyworld_id, action_type, scope_kind, status,
         policy_document_ref, policy_version, policy_hash, recorded_via,
         supersedes_consent_id, revoked_at)
       VALUES ($1, $2, $3, 'storyworld', $4,
               'docs/decisions/consent-ladder-design.md',
               'private-pilot-v1',
               'consent-ladder-design:private-pilot-v1',
               'integration-test',
               $5,
               CASE WHEN $4 = 'revoked' THEN NOW() ELSE NULL END)
       RETURNING id`,
      [
        values.subjectUserId,
        values.storyworldId,
        values.actionType ?? "submit-branch",
        values.status ?? "granted",
        values.supersedesConsentId ?? null,
      ],
    );
    return String(result.rows[0]?.["id"]);
  }

  it("rejects a previously granted record after its append-only revocation", async () => {
    const grantedId = await addConsent({ subjectUserId: userId, storyworldId });
    await addConsent({
      subjectUserId: userId,
      storyworldId,
      status: "revoked",
      supersedesConsentId: grantedId,
    });

    const { hasActiveConsent } = await import("../consents");
    await expect(
      hasActiveConsent(userId, grantedId, storyworldId, "submit-branch"),
    ).resolves.toBe(false);
  });

  it("rejects a consent record when the authenticated user or storyworld does not match", async () => {
    const userScopedId = await addConsent({ subjectUserId: otherUserId, storyworldId });
    const worldScopedId = await addConsent({
      subjectUserId: userId,
      storyworldId: otherStoryworldId,
    });
    const { hasActiveConsent } = await import("../consents");

    await expect(
      hasActiveConsent(userId, userScopedId, storyworldId, "submit-branch"),
    ).resolves.toBe(false);
    await expect(
      hasActiveConsent(userId, worldScopedId, storyworldId, "submit-branch"),
    ).resolves.toBe(false);
  });

  it("accepts only an active, matching submit-branch record", async () => {
    const grantedId = await addConsent({ subjectUserId: userId, storyworldId });
    const rows = await client.query(
      `SELECT id, subject_user_id, storyworld_id, action_type, status,
              supersedes_consent_id
       FROM consent_records
       WHERE id = $1`,
      [grantedId],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      subject_user_id: userId,
      storyworld_id: storyworldId,
      action_type: "submit-branch",
      status: "granted",
    });
    const activeCheck = await client.query(
      `SELECT NOT EXISTS (
         SELECT 1 FROM consent_records revoked
         WHERE revoked.supersedes_consent_id = $1
           AND revoked.status = 'revoked'
       ) AS active`,
      [grantedId],
    );
    expect(activeCheck.rows[0]?.["active"]).toBe(true);
    const { hasActiveConsent } = await import("../consents");

    await expect(
      hasActiveConsent(userId, grantedId, storyworldId, "submit-branch"),
    ).resolves.toBe(true);
    await expect(
      hasActiveConsent(userId, grantedId, storyworldId, "ai-assisted-draft"),
    ).resolves.toBe(false);
  });
});