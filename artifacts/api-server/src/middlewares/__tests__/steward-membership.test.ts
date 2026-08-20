import { beforeEach, describe, expect, it, vi } from "vitest";

const membershipRows = vi.hoisted(() => ({
  current: [] as Array<{ id: number }>,
}));

const select = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: {
    select,
  },
  stewardsTable: {
    id: "id",
    storyworldId: "storyworldId",
    userId: "userId",
  },
  proposalsTable: {},
}));

vi.mock("../../lib/logger", () => ({
  logger: { warn: vi.fn() },
}));

import { isStewardForStoryworld } from "../steward";

describe("isStewardForStoryworld", () => {
  beforeEach(() => {
    membershipRows.current = [];
    select.mockReset();
    select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(membershipRows.current),
        }),
      }),
    }));
  });

  it("recognizes stewardship when the steward record ID differs from the user ID", async () => {
    // Steward IDs identify membership rows; the authenticated principal is
    // matched through stewards.userId by the authoritative query.
    membershipRows.current = [{ id: 73 }];

    await expect(isStewardForStoryworld(12, 1)).resolves.toBe(true);
  });

  it("keeps a user read-only when no stewardship membership exists", async () => {
    await expect(isStewardForStoryworld(12, 1)).resolves.toBe(false);
  });
});