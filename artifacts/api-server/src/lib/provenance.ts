/**
 * GitHub-backed provenance indexing.
 *
 * GitHub retains the canonical history: commit authors, pull-request authors,
 * merge decisions, reviews, and discussion notes. These helpers deliberately
 * turn that history into a rebuildable local index without treating a local
 * serial ID as durable attribution.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  contributionPathMembershipsTable,
  contributionsTable,
  contributorsTable,
  db,
  provenanceRecordsTable,
  stewardsTable,
  userGithubLinksTable,
} from "@workspace/db";
import type { GitHubActor, GitHubCommit } from "./github";

export interface ContributorAttribution {
  id: number;
  identity: string;
  displayName: string;
}

export interface StewardAttribution {
  id: number | null;
  githubIdentity: string | null;
}

export interface AcceptanceDecisionRecord {
  canonCommitSha: string;
  baseCommitSha?: string;
  sourceHeadSha?: string;
  decidedAt: string;
  stewardGithubIdentity: string | null;
  contributors: Array<{ identity: string; displayName: string }>;
}

const ACCEPTANCE_NOTE_MARKER = "telling-forward:accepted-contribution:v1";
const ACCEPTANCE_INTENT_MARKER = "telling-forward:acceptance-intent:v1";
const NARRATION_MARKER = "Telling-Forward-Narration: v1";

export interface NarrationCommitMetadata {
  submissionId: string;
  platformIdentity: string;
  title: string;
  displayName: string;
}

function decodeNarrationText(encoded: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * The commit trailer is a constrained recovery record. It deliberately avoids
 * raw user text in trailer values: names and titles can contain newlines, while
 * Git trailers must remain one physical line to be unambiguous to a sync job.
 */
export function buildNarrationCommitMessage(
  metadata: NarrationCommitMetadata,
): string {
  const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
  return [
    "Add narration",
    "",
    NARRATION_MARKER,
    `Submission-Id: ${metadata.submissionId}`,
    `Platform-Attribution: ${metadata.platformIdentity}`,
    `Title-B64: ${encode(metadata.title)}`,
    `Display-Name-B64: ${encode(metadata.displayName)}`,
  ].join("\n");
}

export function parseNarrationCommit(
  message: string,
): NarrationCommitMetadata | null {
  const trailers = new Map<string, string>();
  for (const line of message.split("\n")) {
    const match = /^([A-Za-z0-9-]+): (.+)$/.exec(line);
    if (match) trailers.set(match[1], match[2]);
  }
  if (!message.split("\n").includes(NARRATION_MARKER)) return null;

  const submissionId = trailers.get("Submission-Id");
  const platformIdentity = trailers.get("Platform-Attribution");
  const title = trailers.get("Title-B64");
  const displayName = trailers.get("Display-Name-B64");
  if (
    !submissionId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId) ||
    !platformIdentity ||
    !/^platform:\d+$/.test(platformIdentity) ||
    !title ||
    !displayName
  ) {
    return null;
  }
  const decodedTitle = decodeNarrationText(title);
  const decodedDisplayName = decodeNarrationText(displayName);
  if (!decodedTitle || !decodedDisplayName) return null;

  return {
    submissionId,
    platformIdentity,
    title: decodedTitle,
    displayName: decodedDisplayName,
  };
}

interface SignedAcceptanceDecisionRecord extends AcceptanceDecisionRecord {
  signature: string;
}

export interface AcceptanceIntentRecord {
  operationId: string;
  sourceHeadSha: string;
  intendedAt: string;
  stewardGithubIdentity: string;
  contributors: Array<{ identity: string; displayName: string }>;
}

function serializeAcceptanceIntentRecord(record: AcceptanceIntentRecord): string {
  return JSON.stringify({
    sourceHeadSha: record.sourceHeadSha,
    operationId: record.operationId,
    intendedAt: record.intendedAt,
    stewardGithubIdentity: record.stewardGithubIdentity,
    contributors: record.contributors,
  });
}

function serializeAcceptanceDecisionRecord(
  record: AcceptanceDecisionRecord,
): string {
  // Never rely on JavaScript object insertion order for a durable signature:
  // parsing and reconstructing an object can legitimately reorder properties.
  const legacy = {
    canonCommitSha: record.canonCommitSha,
    decidedAt: record.decidedAt,
    stewardGithubIdentity: record.stewardGithubIdentity,
    contributors: record.contributors,
  };
  if (!record.baseCommitSha || !record.sourceHeadSha) {
    return JSON.stringify(legacy);
  }
  return JSON.stringify({
    ...legacy,
    baseCommitSha: record.baseCommitSha,
    sourceHeadSha: record.sourceHeadSha,
  });
}

function legacyInsertionOrderSerialization(
  record: AcceptanceDecisionRecord,
): string {
  // The earliest v1 writer signed JavaScript's insertion order before the
  // canonical serializer was introduced. Keep it readable for rebuilds.
  return JSON.stringify({
    canonCommitSha: record.canonCommitSha,
    stewardGithubIdentity: record.stewardGithubIdentity,
    contributors: record.contributors,
    decidedAt: record.decidedAt,
  });
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function githubIdentityFor(
  actor: Pick<GitHubActor, "login"> | { login?: string | null; email?: string | null; name?: string | null },
): string | null {
  const login = clean(actor.login);
  if (login) return `github:${login.toLowerCase()}`;

  const email = clean("email" in actor ? actor.email : null);
  if (email) return `git-email:${email.toLowerCase()}`;

  const name = clean("name" in actor ? actor.name : null);
  return name ? `git-name:${name.toLowerCase()}` : null;
}

function displayNameFor(
  actor: Pick<GitHubActor, "login" | "displayName"> | { login?: string | null; email?: string | null; name?: string | null },
): string | null {
  const displayName = clean("displayName" in actor ? actor.displayName : null);
  const name = clean("name" in actor ? actor.name : null);
  const login = clean(actor.login);
  const email = clean("email" in actor ? actor.email : null);
  return displayName ?? name ?? login ?? email ?? null;
}

export async function resolveContributor(
  actor: Pick<GitHubActor, "login" | "displayName"> | { login?: string | null; email?: string | null; name?: string | null },
): Promise<ContributorAttribution | null> {
  const identity = githubIdentityFor(actor);
  const displayName = displayNameFor(actor);
  if (!identity || !displayName) return null;

  const [existing] = await db
    .select({
      id: contributorsTable.id,
      displayName: contributorsTable.displayName,
      githubIdentity: contributorsTable.githubIdentity,
    })
    .from(contributorsTable)
    .where(eq(contributorsTable.githubIdentity, identity))
    .limit(1);

  if (existing) {
    if (existing.displayName !== displayName) {
      await db
        .update(contributorsTable)
        .set({ displayName })
        .where(eq(contributorsTable.id, existing.id));
    }
    return { id: existing.id, identity, displayName };
  }

  try {
    const [created] = await db
      .insert(contributorsTable)
      .values({
        displayName,
        platformIdentity: identity,
        githubIdentity: identity,
      })
      .returning({ id: contributorsTable.id });
    if (created) return { id: created.id, identity, displayName };
  } catch {
    // Another webhook or reconciliation job may have indexed the same GitHub
    // identity first. Re-read below so concurrent replay remains idempotent.
  }

  const [concurrent] = await db
    .select({ id: contributorsTable.id })
    .from(contributorsTable)
    .where(eq(contributorsTable.githubIdentity, identity))
    .limit(1);
  return concurrent ? { id: concurrent.id, identity, displayName } : null;
}

export async function resolveContributorIdentity(
  identity: string,
  displayName: string,
): Promise<ContributorAttribution | null> {
  const [existing] = await db
    .select({
      id: contributorsTable.id,
      displayName: contributorsTable.displayName,
    })
    .from(contributorsTable)
    .where(
      or(
        eq(contributorsTable.platformIdentity, identity),
        eq(contributorsTable.githubIdentity, identity),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      identity,
      displayName: existing.displayName,
    };
  }

  if (identity.startsWith("platform:")) {
    const [contributor] = await db
      .insert(contributorsTable)
      .values({
        displayName,
        platformIdentity: identity,
        githubIdentity: null,
      })
      .onConflictDoUpdate({
        target: contributorsTable.platformIdentity,
        set: { displayName },
      })
      .returning({ id: contributorsTable.id, displayName: contributorsTable.displayName });
    return contributor
      ? { id: contributor.id, identity, displayName: contributor.displayName }
      : null;
  }

  const login = identity.startsWith("github:")
    ? identity.slice("github:".length)
    : null;
  return resolveContributor({
    login,
    name: displayName,
    email: identity.startsWith("git-email:")
      ? identity.slice("git-email:".length)
      : null,
  });
}

/**
 * Indexs a narration commit after recovering its body from the committed file.
 * Unlike generic saved moments, narration metadata is explicitly encoded in
 * the commit trailer so a rebuild does not depend on the former Postgres row.
 */
export async function indexNarrationCommit(
  storyworldId: number,
  pathId: number,
  commit: GitHubCommit,
  content: string,
): Promise<ContributorAttribution | null> {
  const metadata = parseNarrationCommit(commit.message);
  if (!metadata) return null;

  const contributor = await resolveContributorIdentity(
    metadata.platformIdentity,
    metadata.displayName,
  );
  const heading = `# ${metadata.title}\n\n`;
  const summary = content.startsWith(heading)
    ? content.slice(heading.length).replace(/\n$/, "")
    : null;

  await db.transaction(async (tx) => {
    const [contribution] = await tx
      .insert(contributionsTable)
      .values({
        storyworldId,
        pathId,
        commitSha: commit.sha,
        contributorId: contributor?.id ?? null,
        title: metadata.title,
        summary,
        createdAt: new Date(commit.timestamp),
      })
      .onConflictDoUpdate({
        target: [contributionsTable.storyworldId, contributionsTable.commitSha],
        set: {
          contributorId: contributor?.id ?? null,
          title: metadata.title,
          summary,
        },
      })
      .returning({ id: contributionsTable.id });

    if (contribution) {
      await tx
        .insert(contributionPathMembershipsTable)
        .values({ contributionId: contribution.id, pathId })
        .onConflictDoNothing();
    }
  });
  return contributor;
}

export async function indexSavedMoment(
  storyworldId: number,
  pathId: number,
  commit: GitHubCommit,
): Promise<ContributorAttribution | null> {
  const contributor = await resolveContributor({
    login: commit.authorLogin,
    name: commit.authorName,
    email: commit.authorEmail,
  });
  const title = contributor
    ? `A saved moment from ${contributor.displayName}`
    : "A saved moment";

  const [contribution] = await db
    .insert(contributionsTable)
    .values({
      storyworldId,
      pathId,
      commitSha: commit.sha,
      contributorId: contributor?.id ?? null,
      title,
      // Commit messages are an implementation detail, not reader prose.
      summary: null,
      createdAt: new Date(commit.timestamp),
    })
    .onConflictDoUpdate({
      target: [contributionsTable.storyworldId, contributionsTable.commitSha],
      set: {
        contributorId: contributor?.id ?? null,
        title,
        summary: null,
      },
    })
    .returning({ id: contributionsTable.id });

  if (contribution) {
    await db
      .insert(contributionPathMembershipsTable)
      .values({ contributionId: contribution.id, pathId })
      .onConflictDoNothing();
  }

  return contributor;
}

export async function contributorAttributionsForPath(
  pathId: number,
): Promise<ContributorAttribution[]> {
  const rows = await db
    .select({
      id: contributorsTable.id,
      identity: contributorsTable.githubIdentity,
      displayName: contributorsTable.displayName,
    })
    .from(contributionPathMembershipsTable)
    .innerJoin(
      contributionsTable,
      eq(
        contributionPathMembershipsTable.contributionId,
        contributionsTable.id,
      ),
    )
    .innerJoin(
      contributorsTable,
      eq(contributionsTable.contributorId, contributorsTable.id),
    )
    .where(eq(contributionPathMembershipsTable.pathId, pathId));

  const unique = new Map<number, ContributorAttribution>();
  for (const row of rows) {
    if (row.identity) {
      unique.set(row.id, {
        id: row.id,
        identity: row.identity,
        displayName: row.displayName,
      });
    }
  }
  return [...unique.values()];
}

/**
 * Make one path's membership mirror its GitHub delta. This removes inherited
 * commits from a previous broad scan while leaving the same saved moment
 * attached to any other path that genuinely introduced it.
 */
export async function replacePathMomentMemberships(
  storyworldId: number,
  pathId: number,
  introducedCommitShas: string[],
): Promise<void> {
  const current = await db
    .select({
      contributionId: contributionPathMembershipsTable.contributionId,
      commitSha: contributionsTable.commitSha,
    })
    .from(contributionPathMembershipsTable)
    .innerJoin(
      contributionsTable,
      eq(
        contributionPathMembershipsTable.contributionId,
        contributionsTable.id,
      ),
    )
    .where(
      and(
        eq(contributionPathMembershipsTable.pathId, pathId),
        eq(contributionsTable.storyworldId, storyworldId),
      ),
    );
  const introduced = new Set(introducedCommitShas);
  const staleContributionIds = current
    .filter((membership) => !introduced.has(membership.commitSha))
    .map((membership) => membership.contributionId);
  if (staleContributionIds.length) {
    await db
      .delete(contributionPathMembershipsTable)
      .where(
        and(
          eq(contributionPathMembershipsTable.pathId, pathId),
          inArray(
            contributionPathMembershipsTable.contributionId,
            staleContributionIds,
          ),
        ),
      );
  }
}

export async function stewardAttribution(
  storyworldId: number,
  githubActor: GitHubActor | null | undefined,
  knownStewardId?: number | null,
): Promise<StewardAttribution> {
  const githubIdentity = githubActor
    ? githubIdentityFor(githubActor)
    : null;
  if (knownStewardId !== null && knownStewardId !== undefined) {
    const [linkedSteward] = await db
      .select({ githubUsername: userGithubLinksTable.githubUsername })
      .from(stewardsTable)
      .innerJoin(
        userGithubLinksTable,
        eq(stewardsTable.userId, userGithubLinksTable.userId),
      )
      .where(eq(stewardsTable.id, knownStewardId))
      .limit(1);
    return {
      id: knownStewardId,
      githubIdentity: linkedSteward
        ? `github:${linkedSteward.githubUsername.toLowerCase()}`
        : githubIdentity,
    };
  }
  if (!githubIdentity) return { id: null, githubIdentity: null };

  const login = githubIdentity.replace(/^github:/, "");
  const [steward] = await db
    .select({ id: stewardsTable.id })
    .from(stewardsTable)
    .innerJoin(
      userGithubLinksTable,
      eq(stewardsTable.userId, userGithubLinksTable.userId),
    )
    .where(
      and(
        eq(stewardsTable.storyworldId, storyworldId),
        sql`lower(${userGithubLinksTable.githubUsername}) = ${login}`,
      ),
    )
    .limit(1);

  return { id: steward?.id ?? null, githubIdentity };
}

export async function writeAcceptedProvenance(input: {
  storyworldId: number;
  canonCommitSha: string;
  sourcePathId: number;
  sourcePrNumber: number;
  contributors: ContributorAttribution[];
  steward: StewardAttribution;
  decidedAt: Date;
}): Promise<number | null> {
  const uniqueContributors = [...new Map(
    input.contributors.map((contributor) => [contributor.identity, contributor]),
  ).values()];

  const [record] = await db
    .insert(provenanceRecordsTable)
    .values({
      storyworldId: input.storyworldId,
      canonCommitSha: input.canonCommitSha,
      sourcePathId: input.sourcePathId,
      sourcePrNumber: input.sourcePrNumber,
      contributorIds: uniqueContributors.map((contributor) => contributor.id),
      contributorIdentities: uniqueContributors.map((contributor) => contributor.identity),
      stewardId: input.steward.id,
      stewardGithubIdentity: input.steward.githubIdentity,
      decision: "accepted-into-canon",
      decidedAt: input.decidedAt,
    })
    .onConflictDoUpdate({
      target: [
        provenanceRecordsTable.storyworldId,
        provenanceRecordsTable.canonCommitSha,
      ],
      set: {
        sourcePathId: input.sourcePathId,
        sourcePrNumber: input.sourcePrNumber,
        contributorIds: uniqueContributors.map((contributor) => contributor.id),
        contributorIdentities: uniqueContributors.map((contributor) => contributor.identity),
        stewardId: input.steward.id,
        stewardGithubIdentity: input.steward.githubIdentity,
        decision: "accepted-into-canon",
        decidedAt: input.decidedAt,
      },
    })
    .returning({ id: provenanceRecordsTable.id });
  return record?.id ?? null;
}

/**
 * The visible text stays in product vocabulary. The compact HTML comment is
 * a durable, machine-readable copy of the attribution needed to rebuild the
 * local index when the service account, rather than the steward, performs a
 * GitHub merge.
 */
export function buildAcceptanceDecisionNote(
  input: Omit<AcceptanceDecisionRecord, "decidedAt"> & {
    baseCommitSha: string;
    sourceHeadSha: string;
    decidedAt: Date;
  },
  signingSecret: string,
): string {
  const record: AcceptanceDecisionRecord = {
    ...input,
    decidedAt: input.decidedAt.toISOString(),
  };
  const signedRecord: SignedAcceptanceDecisionRecord = {
    ...record,
    signature: createHmac("sha256", signingSecret)
      .update(serializeAcceptanceDecisionRecord(record))
      .digest("hex"),
  };
  return [
    "Accepted into canon",
    "",
    "This decision records the people who shaped this path.",
    `<!-- ${ACCEPTANCE_NOTE_MARKER} ${JSON.stringify(signedRecord)} -->`,
  ].join("\n");
}

function parseSignedAcceptanceDecisionNote(
  body: string,
): SignedAcceptanceDecisionRecord | null {
  const marker = `<!-- ${ACCEPTANCE_NOTE_MARKER} `;
  const start = body.indexOf(marker);
  if (start < 0) return null;
  const end = body.indexOf(" -->", start + marker.length);
  if (end < 0) return null;

  try {
    const parsed = JSON.parse(
      body.slice(start + marker.length, end),
    ) as Partial<SignedAcceptanceDecisionRecord>;
    if (
      typeof parsed.canonCommitSha !== "string" ||
      typeof parsed.decidedAt !== "string" ||
      typeof parsed.signature !== "string" ||
      !Array.isArray(parsed.contributors)
    ) {
      return null;
    }
    const contributors = parsed.contributors.filter(
      (contributor): contributor is { identity: string; displayName: string } =>
        typeof contributor?.identity === "string" &&
        typeof contributor?.displayName === "string",
    );
    return {
      canonCommitSha: parsed.canonCommitSha,
      ...(typeof parsed.baseCommitSha === "string" &&
      typeof parsed.sourceHeadSha === "string"
        ? {
            baseCommitSha: parsed.baseCommitSha,
            sourceHeadSha: parsed.sourceHeadSha,
          }
        : {}),
      decidedAt: parsed.decidedAt,
      stewardGithubIdentity:
        typeof parsed.stewardGithubIdentity === "string"
          ? parsed.stewardGithubIdentity
          : null,
      contributors,
      signature: parsed.signature,
    };
  } catch {
    return null;
  }
}

export function parseAcceptanceDecisionNote(
  body: string,
): AcceptanceDecisionRecord | null {
  const record = parseSignedAcceptanceDecisionNote(body);
  if (!record) return null;
  const { signature: _signature, ...unsignedRecord } = record;
  return unsignedRecord;
}

export function verifyAcceptanceDecisionNote(
  body: string,
  signingSecret: string | undefined,
): AcceptanceDecisionRecord | null {
  if (!signingSecret) return null;
  const signedRecord = parseSignedAcceptanceDecisionNote(body);
  if (!signedRecord) return null;
  const { signature, ...record } = signedRecord;
  const expected = createHmac("sha256", signingSecret)
    .update(serializeAcceptanceDecisionRecord(record))
    .digest("hex");
  try {
    const signed = Buffer.from(signature, "hex");
    const candidates = [expected];
    if (!record.baseCommitSha || !record.sourceHeadSha) {
      candidates.push(
        createHmac("sha256", signingSecret)
          .update(legacyInsertionOrderSerialization(record))
          .digest("hex"),
      );
    }
    if (!candidates.some((candidate) => {
      const expectedBytes = Buffer.from(candidate, "hex");
      return signed.length === expectedBytes.length &&
        timingSafeEqual(signed, expectedBytes);
    })) {
      return null;
    }
  } catch {
    return null;
  }
  return record;
}

export function buildAcceptanceIntentNote(
  input: Omit<AcceptanceIntentRecord, "intendedAt"> & { intendedAt: Date },
  signingSecret: string,
): string {
  const record: AcceptanceIntentRecord = {
    ...input,
    intendedAt: input.intendedAt.toISOString(),
  };
  const signature = createHmac("sha256", signingSecret)
    .update(serializeAcceptanceIntentRecord(record))
    .digest("hex");
  return [
    "Acceptance is being recorded",
    "",
    "This path is awaiting its canon decision.",
    `<!-- ${ACCEPTANCE_INTENT_MARKER} ${JSON.stringify({ ...record, signature })} -->`,
  ].join("\n");
}

export function verifyAcceptanceIntentNote(
  body: string,
  signingSecret: string | undefined,
): AcceptanceIntentRecord | null {
  if (!signingSecret) return null;
  const marker = `<!-- ${ACCEPTANCE_INTENT_MARKER} `;
  const start = body.indexOf(marker);
  const end = body.indexOf(" -->", start + marker.length);
  if (start < 0 || end < 0) return null;
  try {
    const parsed = JSON.parse(body.slice(start + marker.length, end)) as
      Partial<AcceptanceIntentRecord> & { signature?: string };
    if (
      typeof parsed.sourceHeadSha !== "string" ||
      typeof parsed.operationId !== "string" ||
      typeof parsed.intendedAt !== "string" ||
      typeof parsed.stewardGithubIdentity !== "string" ||
      typeof parsed.signature !== "string" ||
      !Array.isArray(parsed.contributors)
    ) {
      return null;
    }
    const contributors = parsed.contributors.filter(
      (contributor): contributor is { identity: string; displayName: string } =>
        typeof contributor?.identity === "string" &&
        typeof contributor?.displayName === "string",
    );
    const record: AcceptanceIntentRecord = {
      sourceHeadSha: parsed.sourceHeadSha,
      operationId: parsed.operationId,
      intendedAt: parsed.intendedAt,
      stewardGithubIdentity: parsed.stewardGithubIdentity,
      contributors,
    };
    const expected = createHmac("sha256", signingSecret)
      .update(serializeAcceptanceIntentRecord(record))
      .digest("hex");
    const signed = Buffer.from(parsed.signature, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    return signed.length === expectedBytes.length &&
      timingSafeEqual(signed, expectedBytes)
      ? record
      : null;
  } catch {
    return null;
  }
}

export function isAcceptanceIntentNote(body: string): boolean {
  return body.includes(`<!-- ${ACCEPTANCE_INTENT_MARKER} `);
}

export function acceptanceIntentForOperation(
  comments: Array<{ body: string }>,
  signingSecret: string | undefined,
  operationId: string,
  sourceHeadSha: string,
): AcceptanceIntentRecord | null {
  for (const comment of comments) {
    const intent = verifyAcceptanceIntentNote(comment.body, signingSecret);
    if (
      intent?.operationId === operationId &&
      intent.sourceHeadSha === sourceHeadSha
    ) {
      return intent;
    }
  }
  return null;
}

export function acceptanceOperationIdFromCommitMessage(
  message: string,
): string | null {
  const match = /\[telling-forward-acceptance:([0-9a-f-]{36})\]/i.exec(message);
  return match?.[1] ?? null;
}