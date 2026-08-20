import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  where: vi.fn(),
  authenticated: true,
}));

const tables = vi.hoisted(() => ({
  contributionsTable: {
    id: "contributions.id",
    contributorId: "contributions.contributor_id",
    storyworldId: "contributions.storyworld_id",
    pathId: "contributions.path_id",
    title: "contributions.title",
    createdAt: "contributions.created_at",
  },
  contributorsTable: {
    id: "contributors.id",
    platformIdentity: "contributors.platform_identity",
  },
  storyworldsTable: { id: "storyworlds.id", title: "storyworlds.title" },
  storyPathsTable: {
    id: "story_paths.id",
    storyworldId: "story_paths.storyworld_id",
    title: "story_paths.title",
  },
}));

vi.mock("@workspace/db", () => {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: state.where,
    orderBy: vi.fn(() => Promise.resolve(state.rows)),
  };
  return {
    db: { select: vi.fn(() => query) },
    contributionsTable: tables.contributionsTable,
    contributorsTable: tables.contributorsTable,
    storyworldsTable: tables.storyworldsTable,
    storyPathsTable: tables.storyPathsTable,
  };
});

vi.mock("@workspace/api-zod", () => ({
  MyContributionsResponse: { parse: (value: unknown) => value },
  ListMyContributionsResponse: { parse: (value: unknown) => value },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and-condition"),
  desc: vi.fn(() => "desc-condition"),
  eq: vi.fn(() => "eq-condition"),
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    if (!state.authenticated) {
      _res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.session = { userId: 42 };
    next();
  },
}));

import meRouter from "../me";

function buildApp(): Express {
  const app = express();
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn() };
    next();
  });
  app.use("/", meRouter);
  return app;
}

describe("GET /me/contributions", () => {
  beforeEach(() => {
    state.authenticated = true;
    state.rows = [
      {
        id: 17,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        title: "A Door in the Fog",
        submittedAt: new Date("2026-08-20T10:00:00.000Z"),
        status: "accepted",
      },
    ];
    state.where.mockReset();
    state.where.mockImplementation(() => ({
      orderBy: vi.fn(() => Promise.resolve(state.rows)),
    }));
  });

  it("returns only the authenticated contributor's narrations with navigation metadata", async () => {
    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 17,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        title: "A Door in the Fog",
        submittedAt: "2026-08-20T10:00:00.000Z",
        status: "accepted",
      },
    ]);
    expect(state.where).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when the contributor has not submitted a narration", async () => {
    state.rows = [];
    state.where.mockImplementation(() => ({
      orderBy: vi.fn(() => Promise.resolve([])),
    }));

    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("rejects unauthenticated requests", async () => {
    state.authenticated = false;

    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });
});