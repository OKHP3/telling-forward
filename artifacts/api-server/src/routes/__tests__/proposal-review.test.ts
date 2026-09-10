import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

const state = vi.hoisted(() => ({
  selects: [] as unknown[][],
  inserted: [] as Record<string, unknown>[],
  transactionInserts: [] as unknown[][],
  reset() {
    this.selects = [];
    this.inserted = [];
    this.transactionInserts = [];
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock("@workspace/db", () => {
  const field = (name: string) => ({ name });
  const table = (name: string) =>
    new Proxy(
      {},
      { get: (_target, property) => field(`${name}.${String(property)}`) },
    );
  const tables = {
    proposalsTable: table("proposals"),
    proposalVersionsTable: table("proposal_versions"),
    proposalReviewEventsTable: table("proposal_review_events"),
    storyworldsTable: table("storyworlds"),
    storyPathsTable: table("story_paths"),
    editorQuestionsTable: table("editor_questions"),
    stewardsTable: table("stewards"),
    userGithubLinksTable: table("user_github_links"),
    contributorsTable: table("contributors"),
  };
  const chain = (rows: unknown[]) => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
        orderBy: () => Promise.resolve(rows),
      }),
    }),
  });
  const insert = (transaction = false) => ({
    values: (values: Record<string, unknown>) => {
      if (transaction) state.transactionInserts.push([values]);
      else state.inserted.push(values);
      return {
        returning: async () => {
          if (transaction) {
            const next = state.transactionInserts.shift()?.[0];
            return next ? [next] : [];
          }
          return [{ ...values, id: 901, createdAt: new Date() }];
        },
      };
    },
  });
  const db = {
    select: () => chain(state.selects.shift() ?? []),
    insert: () => insert(),
    transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        insert: () => insert(true),
      }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
  };
  return { db, ...tables };
});

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 77 };
    next();
  },
}));

vi.mock("../../middlewares/steward", () => ({
  requireStewardForProposal: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../lib/github", () => ({
  getGitHubClient: vi.fn(),
}));

vi.mock("../../lib/provenance", () => ({
  buildAcceptanceDecisionNote: vi.fn(),
  buildAcceptanceIntentNote: vi.fn(),
  contributorAttributionsForPath: vi.fn(),
  indexSavedMoment: vi.fn(),
  replacePathMomentMemberships: vi.fn(),
  resolveContributor: vi.fn(),
  stewardAttribution: vi.fn(),
  verifyAcceptanceDecisionNote: vi.fn(),
  writeAcceptedProvenance: vi.fn(),
}));

vi.mock("../../lib/contributor-notifications", () => ({
  emitContributorNotification: vi.fn(),
}));

vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@workspace/api-zod", () => {
  const pass = { safeParse: (value: unknown) => ({ success: true, data: value }) };
  return {
    GetProposalParams: pass,
    CreateProposalVersionBody: pass,
    CreateProposalVersionResponse: { parse: (value: unknown) => value },
    AcceptProposalVersionBody: pass,
    RejectProposalVersionBody: pass,
    RequestProposalVersionRevisionBody: pass,
    AppealProposalVersionBody: pass,
  };
});

import proposalsRouter from "../proposals";

const proposal = {
  id: 1,
  storyworldId: 10,
  pathId: 20,
  prNumber: 42,
  state: "submitted",
  submittedAt: new Date(),
  decidedAt: null,
  decisionReason: null,
};

function makeVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    proposalId: 1,
    proposalLineageRef: "lineage-scene-001",
    versionRef: "proposal-version-002",
    predecessorVersionRef: null,
    fidelityNoteRef: "fidelity-note-proposal-version-002",
    sourceReference: null,
    outputReference: null,
    predecessorFidelityNoteRetainedRef: null,
    predecessorReviewEventRetainedRef: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function app(): Express {
  const value = express();
  value.use(express.json());
  value.use((req: any, _res, next) => {
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  value.use("/", proposalsRouter);
  return value;
}

describe("immutable proposal review routes", () => {
  beforeEach(() => state.reset());

  it("accepts the exact fixture version and appends an event without updating the proposal", async () => {
    const event = {
      id: 41,
      eventRef: "review-event-accept-002",
      proposalId: 1,
      proposalVersionId: 11,
      proposalLineageRef: "lineage-scene-001",
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
      action: "accept",
      resultingReviewState: "accepted-by-contributor",
      safeReason: null,
      stewardDecisionRef: null,
      actorUserId: 77,
      createdAt: new Date(),
    };
    state.selects.push([proposal], [makeVersion()], [], []);

    const response = await request(app())
      .post("/1/versions/proposal-version-002/review/accept")
      .send({
        proposalLineageRef: "lineage-scene-001",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-accept-002",
      });

    expect(response.status).toBe(201);
    expect(response.body.versionRef).toBe("proposal-version-002");
    expect(response.body.fidelityNoteRef).toBe(
      "fidelity-note-proposal-version-002",
    );
    expect(response.body.reviewEvent.eventRef).toBe(
      "review-event-accept-002",
    );
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]?.versionRef).toBe("proposal-version-002");
  });

  it("rejects a cross-lineage or misbound review before writing an event", async () => {
    state.selects.push(
      [proposal],
      [
        makeVersion({
          proposalLineageRef: "lineage-scene-001",
        }),
      ],
      [],
      [],
    );

    const response = await request(app())
      .post("/1/versions/proposal-version-002/review/reject")
      .send({
        proposalLineageRef: "lineage-scene-002",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-reject-002",
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toContain("lineage");
    expect(state.inserted).toHaveLength(0);
  });

  it("records rejection and refuses a second terminal outcome for the same version", async () => {
    const rejectedEvent = {
      id: 42,
      eventRef: "review-event-reject-002",
      proposalId: 1,
      proposalVersionId: 11,
      proposalLineageRef: "lineage-scene-001",
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
      action: "reject",
      resultingReviewState: "rejected-by-contributor",
      createdAt: new Date(),
    };
    state.selects.push([proposal], [makeVersion()], [], []);
    state.inserted.push(rejectedEvent);
    const rejected = await request(app())
      .post("/1/versions/proposal-version-002/review/reject")
      .send({
        proposalLineageRef: "lineage-scene-001",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-reject-002",
      });
    expect(rejected.status).toBe(201);
    expect(rejected.body.reviewEvent.resultingReviewState).toBe(
      "rejected-by-contributor",
    );

    state.selects.push(
      [proposal],
      [makeVersion()],
      [rejectedEvent],
      [],
    );
    const frozen = await request(app())
      .post("/1/versions/proposal-version-002/review/accept")
      .send({
        proposalLineageRef: "lineage-scene-001",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-accept-002",
      });
    expect(frozen.status).toBe(409);
  });

  it("records an appeal against the exact version without changing proposal state", async () => {
    const appealEvent = {
      id: 43,
      eventRef: "review-event-appeal-002",
      proposalId: 1,
      proposalVersionId: 11,
      proposalLineageRef: "lineage-scene-001",
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
      action: "appeal",
      resultingReviewState: "appeal-pending",
      stewardDecisionRef: "steward-decision-002",
      createdAt: new Date(),
    };
    state.selects.push([proposal], [makeVersion()], [], []);
    state.inserted.push(appealEvent);

    const response = await request(app())
      .post("/1/versions/proposal-version-002/review/appeal")
      .send({
        proposalLineageRef: "lineage-scene-001",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-appeal-002",
        stewardDecisionRef: "steward-decision-002",
        safeReason: "Please review the decision with the steward.",
      });

    expect(response.status).toBe(201);
    expect(response.body.reviewEvent.versionRef).toBe(
      "proposal-version-002",
    );
    expect(response.body.reviewEvent.resultingReviewState).toBe(
      "appeal-pending",
    );
    expect(response.body.reviewEvent.stewardDecisionRef).toBe(
      "steward-decision-002",
    );
    expect(response.body.proposalId).toBe(proposal.id);
  });

  it("creates a revision child with a new note and no inherited review events", async () => {
    const priorEvent = {
      id: 40,
      eventRef: "review-event-request-changes-001",
      proposalId: 1,
      proposalVersionId: 11,
      proposalLineageRef: "lineage-scene-001",
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
      action: "request-revision",
      resultingReviewState: "changes-requested",
      createdAt: new Date(),
    };
    const successor = makeVersion({
      id: 12,
      versionRef: "proposal-version-003",
      predecessorVersionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-003",
      predecessorFidelityNoteRetainedRef:
        "fidelity-note-proposal-version-002",
      predecessorReviewEventRetainedRef: "review-event-request-changes-001",
    });
    const event = {
      ...priorEvent,
      id: 42,
      eventRef: "review-event-request-changes-002",
    };
    state.selects.push(
      [proposal],
      [makeVersion()],
      [priorEvent],
      [],
    );
    state.transactionInserts.push([successor], [event]);

    const response = await request(app())
      .post("/1/versions/proposal-version-002/review/request-revision")
      .send({
        proposalLineageRef: "lineage-scene-001",
        versionRef: "proposal-version-002",
        fidelityNoteRef: "fidelity-note-proposal-version-002",
        eventRef: "review-event-request-changes-002",
        successorVersionRef: "proposal-version-003",
        successorFidelityNoteRef: "fidelity-note-proposal-version-003",
        predecessorFidelityNoteRetainedRef:
          "fidelity-note-proposal-version-002",
        predecessorReviewEventRetainedRef: "review-event-request-changes-001",
      });

    expect(response.status).toBe(201);
    expect(response.body.successorVersion.versionRef).toBe(
      "proposal-version-003",
    );
    expect(response.body.successorVersion.reviewEventRefs).toEqual([]);
  });
});