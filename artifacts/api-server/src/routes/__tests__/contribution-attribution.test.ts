import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
}));

const query = vi.hoisted(() => {
  const orderBy = vi.fn(() => Promise.resolve(state.rows));
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin = vi.fn(() => ({ where }));
  const innerJoin = vi.fn(() => ({ leftJoin }));
  const from = vi.fn(() => ({ innerJoin }));
  const select = vi.fn(() => ({ from }));

  return { select, from, innerJoin, leftJoin, where, orderBy };
});

const tables = vi.hoisted(() => ({
  storyworldsTable: {},
  storyPathsTable: {},
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
  contributionPathMembershipsTable: {
    contributionId: "memberships.contribution_id",
    pathId: "memberships.path_id",
  },
  contributorsTable: {
    id: "contributors.id",
    displayName: "contributors.display_name",
  },
}));

vi.mock("@workspace/db", () => ({
  db: { select: query.select },
  ...tables,
  proposalsTable: {},
  provenanceRecordsTable: {},
  stewardsTable: {},
  usersTable: {},
}));

vi.mock("@workspace/api-zod", () => {
  const invalid = { safeParse: () => ({ success: false }) };
  return {
    GetStoryworldParams: invalid,
    ListStoryPathsParams: invalid,
    ListContributionsParams: {
      safeParse: (value: Record<string, string>) => ({
        success: true,
        data: { id: Number(value.id), pathId: Number(value.pathId) },
      }),
    },
    ListStoryworldProposalsParams: invalid,
  };
});

vi.mock("../../lib/github", () => ({ getGitHubClient: vi.fn() }));
vi.mock("../../middlewares/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../../middlewares/steward", () => ({
  isStewardForStoryworld: vi.fn(),
  requireStewardForStoryworld: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));
vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: {} }));

import storyworldsRouter from "../storyworlds";

function buildApp(): Express {
  const app = express();
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", storyworldsRouter);
  return app;
}

describe("GET /storyworlds/:id/paths/:pathId/contributions — attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rows = [];
  });

  it("returns the contributor's display name alongside the saved moment", async () => {
    state.rows = [
      {
        id: 18,
        storyworldId: 1,
        pathId: 3,
        commitSha: "e3c0a97",
        contributorId: 14,
        contributorDisplayName: "Marcelline",
        title: "The river remembers",
        summary: "The river held the moon.",
        agentAssisted: false,
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
      },
    ];

    const response = await request(buildApp()).get("/1/paths/3/contributions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 18,
        contributorDisplayName: "Marcelline",
      }),
    ]);
    expect(query.select).toHaveBeenCalledWith(
      expect.objectContaining({
        contributorDisplayName: tables.contributorsTable.displayName,
      }),
    );
    expect(query.leftJoin).toHaveBeenCalledWith(
      tables.contributorsTable,
      expect.anything(),
    );
  });

  it("keeps anonymous attribution explicit when no contributor can be resolved", async () => {
    state.rows = [
      {
        id: 19,
        storyworldId: 1,
        pathId: 3,
        commitSha: "4f0d9bb",
        contributorId: null,
        contributorDisplayName: null,
        title: "An unsigned note",
        summary: "No name remained.",
        agentAssisted: false,
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
      },
    ];

    const response = await request(buildApp()).get("/1/paths/3/contributions");

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      contributorId: null,
      contributorDisplayName: null,
    });
  });
});