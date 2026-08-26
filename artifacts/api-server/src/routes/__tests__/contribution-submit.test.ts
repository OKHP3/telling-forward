import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  insertedContribution: {
    id: 99,
    storyworldId: 1,
    pathId: 7,
    commitSha: "abc123",
    contributorId: 12,
    title: "The lantern room",
    summary: "The door opened.",
    agentAssisted: false,
    createdAt: new Date("2026-08-19T12:00:00.000Z"),
  },
  createBranch: vi.fn(),
  createCommit: vi.fn(),
  listCommitsForBranch: vi.fn(),
  getFileContent: vi.fn(),
  transaction: vi.fn(),
  hasActiveConsent: vi.fn(),
  insertValues: [] as Array<{ table: unknown; values: unknown }>,
  logEvents: [] as Array<{ level: string; args: unknown[] }>,
}));

const tables = vi.hoisted(() => ({
  storyworldsTable: { id: "storyworlds.id", repoOwner: "repo_owner", repoName: "repo_name" },
  storyPathsTable: {
    id: "story_paths.id",
    storyworldId: "story_paths.storyworld_id",
    branchRef: "story_paths.branch_ref",
    state: "story_paths.state",
  },
  contributionsTable: {
    id: "contributions.id",
    storyworldId: "contributions.storyworld_id",
    pathId: "contributions.path_id",
    commitSha: "contributions.commit_sha",
    contributorId: "contributions.contributor_id",
    title: "contributions.title",
    summary: "contributions.summary",
    agentAssisted: "contributions.agent_assisted",
    createdAt: "contributions.created_at",
  },
  contributionPathMembershipsTable: { contributionId: "memberships.contribution_id", pathId: "memberships.path_id" },
  contributorsTable: {
    id: "contributors.id",
    displayName: "contributors.display_name",
    platformIdentity: "contributors.platform_identity",
  },
  consentRecordsTable: {
    id: "consent_records.id",
    subjectUserId: "consent_records.subject_user_id",
    storyworldId: "consent_records.storyworld_id",
    actionType: "consent_records.action_type",
    status: "consent_records.status",
  },
  usersTable: { id: "users.id", displayName: "users.display_name", email: "users.email" },
}));

vi.mock("@workspace/db", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() =>
            Promise.resolve(
              table === tables.consentRecordsTable
                ? [{ id: "00000000-0000-0000-0000-000000000001" }]
                : state.selectResults.shift() ?? [],
            ),
          ),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => {
      const returning = vi.fn(() =>
        Promise.resolve(
          table === tables.contributorsTable
            ? [{ id: 12 }]
            : table === tables.contributionsTable
              ? [state.insertedContribution]
              : [],
        ),
      );
      return {
        values: vi.fn((values) => {
          state.insertValues.push({ table, values });
          return {
            returning,
            onConflictDoNothing: vi.fn(() => Promise.resolve()),
            onConflictDoUpdate: vi.fn(() => ({ returning })),
          };
        }),
      };
    }),
    transaction: state.transaction,
  };
  state.transaction.mockImplementation(async (callback) => callback(db));

  return {
    db,
    storyworldsTable: tables.storyworldsTable,
    storyPathsTable: tables.storyPathsTable,
    contributionsTable: tables.contributionsTable,
    contributionPathMembershipsTable: tables.contributionPathMembershipsTable,
    contributorsTable: tables.contributorsTable,
    consentRecordsTable: tables.consentRecordsTable,
    usersTable: tables.usersTable,
    proposalsTable: {},
    provenanceRecordsTable: {},
    stewardsTable: {},
  };
});

vi.mock("../../lib/github", () => ({
  getGitHubClient: () => ({
    createBranch: state.createBranch,
    createCommit: state.createCommit,
    listCommitsForBranch: state.listCommitsForBranch,
    getFileContent: state.getFileContent,
  }),
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 42 };
    next();
  },
}));

vi.mock("@workspace/api-zod", () => ({
  CreateContributionParams: {
    safeParse: (value: Record<string, string>) => {
      const id = Number(value?.id);
      const pathId = Number(value?.pathId);
      if (!Number.isSafeInteger(id) || !Number.isSafeInteger(pathId)) {
        return {
          success: false,
          error: { message: "Invalid storyworld or path id" },
        };
      }
      return { success: true, data: { id, pathId } };
    },
  },
  CreateContributionBody: {
    safeParse: (value: Record<string, unknown>) => {
      const input = value ?? {};
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const errors: string[] = [];
      if (typeof input.title !== "string" || input.title.length < 1) {
        errors.push("title is required");
      }
      if (typeof input.content !== "string" || input.content.length < 1) {
        errors.push("content is required");
      }
      if (typeof input.submissionId !== "string" || !uuid.test(input.submissionId)) {
        errors.push("submissionId must be a UUID");
      }
      if (input.agentAssisted !== undefined && typeof input.agentAssisted !== "boolean") {
        errors.push("agentAssisted must be a boolean");
      }
      for (const [name, valueToCheck] of [
        ["consentRecordId", input.consentRecordId],
        ["aiAssistedConsentRecordId", input.aiAssistedConsentRecordId],
      ] as const) {
        if (valueToCheck !== undefined &&
            (typeof valueToCheck !== "string" || !uuid.test(valueToCheck))) {
          errors.push(`${name} must be a UUID`);
        }
      }
      if (errors.length > 0) {
        return { success: false, error: { message: errors.join("; ") } };
      }
      return {
        success: true,
        data: {
          title: input.title,
          content: input.content,
          submissionId: input.submissionId,
          agentAssisted: input.agentAssisted ?? false,
          consentRecordId: input.consentRecordId ??
            "00000000-0000-0000-0000-000000000001",
          aiAssistedConsentRecordId: input.aiAssistedConsentRecordId ??
            "00000000-0000-0000-0000-000000000002",
        },
      };
    },
  },
  GetStoryworldParams: { safeParse: () => ({ success: false }) },
  ListStoryPathsParams: { safeParse: () => ({ success: false }) },
  ListContributionsParams: { safeParse: () => ({ success: false }) },
  ListStoryworldProposalsParams: { safeParse: () => ({ success: false }) },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: {} }));
vi.mock("../consents", () => ({
  hasActiveConsent: state.hasActiveConsent,
}));

import storyworldsRouter from "../storyworlds";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.log = {
      error: vi.fn((...args: unknown[]) => state.logEvents.push({ level: "error", args })),
      warn: vi.fn((...args: unknown[]) => state.logEvents.push({ level: "warn", args })),
      info: vi.fn((...args: unknown[]) => state.logEvents.push({ level: "info", args })),
    };
    next();
  });
  app.use("/", storyworldsRouter);
  return app;
}

describe("POST /storyworlds/:id/paths/:pathId/contributions", () => {
  beforeEach(() => {
    state.selectResults = [
      [{ repoOwner: "telling-forward", repoName: "world" }],
      [{ id: 7, storyworldId: 1, branchRef: "path/opening", state: "open" }],
      [{ displayName: "River Writer" }],
      [],
    ];
    state.createBranch.mockReset();
    state.createCommit.mockReset();
    state.listCommitsForBranch.mockReset();
    state.getFileContent.mockReset();
    state.transaction.mockReset();
    state.hasActiveConsent.mockReset();
    state.insertValues = [];
    state.logEvents = [];
    state.createBranch.mockResolvedValue(undefined);
    state.createCommit.mockResolvedValue("abc123");
    state.listCommitsForBranch.mockResolvedValue([]);
    state.getFileContent.mockResolvedValue("");
    state.transaction.mockImplementation(async (callback) => callback((await import("@workspace/db")).db));
    state.hasActiveConsent.mockResolvedValue(true);
  });

  function expectRejectedBeforeGitHub(response: request.Response, expectedText: string) {
    expect(response.status).toBe(400);
    expect(response.body.error).toContain(expectedText);
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).not.toHaveBeenCalled();
  }

  it.each([
    {
      label: "missing title",
      body: {
        content: "A scene without a title.",
        submissionId: "660e8400-e29b-41d4-a716-446655440010",
      },
      error: "title is required",
    },
    {
      label: "missing content",
      body: {
        title: "A scene without content",
        submissionId: "660e8400-e29b-41d4-a716-446655440011",
      },
      error: "content is required",
    },
    {
      label: "malformed submission id",
      body: {
        title: "Bad retry key",
        content: "This must not reach GitHub.",
        submissionId: "not-a-uuid",
      },
      error: "submissionId must be a UUID",
    },
    {
      label: "invalid submit consent id",
      body: {
        title: "Bad consent",
        content: "This must not reach GitHub.",
        submissionId: "660e8400-e29b-41d4-a716-446655440012",
        consentRecordId: "not-a-uuid",
      },
      error: "consentRecordId must be a UUID",
    },
    {
      label: "invalid AI consent id",
      body: {
        title: "Bad AI consent",
        content: "This must not reach GitHub.",
        submissionId: "660e8400-e29b-41d4-a716-446655440013",
        aiAssistedConsentRecordId: "not-a-uuid",
      },
      error: "aiAssistedConsentRecordId must be a UUID",
    },
  ])("rejects $label before any GitHub call", async ({ body, error }) => {
    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send(body);

    expectRejectedBeforeGitHub(response, error);
  });

  it.each([
    ["/not-a-number/paths/7/contributions", "Invalid storyworld or path id"],
    ["/1/paths/not-a-number/contributions", "Invalid storyworld or path id"],
  ])("rejects malformed path parameters before any GitHub call", async (url, error) => {
    const response = await request(buildApp())
      .post(url)
      .send({
        title: "Valid title",
        content: "Valid content.",
        submissionId: "660e8400-e29b-41d4-a716-446655440014",
      });

    expectRejectedBeforeGitHub(response, error);
  });

  it("commits the narration to the path's own branch and indexes it", async () => {
    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "The lantern room",
        content: "The door opened.",
        submissionId: "660e8400-e29b-41d4-a716-446655440000",
      });

    expect(response.status).toBe(201);
    // No extra branch: the path's branch IS the durable location of the scene,
    // so the path's Git history can always rebuild this contribution record.
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).toHaveBeenCalledTimes(1);
    const commitInput = state.createCommit.mock.calls[0]?.[0] as {
      branch: string;
      files: Record<string, string>;
      owner: string;
      repo: string;
      authorName: string;
      authorEmail: string;
      message: string;
    };
    expect(commitInput.branch).toBe("path/opening");
    expect(commitInput.owner).toBe("telling-forward");
    expect(commitInput.repo).toBe("world");
    // Git commit author must use the platform service identity — NEVER a user's
    // personal email, which would be durable PII visible to anyone with repo access.
    expect(commitInput.authorEmail).not.toContain("river@example.test");
    expect(commitInput.authorEmail).toMatch(/@/); // is a real email address
    expect(commitInput.authorName).not.toBe("River Writer"); // not the user's display name
    // Real attribution is in the commit message trailer only (platform identity +
    // display name). The Postgres contributor record is the authoritative source.
    expect(commitInput.message).toContain("Telling-Forward-Narration: v1");
    expect(commitInput.message).toContain("Platform-Attribution: platform:42");
    expect(commitInput.message).toContain(
      "Submission-Id: 660e8400-e29b-41d4-a716-446655440000",
    );
    expect(Object.keys(commitInput.files)).toHaveLength(1);
    const fileContent = Object.values(commitInput.files)[0] as string;
    expect(fileContent).toContain("The door opened.");
    expect(response.body).toMatchObject({
      id: 99,
      title: "The lantern room",
      summary: "The door opened.",
      contributorDisplayName: "River Writer",
    });
  });

  it("preserves the agent-assistance disclosure in the indexed contribution", async () => {
    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "A drafted scene",
        content: "The lantern answered first.",
        submissionId: "660e8400-e29b-41d4-a716-446655440006",
        agentAssisted: true,
      });

    expect(response.status).toBe(201);
    expect(state.insertValues).toContainEqual(
      expect.objectContaining({
        table: tables.contributionsTable,
        values: expect.objectContaining({ agentAssisted: true }),
      }),
    );
  });

  it("rejects a path that is not open before touching GitHub", async () => {
    state.selectResults[1] = [
      { id: 7, storyworldId: 1, branchRef: "path/personal", state: "personal" },
    ];

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Not yet",
        content: "This path is private.",
        submissionId: "660e8400-e29b-41d4-a716-446655440001",
      });

    expect(response.status).toBe(409);
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).not.toHaveBeenCalled();
  });

  it("rejects a path that closes after it was selected before touching GitHub", async () => {
    // The mobile list showed this path while it was open. A steward closes it
    // before the contributor taps Submit, so the server must re-check state.
    const pathSelectedByMobile = {
      id: 7,
      storyworldId: 1,
      branchRef: "path/opening",
      state: "open",
    };
    expect(pathSelectedByMobile.state).toBe("open");

    state.selectResults[1] = [
      { ...pathSelectedByMobile, state: "closed" },
    ];

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Too late",
        content: "The path closed while I was writing.",
        submissionId: "660e8400-e29b-41d4-a716-446655440006",
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "This story path is not open for contributions",
    });
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).not.toHaveBeenCalled();
  });

  it("fails closed with a privacy-safe event when the consent lookup is unavailable", async () => {
    state.hasActiveConsent.mockRejectedValueOnce(new Error("database connection lost"));

    const response = await request(buildApp())
      .post(
        "/1/paths/7/contributions?consentRecordId=22222222-2222-4222-8222-222222222222&privateNote=keep-this-out",
      )
      .send({
        title: "Unavailable policy check",
        content: "PRIVATE CONSENT CONTENT — this must not reach GitHub.",
        submissionId: "660e8400-e29b-41d4-a716-446655440015",
        consentRecordId: "11111111-1111-4111-8111-111111111111",
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "Consent verification is temporarily unavailable; contribution was not saved",
    });
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).not.toHaveBeenCalled();
    expect(state.listCommitsForBranch).not.toHaveBeenCalled();
    expect(state.insertValues).toHaveLength(0);
    expect(state.logEvents).toEqual([
      {
        level: "error",
        args: [
          { storyworldId: 1, pathId: 7, actionType: "submit-branch" },
          "createContribution consent lookup unavailable",
        ],
      },
    ]);

    const capturedLogEvent = JSON.stringify(state.logEvents[0]);
    expect(capturedLogEvent).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(capturedLogEvent).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(capturedLogEvent).not.toContain("keep-this-out");
    expect(capturedLogEvent).not.toContain("PRIVATE CONSENT CONTENT");
  });

  it("fails closed when the AI-assistance consent lookup is unavailable", async () => {
    state.hasActiveConsent
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("database connection lost"));

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Unavailable AI policy check",
        content: "This must not reach GitHub.",
        submissionId: "660e8400-e29b-41d4-a716-446655440016",
        agentAssisted: true,
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "Consent verification is temporarily unavailable; contribution was not saved",
    });
    expect(state.createBranch).not.toHaveBeenCalled();
    expect(state.createCommit).not.toHaveBeenCalled();
    expect(state.listCommitsForBranch).not.toHaveBeenCalled();
    expect(state.insertValues).toHaveLength(0);
  });

  it("does not index a contribution when the GitHub commit fails", async () => {
    state.createCommit.mockRejectedValue(new Error("GitHub unavailable"));

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Lost scene",
        content: "This must not be indexed.",
        submissionId: "660e8400-e29b-41d4-a716-446655440002",
      });

    // No pseudo-SHA fallback: an indexed record without a durable Git source
    // would violate the source-of-truth contract, so the request fails whole.
    expect(response.status).toBe(502);
  });

  it("reuses the committed narration after an index transaction fails", async () => {
    const submissionId = "660e8400-e29b-41d4-a716-446655440003";
    state.transaction.mockRejectedValueOnce(new Error("DB unavailable"));

    const first = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({ title: "Recovered scene", content: "Git is durable.", submissionId });
    expect(first.status).toBe(500);
    expect(state.createCommit).toHaveBeenCalledTimes(1);

    state.listCommitsForBranch.mockResolvedValue([
      {
        sha: "abc123",
        message: [
          "Add narration",
          "",
          "Telling-Forward-Narration: v1",
          `Submission-Id: ${submissionId}`,
          "Platform-Attribution: platform:42",
          `Title-B64: ${Buffer.from("Recovered scene").toString("base64url")}`,
          `Display-Name-B64: ${Buffer.from("River Writer").toString("base64url")}`,
        ].join("\n"),
        authorName: "Telling Forward",
        authorEmail: "noreply@tellingforward.app",
        authorLogin: null,
        timestamp: "2026-08-19T12:00:00.000Z",
      },
    ]);
    state.getFileContent.mockResolvedValue("# Recovered scene\n\nGit is durable.\n");
    state.selectResults = [
      [{ repoOwner: "telling-forward", repoName: "world" }],
      [{ id: 7, storyworldId: 1, branchRef: "path/opening", state: "open" }],
      [{ displayName: "River Writer" }],
    ];

    const retry = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({ title: "Recovered scene", content: "Git is durable.", submissionId });
    expect(retry.status).toBe(201);
    expect(state.createCommit).toHaveBeenCalledTimes(1);
  });

  it("deduplicates a retry using the same submission id instead of creating another commit", async () => {
    const submissionId = "660e8400-e29b-41d4-a716-446655440007";
    const committed = {
      sha: "same-submission-sha",
      message: [
        "Add narration",
        "",
        "Telling-Forward-Narration: v1",
        `Submission-Id: ${submissionId}`,
        "Platform-Attribution: platform:42",
        `Title-B64: ${Buffer.from("One scene").toString("base64url")}`,
        `Display-Name-B64: ${Buffer.from("River Writer").toString("base64url")}`,
      ].join("\n"),
      authorName: "Telling Forward",
      authorEmail: "noreply@telling-forward.app",
      authorLogin: null,
      timestamp: "2026-08-19T12:00:00.000Z",
    };
    state.listCommitsForBranch.mockResolvedValue([committed]);
    state.getFileContent.mockResolvedValue("# One scene\n\nSame scene.\n");

    const first = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({ title: "One scene", content: "Same scene.", submissionId });
    state.selectResults = [
      [{ repoOwner: "telling-forward", repoName: "world" }],
      [{ id: 7, storyworldId: 1, branchRef: "path/opening", state: "open" }],
      [{ displayName: "River Writer" }],
    ];
    const second = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({ title: "One scene", content: "Same scene.", submissionId });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(state.createCommit).not.toHaveBeenCalled();
    expect(state.listCommitsForBranch).toHaveBeenCalledTimes(2);
  });

  it("rejects altered text when a submission id already has a committed narration", async () => {
    const submissionId = "660e8400-e29b-41d4-a716-446655440004";
    state.listCommitsForBranch.mockResolvedValue([
      {
        sha: "existing-sha",
        message: [
          "Add narration",
          "",
          "Telling-Forward-Narration: v1",
          `Submission-Id: ${submissionId}`,
          "Platform-Attribution: platform:42",
          `Title-B64: ${Buffer.from("Immutable scene").toString("base64url")}`,
          `Display-Name-B64: ${Buffer.from("River Writer").toString("base64url")}`,
        ].join("\n"),
        authorName: "Telling Forward",
        authorEmail: "noreply@tellingforward.app",
        authorLogin: null,
        timestamp: "2026-08-19T12:00:00.000Z",
      },
    ]);
    state.getFileContent.mockResolvedValue("# Immutable scene\n\nCommitted text.\n");

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Immutable scene",
        content: "Changed only in the request.",
        submissionId,
      });

    expect(response.status).toBe(409);
    expect(state.createCommit).not.toHaveBeenCalled();
  });

  it("finds a delayed retry beyond five newer path commits", async () => {
    const submissionId = "660e8400-e29b-41d4-a716-446655440005";
    const existingCommit = {
      sha: "old-narration-sha",
      message: [
        "Add narration",
        "",
        "Telling-Forward-Narration: v1",
        `Submission-Id: ${submissionId}`,
        "Platform-Attribution: platform:42",
        `Title-B64: ${Buffer.from("Delayed scene").toString("base64url")}`,
        `Display-Name-B64: ${Buffer.from("River Writer").toString("base64url")}`,
      ].join("\n"),
      authorName: "Telling Forward",
      authorEmail: "noreply@tellingforward.app",
      authorLogin: null,
      timestamp: "2026-08-19T12:00:00.000Z",
    };
    state.listCommitsForBranch.mockResolvedValue([
      ...Array.from({ length: 6 }, (_, index) => ({
        sha: `newer-${index}`,
        message: "Ordinary path commit",
        authorName: "Telling Forward",
        authorEmail: "noreply@tellingforward.app",
        authorLogin: null,
        timestamp: "2026-08-19T12:00:00.000Z",
      })),
      existingCommit,
    ]);
    state.getFileContent.mockResolvedValue("# Delayed scene\n\nStill the same.\n");

    const response = await request(buildApp())
      .post("/1/paths/7/contributions")
      .send({
        title: "Delayed scene",
        content: "Still the same.",
        submissionId,
      });

    expect(response.status).toBe(201);
    expect(state.createCommit).not.toHaveBeenCalled();
    expect(state.listCommitsForBranch).toHaveBeenCalledWith(
      "telling-forward",
      "world",
      "path/opening",
    );
  });
});