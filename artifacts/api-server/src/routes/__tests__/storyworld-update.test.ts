import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({ steward: true }));

const mockReturning = vi.hoisted(() => vi.fn());
const mockUpdateWhere = vi.hoisted(() => vi.fn(() => ({ returning: mockReturning })));
const mockUpdateSet = vi.hoisted(() => vi.fn(() => ({ where: mockUpdateWhere })));
const mockUpdate = vi.hoisted(() => vi.fn(() => ({ set: mockUpdateSet })));
const mockPathWhere = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() =>
  vi.fn(() => ({
    from: vi.fn(() => ({ where: mockPathWhere })),
  })),
);

vi.mock("@workspace/db", () => {
  const table = new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  );

  return {
    db: {
      update: mockUpdate,
      select: mockSelect,
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

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 7 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardForStoryworld: (_req: any, res: any, next: any) => {
    if (!state.steward) {
      res.status(403).json({ error: "Not a steward for this storyworld" });
      return;
    }
    next();
  },
  isStewardForStoryworld: vi.fn(),
  requireStewardFor: (_req: any, _res: any, next: any) => next(),
  requireStewardForProposal: (_req: any, _res: any, next: any) => next(),
}));

import storyworldsRouter from "../storyworlds";

const UPDATED_WORLD = {
  id: 1,
  repoOwner: "telling-forward",
  repoName: "storyworld",
  title: "The Cartographer's Oath",
  stewardId: 7,
  canonBranchRef: "main",
  seed: "A map remembers every shore it leaves behind.",
  readerTheme: "editorial",
  createdAt: new Date("2026-08-01T12:00:00.000Z"),
  updatedAt: new Date("2026-08-20T12:00:00.000Z"),
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

describe("PATCH /storyworlds/:id — discovery seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.steward = true;
    mockReturning.mockResolvedValue([UPDATED_WORLD]);
    mockPathWhere.mockResolvedValue([{ pathCount: 3 }]);
  });

  it("lets a steward save a short seed sentence and returns the refreshed world", async () => {
    const res = await request(buildApp())
      .patch("/1")
      .send({ seed: UPDATED_WORLD.seed });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      seed: UPDATED_WORLD.seed,
      pathCount: 3,
    });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ seed: UPDATED_WORLD.seed }),
    );
  });

  it("lets a steward clear the seed with an explicit null", async () => {
    mockReturning.mockResolvedValue([{ ...UPDATED_WORLD, seed: null }]);

    const res = await request(buildApp())
      .patch("/1")
      .send({ seed: null });

    expect(res.status).toBe(200);
    expect(res.body.seed).toBeNull();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ seed: null }),
    );
  });

  it.each([
    { seed: "A seed with\na second line." },
    { seed: "x".repeat(121) },
  ])("rejects invalid one-line seed input before writing", async (body) => {
    const res = await request(buildApp()).patch("/1").send(body);

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("keeps the discovery invitation steward-only", async () => {
    state.steward = false;

    const res = await request(buildApp())
      .patch("/1")
      .send({ seed: UPDATED_WORLD.seed });

    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});