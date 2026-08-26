import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const state = vi.hoisted(() => ({
  caseRecord: {
    id: "case-1",
    storyworldId: 1,
    status: "open",
    primaryReasonCode: "spam",
    visibilityAction: "none",
  },
  caseInsert: vi.fn(),
  eventInsert: vi.fn(),
  transaction: vi.fn(),
}));

const tables = vi.hoisted(() => ({
  moderationCasesTable: {
    id: "moderation_cases.id",
    storyworldId: "moderation_cases.storyworld_id",
    status: "moderation_cases.status",
    primaryReasonCode: "moderation_cases.primary_reason_code",
  },
  moderationEventsTable: { caseId: "moderation_events.case_id" },
  storyworldModerationControlsTable: {
    id: "storyworld_moderation_controls.id",
    storyworldId: "storyworld_moderation_controls.storyworld_id",
  },
}));

vi.mock("@workspace/db", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const result = Promise.resolve([state.caseRecord]);
          return Object.assign(result, {
            limit: vi.fn(() => Promise.resolve([{ storyworldId: 1 }])),
          });
        }),
      })),
    })),
    transaction: state.transaction,
  };
  return {
    db,
    ...tables,
  };
});

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 42 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardFor: (_req: any, _res: any, next: any) => next(),
  requireStewardForStoryworld: (_req: any, _res: any, next: any) => next(),
}));

import moderationRouter from "../moderation";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/", moderationRouter);
  return app;
}

function configureTransaction({ failEvent }: { failEvent: boolean }) {
  state.transaction.mockImplementation(async (callback) => {
    const workingCase = { ...state.caseRecord };
    state.caseInsert.mockImplementation(async () => [workingCase]);
    const tx = {
      update: vi.fn(() => ({
        set: vi.fn((changes) => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => {
              Object.assign(workingCase, changes);
              return [workingCase];
            }),
          })),
        })),
      })),
      insert: vi.fn((table) => table === tables.moderationCasesTable
        ? { values: vi.fn(() => ({ returning: state.caseInsert })) }
        : { values: state.eventInsert }),
    };
    state.eventInsert.mockImplementation(async () => {
      if (failEvent) throw new Error("moderation event store unavailable");
    });

    try {
      const result = await callback(tx);
      state.caseRecord = workingCase;
      return result;
    } catch (error) {
      throw error;
    }
  });
}

describe("moderation decision atomicity", () => {
  beforeEach(() => {
    state.caseRecord = {
      id: "case-1",
      storyworldId: 1,
      status: "open",
      primaryReasonCode: "spam",
      visibilityAction: "none",
    };
    state.eventInsert.mockReset();
    state.caseInsert.mockReset();
    state.transaction.mockReset();
  });

  it("does not expose a public report intake route during the private pilot", async () => {
    const response = await request(buildApp())
      .post("/storyworlds/1/moderation/report")
      .send({
        subjectKind: "contribution",
        subjectReference: "public-report-attempt",
        reasonCode: "spam",
      });

    expect(response.status).toBe(404);
  });

  it("rolls back a case action when its audit event cannot be written", async () => {
    configureTransaction({ failEvent: true });

    const response = await request(buildApp())
      .post("/moderation/cases/case-1/action")
      .send({ status: "dismissed", visibilityAction: "none" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to apply moderation outcome" });
    expect(state.caseRecord).toMatchObject({
      status: "open",
      visibilityAction: "none",
    });
    expect(state.transaction).toHaveBeenCalledTimes(1);
  });

  it("does not leave a case behind when its opening audit event cannot be written", async () => {
    configureTransaction({ failEvent: true });

    const response = await request(buildApp())
      .post("/storyworlds/1/moderation/cases")
      .send({
        subjectKind: "contribution",
        subjectReference: "contribution-1",
        primaryReasonCode: "spam",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create moderation case" });
    expect(state.caseRecord).toMatchObject({
      id: "case-1",
      status: "open",
      visibilityAction: "none",
    });
    expect(state.caseInsert).toHaveBeenCalledTimes(1);
    expect(state.eventInsert).toHaveBeenCalledTimes(1);
    expect(state.transaction).toHaveBeenCalledTimes(1);
  });

  it("rolls back every case when a batch audit event cannot be written", async () => {
    configureTransaction({ failEvent: true });

    const response = await request(buildApp())
      .post("/storyworlds/1/moderation/batch-dismiss")
      .send({ caseIds: ["case-1"], reasonCode: "spam", confirm: true });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Failed to dismiss moderation cases",
    });
    expect(state.caseRecord).toMatchObject({
      status: "open",
      visibilityAction: "none",
    });
    expect(state.transaction).toHaveBeenCalledTimes(1);
  });
});