import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";

const state = vi.hoisted(() => ({
  steward: true,
  rows: [] as Array<Record<string, unknown>>,
  projection: null as Record<string, unknown> | null,
}));

const table = vi.hoisted(() =>
  new Proxy(
    {},
    { get: (_target, property) => String(property) },
  ),
);

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn((projection?: Record<string, unknown>) => {
      state.projection = projection ?? null;
      return {
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(state.rows),
          }),
        }),
      };
    }),
  },
  storyworldsTable: table,
  storyPathsTable: table,
  proposalsTable: table,
  editorQuestionsTable: table,
  webhookDeliveryEvidenceTable: table,
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 42 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardFor: (_req: any, res: any, next: any) => {
    if (!state.steward) {
      res.status(403).json({ error: "Not a steward for this storyworld" });
      return;
    }
    next();
  },
}));

import adminRouter from "../admin";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", adminRouter);
  return app;
}

describe("GET /webhook-deliveries/:id", () => {
  beforeEach(() => {
    state.steward = true;
    state.rows = [
      {
        id: 9,
        deliveryId: "delivery-123",
        eventType: "pull_request_review",
        processingResult: "processed",
        replayOutcome: "duplicate",
        proposalId: 100,
        editorQuestionId: 7,
        notificationKey: "editor-question:123",
        provenanceRecordId: null,
        receivedAt: new Date("2026-08-26T00:00:00.000Z"),
      },
    ];
    state.projection = null;
  });

  it("returns only redacted delivery evidence to the storyworld steward", async () => {
    const response = await request(buildApp()).get("/webhook-deliveries/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        deliveryId: "delivery-123",
        eventType: "pull_request_review",
        processingResult: "processed",
        replayOutcome: "duplicate",
        proposalId: 100,
        editorQuestionId: 7,
        notificationKey: "editor-question:123",
      }),
    ]);
    expect(state.projection).not.toBeNull();
    expect(Object.keys(state.projection ?? {})).not.toEqual(
      expect.arrayContaining(["payload", "signature", "secret", "privateNote"]),
    );
  });

  it("does not let a non-steward inspect another storyworld's evidence", async () => {
    state.steward = false;

    const response = await request(buildApp()).get("/webhook-deliveries/1");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Not a steward for this storyworld" });
  });

  it("rejects malformed storyworld identifiers before querying evidence", async () => {
    const response = await request(buildApp()).get("/webhook-deliveries/not-a-world");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid storyworld id" });
  });
});