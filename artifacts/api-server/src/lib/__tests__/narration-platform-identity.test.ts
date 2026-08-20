import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserted: [] as Array<Record<string, unknown>>,
  selectRows: [] as Array<Record<string, unknown>>,
}));

const tables = vi.hoisted(() => ({
  contributorsTable: {
    id: "contributors.id",
    displayName: "contributors.display_name",
    platformIdentity: "contributors.platform_identity",
    githubIdentity: "contributors.github_identity",
  },
}));

vi.mock("@workspace/db", () => {
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(state.selectRows),
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.inserted.push(values);
        return {
          onConflictDoUpdate: () => ({
            returning: () =>
              Promise.resolve([
                { id: 77, displayName: values["displayName"] as string },
              ]),
          }),
        };
      },
    }),
  };
  return {
    db,
    contributorsTable: tables.contributorsTable,
    contributionsTable: {},
    contributionPathMembershipsTable: {},
    provenanceRecordsTable: {},
    stewardsTable: {},
    userGithubLinksTable: {},
  };
});

import { resolveContributorIdentity } from "../provenance";

describe("narration reconciliation identity recovery", () => {
  beforeEach(() => {
    state.inserted = [];
    state.selectRows = [];
  });

  it("atomically upserts the exact platform identity encoded in narration metadata", async () => {
    const recovered = await resolveContributorIdentity(
      "platform:42",
      "River Writer",
    );

    expect(recovered).toEqual({
      id: 77,
      identity: "platform:42",
      displayName: "River Writer",
    });
    expect(state.inserted).toEqual([
      {
        displayName: "River Writer",
        platformIdentity: "platform:42",
        githubIdentity: null,
      },
    ]);
  });
});