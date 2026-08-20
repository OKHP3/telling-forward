/**
 * Concept Board AI action authorization tests.
 *
 * These tests keep the route middleware order intact while replacing external
 * services. The assertions make sure unauthenticated and authenticated
 * non-steward requests cannot reach GitHub or OpenAI.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

const state = vi.hoisted(() => ({
  authenticated: false,
  steward: false,
}));

const mockOpenAiCreate = vi.hoisted(() => vi.fn());

const mockGh = vi.hoisted(() => ({
  listIssues: vi.fn(),
  getIssue: vi.fn(),
}));

vi.mock("@workspace/db", () => {
  const table = new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  );

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { repoOwner: "telling-forward", repoName: "storyworld" },
            ]),
          })),
        })),
      })),
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
  requireAuth: (req: any, res: any, next: any) => {
    if (!state.authenticated) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
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

vi.mock("../../lib/github", () => ({
  getGitHubClient: () => mockGh,
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: mockOpenAiCreate,
      },
    },
  },
}));

vi.mock("@workspace/api-zod", () => {
  const passSchema = { safeParse: (value: any) => ({ success: true, data: value }) };
  return {
    GetStoryworldParams: passSchema,
    ListStoryPathsParams: passSchema,
    ListContributionsParams: passSchema,
    ListStoryworldProposalsParams: passSchema,
    CreateContributionBody: passSchema,
    CreateContributionParams: passSchema,
  };
});

import storyworldsRouter from "../storyworlds";

const CAPSULE = {
  number: 42,
  title: "The Wandering Cartographer",
  body: "A hero who maps unmapped worlds.",
  state: "open" as const,
  labels: ["capsule", "capsule:character", "role:protagonist"],
  createdAt: new Date("2026-08-19T12:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-08-19T12:00:00.000Z").toISOString(),
};

const ACTIONS = [
  { name: "promote", body: undefined },
  { name: "disrupt", body: { sourceText: "The accepted scene begins in the rain." } },
  { name: "invert", body: undefined },
] as const;

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

async function callAction(
  app: Express,
  action: (typeof ACTIONS)[number],
) {
  const req = request(app).post(`/1/capsules/42/${action.name}`);
  return action.body === undefined ? req : req.send(action.body);
}

async function* promoteStream() {
  yield { choices: [{ delta: { content: "A lantern swung." } }] };
}

describe.each(ACTIONS)(
  "POST /storyworlds/1/capsules/42/$name",
  (action) => {
    beforeEach(() => {
      state.authenticated = false;
      state.steward = false;
      mockOpenAiCreate.mockReset();
      mockGh.listIssues.mockReset();
      mockGh.getIssue.mockReset();
      mockGh.getIssue.mockResolvedValue(CAPSULE);
    });

    it("returns 401 to unauthenticated requests before checking steward access", async () => {
      const res = await callAction(buildApp(), action);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required" });
      expect(mockGh.listIssues).not.toHaveBeenCalled();
      expect(mockGh.getIssue).not.toHaveBeenCalled();
      expect(mockOpenAiCreate).not.toHaveBeenCalled();
    });

    it("returns 403 to authenticated non-stewards before reading the capsule or calling OpenAI", async () => {
      state.authenticated = true;

      const res = await callAction(buildApp(), action);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Not a steward for this storyworld" });
      expect(mockGh.listIssues).not.toHaveBeenCalled();
      expect(mockGh.getIssue).not.toHaveBeenCalled();
      expect(mockOpenAiCreate).not.toHaveBeenCalled();
    });

    it("allows a steward to reach the mocked AI action", async () => {
      state.authenticated = true;
      state.steward = true;

      if (action.name === "promote") {
        mockOpenAiCreate.mockResolvedValue(promoteStream());
      } else if (action.name === "disrupt") {
        mockOpenAiCreate.mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "The Unmapped Shore",
                type: "event",
                epiphanyNote: "The map refuses its maker.",
              }),
            },
          }],
        });
      } else {
        mockOpenAiCreate.mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "The Cartographer Who Erases",
                type: "character",
                epiphanyNote: "Every map becomes a disappearance.",
              }),
            },
          }],
        });
      }

      const res = await callAction(buildApp(), action);

      expect(res.status).toBe(200);
      expect(mockGh.getIssue).toHaveBeenCalledWith({
        owner: "telling-forward",
        repo: "storyworld",
        issueNumber: 42,
      });
      expect(mockGh.getIssue).toHaveBeenCalledOnce();
      expect(mockGh.listIssues).not.toHaveBeenCalled();
      expect(mockOpenAiCreate).toHaveBeenCalledOnce();

      if (action.name === "promote") {
        expect(res.headers["content-type"]).toMatch(/^text\/event-stream/);
        expect(res.text).toContain('data: {"content":"A lantern swung."}');
        expect(res.text).toContain('data: {"done":true}');
      } else if (action.name === "disrupt") {
        expect(res.body).toEqual({
          title: "The Unmapped Shore",
          type: "event",
          epiphanyNote: "The map refuses its maker.",
        });
      } else {
        expect(res.body).toEqual({
          title: "The Cartographer Who Erases",
          type: "character",
          epiphanyNote: "Every map becomes a disappearance.",
        });
      }
    });
  },
);