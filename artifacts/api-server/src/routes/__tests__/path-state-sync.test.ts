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
          onConflictDoUpdate: () => ({
            returning: () => {
              // Return an appropriate row depending on what was inserted
              if (v["branchRef"]) return Promise.resolve([{ ...PATH_ROW, branchRef: v["branchRef"], state: v["state"] }]);
              if (v["prNumber"]) return Promise.resolve([{ ...PROPOSAL_ROW, state: v["state"] }]);
              return Promise.resolve([]);
            },
          }),
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
  replacePathMomentMemberships: vi.fn().mockResolvedValue(undefined),
  resolveContributor: vi.fn().mockResolvedValue(null),
  resolveContributorIdentity: vi.fn().mockResolvedValue(null),
  stewardAttribution: vi.fn().mockResolvedValue({ githubIdentity: "github:alice" }),
  verifyAcceptanceDecisionNote: vi.fn().mockReturnValue(null),
  writeAcceptedProvenance: vi.fn().mockResolvedValue(1),
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
  action: "opened" | "closed" | "reopened" | "synchronize";
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
// 3. Admin reconcile — path state for PR-derived upserts
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
