import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  membership: [] as Array<{ id: number }>,
  worlds: [] as Array<{ id: number }>,
  existing: [] as Array<{ id: number }>,
  insertWorld: {
    id: 21,
    repoOwner: "example",
    repoName: "my-world",
    title: "My World",
    stewardId: 7,
    canonBranchRef: "main",
    seed: null,
    readerTheme: "editorial",
    createdAt: new Date("2026-08-27T10:00:00.000Z"),
    updatedAt: new Date("2026-08-27T10:00:00.000Z"),
  },
}));

const mockGh = vi.hoisted(() => ({
  listBranches: vi.fn(),
  getFileContent: vi.fn(),
}));
const mockInsert = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => {
  const table = new Proxy({}, { get: (_target, property) => String(property) });
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => {
              // The route's registration queries are ordered:
              // membership, any-world bootstrap check, duplicate check.
              const next = [state.membership, state.worlds, state.existing][
                queryIndex++
              ];
              return next ?? [];
            }),
          })),
          limit: vi.fn(async () => {
            const next = [state.membership, state.worlds, state.existing][
              queryIndex++
            ];
            return next ?? [];
          }),
        })),
      })),
      insert: mockInsert,
      transaction: mockTransaction,
    },
    storyworldsTable: table,
    storyPathsTable: table,
    contributionsTable: table,
    contributionPathMembershipsTable: table,
    contributorsTable: table,
    proposalsTable: table,
    provenanceRecordsTable: table,
    stewardsTable: table,
    usersTable: table,
  };
});

let queryIndex = 0;

vi.mock("../../lib/github", () => ({
  getGitHubClient: () => mockGh,
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 7 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  isStewardForStoryworld: vi.fn(),
  requireStewardForStoryworld: (_req: any, _res: any, next: any) => next(),
  requireStewardFor: (_req: any, _res: any, next: any) => next(),
  requireStewardForProposal: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: {} }));

import storyworldsRouter from "../storyworlds";

const manifest = JSON.stringify({
  kit: "telling-forward-storyworld",
  kitVersion: 1,
  storyworldId: "my-world",
  title: "My World",
  canonBranch: "main",
  contentRoot: "content",
  provenanceContract: "telling-forward:accepted-contribution:v1",
  governance: {
    inviteOnly: true,
    publicContribution: false,
    automaticCanon: false,
    automaticRightsDecision: false,
  },
});

const labels = JSON.stringify([
  "capsule:character",
  "capsule:arc",
  "capsule:event",
  "capsule:arc-beat",
  "capsule:planned-event",
  "capsule:motif",
  "state:draft",
  "state:submitted",
  "state:under-review",
  "state:returned-with-notes",
  "state:accepted-into-canon",
  "state:published-alternate",
].map((name) => ({ name, color: "123456" })));

const kitFiles: Record<string, string> = {
  "storyworld.json": manifest,
  "CONTRIBUTING.md": "Invite-only contribution guidance",
  "CANON-POLICY.md": "Steward-owned canon policy",
  "PROVENANCE.md":
    "telling-forward:accepted-contribution:v1 Submission-Id Platform-Attribution canon commit SHA",
  ".github/labels.json": labels,
  ".github/CODEOWNERS.example": "* @example/stewards",
  ".github/branch-protection.md": "Protect main",
  ".github/ISSUE_TEMPLATE/capsule.yml": "name: Capsule",
  ".github/ISSUE_TEMPLATE/story-submission.yml": "name: Story submission",
  ".github/workflows/validate-storyworld.yml":
    "permissions:\n  contents: read\njobs:\n  validate:\n    runs-on: ubuntu-latest",
  "scripts/validate-storyworld-kit.mjs": "console.log('valid')",
};

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", storyworldsRouter);
  return app;
}

describe("POST /storyworlds — existing GitHub Storyworld Kit registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryIndex = 0;
    state.membership = [];
    state.worlds = [];
    state.existing = [];
    mockGh.listBranches.mockResolvedValue([{ name: "main", sha: "abc123" }]);
    mockGh.getFileContent.mockImplementation(
      async (_owner: string, _repo: string, path: string) => {
        const content = kitFiles[path];
        if (content === undefined) throw new Error(`missing ${path}`);
        return content;
      },
    );
    mockTransaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        insert: vi.fn(() => ({
          values: vi.fn((values: unknown) => ({
            returning: vi.fn(async () =>
              values === undefined ? [] : [state.insertWorld],
            ),
          })),
        })),
      }),
    );
  });

  it("bootstraps the first authenticated steward only after validating the Kit", async () => {
    const response = await request(buildApp()).post("/").send({
      repository: "https://github.com/Example/My-World.git",
      rightsConfirmed: true,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 21,
      repoOwner: "example",
      repoName: "my-world",
      title: "My World",
      canonBranchRef: "main",
      pathCount: 1,
      savedMomentCount: 0,
    });
    expect(mockGh.listBranches).toHaveBeenCalledWith("example", "my-world");
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("requires rights confirmation before reading GitHub", async () => {
    const response = await request(buildApp()).post("/").send({
      repository: "example/my-world",
      rightsConfirmed: false,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("rights-cleared");
    expect(mockGh.listBranches).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a non-steward when a storyworld already exists", async () => {
    state.worlds = [{ id: 1 }];

    const response = await request(buildApp()).post("/").send({
      repository: "example/my-world",
      rightsConfirmed: true,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("steward");
    expect(mockGh.listBranches).not.toHaveBeenCalled();
  });

  it("returns a clear validation error and does not write for an invalid Kit", async () => {
    mockGh.getFileContent.mockImplementation(async (_owner, _repo, path) => {
      if (path === "storyworld.json") {
        return JSON.stringify({ ...JSON.parse(manifest), kitVersion: 99 });
      }
      return kitFiles[path] ?? "present";
    });

    const response = await request(buildApp()).post("/").send({
      repository: "example/my-world",
      rightsConfirmed: true,
    });

    expect(response.status).toBe(422);
    expect(response.body.error).toContain("Kit validation");
    expect(response.body.details).toContain("storyworld.json must declare kitVersion=1");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a duplicate repository before validation or insertion", async () => {
    state.existing = [{ id: 21 }];

    const response = await request(buildApp()).post("/").send({
      repository: "example/my-world",
      rightsConfirmed: true,
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("already registered");
    expect(mockGh.listBranches).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});