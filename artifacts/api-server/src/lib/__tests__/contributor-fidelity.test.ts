import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_FIDELITY_NOTE_FIELDS,
  serializeContributorFidelityNote,
  type InternalFidelityNote,
} from "../contributor-fidelity";

const policyFixturePath = resolve(
  process.cwd(),
  "../../docs/decisions/provenance-fidelity-cases.yaml",
);
const policyFixture = readFileSync(policyFixturePath, "utf8");
const contractDocumentationPath = resolve(
  process.cwd(),
  "../../docs/decisions/provenance-fidelity-contract.md",
);
const contractDocumentation = readFileSync(contractDocumentationPath, "utf8");
const apiSpecPath = resolve(process.cwd(), "../../lib/api-spec/openapi.yaml");
const apiSpec = readFileSync(apiSpecPath, "utf8");
const generatedApiPath = resolve(
  process.cwd(),
  "../../lib/api-zod/src/generated/api.ts",
);
const generatedApi = readFileSync(generatedApiPath, "utf8");

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
