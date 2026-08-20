import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  narrationRows: [] as unknown[],
  proposalRows: [] as unknown[],
  githubLinkRows: [] as unknown[],
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
  proposalsTable: {
    id: "proposals.id",
    contributorId: "proposals.contributor_id",
    githubUserId: "proposals.github_user_id",
    storyworldId: "proposals.storyworld_id",
    pathId: "proposals.path_id",
    prNumber: "proposals.pr_number",
    state: "proposals.state",
    submittedAt: "proposals.submitted_at",
  },
  userGithubLinksTable: {
    userId: "user_github_links.user_id",
    githubUserId: "user_github_links.github_user_id",
    githubUsername: "user_github_links.github_username",
  },
  storyworldsTable: { id: "storyworlds.id", title: "storyworlds.title" },
  storyPathsTable: {
    id: "story_paths.id",
    storyworldId: "story_paths.storyworld_id",
    title: "story_paths.title",
  },
}));

vi.mock("@workspace/db", () => {
  const makeQuery = () => {
    let source: unknown;
    const query = {
      from: vi.fn((table) => {
        source = table;
        return query;
      }),
      innerJoin: vi.fn(() => query),
      where: vi.fn((...args) => {
        state.where(...args);
        return query;
      }),
      orderBy: vi.fn(() =>
        Promise.resolve(
          source === tables.contributionsTable
            ? state.narrationRows
            : state.proposalRows,
        ),
      ),
      limit: vi.fn(() => Promise.resolve([])),
    };
    return query;
  };
  return {
    db: { select: vi.fn(() => makeQuery()) },
    contributionsTable: tables.contributionsTable,
    contributorsTable: tables.contributorsTable,
    proposalsTable: tables.proposalsTable,
    storyworldsTable: tables.storyworldsTable,
    storyPathsTable: tables.storyPathsTable,
    userGithubLinksTable: tables.userGithubLinksTable,
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
  inArray: vi.fn(() => "in-array-condition"),
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
    state.narrationRows = [
      {
        id: 17,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        title: "A Door in the Fog",
        submittedAt: new Date("2026-08-20T10:00:00.000Z"),
      },
    ];
    state.proposalRows = [
      {
        id: 21,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        prNumber: 88,
        state: "returned-with-notes",
        submittedAt: new Date("2026-08-21T10:00:00.000Z"),
      },
      {
        id: 22,
        storyworldId: 3,
        storyworldTitle: "City of Brass",
        pathId: 11,
        pathTitle: "The Archive",
        prNumber: 89,
        state: "under-review",
        submittedAt: new Date("2026-08-19T10:00:00.000Z"),
      },
    ];
    state.where.mockReset();
  });

  it("returns the contributor's accepted narrations and explicitly linked pending or returned submissions", async () => {
    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 21,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        title: "Submission #88",
        submittedAt: "2026-08-21T10:00:00.000Z",
        source: "proposal",
        status: "returned",
      },
      {
        id: 17,
        storyworldId: 2,
        storyworldTitle: "Echoes of the Drift",
        pathId: 9,
        pathTitle: "The Lantern Room",
        title: "A Door in the Fog",
        submittedAt: "2026-08-20T10:00:00.000Z",
        source: "narration",
        status: "accepted",
      },
      {
        id: 22,
        storyworldId: 3,
        storyworldTitle: "City of Brass",
        pathId: 11,
        pathTitle: "The Archive",
        title: "Submission #89",
        submittedAt: "2026-08-19T10:00:00.000Z",
        source: "proposal",
        status: "pending",
      },
    ]);
    expect(state.where).toHaveBeenCalledTimes(2);
  });

  it("returns no proposal activity when no proposal has passed the immutable GitHub account match", async () => {
    state.narrationRows = [];
    state.proposalRows = [];

    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(state.where).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthenticated requests", async () => {
    state.authenticated = false;

    const response = await request(buildApp()).get("/contributions");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });
});