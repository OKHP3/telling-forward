import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

// These tests exercise the pure, GitHub-durable record format. Database access
// is deliberately not required to verify that a future reconciliation can read
// a decision note from a PR review.
vi.mock("@workspace/db", () => ({}));

import {
  buildAcceptanceDecisionNote,
  buildAcceptanceIntentNote,
  githubIdentityFor,
  isAcceptanceIntentNote,
  acceptanceIntentForOperation,
  parseAcceptanceDecisionNote,
  verifyAcceptanceDecisionNote,
  verifyAcceptanceIntentNote,
} from "../../lib/provenance";

describe("accepted contribution decision note", () => {
  it("round-trips the steward and every contributor from a GitHub review", () => {
    const note = buildAcceptanceDecisionNote({
      canonCommitSha: "a".repeat(40),
      baseCommitSha: "b".repeat(40),
      sourceHeadSha: "c".repeat(40),
      stewardGithubIdentity: "github:world-steward",
      contributors: [
        { identity: "github:river-writer", displayName: "River Writer" },
        { identity: "git-email:aria@example.test", displayName: "Aria" },
      ],
      decidedAt: new Date("2026-08-19T12:00:00.000Z"),
    }, "test-signing-secret");

    expect(note).toContain("Accepted into canon");
    expect(note).not.toContain("pull request");
    expect(parseAcceptanceDecisionNote(note)).toEqual({
      canonCommitSha: "a".repeat(40),
      baseCommitSha: "b".repeat(40),
      sourceHeadSha: "c".repeat(40),
      decidedAt: "2026-08-19T12:00:00.000Z",
      stewardGithubIdentity: "github:world-steward",
      contributors: [
        { identity: "github:river-writer", displayName: "River Writer" },
        { identity: "git-email:aria@example.test", displayName: "Aria" },
      ],
    });
    expect(verifyAcceptanceDecisionNote(note, "test-signing-secret")).toEqual(
      parseAcceptanceDecisionNote(note),
    );
    expect(verifyAcceptanceDecisionNote(note, "wrong-secret")).toBeNull();
    expect(
      verifyAcceptanceDecisionNote(
        note.replace("River Writer", "Someone Else"),
        "test-signing-secret",
      ),
    ).toBeNull();
  });

  it("rejects malformed or unrelated review text", () => {
    expect(parseAcceptanceDecisionNote("Accepted into canon")).toBeNull();
    expect(
      parseAcceptanceDecisionNote(
        "<!-- telling-forward:accepted-contribution:v1 not-json -->",
      ),
    ).toBeNull();
  });

  it("continues to verify the original v1 record shape", () => {
    const legacyRecord = {
      canonCommitSha: "d".repeat(40),
      stewardGithubIdentity: "github:earlier-steward",
      contributors: [{ identity: "github:earlier-writer", displayName: "Earlier Writer" }],
      decidedAt: "2026-08-18T12:00:00.000Z",
    };
    const signature = createHmac("sha256", "legacy-test-secret")
      .update(JSON.stringify(legacyRecord))
      .digest("hex");
    const legacyNote = `<!-- telling-forward:accepted-contribution:v1 ${JSON.stringify({
      ...legacyRecord,
      signature,
    })} -->`;

    expect(
      verifyAcceptanceDecisionNote(legacyNote, "legacy-test-secret"),
    ).toEqual(legacyRecord);
  });

  it("records a recoverable steward-bound intent before merge", () => {
    const intent = buildAcceptanceIntentNote({
      operationId: "11111111-1111-4111-8111-111111111111",
      sourceHeadSha: "e".repeat(40),
      stewardGithubIdentity: "github:canon-steward",
      contributors: [
        { identity: "github:river-writer", displayName: "River Writer" },
      ],
      intendedAt: new Date("2026-08-19T12:00:00.000Z"),
    }, "intent-test-secret");

    expect(isAcceptanceIntentNote(intent)).toBe(true);
    expect(verifyAcceptanceIntentNote(intent, "intent-test-secret")).toEqual({
      operationId: "11111111-1111-4111-8111-111111111111",
      sourceHeadSha: "e".repeat(40),
      stewardGithubIdentity: "github:canon-steward",
      contributors: [
        { identity: "github:river-writer", displayName: "River Writer" },
      ],
      intendedAt: "2026-08-19T12:00:00.000Z",
    });
    expect(verifyAcceptanceIntentNote(intent, "wrong-secret")).toBeNull();
  });

  it("uses the newest matching intent when a later steward retries acceptance", () => {
    const sourceHeadSha = "f".repeat(40);
    const firstAttempt = buildAcceptanceIntentNote({
      operationId: "22222222-2222-4222-8222-222222222222",
      sourceHeadSha,
      stewardGithubIdentity: "github:first-steward",
      contributors: [],
      intendedAt: new Date("2026-08-19T12:00:00.000Z"),
    }, "retry-test-secret");
    const successfulAttempt = buildAcceptanceIntentNote({
      operationId: "33333333-3333-4333-8333-333333333333",
      sourceHeadSha,
      stewardGithubIdentity: "github:second-steward",
      contributors: [],
      intendedAt: new Date("2026-08-19T12:05:00.000Z"),
    }, "retry-test-secret");

    expect(
      acceptanceIntentForOperation(
        [{ body: firstAttempt }, { body: successfulAttempt }],
        "retry-test-secret",
        "33333333-3333-4333-8333-333333333333",
        sourceHeadSha,
      )?.stewardGithubIdentity,
    ).toBe("github:second-steward");
    expect(
      acceptanceIntentForOperation(
        [{ body: successfulAttempt }],
        "retry-test-secret",
        "33333333-3333-4333-8333-333333333333",
        "0".repeat(40),
      ),
    ).toBeNull();
  });

  it("uses a stable GitHub login before less reliable commit metadata", () => {
    expect(
      githubIdentityFor({
        login: "River-Writer",
        email: "river@example.test",
        name: "River",
      }),
    ).toBe("github:river-writer");
  });
});