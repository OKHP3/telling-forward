/**
 * Capsule authorization boundary tests
 *
 * Verifies that PATCH and DELETE /storyworlds/:id/capsules/:capsuleId
 * refuse to act on GitHub issues that lack a `capsule:*` label, while
 * correctly handling issues that do carry such a label.
 *
 * All external dependencies (GitHub client, DB, auth middleware) are mocked
 * so these tests run without network or database access.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

// ---------------------------------------------------------------------------
// Hoisted mocks — evaluated before any import in this file
// ---------------------------------------------------------------------------

const mockGh = vi.hoisted(() => ({
  listIssues:   vi.fn(),
  createIssue:  vi.fn(),
  updateIssue:  vi.fn(),
  closeIssue:   vi.fn(),
  ensureLabels: vi.fn().mockResolvedValue(undefined),
}));

const mockRequireSteward = vi.hoisted(() =>
  vi.fn((_req: any, _res: any, next: any) => next()),
);

vi.mock("@workspace/db", () => {
  // Returns a minimal Drizzle-style chain: the storyworld lookup always
  // resolves to a single world with owner=testowner, repo=testrepo.
  const worldRow = { repoOwner: "testowner", repoName: "testrepo" };
  const chain = () => ({
    from: () => ({
      where: () => ({
        limit:   () => Promise.resolve([worldRow]),
        orderBy: () => Promise.resolve([worldRow]),
      }),
      orderBy: () => Promise.resolve([worldRow]),
      limit:   () => Promise.resolve([worldRow]),
    }),
  });
  return {
    db: { select: chain },
    storyworldsTable: { id: "id", repoOwner: "repoOwner", repoName: "repoName" },
    stewardsTable:    { storyworldId: "storyworldId", userId: "userId", id: "id" },
    proposalsTable:   {},
    storyPathsTable:  {},
    contributionsTable: {},
  };
});

vi.mock("../../lib/github", () => ({
  getGitHubClient: () => mockGh,
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 1 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardForStoryworld: mockRequireSteward,
  requireStewardFor:           (_req: any, _res: any, next: any, _id: any) => next(),
  requireStewardForProposal:   (_req: any, _res: any, next: any) => next(),
}));

vi.mock("@workspace/api-zod", () => {
  const passSchema = { safeParse: (v: any) => ({ success: true, data: v }) };
  return {
    GetStoryworldParams:           passSchema,
    ListStoryPathsParams:          passSchema,
    ListContributionsParams:       passSchema,
    ListStoryworldProposalsParams: passSchema,
  };
});

// ---------------------------------------------------------------------------
// Static import of the router (runs after mocks are hoisted)
// ---------------------------------------------------------------------------

import storyworldsRouter from "../storyworlds";

// ---------------------------------------------------------------------------
// Fixture issues
// ---------------------------------------------------------------------------

const NON_CAPSULE_ISSUE = {
  number: 99,
  title: "Some unrelated workflow issue",
  body: null,
  state: "open" as const,
  labels: ["bug", "help wanted"],   // no capsule:* label
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const CHARACTER_CAPSULE = {
  number: 42,
  title: "The Wandering Cartographer",
  body: "A hero who maps unmapped worlds.",
  state: "open" as const,
  labels: ["capsule:character", "role:protagonist"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ARC_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 43,
  labels: ["capsule:arc", "state:draft"],
};

const EVENT_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 44,
  labels: ["capsule:event", "state:draft"],
};

const LEGACY_KIND_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 45,
  labels: ["capsule", "kind:character", "state:draft"],
};

const KIND_ONLY_ISSUE = {
  ...CHARACTER_CAPSULE,
  number: 46,
  labels: ["kind:character"],
};

const BARE_CAPSULE_ISSUE = {
  ...CHARACTER_CAPSULE,
  number: 47,
  labels: ["capsule"],
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  // Attach a stub logger so req.log.error() calls in route handlers don't crash
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", storyworldsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /storyworlds/1/capsules/:capsuleId — capsule identity boundary", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGh.ensureLabels.mockResolvedValue(undefined);
    app = buildApp();
  });

  it("returns 404 and does NOT call updateIssue when the issue has no capsule:* label", async () => {
    mockGh.listIssues.mockResolvedValue([NON_CAPSULE_ISSUE]);

    const res = await request(app)
      .patch("/1/capsules/99")
      .send({ title: "Attacker-supplied title" });

    expect(res.status).toBe(404);
    expect(mockGh.updateIssue).not.toHaveBeenCalled();
  });

  it("returns 200 and calls updateIssue when the issue carries a capsule:character label", async () => {
    mockGh.listIssues.mockResolvedValue([CHARACTER_CAPSULE]);
    mockGh.updateIssue.mockResolvedValue({
      ...CHARACTER_CAPSULE,
      title: "Updated Title",
    });

    const res = await request(app)
      .patch("/1/capsules/42")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(mockGh.updateIssue).toHaveBeenCalledOnce();
    expect(res.body.title).toBe("Updated Title");
  });

  it("returns 404 when the issue number is not found at all", async () => {
    // listIssues returns an entirely different issue number
    mockGh.listIssues.mockResolvedValue([{ ...CHARACTER_CAPSULE, number: 100 }]);

    const res = await request(app)
      .patch("/1/capsules/42")
      .send({ title: "Should not apply" });

    expect(res.status).toBe(404);
    expect(mockGh.updateIssue).not.toHaveBeenCalled();
  });
});

describe("GET /storyworlds/1/capsules — steward access control", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns 403 and does NOT return capsule data when the user is not a steward", async () => {
    // Override the steward middleware to reject for this test
    mockRequireSteward.mockImplementationOnce(
      (_req: any, res: any, _next: any): Promise<void> => {
        res.status(403).json({ error: "Not a steward for this storyworld" });
        return Promise.resolve();
      }
    );

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(403);
    expect(mockGh.listIssues).not.toHaveBeenCalled();
  });

  it("returns 200 and capsule list for an authenticated steward", async () => {
    mockGh.listIssues.mockResolvedValue([CHARACTER_CAPSULE]);

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("character");
  });

  it("includes API, MCP, and ingestion capsules through the shared capsule:* filter only", async () => {
    // The API writer creates capsule:character, while both MCP and ingestion
    // writers create the same typed contract for arc and event capsules.
    mockGh.listIssues.mockResolvedValue([
      CHARACTER_CAPSULE,
      ARC_CAPSULE,
      EVENT_CAPSULE,
      LEGACY_KIND_CAPSULE,
      KIND_ONLY_ISSUE,
      BARE_CAPSULE_ISSUE,
      NON_CAPSULE_ISSUE,
    ]);

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body.map((capsule: { id: number }) => capsule.id)).toEqual([42, 43, 44]);
    expect(res.body.map((capsule: { type: string }) => capsule.type)).toEqual([
      "character",
      "arc",
      "event",
    ]);
  });
});

describe("DELETE /storyworlds/1/capsules/:capsuleId — capsule identity boundary", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGh.ensureLabels.mockResolvedValue(undefined);
    app = buildApp();
  });

  it("returns 404 and does NOT call closeIssue when the issue has no capsule:* label", async () => {
    mockGh.listIssues.mockResolvedValue([NON_CAPSULE_ISSUE]);

    const res = await request(app).delete("/1/capsules/99");

    expect(res.status).toBe(404);
    expect(mockGh.closeIssue).not.toHaveBeenCalled();
  });

  it("returns 204 and calls closeIssue when the issue carries a capsule:arc label", async () => {
    mockGh.listIssues.mockResolvedValue([ARC_CAPSULE]);
    mockGh.closeIssue.mockResolvedValue(undefined);

    const res = await request(app).delete("/1/capsules/43");

    expect(res.status).toBe(204);
    expect(mockGh.closeIssue).toHaveBeenCalledOnce();
    expect(mockGh.closeIssue).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issueNumber: 43,
    });
  });

  it("returns 404 when the issue number is not found in the open issues list", async () => {
    mockGh.listIssues.mockResolvedValue([]);

    const res = await request(app).delete("/1/capsules/42");

    expect(res.status).toBe(404);
    expect(mockGh.closeIssue).not.toHaveBeenCalled();
  });
});
