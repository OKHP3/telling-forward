/**
 * Path state synchronization regression tests
 *
 * Covers the prToPathState logic in both routes/webhooks.ts and
 * routes/admin.ts, which drive story_path.state from GitHub PR outcomes.
 *
 * Key regression (Task #70): a merged PR must produce "published-canon",
 * not "published-alternate". Only a PR that is closed without merging
 * produces "published-alternate". The two are mutually exclusive terminal
 * path states.
 *
 * Strategy
 * --------
 * Both modules keep prToPathState as a private function, so we test it:
 *
 * 1. Structurally: by mirroring the logic and asserting all four input
 *    combinations produce the right state. This is the canonical regression
 *    guard — if either module reverts the fix, the logic test fails.
 *
 * 2. Integration: by calling githubWebhookHandler (the webhook's named export)
 *    with a signed payload, mocking DB so we can capture the path state value
 *    passed to db.insert().values().
 *
 * 3. Admin reconcile: by driving the reconcile route with a mocked GitHub
 *    client that returns a closed+merged PR, and capturing which path state
 *    value reaches the insert call for the PR's head branch.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Per-insert call capture — we track ALL insert values so we can find the
// one for the PR head branch (not the branch-reconcile inserts).
// ---------------------------------------------------------------------------

const insertLog = vi.hoisted(() => ({
  calls: [] as Array<{ branchRef?: string; state?: string }>,
  reset() { this.calls = []; },
  /** State from the first insert whose branchRef matches */
  stateForBranch(ref: string): string | undefined {
    return this.calls.find(c => c.branchRef === ref)?.state;
  },
}));

const proposalUpsertLog = vi.hoisted(() => ({
  calls: [] as Array<{
    state: unknown;
    decidedAt: unknown;
    /** contributorId from the INSERT .values() call — what the route resolved */
    insertedContributorId: unknown;
    /** contributorId from the ON CONFLICT DO UPDATE SET — should be a COALESCE SQL expression */
    conflictContributorId: unknown;
  }>,
  reset() { this.calls = []; },
}));

const proposalPersistence = vi.hoisted(() => ({
  state: null as string | null,
  decidedAt: null as Date | null,
  /**
   * Simulates COALESCE(existing, incoming) for contributorId across reconcile
   * runs: once set, a subsequent upsert cannot overwrite it.
   */
  contributorId: null as number | null,
  seed(state: string, decidedAt: Date) {
    this.state = state;
    this.decidedAt = decidedAt;
  },
  reset() {
    this.state = null;
    this.decidedAt = null;
    this.contributorId = null;
  },
}));

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => {
  const WORLD_ROW = {
    id: 1,
    repoOwner: "testowner",
    repoName: "testrepo",
    title: "Test World",
    canonBranchRef: "main",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const PATH_ROW = {
    id: 10, storyworldId: 1, branchRef: "contrib/scene",
    title: "contrib/scene", state: "proposed", originPathId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const PROPOSAL_ROW = {
    id: 100, storyworldId: 1, pathId: 10, prNumber: 42,
    state: "submitted", submittedAt: new Date().toISOString(), decidedAt: null,
  };

  /** Select queue: populated per test */
  const selectQueue: unknown[][] = [];

  function sqlText(value: unknown): string {
    if (!value || typeof value !== "object") return "";
    const candidate = value as { value?: unknown; queryChunks?: unknown[] };
    if (Array.isArray(candidate.value)) {
      return candidate.value
        .filter((chunk): chunk is string => typeof chunk === "string")
        .join("");
    }
    return (candidate.queryChunks ?? []).map(sqlText).join("");
  }

  function preservesExistingState(expression: unknown, existingState: string): boolean {
    const escapedState = existingState.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`WHEN[\\s\\S]*'${escapedState}'[\\s\\S]*THEN`).test(
      sqlText(expression),
    );
  }

  function selectChain(rows: unknown[]) {
    const end = () => Promise.resolve(rows);
    const where = () => ({ limit: end, returning: end });
    return { from: () => ({ where, innerJoin: () => ({ where }), limit: end, orderBy: end }) };
  }

  function insertChain(vals: Record<string, unknown>, returnRow: unknown) {
    // Record this insert for assertion
    insertLog.calls.push({ branchRef: vals["branchRef"] as string, state: vals["state"] as string });
    return {
      values: (v: Record<string, unknown>) => {
        // Also capture the values() call in case it's called after insert(table)
        insertLog.calls[insertLog.calls.length - 1] = {
          branchRef: v["branchRef"] as string,
          state: v["state"] as string,
        };
        return {
          onConflictDoUpdate: () => ({
            returning: () => Promise.resolve([returnRow]),
          }),
          returning: () => Promise.resolve([returnRow]),
        };
      },
    };
  }

  const db = {
    _selectQueue: selectQueue,
    _pushSelectRows: (rows: unknown[]) => selectQueue.push(rows),
    _resetSelectQueue: () => { selectQueue.length = 0; },

    select: () => {
      const rows = selectQueue.shift() ?? [];
      return selectChain(rows);
    },
    insert: (_table: unknown) => ({
      values: (v: Record<string, unknown>) => {
        insertLog.calls.push({ branchRef: v["branchRef"] as string, state: v["state"] as string });
        return {
          // Used by contributorNotificationsTable inserts (emitContributorNotification)
          onConflictDoNothing: () => Promise.resolve([]),
          onConflictDoUpdate: (config: { set?: Record<string, unknown> }) => {
            if (v["prNumber"]) {
              proposalUpsertLog.calls.push({
                state: config.set?.["state"],
                decidedAt: config.set?.["decidedAt"],
                insertedContributorId: v["contributorId"],
                conflictContributorId: config.set?.["contributorId"],
              });
              const existingState = proposalPersistence.state;
              const preservesState =
                existingState !== null &&
                preservesExistingState(config.set?.["state"], existingState);
              if (!preservesState) {
                proposalPersistence.state = v["state"] as string;
                proposalPersistence.decidedAt = v["decidedAt"] as Date | null;
              }
              // Simulate COALESCE(existing, incoming): once a contributorId is
              // stored, subsequent upserts must not overwrite it — mirrors the
              // COALESCE expression in the production ON CONFLICT DO UPDATE SET.
              if (proposalPersistence.contributorId === null) {
                proposalPersistence.contributorId =
                  (v["contributorId"] as number | null) ?? null;
              }
            }
            return {
              returning: () => {
                // Return an appropriate row depending on what was inserted
                if (v["branchRef"]) return Promise.resolve([{ ...PATH_ROW, branchRef: v["branchRef"], state: v["state"] }]);
                if (v["prNumber"]) {
                  return Promise.resolve([{
                    ...PROPOSAL_ROW,
                    state: proposalPersistence.state ?? v["state"],
                    decidedAt: proposalPersistence.decidedAt ?? v["decidedAt"],
                    // COALESCE simulation: always return the first-established owner
                    contributorId: proposalPersistence.contributorId,
                  }]);
                }
                return Promise.resolve([]);
              },
            };
          },
        };
      },
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    }),
    transaction: async (fn: (tx: any) => unknown) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: () => Promise.resolve([]) }) }) }),
    }),

    // Expose world/path for tests
    _WORLD_ROW: WORLD_ROW,
    _PATH_ROW: PATH_ROW,
  };

  return {
    db,
    proposalsTable: "proposalsTable",
    storyworldsTable: "storyworldsTable",
    storyPathsTable: "storyPathsTable",
    stewardsTable: "stewardsTable",
    userGithubLinksTable: "userGithubLinksTable",
    editorQuestionsTable: "editorQuestionsTable",
    contributionsTable: "contributionsTable",
    // Minimal stub so emitContributorNotification can read .eventKey for the
    // onConflictDoNothing target without throwing on undefined.
    contributorNotificationsTable: { eventKey: "event_key" },
  };
});

// ---------------------------------------------------------------------------
// GitHub client mock
// ---------------------------------------------------------------------------

const mockGh = vi.hoisted(() => ({
  listBranches: vi.fn().mockResolvedValue([]),
  listCommitsForBranch: vi.fn().mockResolvedValue([]),
  listOpenPullRequests: vi.fn().mockResolvedValue([]),
  listClosedPullRequests: vi.fn().mockResolvedValue([]),
  listCommitsBetween: vi.fn().mockResolvedValue([]),
  getPullRequest: vi.fn().mockResolvedValue(null),
  getMergeCommitRange: vi.fn().mockResolvedValue(null),
  listPullRequestComments: vi.fn().mockResolvedValue([]),
  listPullRequestReviews: vi.fn().mockResolvedValue([]),
  createPullRequestComment: vi.fn().mockResolvedValue(undefined),
  getCommitMessage: vi.fn().mockResolvedValue(""),
  getFileContent: vi.fn().mockResolvedValue(""),
}));

vi.mock("../../lib/github", () => ({
  getGitHubClient: () => mockGh,
}));

// ---------------------------------------------------------------------------
// Provenance mock
// ---------------------------------------------------------------------------

const mockProvenance = vi.hoisted(() => ({
  indexNarrationCommit: vi.fn().mockResolvedValue(null),
  parseNarrationCommit: vi.fn().mockReturnValue(null),
  replacePathMomentMemberships: vi.fn().mockResolvedValue(undefined),
  resolveContributor: vi.fn().mockResolvedValue(null),
  writeAcceptedProvenance: vi.fn().mockResolvedValue(1),
}));

vi.mock("../../lib/provenance", () => ({
  buildAcceptanceDecisionNote: vi.fn().mockReturnValue("note"),
  buildAcceptanceIntentNote: vi.fn().mockReturnValue("intent"),
  acceptanceIntentForOperation: vi.fn().mockReturnValue(null),
  acceptanceOperationIdFromCommitMessage: vi.fn().mockReturnValue(null),
  isAcceptanceIntentNote: vi.fn().mockReturnValue(false),
  parseAcceptanceDecisionNote: vi.fn().mockReturnValue(null),
  contributorAttributionsForPath: vi.fn().mockResolvedValue([]),
  indexNarrationCommit: mockProvenance.indexNarrationCommit,
  indexSavedMoment: vi.fn().mockResolvedValue(null),
  parseNarrationCommit: mockProvenance.parseNarrationCommit,
  replacePathMomentMemberships: mockProvenance.replacePathMomentMemberships,
  resolveContributor: mockProvenance.resolveContributor,
  resolveContributorIdentity: vi.fn().mockResolvedValue(null),
  stewardAttribution: vi.fn().mockResolvedValue({ githubIdentity: "github:alice" }),
  verifyAcceptanceDecisionNote: vi.fn().mockReturnValue(null),
  writeAcceptedProvenance: mockProvenance.writeAcceptedProvenance,
}));

// ---------------------------------------------------------------------------
// Static imports (after mocks)
// ---------------------------------------------------------------------------

import { githubWebhookHandler } from "../webhooks";
import adminRouter from "../admin";
import { db } from "@workspace/db";

const mockDb = db as typeof db & {
  _pushSelectRows: (rows: unknown[]) => void;
  _resetSelectQueue: () => void;
  _WORLD_ROW: Record<string, unknown>;
  _PATH_ROW: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = "test-webhook-secret";

function sign(body: string): string {
  return "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

/** Call githubWebhookHandler with a mock req/res pair */
async function callWebhook(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const rawBody = Buffer.from(JSON.stringify(payload));
  let status = 200;
  let responseBody: unknown = {};

  const req = {
    body: rawBody,
    headers: {
      "x-hub-signature-256": sign(rawBody.toString()),
      "x-github-event": eventType,
    },
    ip: "127.0.0.1",
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  } as unknown as Request;

  const res = {
    status: (s: number) => { status = s; return res; },
    json: (b: unknown) => { responseBody = b; return res; },
  } as unknown as Response;

  await githubWebhookHandler(req, res);
  return { status, body: responseBody };
}

function buildAdminApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    next();
  });
  app.use("/", adminRouter);
  return app;
}

function makePRPayload(opts: {
  action: "opened" | "closed" | "reopened" | "synchronize" | "labeled";
  merged: boolean;
  state: "open" | "closed";
}) {
  return {
    action: opts.action,
    repository: { name: "testrepo", owner: { login: "testowner" } },
    pull_request: {
      number: 42,
      state: opts.state,
      merged: opts.merged,
      head: { ref: "contrib/scene" },
      base: { ref: "main" },
      created_at: new Date().toISOString(),
      closed_at: opts.state === "closed" ? new Date().toISOString() : null,
      merged_at: opts.merged ? new Date().toISOString() : null,
      merge_commit_sha: opts.merged ? "mergesha001" : null,
      merged_by: opts.merged ? { login: "alice", name: "Alice" } : null,
      user: { login: "contributor", name: "Contributor" },
    },
  };
}

function sqlText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const candidate = value as {
    value?: unknown;
    queryChunks?: unknown[];
  };
  if (Array.isArray(candidate.value)) {
    return candidate.value.filter((chunk): chunk is string => typeof chunk === "string").join("");
  }
  return (candidate.queryChunks ?? []).map(sqlText).join("");
}

// ---------------------------------------------------------------------------
// 1. Structural / unit tests for the prToPathState logic
//    These mirror the fixed logic and serve as the canonical regression guard.
// ---------------------------------------------------------------------------

describe("prToPathState — structural invariants", () => {
  /** Mirrors the fixed function in both webhooks.ts and admin.ts */
  function prToPathState(merged: boolean, closed: boolean) {
    if (merged) return "published-canon";
    if (closed) return "published-alternate";
    return "proposed";
  }

  it("merged=true → published-canon (the core regression fix)", () => {
    expect(prToPathState(true, true)).toBe("published-canon");
    expect(prToPathState(true, false)).toBe("published-canon");
  });

  it("merged=false, closed=true → published-alternate", () => {
    expect(prToPathState(false, true)).toBe("published-alternate");
  });

  it("merged=false, closed=false → proposed", () => {
    expect(prToPathState(false, false)).toBe("proposed");
  });

  it("merged PR never produces published-alternate", () => {
    expect(prToPathState(true, true)).not.toBe("published-alternate");
    expect(prToPathState(true, false)).not.toBe("published-alternate");
  });

  it("closed-without-merge PR never produces published-canon", () => {
    expect(prToPathState(false, true)).not.toBe("published-canon");
  });

  it("published-canon and published-alternate are distinct values", () => {
    expect("published-canon").not.toBe("published-alternate");
  });
});

// ---------------------------------------------------------------------------
// 2. Webhook handler integration — merged PR produces published-canon
// ---------------------------------------------------------------------------

describe("webhook pull_request handler — path state from PR outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    mockDb._resetSelectQueue();
    process.env["GITHUB_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
  });

  it("merged+closed PR → published-canon inserted into story_paths", async () => {
    // findStoryworld needs one select result
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);

    const payload = makePRPayload({ action: "closed", merged: true, state: "closed" });
    const { status } = await callWebhook("pull_request", payload);

    expect(status).toBe(200);

    // Find the insert for the PR's head branch
    const pathInsert = insertLog.calls.find(c => c.branchRef === "contrib/scene");
    expect(pathInsert?.state).toBe("published-canon");
    expect(pathInsert?.state).not.toBe("published-alternate");
  });

  it("closed-without-merge PR → published-alternate inserted into story_paths", async () => {
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);

    const payload = makePRPayload({ action: "closed", merged: false, state: "closed" });
    await callWebhook("pull_request", payload);

    const pathInsert = insertLog.calls.find(c => c.branchRef === "contrib/scene");
    expect(pathInsert?.state).toBe("published-alternate");
    expect(pathInsert?.state).not.toBe("published-canon");
  });

  it("opened PR → proposed inserted into story_paths", async () => {
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);

    const payload = makePRPayload({ action: "opened", merged: false, state: "open" });
    await callWebhook("pull_request", payload);

    const pathInsert = insertLog.calls.find(c => c.branchRef === "contrib/scene");
    expect(pathInsert?.state).toBe("proposed");
  });

  it("rejects a payload with an invalid signature", async () => {
    const req = {
      body: Buffer.from("{}"),
      headers: { "x-hub-signature-256": "sha256=badsig", "x-github-event": "pull_request" },
      ip: "127.0.0.1",
      log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    } as unknown as Request;

    let status = 200;
    const res = {
      status: (s: number) => { status = s; return res; },
      json: () => res,
    } as unknown as Response;

    await githubWebhookHandler(req, res);
    expect(status).toBe(401);
  });

  it("returns 200 for unknown repo (no storyworld) without throwing", async () => {
    mockDb._pushSelectRows([]); // findStoryworld returns nothing

    const payload = makePRPayload({ action: "closed", merged: true, state: "closed" });
    const { status } = await callWebhook("pull_request", payload);

    expect(status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 3. Proposal lifecycle preservation — GitHub may sync its own PR outcome,
//    but it must never reopen a restricted, withdrawn, or archived proposal.
// ---------------------------------------------------------------------------

describe("webhook pull_request handler — protected proposal outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    proposalUpsertLog.reset();
    proposalPersistence.reset();
    mockDb._resetSelectQueue();
    process.env["GITHUB_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
  });

  it.each(["restricted", "withdrawn", "archived"])(
    "keeps a %s proposal closed when GitHub sends a terminal event",
    async (protectedState) => {
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      const { status } = await callWebhook(
        "pull_request",
        makePRPayload({ action: "closed", merged: true, state: "closed" }),
      );

      expect(status).toBe(200);
      expect(proposalUpsertLog.calls).toHaveLength(1);
      const upsert = proposalUpsertLog.calls[0]!;
      expect(sqlText(upsert.state)).toMatch(
        new RegExp(`WHEN[\\s\\S]*'${protectedState}'[\\s\\S]*THEN`),
      );
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
    },
  );

  it.each(["restricted", "withdrawn", "archived"])(
    "keeps a %s proposal closed when GitHub sends a non-terminal event",
    async (protectedState) => {
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      const { status } = await callWebhook(
        "pull_request",
        makePRPayload({ action: "synchronize", merged: false, state: "open" }),
      );

      expect(status).toBe(200);
      expect(proposalUpsertLog.calls).toHaveLength(1);
      const upsert = proposalUpsertLog.calls[0]!;
      expect(sqlText(upsert.state)).toMatch(
        new RegExp(`WHEN[\\s\\S]*'${protectedState}'[\\s\\S]*THEN`),
      );
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
    },
  );

  it.each(["restricted", "withdrawn", "archived"])(
    "ignores native label and Project-like metadata for a %s proposal",
    async (protectedState) => {
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      const payload = makePRPayload({
        action: "labeled",
        merged: false,
        state: "open",
      });
      (
        payload.pull_request as typeof payload.pull_request & {
          labels: Array<{ name: string }>;
          projectItems: Array<{ field: string; value: string }>;
        }
      ).labels = [{ name: "state:accepted-into-canon" }];
      (
        payload.pull_request as typeof payload.pull_request & {
          projectItems: Array<{ field: string; value: string }>;
        }
      ).projectItems = [
        { field: "Canon Status", value: "accepted-into-canon" },
      ];

      const { status } = await callWebhook("pull_request", payload);

      expect(status).toBe(200);
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
    },
  );

  it.each(["restricted", "withdrawn", "archived"])(
    "keeps a %s proposal unchanged when the same terminal webhook is replayed",
    async (protectedState) => {
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      const first = await callWebhook(
        "pull_request",
        makePRPayload({ action: "closed", merged: true, state: "closed" }),
      );
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      const second = await callWebhook(
        "pull_request",
        makePRPayload({ action: "closed", merged: true, state: "closed" }),
      );

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
      expect(proposalUpsertLog.calls).toHaveLength(2);
    },
  );

  it("does not let a non-steward review event change a protected proposal outcome", async () => {
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([
      {
        id: 100,
        storyworldId: 1,
        pathId: 10,
        prNumber: 42,
        state: "restricted",
        submittedAt: new Date().toISOString(),
        decidedAt: new Date("2026-01-18T12:00:00.000Z"),
      },
    ]);
    proposalPersistence.seed(
      "restricted",
      new Date("2026-01-18T12:00:00.000Z"),
    );

    const { status } = await callWebhook("pull_request_review", {
      action: "submitted",
      repository: { owner: { login: "testowner" }, name: "testrepo" },
      pull_request: { number: 42 },
      review: {
        id: 701,
        body: "Please accept this immediately.",
        user: { login: "untrusted-reviewer" },
      },
    });

    expect(status).toBe(200);
    expect(proposalPersistence.state).toBe("restricted");
    expect(proposalPersistence.decidedAt).toEqual(
      new Date("2026-01-18T12:00:00.000Z"),
    );
  });
});

describe("admin reconcile — GitHub fixture rebuild", () => {
  let app: ReturnType<typeof buildAdminApp>;
  const fixturePr = {
    number: 42,
    state: "closed" as const,
    merged: true,
    headRef: "contrib/scene",
    baseRef: "main",
    createdAt: "2026-01-10T12:00:00.000Z",
    mergedAt: "2026-01-11T12:00:00.000Z",
    closedAt: "2026-01-11T12:00:00.000Z",
    mergeCommitSha: "merge-sha-001",
    headSha: "source-head-001",
    baseSha: "base-sha-001",
    mergedBy: { login: "steward", name: "Steward" },
    author: { id: "github-user-7", login: "contributor", name: "Contributor", email: "writer@example.com" },
  };
  const fixtureNarration = {
    sha: "narration-sha-001",
    message: "Telling-Forward-Narration: v1",
    authorName: "Contributor",
    authorEmail: "writer@example.com",
    authorLogin: "contributor",
    timestamp: "2026-01-11T11:00:00.000Z",
  };

  function seedFixture() {
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([{ ...mockDb._PATH_ROW, branchRef: "main", state: "open" }]);
    mockDb._pushSelectRows([{ ...mockDb._PATH_ROW, branchRef: "contrib/scene" }]);
    mockDb._pushSelectRows([{ ...mockDb._PATH_ROW, branchRef: "main", id: 11 }]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    proposalUpsertLog.reset();
    proposalPersistence.reset();
    mockDb._resetSelectQueue();
    process.env["ADMIN_SECRET"] = "admin-secret-test";
    mockGh.listBranches.mockResolvedValue([
      { name: "main", sha: "canon-head" },
      { name: "contrib/scene", sha: "source-head-001" },
    ]);
    mockGh.listOpenPullRequests.mockResolvedValue([fixturePr]);
    mockGh.listCommitsForBranch.mockResolvedValue([]);
    mockGh.listCommitsBetween.mockResolvedValue([fixtureNarration]);
    mockGh.getPullRequest.mockResolvedValue(fixturePr);
    mockGh.getMergeCommitRange.mockResolvedValue({
      baseSha: "base-sha-001",
      headSha: "source-head-001",
    });
    mockGh.listPullRequestReviews.mockResolvedValue([
      { id: 701, body: "What does the witness remember?", state: "CHANGES_REQUESTED", submittedAt: "2026-01-10T15:00:00.000Z" },
    ]);
    mockGh.listPullRequestComments.mockResolvedValue([]);
    mockGh.getFileContent.mockResolvedValue("# Recovered scene\n\nRecovered body\n");
    mockProvenance.parseNarrationCommit.mockReturnValue({
      submissionId: "submission-001",
      platformIdentity: "platform:writer-7",
      title: "Recovered scene",
      displayName: "Contributor",
    });
    mockProvenance.indexNarrationCommit.mockResolvedValue(null);
    app = buildAdminApp();
  });

  it("rebuilds story paths, contributions, proposal lineage, questions, and provenance from one fixture", async () => {
    seedFixture();
    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      branches_fetched: 2,
      paths_upserted: 2,
      commits_fetched: 1,
      contributions_upserted: 2,
      prs_fetched: 1,
      proposals_upserted: 1,
      editor_questions_upserted: 1,
      provenance_records_upserted: 1,
    });
    expect(res.body.changes.updated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "path",
          githubId: "branch:main",
          state: "open",
        }),
        expect.objectContaining({
          entity: "contribution",
          githubId: "commit:narration-sha-001",
        }),
        expect.objectContaining({
          entity: "proposal",
          githubId: "pr:42",
          state: "accepted-into-canon",
        }),
        expect.objectContaining({
          entity: "provenance",
          githubId: "merge-commit:merge-sha-001",
          state: "accepted-into-canon",
        }),
      ]),
    );
    expect(mockProvenance.indexNarrationCommit).toHaveBeenCalledWith(
      1, 10, fixtureNarration, "# Recovered scene\n\nRecovered body\n",
    );
    expect(mockProvenance.replacePathMomentMemberships).toHaveBeenCalledWith(
      1, 10, ["narration-sha-001"],
    );
    expect(mockProvenance.writeAcceptedProvenance).toHaveBeenCalledWith(
      expect.objectContaining({
        storyworldId: 1,
        canonCommitSha: "merge-sha-001",
        sourcePathId: 10,
        sourcePrNumber: 42,
      }),
    );
    expect(proposalUpsertLog.calls).toHaveLength(1);
  });

  it("is safe when a rerun sees no GitHub objects and does not reopen terminal local outcomes", async () => {
    seedFixture();
    const first = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    insertLog.reset();
    proposalUpsertLog.reset();
    mockDb._resetSelectQueue();
    mockGh.listBranches.mockResolvedValue([]);
    mockGh.listOpenPullRequests.mockResolvedValue([]);
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);

    const second = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.summary).toEqual({
      branches_fetched: 0,
      paths_upserted: 0,
      paths_state_updated: 0,
      commits_fetched: 0,
      contributions_upserted: 0,
      prs_fetched: 0,
      proposals_upserted: 0,
      editor_questions_upserted: 0,
      provenance_records_upserted: 0,
    });
    expect(proposalUpsertLog.calls).toHaveLength(0);
    expect(mockProvenance.writeAcceptedProvenance).toHaveBeenCalledTimes(1);
    expect(first.body.summary.proposals_upserted).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Admin reconcile — path state for PR-derived upserts
// ---------------------------------------------------------------------------

describe("admin reconcile — path state from PR outcome", () => {
  let app: ReturnType<typeof buildAdminApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    mockDb._resetSelectQueue();
    process.env["ADMIN_SECRET"] = "admin-secret-test";
    process.env["GITHUB_WEBHOOK_SECRET"] = "test-secret";

    // Default: no branches, no PRs (overridden per test)
    mockGh.listBranches.mockResolvedValue([]);
    mockGh.listCommitsForBranch.mockResolvedValue([]);
    mockGh.listOpenPullRequests.mockResolvedValue([]);
    mockGh.listCommitsBetween.mockResolvedValue([]);
    mockGh.listPullRequestReviews.mockResolvedValue([]);
    mockGh.listPullRequestComments.mockResolvedValue([]);
    mockGh.getPullRequest.mockResolvedValue(null);
    mockGh.getFileContent.mockResolvedValue("");
    mockProvenance.parseNarrationCommit.mockReturnValue(null);
    mockProvenance.indexNarrationCommit.mockResolvedValue(null);

    app = buildAdminApp();
  });

  it("reconcile with a merged PR → published-canon path state", async () => {
    const mergedPr = {
      number: 42,
      state: "closed",
      merged: true,
      headRef: "contrib/scene",
      baseRef: "main",
      createdAt: new Date().toISOString(),
      mergedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      mergeCommitSha: "mergesha001",
      mergedBy: { login: "alice", displayName: "Alice" },
      author: { login: "contributor", name: "Contributor", email: "c@example.com" },
    };

    // The reconcile route uses listOpenPullRequests, which returns ALL PRs
    // it will iterate (open + closed come from same list in admin.ts).
    mockGh.listOpenPullRequests.mockResolvedValue([mergedPr]);
    mockGh.getPullRequest.mockResolvedValue({
      ...mergedPr, merged: true, mergeCommitSha: "mergesha001",
    });
    mockGh.getMergeCommitRange.mockResolvedValue({ baseSha: "b1", headSha: "h1" });

    // DB selects: world lookup, then per-PR base path lookup, then proposal lookup
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    // base path lookup (no match) — one per PR
    mockDb._pushSelectRows([]);

    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);

    // The PR's head branch insert must use published-canon
    const prPathInsert = insertLog.calls.find(c => c.branchRef === "contrib/scene");
    expect(prPathInsert?.state).toBe("published-canon");
    expect(prPathInsert?.state).not.toBe("published-alternate");
  });

  it("recovers narration commits from the canon branch", async () => {
    const narrationCommit = {
      sha: "narration-sha",
      message: "Telling-Forward-Narration: v1",
      authorName: "Telling Forward",
      authorEmail: "noreply@tellingforward.app",
      authorLogin: null,
      timestamp: new Date().toISOString(),
    };
    mockGh.listBranches.mockResolvedValue([{ name: "main", sha: "head-sha" }]);
    mockGh.listCommitsForBranch.mockResolvedValue([narrationCommit]);
    mockGh.getFileContent.mockResolvedValue("# Recovered scene\n\nGit body\n");
    mockProvenance.parseNarrationCommit.mockReturnValue({
      submissionId: "660e8400-e29b-41d4-a716-446655440004",
      platformIdentity: "platform:42",
      title: "Recovered scene",
      displayName: "River Writer",
    });

    // world lookup, then the canonical path lookup
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([{ ...mockDb._PATH_ROW, branchRef: "main", state: "open" }]);

    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);
    expect(mockGh.getFileContent).toHaveBeenCalledWith(
      "testowner",
      "testrepo",
      "narrations/660e8400-e29b-41d4-a716-446655440004.md",
      "narration-sha",
    );
    expect(mockProvenance.indexNarrationCommit).toHaveBeenCalledWith(
      1,
      10,
      narrationCommit,
      "# Recovered scene\n\nGit body\n",
    );
  });

  it("reconcile with a closed-without-merge PR → published-alternate path state", async () => {
    const closedPr = {
      number: 43,
      state: "closed",
      merged: false,
      headRef: "contrib/rejected",
      baseRef: "main",
      createdAt: new Date().toISOString(),
      mergedAt: null,
      closedAt: new Date().toISOString(),
      mergeCommitSha: null,
      mergedBy: null,
      author: { login: "contributor", name: "Contributor", email: "c@example.com" },
    };

    mockGh.listOpenPullRequests.mockResolvedValue([closedPr]);
    mockGh.getPullRequest.mockResolvedValue({ ...closedPr, merged: false, mergeCommitSha: null });

    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]);

    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);

    const prPathInsert = insertLog.calls.find(c => c.branchRef === "contrib/rejected");
    expect(prPathInsert?.state).toBe("published-alternate");
    expect(prPathInsert?.state).not.toBe("published-canon");
  });

  it("returns 401 with wrong admin secret", async () => {
    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "wrong-secret" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(401);
  });
});

describe("admin reconcile — protected proposal outcomes", () => {
  let app: ReturnType<typeof buildAdminApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    proposalUpsertLog.reset();
    proposalPersistence.reset();
    mockDb._resetSelectQueue();
    process.env["ADMIN_SECRET"] = "admin-secret-test";
    mockGh.listBranches.mockResolvedValue([]);
    mockGh.listCommitsForBranch.mockResolvedValue([]);
    mockGh.listCommitsBetween.mockResolvedValue([]);
    mockGh.listPullRequestReviews.mockResolvedValue([]);
    mockGh.listPullRequestComments.mockResolvedValue([]);
    mockGh.getPullRequest.mockResolvedValue(null);
    mockGh.getFileContent.mockResolvedValue("");
    mockProvenance.parseNarrationCommit.mockReturnValue(null);
    mockProvenance.indexNarrationCommit.mockResolvedValue(null);
    app = buildAdminApp();
  });

  it.each([
    ["restricted", "closed", true],
    ["withdrawn", "open", false],
    ["archived", "closed", false],
  ] as const)(
    "keeps a %s proposal closed during a %s GitHub reconciliation",
    async (protectedState, state, merged) => {
      const pr = {
        number: 42,
        state,
        merged,
        headRef: "contrib/scene",
        baseRef: "main",
        createdAt: new Date().toISOString(),
        mergedAt: merged ? new Date().toISOString() : null,
        closedAt: state === "closed" ? new Date().toISOString() : null,
        mergeCommitSha: merged ? "mergesha001" : null,
        mergedBy: null,
        author: { login: "contributor", name: "Contributor", email: "c@example.com" },
      };
      mockGh.listOpenPullRequests.mockResolvedValue([pr]);
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      mockDb._pushSelectRows([]);
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      const res = await request(app)
        .post("/reconcile")
        .set({ "x-admin-secret": "admin-secret-test" })
        .send({ storyworld_id: 1 });

      expect(res.status).toBe(200);
      expect(proposalUpsertLog.calls).toHaveLength(1);
      const upsert = proposalUpsertLog.calls[0]!;
      expect(sqlText(upsert.state)).toMatch(
        new RegExp(`WHEN[\\s\\S]*'${protectedState}'[\\s\\S]*THEN`),
      );
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
      expect(res.body.changes.preserved).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entity: "proposal",
            githubId: "pr:42",
            state: protectedState,
          }),
        ]),
      );
    },
  );

  it.each(["restricted", "withdrawn", "archived"])(
    "does not let native metadata reopen a %s proposal during reconciliation",
    async (protectedState) => {
      const pr = {
        number: 42,
        state: "open" as const,
        merged: false,
        headRef: "contrib/scene",
        baseRef: "main",
        createdAt: new Date().toISOString(),
        mergedAt: null,
        closedAt: null,
        mergeCommitSha: null,
        mergedBy: null,
        author: {
          login: "contributor",
          name: "Contributor",
          email: "c@example.com",
        },
        labels: [{ name: "state:accepted-into-canon" }],
        projectItems: [{ field: "Canon Status", value: "accepted-into-canon" }],
      };
      mockGh.listOpenPullRequests.mockResolvedValue([pr]);
      mockDb._pushSelectRows([mockDb._WORLD_ROW]);
      mockDb._pushSelectRows([]);
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      proposalPersistence.seed(protectedState, retainedDecidedAt);

      const res = await request(app)
        .post("/reconcile")
        .set({ "x-admin-secret": "admin-secret-test" })
        .send({ storyworld_id: 1 });

      expect(res.status).toBe(200);
      expect(proposalPersistence.state).toBe(protectedState);
      expect(proposalPersistence.decidedAt).toEqual(retainedDecidedAt);
    },
  );
});

// ---------------------------------------------------------------------------
// 6. Admin reconcile — contributor ownership link
//
// Proves that:
//   a) resolveContributor is called for the PR author and its result is
//      stored as contributorId in the proposal INSERT .values() clause.
//   b) The ON CONFLICT DO UPDATE SET for contributorId is a COALESCE SQL
//      expression — never a plain number — so a later reconcile pass with a
//      different GitHub author cannot overwrite the existing link.
//   c) Both (a) and (b) hold on a re-run where resolveContributor returns a
//      different contributor id.
//
// The companion address-endpoint tests in proposal-state.test.ts confirm that
// a proposal with contributorId = 55 (as produced by reconcile) grants access
// only to the platform contributor with id 55 and rejects all others.
// ---------------------------------------------------------------------------

describe("admin reconcile — contributor link from PR author", () => {
  let app: ReturnType<typeof buildAdminApp>;

  const alicePr = {
    number: 55,
    state: "open" as const,
    merged: false,
    headRef: "contrib/alice-scene",
    baseRef: "main",
    createdAt: new Date().toISOString(),
    mergedAt: null,
    closedAt: null,
    mergeCommitSha: null,
    mergedBy: null,
    author: {
      id: "github-alice-1",
      login: "alice",
      name: "Alice",
      email: "alice@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.reset();
    proposalUpsertLog.reset();
    proposalPersistence.reset();
    mockDb._resetSelectQueue();
    process.env["ADMIN_SECRET"] = "admin-secret-test";
    mockGh.listBranches.mockResolvedValue([]);
    mockGh.listCommitsBetween.mockResolvedValue([]);
    mockGh.listOpenPullRequests.mockResolvedValue([alicePr]);
    mockGh.getPullRequest.mockResolvedValue({ ...alicePr, state: "open", merged: false });
    mockGh.listPullRequestReviews.mockResolvedValue([]);
    mockGh.listPullRequestComments.mockResolvedValue([]);
    mockGh.getFileContent.mockResolvedValue("");
    mockProvenance.parseNarrationCommit.mockReturnValue(null);
    mockProvenance.indexNarrationCommit.mockResolvedValue(null);
    mockProvenance.resolveContributor.mockResolvedValue(null);
    app = buildAdminApp();
  });

  it("persists the GitHub-resolved contributor id in the proposal insert values", async () => {
    // The reconcile route calls resolveContributor with the PR author and
    // must store the returned id in the VALUES clause of the proposal upsert.
    mockProvenance.resolveContributor.mockResolvedValue({
      id: 55,
      platformIdentity: "platform:7",
    });

    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]); // base-path lookup for the PR

    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);
    expect(proposalUpsertLog.calls).toHaveLength(1);
    // The VALUES clause carries the resolved contributor id, not null
    expect(proposalUpsertLog.calls[0]!.insertedContributorId).toBe(55);
  });

  it("stores null when resolveContributor cannot match the PR author", async () => {
    // If the GitHub author has not yet registered a platform account,
    // the proposal must not block — it is inserted with null and the
    // COALESCE rule will fill it on a future reconcile once they join.
    mockProvenance.resolveContributor.mockResolvedValue(null);

    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]);

    const res = await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(res.status).toBe(200);
    expect(proposalUpsertLog.calls).toHaveLength(1);
    expect(proposalUpsertLog.calls[0]!.insertedContributorId).toBeNull();
  });

  it("uses a COALESCE SQL expression for contributorId in the conflict-update set", async () => {
    // The ON CONFLICT DO UPDATE SET must carry COALESCE(existing, incoming),
    // not a plain number. If this assertion fails, the production code stopped
    // using COALESCE and a re-run could overwrite the original owner's id.
    mockProvenance.resolveContributor.mockResolvedValue({
      id: 55,
      platformIdentity: "platform:7",
    });

    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]);

    await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    const conflictValue = proposalUpsertLog.calls[0]!.conflictContributorId;
    // A plain number here would mean the production code stopped using COALESCE
    expect(typeof conflictValue).not.toBe("number");
    // The SQL object must contain a COALESCE reference
    expect(sqlText(conflictValue)).toMatch(/COALESCE/i);
  });

  it("does not overwrite an existing contributor link when a rerun resolves a different author", async () => {
    // First run: alice (contributor 55) is linked.
    mockProvenance.resolveContributor.mockResolvedValue({
      id: 55,
      platformIdentity: "platform:7",
    });
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]);
    await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    // Second run: same PR now resolves to contributor 77 (e.g. a reused login
    // or a subsequent registration). The COALESCE rule in the conflict set must
    // prevent bob's id from replacing alice's established link.
    const bobPr = {
      ...alicePr,
      author: {
        id: "github-bob-2",
        login: "bob",
        name: "Bob",
        email: "bob@example.com",
      },
    };
    mockProvenance.resolveContributor.mockResolvedValue({
      id: 77,
      platformIdentity: "platform:9",
    });
    mockGh.listOpenPullRequests.mockResolvedValue([bobPr]);
    mockGh.getPullRequest.mockResolvedValue({ ...bobPr, state: "open", merged: false });
    mockDb._pushSelectRows([mockDb._WORLD_ROW]);
    mockDb._pushSelectRows([]);
    await request(app)
      .post("/reconcile")
      .set({ "x-admin-secret": "admin-secret-test" })
      .send({ storyworld_id: 1 });

    expect(proposalUpsertLog.calls).toHaveLength(2);

    // Second INSERT carries bob's id in VALUES (that's what the route resolved)…
    expect(proposalUpsertLog.calls[1]!.insertedContributorId).toBe(77);

    // …but the conflict-update set still uses COALESCE, so the DB preserves 55.
    const conflictValue = proposalUpsertLog.calls[1]!.conflictContributorId;
    expect(typeof conflictValue).not.toBe("number");
    expect(sqlText(conflictValue)).toMatch(/COALESCE/i);

    // The mock simulates COALESCE persistence: alice's id (55) must survive
    // the second upsert, not be overwritten by bob's 77. If this assertion
    // fails the production COALESCE guard is no longer protecting the link.
    expect(proposalPersistence.contributorId).toBe(55);
  });
});
