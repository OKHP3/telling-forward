import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
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
]);

// One row per GitHub repository acting as a storyworld
export const storyworldsTable = pgTable("storyworlds", {
  id: serial("id").primaryKey(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  title: text("title").notNull(),
  stewardId: integer("steward_id"),
  canonBranchRef: text("canon_branch_ref").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [unique("storyworlds_repo_unique").on(t.repoOwner, t.repoName)]);

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  unique("contributions_commit_unique").on(t.storyworldId, t.commitSha),
  index("idx_contributions_path").on(t.pathId),
]);

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
  prNumber: integer("pr_number").notNull(),
  state: proposalStateEnum("state").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
},
(t) => [
  unique("proposals_pr_unique").on(t.storyworldId, t.prNumber),
  index("idx_proposals_path").on(t.pathId),
]);

// Maps to PR review comments
export const editorQuestionsTable = pgTable("editor_questions", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id")
    .notNull()
    .references(() => proposalsTable.id),
  reviewCommentId: integer("review_comment_id").notNull().unique(),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [index("idx_editor_questions_proposal").on(t.proposalId)]);

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
});

// The durable provenance ledger from Section 7.4
export const provenanceRecordsTable = pgTable("provenance_records", {
  id: serial("id").primaryKey(),
  storyworldId: integer("storyworld_id")
    .notNull()
    .references(() => storyworldsTable.id),
  canonCommitSha: text("canon_commit_sha").notNull(),
  sourcePathId: integer("source_path_id").references(() => storyPathsTable.id),
  contributorIds: integer("contributor_ids").array().notNull(),
  stewardId: integer("steward_id").references(() => stewardsTable.id),
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
