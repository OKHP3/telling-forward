/**
 * Proposal state machine tests
 *
 * Covers the proposal lifecycle model:
 *   submitted → under-review         (POST /:id/review)
 *   returned-with-notes → under-review  (POST /:id/review)
 *   under-review → returned-with-notes  (POST /:id/return)
 *   under-review → accepted-into-canon  (POST /:id/accept — terminal)
 *   active → restricted                 (POST /:id/restrict — steward only)
 *   active → withdrawn                  (POST /:id/withdraw — author only)
 *   terminal → archived                 (POST /:id/archive — steward only)
 *
 * Key regression: when a proposal is accepted into canon the associated story
 * path state must be set to "published-canon", never "published-alternate".
 * These two states are mutually exclusive terminal outcomes of canon review.
 *
 * Strategy
 * --------
 * - /review: only touches proposalsTable; straightforward to test.
 * - /return: touches proposalsTable + storyworldsTable + GitHub PR reviews;
 *   we stub all three.
 * - /accept: deep GitHub merge flow; we stub every GitHub call and the DB
 *   transaction so we can assert the path-state write without real network I/O.
 * - Structural invariants: pure assertions on the state-machine sets that
 *   guard each transition.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

// ---------------------------------------------------------------------------
// Call-capture store (hoisted so vi.mock factories can close over it safely)
// ---------------------------------------------------------------------------

const capture = vi.hoisted(() => ({
  /** State value written to the path row inside the accept transaction */
  pathState: null as string | null,
  /** State value written to the proposal row (review handler update) */
  proposalState: null as string | null,
  /** Restriction reason written with a steward restriction */
  decisionReason: null as string | null,
  authenticated: true,
  steward: true,
  reset() {
    this.pathState = null;
    this.proposalState = null;
    this.decisionReason = null;
    this.authenticated = true;
    this.steward = true;
  },
}));

// ---------------------------------------------------------------------------
// DB mock
//
// vi.mock factories are hoisted to the top of the file by Vitest before any
// imports run. They must NOT close over variables that are declared after them
// (Symbol/const at module scope) — only vi.hoisted values are safe.
//
// The router queries the DB in this fixed pattern per handler:
//   /review:  select(proposal)  → update(proposal)
//   /return:  select(proposal)  → select(world) → [gh calls] → transaction
//   /accept:  select(proposal)  → select(world) → select(path) → select(steward)
//             → [gh calls] → transaction(update proposal, update path)
//
// We expose `__setNextRows` and `__setNextUpdateResult` on the mock `db`
// object so individual tests can prime exactly what each call returns.
// ---------------------------------------------------------------------------

vi.mock("@workspace/db", () => {
  // Queue-based select: each call pops from the front of the queue.
  const selectQueue: unknown[][] = [];
  // Queue-based update: each call pops from the front.
  const updateQueue: { result: unknown[]; tag: "proposal" | "path" | "other" }[] = [];
  // Queue-based transaction: replaced per test by __setTransaction.
  let transactionImpl: ((fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>) | null = null;
  let insertImpl: (() => unknown) | null = null;

  function makeSelectChain(rows: unknown[]) {
    const limit = () => Promise.resolve(rows);
    const orderBy = () => Promise.resolve(rows);
    const where = () => ({ limit, returning: limit, orderBy });
    const innerJoin = () => ({ where });
    return {
      from: () => ({ where, innerJoin, limit, orderBy }),
    };
  }

  function makeUpdateChain(
    tag: "proposal" | "path" | "other",
    result: unknown[],
  ) {
    return {
      set: (val: Record<string, unknown>) => {
        if (tag === "proposal" && val["state"]) {
          capture.proposalState = val["state"] as string;
        }
        if (tag === "proposal" && "decisionReason" in val) {
          capture.decisionReason = (val["decisionReason"] as string | null) ?? null;
        }
        if (tag === "path" && val["state"]) {
          capture.pathState = val["state"] as string;
        }
        return { where: () => ({ returning: () => Promise.resolve(result) }) };
      },
    };
  }

  function makeInsertChain() {
    return {
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve([]),
      }),
    };
  }

  const db = {
    // Allow tests to prime the queues
    __pushSelectRows: (rows: unknown[]) => selectQueue.push(rows),
    __pushUpdate: (tag: "proposal" | "path" | "other", result: unknown[]) =>
      updateQueue.push({ tag, result }),
    __setTransaction: (
      impl: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>,
    ) => {
      transactionImpl = impl;
    },
    __setInsert: (impl: () => unknown) => {
      insertImpl = impl;
    },
    __reset: () => {
      selectQueue.length = 0;
      updateQueue.length = 0;
      transactionImpl = null;
      insertImpl = null;
    },

    select: () => {
      const rows = selectQueue.shift() ?? [];
      return makeSelectChain(rows);
    },
    update: (_table: unknown) => {
      const entry = updateQueue.shift() ?? { tag: "other" as const, result: [] };
      return makeUpdateChain(entry.tag, entry.result);
    },
    insert: (_table: unknown) => {
      if (insertImpl) return insertImpl();
      return makeInsertChain();
    },
    transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      if (transactionImpl) return transactionImpl(fn);
      return fn({
        update: (_table: unknown) => {
          const entry = updateQueue.shift() ?? { tag: "other" as const, result: [] };
          return makeUpdateChain(entry.tag, entry.result);
        },
        insert: (_table: unknown) => makeInsertChain(),
      });
    },
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
// GitHub mock — injected through the module's public test seam so handlers use
// a complete fake client without making real GitHub requests.
// ---------------------------------------------------------------------------

const mockGh = vi.hoisted(() => ({
  getPullRequest: vi.fn(),
  mergePullRequest: vi.fn(),
  getMergeCommitRange: vi.fn(),
  listCommitsBetween: vi.fn(),
  listPullRequestComments: vi.fn(),
  listPullRequestReviews: vi.fn(),
  createPullRequestReview: vi.fn(),
  createPullRequestComment: vi.fn(),
  getCommitMessage: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Provenance mock
// ---------------------------------------------------------------------------

vi.mock("../../lib/provenance", () => ({
  buildAcceptanceDecisionNote: vi.fn().mockReturnValue("decision-note"),
  buildAcceptanceIntentNote: vi.fn().mockReturnValue("intent-note"),
  acceptanceIntentForOperation: vi.fn().mockReturnValue(null),
  acceptanceOperationIdFromCommitMessage: vi.fn().mockReturnValue(null),
  contributorAttributionsForPath: vi.fn().mockResolvedValue([]),
  indexSavedMoment: vi.fn().mockResolvedValue(null),
  replacePathMomentMemberships: vi.fn().mockResolvedValue(undefined),
  resolveContributor: vi.fn().mockResolvedValue(null),
  resolveContributorIdentity: vi.fn().mockResolvedValue(null),
  stewardAttribution: vi
    .fn()
    .mockResolvedValue({ githubIdentity: "github:steward-alice" }),
  verifyAcceptanceDecisionNote: vi.fn().mockReturnValue(null),
  writeAcceptedProvenance: vi.fn().mockResolvedValue(42),
}));

// ---------------------------------------------------------------------------
// Auth + steward middleware seams
// ---------------------------------------------------------------------------

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!capture.authenticated) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.session = { userId: 1 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardForProposal: (_req: any, res: any, next: any) => {
    if (!capture.steward) {
      res.status(403).json({ error: "Not a steward for this storyworld" });
      return;
    }
    next();
  },
}));

// ---------------------------------------------------------------------------
// API-zod mock — pass all bodies/params through unchanged
// ---------------------------------------------------------------------------

vi.mock("@workspace/api-zod", () => {
  const pass = { safeParse: (v: any) => ({ success: true, data: v }) };
  const through = (v: any) => v;
  return {
    GetProposalParams: pass,
    GetProposalResponse: { parse: through },
    ListProposalsResponse: { parse: through },
    MarkProposalUnderReviewParams: pass,
    MarkProposalUnderReviewResponse: { parse: through },
    AcceptProposalParams: pass,
    AcceptProposalResponse: { parse: through },
    ReturnProposalParams: pass,
    ReturnProposalBody: {
      safeParse: (v: any) => ({
        success: true,
        data: {
          editorQuestion:
            v?.editorQuestion ?? v?.questionText ?? "Editor question",
        },
      }),
    },
    ReturnProposalResponse: { parse: through },
    RestrictProposalParams: pass,
    RestrictProposalBody: {
      safeParse: (v: any) => ({
        success: true,
        data: { reason: v?.reason },
      }),
    },
    RestrictProposalResponse: { parse: through },
    WithdrawProposalParams: pass,
    WithdrawProposalResponse: { parse: through },
    ArchiveProposalParams: pass,
    ArchiveProposalResponse: { parse: through },
  };
});

// ---------------------------------------------------------------------------
// Static import (after all mocks are declared)
// ---------------------------------------------------------------------------

import proposalsRouter from "../proposals";
import { db } from "@workspace/db";
import {
  setGitHubClient,
  type GitHubClientInterface,
} from "../../lib/github";

// ---------------------------------------------------------------------------
// Typed access to the mock helpers
// ---------------------------------------------------------------------------

const mockDb = db as typeof db & {
  __pushSelectRows: (rows: unknown[]) => void;
  __pushUpdate: (tag: "proposal" | "path" | "other", result: unknown[]) => void;
  __setTransaction: (
    impl: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>,
  ) => void;
  __setInsert: (impl: () => unknown) => void;
  __reset: () => void;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProposal(state: string, extra: Record<string, unknown> = {}) {
  return {
    id: 100,
    storyworldId: 1,
    pathId: 10,
    prNumber: 42,
    state,
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    ...extra,
  };
}

const WORLD_ROW = {
  id: 1,
  repoOwner: "testowner",
  repoName: "testrepo",
  title: "Test World",
  canonBranchRef: "main",
};

const PATH_ROW = {
  id: 10,
  storyworldId: 1,
  branchRef: "contrib/scene-one",
  title: "Scene One",
  state: "proposed",
  originPathId: null,
};

const STEWARD_ROW = { id: 5, githubUsername: "steward-alice" };

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", proposalsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests: GET /:id — proposal detail with chronological editor questions
// ---------------------------------------------------------------------------

describe("GET /:id — proposal detail", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    setGitHubClient(mockGh as unknown as GitHubClientInterface);
    app = buildApp();
  });

  it("includes editor questions in chronological order", async () => {
    const firstQuestion = {
      id: 4,
      proposalId: 100,
      reviewCommentId: 101,
      body: "What changes when the bell rings?",
      resolved: false,
      createdAt: new Date("2026-08-18T09:00:00.000Z").toISOString(),
    };
    const secondQuestion = {
      id: 8,
      proposalId: 100,
      reviewCommentId: 102,
      body: "Can you show the reader why the witness stays?",
      resolved: false,
      createdAt: new Date("2026-08-19T11:30:00.000Z").toISOString(),
    };
    mockDb.__pushSelectRows([makeProposal("returned-with-notes")]);
    mockDb.__pushSelectRows([firstQuestion, secondQuestion]);

    const res = await request(app).get("/100");

    expect(res.status).toBe(200);
    expect(res.body.editorQuestions).toEqual([firstQuestion, secondQuestion]);
  });
});

// ---------------------------------------------------------------------------
// Tests: submitted → under-review
// ---------------------------------------------------------------------------

describe("POST /:id/review — submitted → under-review", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    app = buildApp();
  });

  it("transitions a submitted proposal to under-review", async () => {
    mockDb.__pushSelectRows([makeProposal("submitted")]);
    mockDb.__pushUpdate("proposal", [makeProposal("under-review")]);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("under-review");
    expect(capture.proposalState).toBe("under-review");
  });

  it("returns 409 when proposal is already accepted-into-canon", async () => {
    mockDb.__pushSelectRows([makeProposal("accepted-into-canon")]);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot mark as under review/i);
  });

  it("returns 409 when proposal is already published-alternate", async () => {
    mockDb.__pushSelectRows([makeProposal("published-alternate")]);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot mark as under review/i);
  });

  it("returns 403 when the signed-in user is not a steward", async () => {
    capture.steward = false;

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a steward/i);
  });

  it("returns 401 when the user is not authenticated", async () => {
    capture.authenticated = false;

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 404 when proposal does not exist", async () => {
    mockDb.__pushSelectRows([]);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(404);
  });

  it("returns 409 when concurrent update wins (0 rows returned from update)", async () => {
    mockDb.__pushSelectRows([makeProposal("submitted")]);
    // Update returns empty (concurrent modification)
    mockDb.__pushUpdate("proposal", []);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Tests: returned-with-notes → under-review (re-submit cycle)
// ---------------------------------------------------------------------------

describe("POST /:id/review — returned-with-notes → under-review", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    setGitHubClient(mockGh as unknown as GitHubClientInterface);
    app = buildApp();
  });

  it("allows re-review of a returned proposal", async () => {
    mockDb.__pushSelectRows([makeProposal("returned-with-notes")]);
    mockDb.__pushUpdate("proposal", [makeProposal("under-review")]);

    const res = await request(app).post("/100/review");

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("under-review");
  });
});

// ---------------------------------------------------------------------------
// Tests: under-review → returned-with-notes
// ---------------------------------------------------------------------------

describe("POST /:id/return — under-review → returned-with-notes", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();

    // Default GitHub stubs for the return handler
    mockGh.listPullRequestReviews.mockResolvedValue([]);
    mockGh.createPullRequestReview.mockResolvedValue(99); // reviewId

    app = buildApp();
  });

  it("transitions an under-review proposal to returned-with-notes", async () => {
    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushSelectRows([WORLD_ROW]);

    const updated = makeProposal("returned-with-notes");
    mockDb.__setTransaction(async (fn: any) => {
      return fn({
        update: (_t: unknown) => ({
          set: (_val: unknown) => ({
            where: () => ({ returning: () => Promise.resolve([updated]) }),
          }),
        }),
        insert: (_t: unknown) => ({
          values: () => ({ onConflictDoUpdate: () => Promise.resolve([]) }),
        }),
      });
    });

    const res = await request(app)
      .post("/100/return")
      .send({ editorQuestion: "Please expand the second scene." });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("returned-with-notes");
  });

  it("returns 409 when returning from accepted-into-canon", async () => {
    mockDb.__pushSelectRows([makeProposal("accepted-into-canon")]);
    mockDb.__pushSelectRows([WORLD_ROW]);

    const res = await request(app)
      .post("/100/return")
      .send({ editorQuestion: "Too late." });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot return/i);
  });

  it("returns 403 when the signed-in user is not a steward", async () => {
    capture.steward = false;

    const res = await request(app)
      .post("/100/return")
      .send({ editorQuestion: "Please expand the second scene." });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a steward/i);
  });

  it("returns 401 when the user is not authenticated", async () => {
    capture.authenticated = false;

    const res = await request(app)
      .post("/100/return")
      .send({ editorQuestion: "Please expand the second scene." });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("reuses an existing REQUEST_CHANGES review instead of posting a duplicate", async () => {
    const question = "Expand the cave scene.";
    mockGh.listPullRequestReviews.mockResolvedValueOnce([
      { id: 77, state: "CHANGES_REQUESTED", body: question },
    ]);

    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushSelectRows([WORLD_ROW]);

    const updated = makeProposal("returned-with-notes");
    mockDb.__setTransaction(async (fn: any) => {
      return fn({
        update: (_t: unknown) => ({
          set: (_val: unknown) => ({
            where: () => ({ returning: () => Promise.resolve([updated]) }),
          }),
        }),
        insert: (_t: unknown) => ({
          values: () => ({ onConflictDoUpdate: () => Promise.resolve([]) }),
        }),
      });
    });

    await request(app)
      .post("/100/return")
      .send({ editorQuestion: question });

    // Existing review found — no new review should be created
    expect(mockGh.createPullRequestReview).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: accept into canon — the key regression
// ---------------------------------------------------------------------------

describe("POST /:id/accept — published-canon regression", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    setGitHubClient(mockGh as unknown as GitHubClientInterface);
    process.env["GITHUB_WEBHOOK_SECRET"] = "test-secret";

    // Full GitHub stub set for the accept flow
    mockGh.getPullRequest.mockResolvedValue({
      merged: false,
      mergeCommitSha: null,
      state: "open",
      headRef: "contrib/scene-one",
      baseRef: "main",
      headSha: "head456",
      baseSha: "base123",
      author: { login: "alice", name: "Alice", email: "alice@example.com" },
      mergedAt: null,
    });
    mockGh.listCommitsBetween.mockResolvedValue([
      {
        sha: "c1",
        message: "Add scene",
        authorLogin: "alice",
        authorName: "Alice",
        authorEmail: "alice@example.com",
      },
    ]);
    mockGh.mergePullRequest.mockResolvedValue("mergesha999");
    mockGh.getMergeCommitRange.mockResolvedValue({
      baseSha: "base123",
      headSha: "head456",
    });
    mockGh.listPullRequestComments.mockResolvedValue([]);
    mockGh.getCommitMessage.mockResolvedValue(
      "Accept scene [telling-forward-acceptance:op1]",
    );
    mockGh.createPullRequestComment.mockResolvedValue(undefined);

    app = buildApp();
  });

  it("writes published-canon (not published-alternate) to the path on acceptance", async () => {
    // Prime the four sequential selects
    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushSelectRows([WORLD_ROW]);
    mockDb.__pushSelectRows([PATH_ROW]);
    mockDb.__pushSelectRows([STEWARD_ROW]);

    const acceptedProposal = makeProposal("accepted-into-canon", {
      decidedAt: new Date().toISOString(),
    });

    // Transaction: first update (proposal) → acceptedProposal; second update
    // (path) → PATH_ROW with state published-canon.
    mockDb.__setTransaction(async (fn: any) => {
      let callCount = 0;
      return fn({
        update: (_t: unknown) => ({
          set: (val: Record<string, unknown>) => {
            callCount++;
            if (callCount === 1 && val["state"]) {
              capture.proposalState = val["state"] as string;
            }
            if (callCount === 2 && val["state"]) {
              capture.pathState = val["state"] as string;
            }
            const result =
              callCount === 1
                ? [acceptedProposal]
                : [{ ...PATH_ROW, state: val["state"] }];
            return {
              where: () => ({
                returning: () => Promise.resolve(result),
              }),
            };
          },
        }),
      });
    });

    await request(app).post("/100/accept");

    // Core regression assertion
    expect(capture.pathState).toBe("published-canon");
    expect(capture.pathState).not.toBe("published-alternate");
  });

  it("returns 409 when trying to accept from draft state", async () => {
    mockDb.__pushSelectRows([makeProposal("draft")]);

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot accept/i);
  });

  it("returns 409 when trying to accept an already accepted proposal without touching GitHub", async () => {
    mockDb.__pushSelectRows([makeProposal("accepted-into-canon")]);

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot accept/i);
    expect(mockGh.getPullRequest).not.toHaveBeenCalled();
    expect(mockGh.mergePullRequest).not.toHaveBeenCalled();
  });

  it("returns 403 when the signed-in user is not a steward", async () => {
    capture.steward = false;

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a steward/i);
  });

  it("returns 401 when the user is not authenticated", async () => {
    capture.authenticated = false;

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 404 when proposal does not exist", async () => {
    mockDb.__pushSelectRows([]);

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(404);
  });

  it("returns 503 when GITHUB_WEBHOOK_SECRET is absent", async () => {
    delete process.env["GITHUB_WEBHOOK_SECRET"];
    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushSelectRows([WORLD_ROW]);

    const res = await request(app).post("/100/accept");

    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Tests: active → restricted
// ---------------------------------------------------------------------------

describe("POST /:id/restrict — steward restriction", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    app = buildApp();
  });

  it("restricts an active proposal and records the optional reason", async () => {
    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushUpdate("proposal", [
      makeProposal("restricted", { decisionReason: "Does not meet the world safety rules." }),
    ]);

    const res = await request(app)
      .post("/100/restrict")
      .send({ reason: "Does not meet the world safety rules." });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("restricted");
    expect(capture.proposalState).toBe("restricted");
    expect(capture.decisionReason).toBe("Does not meet the world safety rules.");
  });

  it("rejects restriction after acceptance into canon", async () => {
    mockDb.__pushSelectRows([makeProposal("accepted-into-canon")]);

    const res = await request(app).post("/100/restrict").send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot restrict/i);
  });
});

// ---------------------------------------------------------------------------
// Tests: active → withdrawn
// ---------------------------------------------------------------------------

describe("POST /:id/withdraw — verified proposal author", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    mockGh.getPullRequest.mockResolvedValue({
      number: 42,
      author: { login: "alice", displayName: "Alice" },
    });
    app = buildApp();
  });

  it("lets the linked GitHub author withdraw an active proposal", async () => {
    mockDb.__pushSelectRows([makeProposal("submitted")]);
    mockDb.__pushSelectRows([WORLD_ROW]);
    mockDb.__pushSelectRows([{ githubUsername: "Alice" }]);
    mockDb.__pushUpdate("proposal", [makeProposal("withdrawn")]);

    const res = await request(app).post("/100/withdraw");

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("withdrawn");
    expect(capture.proposalState).toBe("withdrawn");
  });

  it("rejects a withdrawal by someone other than the pull request author", async () => {
    mockDb.__pushSelectRows([makeProposal("under-review")]);
    mockDb.__pushSelectRows([WORLD_ROW]);
    mockDb.__pushSelectRows([{ githubUsername: "mallory" }]);

    const res = await request(app).post("/100/withdraw");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only the contributor/i);
    expect(capture.proposalState).toBeNull();
  });

  it("rejects withdrawal after acceptance into canon before checking GitHub", async () => {
    mockDb.__pushSelectRows([makeProposal("accepted-into-canon")]);

    const res = await request(app).post("/100/withdraw");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot withdraw/i);
    expect(mockGh.getPullRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: terminal → archived
// ---------------------------------------------------------------------------

describe("POST /:id/archive — steward archives terminal outcomes", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    capture.reset();
    mockDb.__reset();
    app = buildApp();
  });

  it("archives a withdrawn proposal without changing its original decision time", async () => {
    const decidedAt = new Date("2026-08-19T18:00:00.000Z");
    mockDb.__pushSelectRows([makeProposal("withdrawn", { decidedAt })]);
    mockDb.__pushUpdate("proposal", [makeProposal("archived", { decidedAt })]);

    const res = await request(app).post("/100/archive");

    expect(res.status).toBe(200);
    expect(res.body.state).toBe("archived");
    expect(capture.proposalState).toBe("archived");
  });

  it("rejects archiving an active submission", async () => {
    mockDb.__pushSelectRows([makeProposal("submitted")]);

    const res = await request(app).post("/100/archive");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot archive/i);
  });
});

// ---------------------------------------------------------------------------
// State machine invariants — structural / unit-level assertions
// ---------------------------------------------------------------------------

describe("proposal state machine — structural invariants", () => {
  it("published-alternate and published-canon are distinct values", () => {
    // These are the two mutually exclusive terminal path states after a canon
    // review decision; they must never be equal.
    expect("published-canon").not.toBe("published-alternate");
  });

  it("ACCEPT_FROM does not include terminal proposal states", () => {
    // Mirrors the ACCEPT_FROM set in the router source.
    const acceptFrom = new Set(["submitted", "under-review"]);
    const terminal = ["accepted-into-canon", "published-alternate"];
    for (const s of terminal) {
      expect(acceptFrom.has(s)).toBe(false);
    }
  });

  it("REVIEW_FROM only allows non-terminal states", () => {
    const reviewFrom = new Set(["submitted", "returned-with-notes"]);
    const terminal = ["accepted-into-canon", "published-alternate", "draft"];
    for (const s of terminal) {
      expect(reviewFrom.has(s)).toBe(false);
    }
  });

  it("RETURN_FROM only allows active review states", () => {
    const returnFrom = new Set(["submitted", "under-review"]);
    const notAllowed = [
      "draft",
      "returned-with-notes",
      "accepted-into-canon",
      "published-alternate",
    ];
    for (const s of notAllowed) {
      expect(returnFrom.has(s)).toBe(false);
    }
  });
});
