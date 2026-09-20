import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  CONTRIBUTOR_FIDELITY_NOTE_FIELDS,
  serializeContributorFidelityNote,
  type InternalFidelityNote,
} from "../contributor-fidelity";

const policyFixturePath = resolve(
  process.cwd(),
  "../../docs/decisions/provenance-fidelity-cases.yaml",
);
const policyFixture = readFileSync(policyFixturePath, "utf8").replace(/\r\n/g, "\n");
const contractDocumentationPath = resolve(
  process.cwd(),
  "../../docs/decisions/provenance-fidelity-contract.md",
);
const contractDocumentation = readFileSync(contractDocumentationPath, "utf8").replace(/\r\n/g, "\n");
const apiSpecPath = resolve(process.cwd(), "../../lib/api-spec/openapi.yaml");
const apiSpec = readFileSync(apiSpecPath, "utf8").replace(/\r\n/g, "\n");
const generatedApiPath = resolve(
  process.cwd(),
  "../../lib/api-zod/src/generated/api.ts",
);
const generatedApi = readFileSync(generatedApiPath, "utf8").replace(/\r\n/g, "\n");
const parsedPolicyFixture = parseYaml(policyFixture) as ProvenanceFixture;

const policyFieldNames = {
  "source-version-label": "sourceVersionLabel",
  "output-version-label": "outputVersionLabel",
  "change-type": "changeType",
  "changed-material": "changedMaterial",
  "preserved-intent": "preservedIntent",
  "questions-to-check": "questionsToCheck",
  "meaning-check": "meaningCheck",
  "structure-and-length": "structureAndLength",
  "intended-audience": "intendedAudience",
  "review-status-and-safe-event": "review",
} as const;

function allowedFieldsFromPolicy(): string[] {
  const match = policyFixture.match(
    /    contributor-facing-fixture:\n      allowed_fields:\n((?:        - [^\n]+\n)+)/,
  );
  if (!match) return [];

  return match[1]
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*-\s+/, ""))
    .map((field) => {
      const responseKey =
        policyFieldNames[field as keyof typeof policyFieldNames];
      if (!responseKey) {
        throw new Error(`Unknown contributor fidelity policy field: ${field}`);
      }
      return responseKey;
    });
}

function responseKeysFromDocumentation(): string[] {
  const tableStart = contractDocumentation.indexOf(
    "| Contributor-facing label | Internal source | Response key | Allowed presentation |",
  );
  if (tableStart === -1) return [];

  const table = contractDocumentation.slice(tableStart).split(/\r?\n/);
  const rows: string[] = [];
  for (const line of table.slice(2)) {
    if (!line.startsWith("|") || !line.endsWith("|")) break;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length !== 4) break;
    rows.push(
      ...cells[2]
        .replaceAll("`", "")
        .split(",")
        .map((key) => key.trim()),
    );
  }
  return rows;
}

function contributorApiSchemaFields(): string[] | null {
  const schemaHeader = "\n    ContributorFidelityNote:\n";
  const schemaStart = apiSpec.indexOf(schemaHeader);
  if (schemaStart === -1) return null;

  const schemaBody = apiSpec.slice(schemaStart + schemaHeader.length);
  const nextSchema = schemaBody.search(/\n    [A-Za-z][A-Za-z0-9]*:\n/);
  const schema =
    nextSchema === -1 ? schemaBody : schemaBody.slice(0, nextSchema);
  const propertiesStart = schema.indexOf("\n      properties:\n");
  if (propertiesStart === -1) return [];

  const propertiesBody = schema.slice(
    propertiesStart + "\n      properties:\n".length,
  );
  const propertiesEnd = propertiesBody.search(
    /\n      required:\n|\n    [A-Za-z][A-Za-z0-9]*:\n/,
  );
  const properties =
    propertiesEnd === -1
      ? propertiesBody
      : propertiesBody.slice(0, propertiesEnd);

  return [...properties.matchAll(/^        ([A-Za-z][A-Za-z0-9]*):$/gm)].map(
    ([, field]) => field,
  );
}

function generatedContributorApiSchemaFields(): string[] | null {
  const schemaHeader = "export const ContributorFidelityNote = zod.object({\n";
  const schemaStart = generatedApi.indexOf(schemaHeader);
  if (schemaStart === -1) return null;

  const schemaBody = generatedApi.slice(schemaStart + schemaHeader.length);
  const schemaEnd = schemaBody.indexOf("\n});");
  const schema = schemaEnd === -1 ? schemaBody : schemaBody.slice(0, schemaEnd);

  return [...schema.matchAll(/^  ([A-Za-z][A-Za-z0-9]*):/gm)].map(
    ([, field]) => field,
  );
}

type FixtureRecord = Record<string, unknown>;
type ProvenanceFixture = {
  cases: FixtureRecord[];
};

function record(value: unknown, label: string): FixtureRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a mapping`);
  }
  return value as FixtureRecord;
}

function stringField(
  value: FixtureRecord,
  field: string,
  label: string,
): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || fieldValue.length === 0) {
    throw new Error(`${label}.${field} must be a non-empty string`);
  }
  return fieldValue;
}

function canonicalFixtureValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalFixtureValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as FixtureRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalFixtureValue(nestedValue)]),
    );
  }
  return value;
}

type VersionDeclaration = {
  version: FixtureRecord;
  lineage: string;
  declaredBy: string;
};

function validateProposalLineageFixture(fixture: ProvenanceFixture): void {
  if (!Array.isArray(fixture.cases)) {
    throw new Error("provenance fidelity fixture must contain cases");
  }

  const versions = new Map<string, VersionDeclaration>();
  const addVersion = (
    versionValue: unknown,
    parentCase: FixtureRecord,
    declaredBy: string,
  ) => {
    if (versionValue === undefined) return;
    const version = record(versionValue, declaredBy);
    if (version.version_ref === undefined) return;

    const versionRef = stringField(version, "version_ref", declaredBy);
    if (versions.has(versionRef)) {
      throw new Error(`Duplicate proposal version reference: ${versionRef}`);
    }
    versions.set(versionRef, {
      version,
      lineage: stringField(parentCase, "proposal_lineage_ref", declaredBy),
      declaredBy,
    });
  };

  const reviewEvents = new Map<
    string,
    { definition: string; declaredBy: string }
  >();
  const registerReviewEvent = (value: FixtureRecord, label: string) => {
    const eventRef = stringField(value, "event_ref", label);
    const definition = JSON.stringify(canonicalFixtureValue(value)) ?? "";
    const previous = reviewEvents.get(eventRef);
    if (previous) {
      if (previous.definition !== definition) {
        throw new Error(
          `Conflicting review event definition: ${eventRef} (${previous.declaredBy} vs ${label})`,
        );
      }
      throw new Error(
        `Duplicate review event reference: ${eventRef} (${previous.declaredBy} and ${label})`,
      );
    }
    reviewEvents.set(eventRef, { definition, declaredBy: label });
  };
  const collectReviewEvents = (value: unknown, label: string): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        collectReviewEvents(item, `${label}[${index}]`),
      );
      return;
    }

    const recordValue = value as FixtureRecord;
    if (recordValue.event_ref !== undefined) {
      registerReviewEvent(recordValue, label);
    }
    for (const [field, nestedValue] of Object.entries(recordValue)) {
      if (field !== "event_ref") {
        collectReviewEvents(nestedValue, `${label}.${field}`);
      }
    }
  };

  for (const fixtureCase of fixture.cases) {
    const caseId = stringField(fixtureCase, "id", "case");
    collectReviewEvents(fixtureCase, caseId);
    addVersion(fixtureCase, fixtureCase, caseId);
    for (const nestedField of ["revised_version", "later_attempt"]) {
      addVersion(
        fixtureCase[nestedField],
        fixtureCase,
        `${caseId}.${nestedField}`,
      );
    }

    const resolution =
      fixtureCase.resolution === undefined
        ? undefined
        : record(fixtureCase.resolution, `${caseId}.resolution`);
    if (resolution?.successor_version_ref !== undefined) {
      const successorVersion: FixtureRecord = {
        version_ref: resolution.successor_version_ref,
        predecessor_version_ref: fixtureCase.affected_version_ref,
        fidelity_note_ref: resolution.successor_fidelity_note_ref,
        review_event_refs: resolution.successor_review_event_refs,
        predecessor_fidelity_note_retained_ref:
          resolution.successor_predecessor_fidelity_note_retained_ref,
        predecessor_review_event_retained_ref:
          resolution.successor_predecessor_review_event_retained_ref,
      };
      addVersion(
        successorVersion,
        fixtureCase,
        `${caseId}.resolution.successor`,
      );
    }
  }

  for (const [versionRef, declaration] of versions) {
    const predecessor = declaration.version.predecessor_version_ref;
    const note = declaration.version.fidelity_note_ref;
    if (predecessor === null || predecessor === undefined) {
      if (note === undefined) {
        throw new Error(
          `Initial proposal version ${versionRef} is missing a fidelity note`,
        );
      }
      continue;
    }

    if (typeof predecessor !== "string") {
      throw new Error(
        `Proposal version ${versionRef} has an invalid predecessor`,
      );
    }
    const predecessorDeclaration = versions.get(predecessor);
    if (!predecessorDeclaration) {
      throw new Error(
        `Proposal version ${versionRef} points to missing predecessor ${predecessor}`,
      );
    }
    if (predecessorDeclaration.lineage !== declaration.lineage) {
      throw new Error(
        `Proposal version ${versionRef} points across lineages to ${predecessor}`,
      );
    }
    if (typeof note !== "string" || note.length === 0) {
      throw new Error(`Revision ${versionRef} is missing a fidelity note`);
    }
  }

  const assertReviewTarget = (
    eventValue: unknown,
    expectedVersion: unknown,
    label: string,
  ) => {
    const event = record(eventValue, label);
    const actualVersion = stringField(event, "version_ref", label);
    if (actualVersion !== expectedVersion) {
      throw new Error(
        `${label} targets ${actualVersion}, expected ${String(expectedVersion)}`,
      );
    }
  };

  const assertRetainedHistory = (
    childValue: unknown,
    predecessorVersion: string,
    predecessorNote: string,
    predecessorEvent: string,
    label: string,
  ) => {
    const child = record(childValue, label);
    if (child.predecessor_version_ref !== predecessorVersion) {
      throw new Error(`${label} has the wrong predecessor`);
    }
    if (child.fidelity_note_ref === predecessorNote) {
      throw new Error(`${label} reuses its predecessor fidelity note`);
    }
    if (child.predecessor_fidelity_note_retained_ref !== predecessorNote) {
      throw new Error(`${label} does not retain its predecessor fidelity note`);
    }
    if (child.predecessor_review_event_retained_ref !== predecessorEvent) {
      throw new Error(
        `${label} does not retain its predecessor review history`,
      );
    }
    if (
      !Array.isArray(child.review_event_refs) ||
      child.review_event_refs.length !== 0
    ) {
      throw new Error(`${label} inherits a review outcome`);
    }
  };

  const byId = new Map(
    fixture.cases.map((fixtureCase) => [
      stringField(fixtureCase, "id", "case"),
      fixtureCase,
    ]),
  );
  const revision = byId.get("contributor-requested-revision");
  if (!revision) throw new Error("Missing request-revision fixture");
  const reviewed = record(
    revision.reviewed_version,
    "request reviewed_version",
  );
  const requestEvent = record(
    reviewed.review_event,
    "request reviewed_version.review_event",
  );
  const requestVersion = stringField(
    reviewed,
    "version_ref",
    "request reviewed_version",
  );
  const requestNote = stringField(
    reviewed,
    "fidelity_note_ref",
    "request reviewed_version",
  );
  const requestEventRef = stringField(
    requestEvent,
    "event_ref",
    "request event",
  );
  assertReviewTarget(
    requestEvent,
    requestVersion,
    "request-revision review event",
  );
  assertRetainedHistory(
    revision.revised_version,
    requestVersion,
    requestNote,
    requestEventRef,
    "request-revision revised version",
  );

  const accepted = byId.get("contributor-accepted-version-is-frozen");
  if (!accepted) throw new Error("Missing accept fixture");
  assertReviewTarget(
    accepted.review_event,
    accepted.reviewed_version_ref,
    "accept review event",
  );
  if (accepted.fidelity_note_ref !== "fidelity-note-proposal-version-002") {
    throw new Error(
      "accept fixture is not attached to the reviewed version note",
    );
  }
  assertRetainedHistory(
    revision.revised_version,
    requestVersion,
    requestNote,
    requestEventRef,
    "accepted version lineage",
  );

  const rejected = byId.get("contributor-rejected-version-is-frozen");
  if (!rejected) throw new Error("Missing reject fixture");
  assertReviewTarget(
    rejected.review_event,
    rejected.reviewed_version_ref,
    "reject review event",
  );
  const rejectedAttempt = record(
    rejected.later_attempt,
    "reject later_attempt",
  );
  assertRetainedHistory(
    rejectedAttempt,
    stringField(rejected, "reviewed_version_ref", "reject fixture"),
    stringField(rejected, "fidelity_note_ref", "reject fixture"),
    stringField(
      record(rejected.review_event, "reject event"),
      "event_ref",
      "reject event",
    ),
    "reject later attempt",
  );

  const appeal = byId.get("steward-decision-appeal-retains-original");
  if (!appeal) throw new Error("Missing appeal fixture");
  assertReviewTarget(
    appeal.review_event,
    appeal.affected_version_ref,
    "appeal review event",
  );
  const resolution = record(appeal.resolution, "appeal resolution");
  assertReviewTarget(
    resolution,
    appeal.affected_version_ref,
    "appeal resolution event",
  );
  assertRetainedHistory(
    {
      version_ref: resolution.successor_version_ref,
      predecessor_version_ref: appeal.affected_version_ref,
      fidelity_note_ref: resolution.successor_fidelity_note_ref,
      review_event_refs: resolution.successor_review_event_refs,
      predecessor_fidelity_note_retained_ref:
        resolution.successor_predecessor_fidelity_note_retained_ref,
      predecessor_review_event_retained_ref:
        resolution.successor_predecessor_review_event_retained_ref,
    },
    stringField(appeal, "affected_version_ref", "appeal fixture"),
    "fidelity-note-proposal-version-002",
    stringField(
      record(appeal.review_event, "appeal event"),
      "event_ref",
      "appeal event",
    ),
    "appeal successor version",
  );
}

const protectedFixtureValues = {
  modelProvider: "private-model-provider-sentinel",
  engineAndRun: "PIE / run-private-001",
  githubRepository: "github:OKHP3/telling-forward",
  githubCommit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  sourceDigest: "sha256:private-source-digest",
  machineScore: 0.97,
  machineDiff: "machine-diff-sentinel",
  contributorIdentity: "github:other-contributor",
  stewardIdentity: "github:private-steward",
  privateAnnotation: "private-reviewer-annotation",
  consentRecord: "consent-record-private-001",
  moderationRecord: "moderation-case-private-001",
  safetyEvidence: "private-safety-evidence",
  legalHold: "legal-hold-private-001",
  retentionDecision: "retain-until-private-date",
  deletionDecision: "deletion-approval-private-001",
  appealEvidence: "private-appeal-evidence",
  unreleasedMaterial: "unreleased-private-material",
} as const;

const internalFixture: InternalFidelityNote = {
  sourceVersionRef: protectedFixtureValues.githubCommit,
  outputVersionRef: "github:commit:output-private-001",
  transformKind: "clarity-assist",
  changedMaterial: ["sentence structure", "reading register"],
  preservedIntent: ["plot claim", "named entities"],
  ambiguitiesFlagged: ["pronoun reference in source"],
  semanticPreservation: {
    finding: "uncertain",
    explanation: "One reference needs the contributor's check.",
  },
  structuralSimplification: "Some sentences were combined.",
  audienceCalibration: "feedback-only",
  humanReviewStatus: {
    status: "not-reviewed",
  },

  engine: "PIE",
  maturityRung: "R4",
  modelOrProviderRef: protectedFixtureValues.modelProvider,
  ingestionRunRef: protectedFixtureValues.engineAndRun,
  prompt: "private prompt",
  toolTrace: "private tool trace",
  generationMetadata: "private generation metadata",
  repositoryReference: protectedFixtureValues.githubRepository,
  issueReference: "github:issue:42",
  pullRequestReference: "github:pr:42",
  branchReference: "github:branch:private",
  commitSha: protectedFixtureValues.githubCommit,
  sourceDigest: protectedFixtureValues.sourceDigest,
  machineReadableDiff: protectedFixtureValues.machineDiff,
  machineScore: protectedFixtureValues.machineScore,
  confidence: 0.99,
  classifierOutput: "private classifier output",
  automatedDecision: "pass",
  contributorIdentity: protectedFixtureValues.contributorIdentity,
  stewardIdentity: protectedFixtureValues.stewardIdentity,
  privateAnnotation: protectedFixtureValues.privateAnnotation,
  consentRecord: protectedFixtureValues.consentRecord,
  moderationRecord: protectedFixtureValues.moderationRecord,
  safetyEvidence: protectedFixtureValues.safetyEvidence,
  legalHold: protectedFixtureValues.legalHold,
  retentionDecision: protectedFixtureValues.retentionDecision,
  deletionDecision: protectedFixtureValues.deletionDecision,
  appealEvidence: protectedFixtureValues.appealEvidence,
  unreleasedSourceExcerpt: protectedFixtureValues.unreleasedMaterial,
  unreleasedOutputExcerpt: protectedFixtureValues.unreleasedMaterial,
};

describe("contributor fidelity note contract", () => {
  it("validates immutable proposal lineage fixtures and retained review history", () => {
    expect(() =>
      validateProposalLineageFixture(parsedPolicyFixture),
    ).not.toThrow();
  });

  it("rejects duplicate versions, cross-lineage predecessors, missing notes, and misbound events", () => {
    const duplicateVersionFixture = structuredClone(parsedPolicyFixture);
    const sourceCase = duplicateVersionFixture.cases.find(
      (fixtureCase) => fixtureCase.id === "proposed-transformation",
    );
    if (!sourceCase) throw new Error("Missing source fixture");
    duplicateVersionFixture.cases.push({
      ...sourceCase,
      id: "duplicate-version-fixture",
    });
    expect(() =>
      validateProposalLineageFixture(duplicateVersionFixture),
    ).toThrow("Duplicate proposal version reference");

    const crossLineageFixture = structuredClone(parsedPolicyFixture);
    const revision = crossLineageFixture.cases.find(
      (fixtureCase) => fixtureCase.id === "contributor-requested-revision",
    );
    if (!revision) throw new Error("Missing request-revision fixture");
    revision.proposal_lineage_ref = "lineage-different";
    expect(() => validateProposalLineageFixture(crossLineageFixture)).toThrow(
      "across lineages",
    );

    const missingNoteFixture = structuredClone(parsedPolicyFixture);
    const missingNoteRevision = missingNoteFixture.cases.find(
      (fixtureCase) => fixtureCase.id === "contributor-requested-revision",
    );
    if (!missingNoteRevision)
      throw new Error("Missing request-revision fixture");
    delete record(missingNoteRevision.revised_version, "revised version")
      .fidelity_note_ref;
    expect(() => validateProposalLineageFixture(missingNoteFixture)).toThrow(
      "missing a fidelity note",
    );

    const misboundEventFixture = structuredClone(parsedPolicyFixture);
    const misboundRevision = misboundEventFixture.cases.find(
      (fixtureCase) => fixtureCase.id === "contributor-requested-revision",
    );
    if (!misboundRevision) throw new Error("Missing request-revision fixture");
    record(
      record(misboundRevision.reviewed_version, "reviewed version")
        .review_event,
      "review event",
    ).version_ref = "proposal-version-002";
    expect(() => validateProposalLineageFixture(misboundEventFixture)).toThrow(
      "expected proposal-version-001",
    );
  });

  it("rejects duplicate and conflicting review event definitions", () => {
    const duplicateEventFixture = structuredClone(parsedPolicyFixture);
    const duplicateEventSource = duplicateEventFixture.cases.find(
      (fixtureCase) =>
        fixtureCase.id === "contributor-accepted-version-is-frozen",
    );
    const duplicateEventTarget = duplicateEventFixture.cases.find(
      (fixtureCase) =>
        fixtureCase.id === "contributor-rejected-version-is-frozen",
    );
    if (!duplicateEventSource || !duplicateEventTarget) {
      throw new Error("Missing review outcome fixture");
    }
    duplicateEventTarget.review_event = structuredClone(
      duplicateEventSource.review_event,
    );
    expect(() => validateProposalLineageFixture(duplicateEventFixture)).toThrow(
      "Duplicate review event reference",
    );

    const conflictingEventFixture = structuredClone(parsedPolicyFixture);
    const conflictingEventSource = conflictingEventFixture.cases.find(
      (fixtureCase) =>
        fixtureCase.id === "contributor-accepted-version-is-frozen",
    );
    const conflictingEventTarget = conflictingEventFixture.cases.find(
      (fixtureCase) =>
        fixtureCase.id === "contributor-rejected-version-is-frozen",
    );
    if (!conflictingEventSource || !conflictingEventTarget) {
      throw new Error("Missing review outcome fixture");
    }
    const sourceEvent = record(
      conflictingEventSource.review_event,
      "accept review event",
    );
    const targetEvent = record(
      conflictingEventTarget.review_event,
      "reject review event",
    );
    targetEvent.event_ref = stringField(
      sourceEvent,
      "event_ref",
      "accept review event",
    );
    expect(() =>
      validateProposalLineageFixture(conflictingEventFixture),
    ).toThrow("Conflicting review event definition");
  });

  it("keeps the policy fixture complete for the protected-field review", () => {
    expect(policyFixture).toContain("contributor-facing-fixture:");
    expect(allowedFieldsFromPolicy()).toEqual([
      ...CONTRIBUTOR_FIDELITY_NOTE_FIELDS,
    ]);
    for (const category of [
      "model-provider-and-operational-metadata",
      "github-and-repository-references",
      "machine-scores-and-comparison-material",
      "identity-and-private-annotations",
      "consent-and-attribution-controls",
      "moderation-and-safety-records",
      "legal-retention-and-deletion-records",
      "unreleased-source-and-output-material",
    ]) {
      expect(policyFixture).toContain(`- ${category}`);
    }
    for (const value of Object.values(protectedFixtureValues)) {
      expect(policyFixture).toContain(String(value));
    }
  });

  it("keeps policy, documentation, serializer, and any API schema synchronized", () => {
    const serializerFields = [...CONTRIBUTOR_FIDELITY_NOTE_FIELDS];
    expect(allowedFieldsFromPolicy()).toEqual(serializerFields);
    expect(responseKeysFromDocumentation()).toEqual(serializerFields);

    const apiFields = contributorApiSchemaFields();
    if (apiFields) {
      expect(apiFields).toEqual(serializerFields);
    }

    const generatedApiFields = generatedContributorApiSchemaFields();
    if (generatedApiFields) {
      expect(generatedApiFields).toEqual(serializerFields);
    }
  });

  it("serializes the allowed qualitative fields into an exact contributor shape", () => {
    const response = serializeContributorFidelityNote(internalFixture, {
      sourceVersionLabel: "Original scene",
      outputVersionLabel: "Proposed version",
      changeType: "Clarity pass",
      intendedAudience: "Readers who prefer a clearer sentence structure.",
    });

    expect(Object.keys(response)).toEqual(CONTRIBUTOR_FIDELITY_NOTE_FIELDS);
    expect(response).toMatchObject({
      sourceVersionLabel: "Original scene",
      outputVersionLabel: "Proposed version",
      changeType: "Clarity pass",
      changedMaterial: ["sentence structure", "reading register"],
      preservedIntent: ["plot claim", "named entities"],
      questionsToCheck: ["pronoun reference in source"],
      meaningCheck: {
        finding: "uncertain",
        explanation: "One reference needs the contributor's check.",
      },
      structureAndLength: "Some sentences were combined.",
      intendedAudience: "Readers who prefer a clearer sentence structure.",
      review: { status: "not-reviewed" },
    });
  });

  it("never includes raw engine, GitHub, identity, consent, moderation, legal, or machine data", () => {
    const response = serializeContributorFidelityNote(internalFixture, {
      sourceVersionLabel: "Original scene",
      outputVersionLabel: "Proposed version",
      changeType: "Clarity pass",
      intendedAudience: "Contributor-selected audience",
    });
    const serializedResponse = JSON.stringify(response);

    for (const value of Object.values(protectedFixtureValues)) {
      expect(serializedResponse).not.toContain(String(value));
    }
    expect(serializedResponse).not.toMatch(
      /engine|provider|github|repository|commit|identity|consent|moderation|legal|score|confidence|classifier|prompt|run|diff|annotation|retention|deletion|appeal/i,
    );
  });

  it("requires an explicit policy update before a new fidelity field can be exposed", () => {
    const response = serializeContributorFidelityNote(internalFixture, {
      sourceVersionLabel: "Original scene",
      outputVersionLabel: "Proposed version",
      changeType: "Clarity pass",
      intendedAudience: "Contributor-selected audience",
    });
    const exposedFields = Object.keys(response);

    expect(exposedFields).toEqual([...CONTRIBUTOR_FIDELITY_NOTE_FIELDS]);
    expect(exposedFields).not.toContain("transformKind");
    expect(exposedFields).not.toContain("modelOrProviderRef");
    expect(exposedFields).not.toContain("machineScore");
  });
});
