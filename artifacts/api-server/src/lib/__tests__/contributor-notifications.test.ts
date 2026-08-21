import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserted: [] as Array<Record<string, unknown>>,
  conflictCalls: 0,
}));

const table = vi.hoisted(() => ({
  eventKey: "contributor_notifications.event_key",
}));

vi.mock("@workspace/db", () => ({
  db: {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.inserted.push(values);
        return {
          onConflictDoNothing: () => {
            state.conflictCalls += 1;
            return Promise.resolve();
          },
        };
      },
    }),
  },
  contributorNotificationsTable: table,
}));

import {
  contributorNotificationCopy,
  emitContributorNotification,
} from "../contributor-notifications";

describe("contributor notifications", () => {
  beforeEach(() => {
    state.inserted = [];
    state.conflictCalls = 0;
  });

  it("uses calm copy and a stable event key for replay-safe delivery", async () => {
    await emitContributorNotification({
      contributorId: 7,
      proposalId: 42,
      kind: "creative-question",
      eventKey: "editor-question:9001",
    });
    await emitContributorNotification({
      contributorId: 7,
      proposalId: 42,
      kind: "creative-question",
      eventKey: "editor-question:9001",
    });

    expect(state.inserted).toHaveLength(2);
    expect(state.inserted[0]).toMatchObject({
      contributorId: 7,
      proposalId: 42,
      kind: "creative-question",
      eventKey: "editor-question:9001",
      title: "We have one creative question for you",
    });
    expect(state.conflictCalls).toBe(2);
  });

  it("does not create an inbox record without an explicit contributor link", async () => {
    await emitContributorNotification({
      contributorId: null,
      proposalId: 42,
      kind: "official-story",
      eventKey: "proposal:42:official-story:sha",
    });
    expect(state.inserted).toEqual([]);
  });

  it("keeps the five ADR states plain-language and complete", () => {
    expect(Object.keys(contributorNotificationCopy)).toEqual([
      "received",
      "being-reviewed",
      "creative-question",
      "official-story",
      "alternate-path",
    ]);
    expect(
      Object.values(contributorNotificationCopy).every(
        (copy) => copy.title.length > 0 && copy.body.length > 0,
      ),
    ).toBe(true);
  });
});