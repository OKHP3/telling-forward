import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  authenticated: false,
}));

const tables = vi.hoisted(() => ({
  contributorsTable: {
    id: "contributors.id",
    platformIdentity: "contributors.platform_identity",
    githubIdentity: "contributors.github_identity",
  },
  contributorNotificationsTable: {
    id: "contributor_notifications.id",
    contributorId: "contributor_notifications.contributor_id",
    readAt: "contributor_notifications.read_at",
    createdAt: "contributor_notifications.created_at",
  },
  userGithubLinksTable: {
    userId: "user_github_links.user_id",
    githubUsername: "user_github_links.github_username",
  },
}));

const db = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db,
  contributorsTable: tables.contributorsTable,
  contributorNotificationsTable: tables.contributorNotificationsTable,
  userGithubLinksTable: tables.userGithubLinksTable,
}));

vi.mock("@workspace/api-zod", () => ({
  ListContributorNotificationsResponse: { parse: (value: unknown) => value },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!state.authenticated) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.session = { userId: 42 };
    next();
  },
}));

import notificationsRouter from "../notifications";

function buildApp(): Express {
  const app = express();
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn() };
    next();
  });
  app.use("/", notificationsRouter);
  return app;
}

describe("GET /notifications/unread-count", () => {
  beforeEach(() => {
    state.authenticated = false;
    db.select.mockReset();
  });

  it("returns 401 without querying notification data when signed out", async () => {
    const response = await request(buildApp()).get("/notifications/unread-count");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
    expect(db.select).not.toHaveBeenCalled();
  });
});