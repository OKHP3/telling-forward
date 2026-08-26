import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  unique,
  index,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Telling Forward core tables (Section 8 of platform requirements).
 *
 * Every table that references a GitHub object stores the GitHub-native key
 * (SHA, PR number, branch ref) alongside the application ID, so the cache
 * is always re-derivable and auditable against GitHub directly.
 */

// Story path states (Section 8)
export const storyPathStateEnum = pgEnum("story_path_state", [
  "personal",
  "open",
  "proposed",
  // A path accepted into canon via a steward decision. Mutually exclusive with
  // published-alternate: these are the two terminal outcomes of canon review.
  "published-canon",
  "published-alternate",
]);

// The single authoritative contributor state machine (Section 7.3).
// This is a deliberate UI simplification over raw PR states and must be
// maintained explicitly, not inferred ad hoc.
export const proposalStateEnum = pgEnum("proposal_state", [
  "draft",
  "submitted",
  "under-review",
  "returned-with-notes",
  "accepted-into-canon",
  "published-alternate",
  "restricted",
  "withdrawn",
  "archived",
]);

// One row per GitHub repository acting as a storyworld
export const storyworldsTable = pgTable("storyworlds", {
  id: serial("id").primaryKey(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  title: text("title").notNull(),
  stewardId: integer("steward_id"),
  canonBranchRef: text("canon_branch_ref").notNull(),
  // A short seed sentence surfaced on the Reader discovery page.
  // Not required — worlds without a seed fall back to the repo name.
  seed: text("seed"),
  // A named member of the finite Reader theme catalog. The Reader falls back
  // to Editorial if an older record has no usable value.
  readerTheme: text("reader_theme").notNull().default("editorial"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  unique("storyworlds_repo_unique").on(t.repoOwner, t.repoName),
  check(
    "storyworlds_reader_theme_check",
    sql`${t.readerTheme} IN ('editorial', 'terminal', 'archive', 'dispatch', 'signal')`,
  ),
]);

// Maps to a GitHub branch
export const storyPathsTable = pgTable("story_paths", {
  id: serial("id").primaryKey(),
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  branchRef: text("branch_ref").notNull(),
  title: text("title").notNull(),
  originPathId: integer("origin_path_id"),
  state: storyPathStateEnum("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  unique("story_paths_branch_unique").on(t.storyworldId, t.branchRef),
  index("idx_story_paths_storyworld").on(t.storyworldId),
]);

// Maps to a commit; the human-facing feed record.
// Internal name only — surfaces as "Saved moment" in UI copy (ADR-0001).
export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  // Commit identity is repository-native: a SHA is unique per storyworld
  // (repo), not per path — a branch can share commits with its origin.
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  pathId: integer("path_id")
    .notNull()
    .references(() => storyPathsTable.id),
  commitSha: text("commit_sha").notNull(),
  contributorId: integer("contributor_id").references(
    () => contributorsTable.id,
  ),
  title: text("title").notNull(),
  summary: text("summary"),
  // True if this scene was drafted with AI assistance (Scene Writer / PME).
  // Always visible in the Reader; never hover-only. Part of the theme contract.
  agentAssisted: boolean("agent_assisted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  unique("contributions_commit_unique").on(t.storyworldId, t.commitSha),
  index("idx_contributions_path").on(t.pathId),
]);

// A saved moment can be shared by more than one path. The commit record itself
// remains unique per storyworld; this table preserves every path membership
// needed to rebuild readers' views after a reconciliation.
export const contributionPathMembershipsTable = pgTable(
  "contribution_path_memberships",
  {
    contributionId: integer("contribution_id")
      .notNull()
      .references(() => contributionsTable.id),
    pathId: integer("path_id")
      .notNull()
      .references(() => storyPathsTable.id),
  },
  (t) => [
    unique("contribution_path_membership_unique").on(
      t.contributionId,
      t.pathId,
    ),
    index("idx_contribution_path_memberships_path").on(t.pathId),
  ],
);

// Maps to a pull request
export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  // PR identity is repository-native: PR numbers are unique per storyworld
  // (repo), not per path.
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  pathId: integer("path_id")
    .notNull()
    .references(() => storyPathsTable.id),
  // The PR author resolved from GitHub. Nullable for historic or otherwise
  // unattributable imports; consumers must never infer ownership from a path.
  contributorId: integer("contributor_id").references(
    () => contributorsTable.id,
  ),
  // GitHub's immutable numeric account ID for the PR author. This is stored
  // alongside the contributor link because a login can be renamed or reused.
  // Null means historic ownership cannot be verified for activity visibility.
  githubUserId: text("github_user_id"),
  prNumber: integer("pr_number").notNull(),
  state: proposalStateEnum("state").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  // A steward may record why a submission was restricted. It is deliberately
  // separate from editor questions, which invite revision rather than end it.
  decisionReason: text("decision_reason"),
},
(t) => [
  unique("proposals_pr_unique").on(t.storyworldId, t.prNumber),
  index("idx_proposals_path").on(t.pathId),
  index("idx_proposals_contributor").on(t.contributorId),
  index("idx_proposals_github_user").on(t.githubUserId),
]);

// Maps to PR review comments
export const editorQuestionsTable = pgTable("editor_questions", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id")
    .notNull()
    .references(() => proposalsTable.id),
  // bigint stores GitHub-native IDs losslessly; GitHub IDs exceed INT32 range.
  reviewCommentId: bigint("review_comment_id", { mode: "number" }).notNull().unique(),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  // Contributor-owned acknowledgement for the current revision cycle. This
  // never changes the original editor question text.
  addressedAt: timestamp("addressed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [index("idx_editor_questions_proposal").on(t.proposalId)]);

// Plain-language contributor inbox entries. Technical and maintainer events
// intentionally do not use this table.
export const contributorNotificationKindEnum = [
  "received",
  "being-reviewed",
  "creative-question",
  "official-story",
  "alternate-path",
] as const;
export type ContributorNotificationKind =
  (typeof contributorNotificationKindEnum)[number];

export const contributorNotificationsTable = pgTable(
  "contributor_notifications",
  {
    id: serial("id").primaryKey(),
    contributorId: integer("contributor_id")
      .notNull()
      .references(() => contributorsTable.id),
    proposalId: integer("proposal_id")
      .notNull()
      .references(() => proposalsTable.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    eventKey: text("event_key").notNull().unique(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_contributor_notifications_contributor_created").on(
      t.contributorId,
      t.createdAt,
    ),
    index("idx_contributor_notifications_proposal").on(t.proposalId),
    check(
      "contributor_notifications_kind_check",
      sql`${t.kind} IN ('received', 'being-reviewed', 'creative-question', 'official-story', 'alternate-path')`,
    ),
  ],
);

// Redacted, storyworld-scoped audit projection of an accepted GitHub webhook.
// The raw payload, signature, secret, and contributor-private control-plane
// data intentionally never enter this table.
export const webhookDeliveryEvidenceTable = pgTable(
  "webhook_delivery_evidence",
  {
    id: serial("id").primaryKey(),
    storyworldId: integer("storyworld_id")
      .notNull()
      .references(() => storyworldsTable.id, { onDelete: "cascade" }),
    deliveryId: text("delivery_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    processingResult: text("processing_result").notNull(),
    replayOutcome: text("replay_outcome").notNull(),
    proposalId: integer("proposal_id").references(() => proposalsTable.id, {
      onDelete: "set null",
    }),
    editorQuestionId: integer("editor_question_id").references(
      () => editorQuestionsTable.id,
      { onDelete: "set null" },
    ),
    notificationKey: text("notification_key"),
    provenanceRecordId: integer("provenance_record_id").references(
      () => provenanceRecordsTable.id,
      { onDelete: "set null" },
    ),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_webhook_delivery_evidence_storyworld_received").on(
      t.storyworldId,
      t.receivedAt,
    ),
    check(
      "webhook_delivery_evidence_processing_result_check",
      sql`${t.processingResult} IN ('processed', 'ignored', 'failed')`,
    ),
    check(
      "webhook_delivery_evidence_replay_outcome_check",
      sql`${t.replayOutcome} IN ('new', 'duplicate')`,
    ),
  ],
);

// Application-level authority, cross-checked against GitHub branch protection
export const stewardsTable = pgTable("stewards", {
  id: serial("id").primaryKey(),
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [index("idx_stewards_storyworld").on(t.storyworldId)]);

// Resolves the identity question from Section 7.2
export const contributorsTable = pgTable("contributors", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  platformIdentity: text("platform_identity").notNull(),
  githubIdentity: text("github_identity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  unique("contributors_github_identity_unique").on(t.githubIdentity),
  // Required for the atomic upsert on submission: one contributor row per
  // platform identity, even under concurrent submissions by the same user.
  unique("contributors_platform_identity_unique").on(t.platformIdentity),
]);

// The durable provenance ledger from Section 7.4
export const provenanceRecordsTable = pgTable("provenance_records", {
  id: serial("id").primaryKey(),
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  canonCommitSha: text("canon_commit_sha").notNull(),
  sourcePathId: integer("source_path_id").references(() => storyPathsTable.id),
  // GitHub PR number is the durable source reference used to rebuild this
  // record. It intentionally is not a local proposal foreign key.
  sourcePrNumber: integer("source_pr_number"),
  // Local IDs support quick joins; durable GitHub identities allow the index to
  // be reconstructed even when local serial IDs have changed.
  contributorIds: integer("contributor_ids").array().notNull(),
  contributorIdentities: text("contributor_identities").array().notNull().default([]),
  stewardId: integer("steward_id").references(() => stewardsTable.id),
  stewardGithubIdentity: text("steward_github_identity"),
  decision: text("decision").notNull().default("accepted-into-canon"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
},
(t) => [
  unique("provenance_canon_commit_unique").on(t.storyworldId, t.canonCommitSha),
  index("idx_provenance_storyworld").on(t.storyworldId),
]);

// Insert/select schemas following the drizzle-zod pattern
export const insertStoryworldSchema = createInsertSchema(
  storyworldsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectStoryworldSchema = createSelectSchema(storyworldsTable);
export type InsertStoryworld = z.infer<typeof insertStoryworldSchema>;
export type Storyworld = typeof storyworldsTable.$inferSelect;

export const insertStoryPathSchema = createInsertSchema(storyPathsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectStoryPathSchema = createSelectSchema(storyPathsTable);
export type InsertStoryPath = z.infer<typeof insertStoryPathSchema>;
export type StoryPath = typeof storyPathsTable.$inferSelect;

export const insertContributionSchema = createInsertSchema(
  contributionsTable,
).omit({ id: true, createdAt: true });
export const selectContributionSchema = createSelectSchema(contributionsTable);
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributionsTable.$inferSelect;

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({
  id: true,
});
export const selectProposalSchema = createSelectSchema(proposalsTable);
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;

export const insertEditorQuestionSchema = createInsertSchema(
  editorQuestionsTable,
).omit({ id: true, createdAt: true });
export const selectEditorQuestionSchema =
  createSelectSchema(editorQuestionsTable);
export type InsertEditorQuestion = z.infer<typeof insertEditorQuestionSchema>;
export type EditorQuestion = typeof editorQuestionsTable.$inferSelect;

export const insertContributorNotificationSchema = createInsertSchema(
  contributorNotificationsTable,
).omit({ id: true, createdAt: true });
export const selectContributorNotificationSchema = createSelectSchema(
  contributorNotificationsTable,
);
export type InsertContributorNotification = z.infer<
  typeof insertContributorNotificationSchema
>;
export type ContributorNotification =
  typeof contributorNotificationsTable.$inferSelect;

export const insertStewardSchema = createInsertSchema(stewardsTable).omit({
  id: true,
  createdAt: true,
});
export const selectStewardSchema = createSelectSchema(stewardsTable);
export type InsertSteward = z.infer<typeof insertStewardSchema>;
export type Steward = typeof stewardsTable.$inferSelect;

export const insertContributorSchema = createInsertSchema(
  contributorsTable,
).omit({ id: true, createdAt: true });
export const selectContributorSchema = createSelectSchema(contributorsTable);
export type InsertContributor = z.infer<typeof insertContributorSchema>;
export type Contributor = typeof contributorsTable.$inferSelect;

export const insertProvenanceRecordSchema = createInsertSchema(
  provenanceRecordsTable,
).omit({ id: true });
export const selectProvenanceRecordSchema = createSelectSchema(
  provenanceRecordsTable,
);
export type InsertProvenanceRecord = z.infer<
  typeof insertProvenanceRecordSchema
>;
export type ProvenanceRecord = typeof provenanceRecordsTable.$inferSelect;
