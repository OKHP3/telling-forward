/**
 * The contributor fidelity note is a deliberately narrow projection of an
 * internal transform record. This pure serializer is not wired to an endpoint
 * while the contributor-review contract remains deferred.
 *
 * Keep the output keys in sync with the contributor-facing field list in
 * docs/decisions/provenance-fidelity-contract.md. The contract test asserts
 * the exact key set so a new field cannot become public accidentally.
 */

export const CONTRIBUTOR_FIDELITY_NOTE_FIELDS = [
  "sourceVersionLabel",
  "outputVersionLabel",
  "changeType",
  "changedMaterial",
  "preservedIntent",
  "questionsToCheck",
  "meaningCheck",
  "structureAndLength",
  "intendedAudience",
  "review",
] as const;

export type ContributorFidelityNoteField =
  (typeof CONTRIBUTOR_FIDELITY_NOTE_FIELDS)[number];

export interface InternalSemanticPreservation {
  finding: "preserved" | "partially-preserved" | "uncertain";
  explanation: string;
}

export interface InternalReviewEvent {
  status: "not-reviewed" | "reviewed" | "accepted-as-new-version" | "rejected";
  safeReason?: string;
  occurredAt?: string;
}

export interface InternalFidelityNote {
  sourceVersionRef: string;
  outputVersionRef: string;
  transformKind: string;
  changedMaterial: readonly string[];
  preservedIntent: readonly string[];
  ambiguitiesFlagged: readonly string[];
  semanticPreservation: InternalSemanticPreservation;
  structuralSimplification: string;
  audienceCalibration: string;
  humanReviewStatus: InternalReviewEvent;

  // These fields intentionally model values that must not cross the
  // contributor boundary. The serializer below never reads them.
  engine?: string;
  maturityRung?: string;
  modelOrProviderRef?: string;
  ingestionRunRef?: string;
  prompt?: string;
  toolTrace?: string;
  generationMetadata?: string;
  repositoryReference?: string;
  issueReference?: string;
  pullRequestReference?: string;
  branchReference?: string;
  commitSha?: string;
  sourceDigest?: string;
  machineReadableDiff?: string;
  machineScore?: number;
  confidence?: number;
  classifierOutput?: string;
  automatedDecision?: string;
  contributorIdentity?: string;
  stewardIdentity?: string;
  privateAnnotation?: string;
  consentRecord?: string;
  moderationRecord?: string;
  safetyEvidence?: string;
  legalHold?: string;
  retentionDecision?: string;
  deletionDecision?: string;
  appealEvidence?: string;
  unreleasedSourceExcerpt?: string;
  unreleasedOutputExcerpt?: string;
}

export interface ContributorFidelityNote {
  sourceVersionLabel: string;
  outputVersionLabel: string;
  changeType: string;
  changedMaterial: readonly string[];
  preservedIntent: readonly string[];
  questionsToCheck: readonly string[];
  meaningCheck: {
    finding: InternalSemanticPreservation["finding"];
    explanation: string;
  };
  structureAndLength: string;
  intendedAudience: string;
  review: {
    status: InternalReviewEvent["status"];
    safeReason?: string;
    occurredAt?: string;
  };
}

/**
 * Serialize only contributor-safe, plain-language values.
 *
 * The labels are supplied by the caller rather than derived from internal
 * references or transform metadata. This prevents raw repository IDs and
 * engine/provider terminology from being exposed by default.
 */
export function serializeContributorFidelityNote(
  internal: InternalFidelityNote,
  labels: Pick<
    ContributorFidelityNote,
    | "sourceVersionLabel"
    | "outputVersionLabel"
    | "changeType"
    | "intendedAudience"
  >,
): ContributorFidelityNote {
  return {
    sourceVersionLabel: labels.sourceVersionLabel,
    outputVersionLabel: labels.outputVersionLabel,
    changeType: labels.changeType,
    changedMaterial: [...internal.changedMaterial],
    preservedIntent: [...internal.preservedIntent],
    questionsToCheck: [...internal.ambiguitiesFlagged],
    meaningCheck: {
      finding: internal.semanticPreservation.finding,
      explanation: internal.semanticPreservation.explanation,
    },
    structureAndLength: internal.structuralSimplification,
    intendedAudience: labels.intendedAudience,
    review: {
      status: internal.humanReviewStatus.status,
      ...(internal.humanReviewStatus.safeReason
        ? { safeReason: internal.humanReviewStatus.safeReason }
        : {}),
      ...(internal.humanReviewStatus.occurredAt
        ? { occurredAt: internal.humanReviewStatus.occurredAt }
        : {}),
    },
  };
}
