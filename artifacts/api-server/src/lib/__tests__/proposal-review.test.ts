import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  validateExactReviewReferences,
  validateNoInheritedOutcome,
  validatePredecessor,
  validateRevision,
  type ProposalVersionRecord,
} from "../proposal-review";

const fixture = parseYaml(
  readFileSync(
    resolve(process.cwd(), "../../docs/decisions/provenance-fidelity-cases.yaml"),
    "utf8",
  ),
) as { cases: Record<string, any>[] };

function version(
  overrides: Partial<ProposalVersionRecord> = {},
): ProposalVersionRecord {
  return {
    proposalId: 1,
    proposalLineageRef: "lineage-scene-001",
    versionRef: "proposal-version-001",
    predecessorVersionRef: null,
    fidelityNoteRef: "fidelity-note-proposal-version-001",
    ...overrides,
  };
}

describe("proposal review lineage contract", () => {
  it("uses the fixture's exact refs for accept, reject, revision, and appeal", () => {
    const revision = fixture.cases.find(
      (item) => item.id === "contributor-requested-revision",
    )!;
    const accepted = fixture.cases.find(
      (item) => item.id === "contributor-accepted-version-is-frozen",
    )!;
    const rejected = fixture.cases.find(
      (item) => item.id === "contributor-rejected-version-is-frozen",
    )!;
    const appeal = fixture.cases.find(
      (item) => item.id === "steward-decision-appeal-retains-original",
    )!;

    expect(revision.reviewed_version.version_ref).toBe("proposal-version-001");
    expect(accepted.reviewed_version_ref).toBe("proposal-version-002");
    expect(accepted.fidelity_note_ref).toBe(
      "fidelity-note-proposal-version-002",
    );
    expect(rejected.review_event.resulting_review_state).toBe(
      "rejected-by-contributor",
    );
    expect(appeal.review_event.version_ref).toBe(appeal.affected_version_ref);
    expect(appeal.resolution.successor_review_event_refs).toEqual([]);
  });

  it("rejects mutable-current or cross-lineage references", () => {
    const reviewed = version({
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
    });

    expect(
      validateExactReviewReferences({
        pathVersionRef: "proposal-version-002",
        requestVersionRef: "proposal-version-001",
        requestFidelityNoteRef: reviewed.fidelityNoteRef,
        version: reviewed,
      }),
    ).toContain("version_ref");

    expect(
      validatePredecessor(
        version({
          versionRef: "proposal-version-003",
          proposalLineageRef: "lineage-scene-002",
          predecessorVersionRef: "proposal-version-002",
          fidelityNoteRef: "fidelity-note-proposal-version-003",
        }),
        reviewed,
      ),
    ).toContain("same proposal lineage");
  });

  it("requires retained predecessor evidence and prevents inherited outcomes", () => {
    const predecessor = version({
      versionRef: "proposal-version-002",
      fidelityNoteRef: "fidelity-note-proposal-version-002",
    });

    expect(
      validateRevision(
        predecessor,
        {
          proposalLineageRef: predecessor.proposalLineageRef,
          versionRef: "proposal-version-003",
          predecessorVersionRef: predecessor.versionRef,
          fidelityNoteRef: "fidelity-note-proposal-version-003",
          predecessorFidelityNoteRetainedRef: predecessor.fidelityNoteRef,
          predecessorReviewEventRetainedRef: "review-event-reject-002",
        },
        ["review-event-reject-002"],
      ),
    ).toBeNull();

    expect(validateNoInheritedOutcome([])).toBeNull();
    expect(
      validateNoInheritedOutcome([
        {
          eventRef: "review-event-reject-002",
          proposalId: 1,
          proposalLineageRef: predecessor.proposalLineageRef,
          versionRef: "proposal-version-003",
          fidelityNoteRef: "fidelity-note-proposal-version-003",
          action: "reject",
          resultingReviewState: "rejected-by-contributor",
        },
      ]),
    ).toContain("inherit");
  });
});