export const CONTRIBUTOR_REVIEW_ACTIONS = [
  "accept",
  "reject",
  "request-revision",
  "appeal",
] as const;

export type ContributorReviewAction =
  (typeof CONTRIBUTOR_REVIEW_ACTIONS)[number];

export const CONTRIBUTOR_REVIEW_STATES = [
  "accepted-by-contributor",
  "rejected-by-contributor",
  "changes-requested",
  "appeal-pending",
] as const;

export type ContributorReviewState =
  (typeof CONTRIBUTOR_REVIEW_STATES)[number];

export type ProposalVersionRecord = {
  proposalId: number;
  proposalLineageRef: string;
  versionRef: string;
  predecessorVersionRef: string | null;
  fidelityNoteRef: string;
};

export type ProposalReviewEventRecord = {
  eventRef: string;
  proposalId: number;
  proposalLineageRef: string;
  versionRef: string;
  fidelityNoteRef: string;
  action: ContributorReviewAction;
  resultingReviewState: ContributorReviewState;
};

export function resultingStateForAction(
  action: ContributorReviewAction,
): ContributorReviewState {
  switch (action) {
    case "accept":
      return "accepted-by-contributor";
    case "reject":
      return "rejected-by-contributor";
    case "request-revision":
      return "changes-requested";
    case "appeal":
      return "appeal-pending";
  }
}

export function validateExactReviewReferences(input: {
  pathVersionRef: string;
  requestVersionRef: string;
  requestFidelityNoteRef: string;
  version: ProposalVersionRecord;
}): string | null {
  if (input.pathVersionRef !== input.requestVersionRef) {
    return "version_ref must match the immutable version in the route";
  }
  if (input.version.versionRef !== input.requestVersionRef) {
    return "version_ref does not identify the requested proposal version";
  }
  if (input.version.fidelityNoteRef !== input.requestFidelityNoteRef) {
    return "fidelity_note_ref must identify the note attached to version_ref";
  }
  return null;
}

export function validatePredecessor(
  version: ProposalVersionRecord,
  predecessor: ProposalVersionRecord | undefined,
): string | null {
  if (version.predecessorVersionRef === null) {
    if (predecessor) {
      return "an initial proposal version cannot have a predecessor";
    }
    return null;
  }

  if (!predecessor) {
    return `predecessor version ${version.predecessorVersionRef} was not found`;
  }
  if (predecessor.proposalLineageRef !== version.proposalLineageRef) {
    return "predecessor_version_ref must identify a predecessor in the same proposal lineage";
  }
  if (predecessor.versionRef !== version.predecessorVersionRef) {
    return "predecessor_version_ref must identify the direct predecessor";
  }
  return null;
}

export function validateRevision(
  predecessor: ProposalVersionRecord,
  successor: {
    proposalLineageRef: string;
    versionRef: string;
    predecessorVersionRef: string;
    fidelityNoteRef: string;
    predecessorFidelityNoteRetainedRef: string;
    predecessorReviewEventRetainedRef: string;
  },
  predecessorEventRefs: readonly string[],
): string | null {
  if (successor.proposalLineageRef !== predecessor.proposalLineageRef) {
    return "revised version must remain within the proposal lineage";
  }
  if (successor.predecessorVersionRef !== predecessor.versionRef) {
    return "revised version must point to the reviewed version as its direct predecessor";
  }
  if (successor.versionRef === predecessor.versionRef) {
    return "a revision must use a new version_ref";
  }
  if (successor.fidelityNoteRef === predecessor.fidelityNoteRef) {
    return "a revision must use a new fidelity_note_ref";
  }
  if (
    successor.predecessorFidelityNoteRetainedRef !==
    predecessor.fidelityNoteRef
  ) {
    return "the predecessor fidelity note must be retained by exact reference";
  }
  if (
    !predecessorEventRefs.includes(
      successor.predecessorReviewEventRetainedRef,
    )
  ) {
    return "the predecessor review event must be retained by exact reference";
  }
  return null;
}

export function validateNoInheritedOutcome(
  successorEvents: readonly ProposalReviewEventRecord[],
): string | null {
  if (successorEvents.length > 0) {
    return "a revised proposal version cannot inherit a prior review outcome";
  }
  return null;
}