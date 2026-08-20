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
  getIssue:     vi.fn(),
  createIssue:  vi.fn(),
  updateIssue:  vi.fn(),
  closeIssue:   vi.fn(),
  ensureLabels: vi.fn().mockResolvedValue(undefined),
}));

const mockRequireSteward = vi.hoisted(() =>
  vi.fn((_req: any, _res: any, next: any) => next()),
);

const mockIsStewardForStoryworld = vi.hoisted(() => vi.fn());

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
  isStewardForStoryworld:         mockIsStewardForStoryworld,
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
  labels: ["capsule", "capsule:character", "role:protagonist"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ARC_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 43,
  labels: ["capsule", "capsule:arc", "state:draft"],
};

const EVENT_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 44,
  labels: ["capsule", "capsule:event", "state:draft"],
};

const ARC_BEAT_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 45,
  labels: ["capsule:arc-beat", "state:draft"],
};

const PLANNED_EVENT_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 46,
  labels: ["capsule:planned-event", "state:draft"],
};

const MOTIF_CAPSULE = {
  ...CHARACTER_CAPSULE,
  number: 47,
  labels: ["capsule:motif", "state:draft"],
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
    mockIsStewardForStoryworld.mockResolvedValue(true);
    mockGh.ensureLabels.mockResolvedValue(undefined);
    app = buildApp();
  });

  it("returns 404 and does NOT call updateIssue when the issue has no capsule:* label", async () => {
    mockGh.getIssue.mockResolvedValue(NON_CAPSULE_ISSUE);

    const res = await request(app)
      .patch("/1/capsules/99")
      .send({ title: "Attacker-supplied title" });

    expect(res.status).toBe(404);
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.updateIssue).not.toHaveBeenCalled();
  });

  it("returns 200 and calls updateIssue when the issue carries a capsule:character label", async () => {
    mockGh.getIssue.mockResolvedValue(CHARACTER_CAPSULE);
    mockGh.updateIssue.mockResolvedValue({
      ...CHARACTER_CAPSULE,
      title: "Updated Title",
    });

    const res = await request(app)
      .patch("/1/capsules/42")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(mockGh.getIssue).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issueNumber: 42,
    });
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.updateIssue).toHaveBeenCalledOnce();
    expect(res.body.title).toBe("Updated Title");
  });

  it("returns 404 when the issue number is not found at all", async () => {
    mockGh.getIssue.mockResolvedValue(null);

    const res = await request(app)
      .patch("/1/capsules/42")
      .send({ title: "Should not apply" });

    expect(res.status).toBe(404);
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.updateIssue).not.toHaveBeenCalled();
  });
});

describe("GET /storyworlds/1/capsules/access — board capability", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("reports steward capability from the authoritative membership check", async () => {
    // The membership helper owns the user-to-steward-record mapping; the
    // route deliberately never compares a public user ID to stewardId.
    mockIsStewardForStoryworld.mockResolvedValueOnce(true);

    const res = await request(app).get("/1/capsules/access");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isSteward: true });
    expect(mockIsStewardForStoryworld).toHaveBeenCalledWith(1, 1);
  });

  it("reports a read-only capability for an authenticated non-steward", async () => {
    mockIsStewardForStoryworld.mockResolvedValueOnce(false);

    const res = await request(app).get("/1/capsules/access");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isSteward: false });
  });
});

describe("GET /storyworlds/1/capsules — authenticated contributor access", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns capsule data without invoking the steward guard", async () => {
    mockGh.listIssues.mockImplementation(({ labels }: { labels?: string[] }) =>
      Promise.resolve(
        labels?.[0] === "capsule:character" ? [CHARACTER_CAPSULE] : [],
      ),
    );

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockRequireSteward).not.toHaveBeenCalled();
  });

  it("returns 200 and capsule list for an authenticated user", async () => {
    mockGh.listIssues.mockImplementation(({ labels }: { labels?: string[] }) =>
      Promise.resolve(
        labels?.[0] === "capsule:character" ? [CHARACTER_CAPSULE] : [],
      ),
    );

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("character");
    expect(mockGh.listIssues).toHaveBeenCalledTimes(6);
    for (const label of [
      "capsule:character",
      "capsule:arc",
      "capsule:event",
      "capsule:arc-beat",
      "capsule:planned-event",
      "capsule:motif",
    ]) {
      expect(mockGh.listIssues).toHaveBeenCalledWith({
        owner: "testowner",
        repo: "testrepo",
        labels: [label],
        state: "open",
      });
    }
    expect(mockGh.listIssues).not.toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["capsule"] }),
    );
  });

  it("includes API, MCP, and ingestion capsules through exact GitHub label filters", async () => {
    const issuesByLabel: Record<string, object[]> = {
      "capsule:character": [CHARACTER_CAPSULE],
      "capsule:arc": [ARC_CAPSULE],
      "capsule:event": [EVENT_CAPSULE],
      "capsule:arc-beat": [ARC_BEAT_CAPSULE],
      "capsule:planned-event": [PLANNED_EVENT_CAPSULE],
      "capsule:motif": [MOTIF_CAPSULE],
    };
    mockGh.listIssues.mockImplementation(({ labels }: { labels?: string[] }) =>
      Promise.resolve(issuesByLabel[labels?.[0] ?? ""] ?? []),
    );

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body.map((capsule: { id: number }) => capsule.id)).toEqual([
      42, 43, 44, 45, 46, 47,
    ]);
    expect(res.body.map((capsule: { type: string }) => capsule.type)).toEqual([
      "character",
      "arc",
      "event",
      "arc-beat",
      "planned-event",
      "motif",
    ]);
  });

  it("returns a canonical issue once when it has multiple type labels", async () => {
    const multiTypedCapsule = {
      ...CHARACTER_CAPSULE,
      labels: ["capsule:character", "capsule:arc"],
    };
    mockGh.listIssues.mockImplementation(({ labels }: { labels?: string[] }) =>
      Promise.resolve(
        labels?.[0] === "capsule:character" || labels?.[0] === "capsule:arc"
          ? [multiTypedCapsule]
          : [],
      ),
    );

    const res = await request(app).get("/1/capsules");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(42);
  });
});

describe("POST /storyworlds/1/capsules — capsule labels", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGh.ensureLabels.mockResolvedValue(undefined);
    mockGh.createIssue.mockResolvedValue({
      ...CHARACTER_CAPSULE,
      title: "A New Capsule",
      labels: ["capsule", "capsule:character", "role:protagonist"],
    });
    app = buildApp();
  });

  it("ensures and applies the parent capsule label with the type label", async () => {
    const res = await request(app)
      .post("/1/capsules")
      .send({
        title: "A New Capsule",
        type: "character",
        roleTag: "protagonist",
      });

    expect(res.status).toBe(201);
    expect(mockGh.ensureLabels).toHaveBeenCalledWith(
      "testowner",
      "testrepo",
      expect.arrayContaining([
        expect.objectContaining({ name: "capsule" }),
        expect.objectContaining({ name: "capsule:character" }),
        expect.objectContaining({ name: "capsule:arc" }),
        expect.objectContaining({ name: "capsule:event" }),
      ]),
    );
    expect(mockGh.createIssue).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      title: "A New Capsule",
      body: undefined,
      labels: ["capsule", "capsule:character", "role:protagonist"],
    });
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
    mockGh.getIssue.mockResolvedValue(NON_CAPSULE_ISSUE);

    const res = await request(app).delete("/1/capsules/99");

    expect(res.status).toBe(404);
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.closeIssue).not.toHaveBeenCalled();
  });

  it("returns 204 and calls closeIssue when the issue carries a capsule:arc label", async () => {
    mockGh.getIssue.mockResolvedValue(ARC_CAPSULE);
    mockGh.closeIssue.mockResolvedValue(undefined);

    const res = await request(app).delete("/1/capsules/43");

    expect(res.status).toBe(204);
    expect(mockGh.getIssue).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issueNumber: 43,
    });
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.closeIssue).toHaveBeenCalledOnce();
    expect(mockGh.closeIssue).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      issueNumber: 43,
    });
  });

  it("returns 404 when the issue number is not found in the open issues list", async () => {
    mockGh.getIssue.mockResolvedValue(null);

    const res = await request(app).delete("/1/capsules/42");

    expect(res.status).toBe(404);
    expect(mockGh.listIssues).not.toHaveBeenCalled();
    expect(mockGh.closeIssue).not.toHaveBeenCalled();
  });
});
