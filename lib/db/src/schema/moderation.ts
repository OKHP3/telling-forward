import { pgEnum, pgTable, text, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const moderationCaseStatusEnum = pgEnum("moderation_case_status", [
  "open",
  "triaged",
  "awaiting-steward",
  "resolved",
  "dismissed",
  "appealed",
]);
export const moderationVisibilityActionEnum = pgEnum("moderation_visibility_action", [
  "none",
  "hold",
  "restricted",
  "muted",
  "blocked",
]);
export const moderationSubjectKindEnum = pgEnum("moderation_subject_kind", [
  "proposal", "contribution", "capsule", "reaction", "theory", "account",
]);
export const moderationReasonCodeEnum = pgEnum("moderation_reason_code", [
  "spam", "harassment", "nsfw", "plagiarism-review", "rights-concern", "safety", "other",
]);

export const moderationCasesTable = pgTable("moderation_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyworldId: integer("storyworld_id").notNull(),
  subjectKind: moderationSubjectKindEnum("subject_kind").notNull(),
  subjectReference: text("subject_reference").notNull(),
  openedByUserId: integer("opened_by_user_id"),
  assignedStewardId: integer("assigned_steward_id"),
  status: moderationCaseStatusEnum("status").notNull().default("open"),
  visibilityAction: moderationVisibilityActionEnum("visibility_action").notNull().default("none"),
  primaryReasonCode: moderationReasonCodeEnum("primary_reason_code").notNull(),
  contributorMessage: text("contributor_message"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (t) => [
  index("idx_moderation_cases_storyworld").on(t.storyworldId),
  index("idx_moderation_cases_status").on(t.status),
]);

export const moderationEventsTable = pgTable("moderation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => moderationCasesTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  reasonCode: moderationReasonCodeEnum("reason_code"),
  privateNote: text("private_note"),
  evidenceReference: text("evidence_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("idx_moderation_events_case").on(t.caseId)]);

export const storyworldModerationControlsTable = pgTable("storyworld_moderation_controls", {
  id: uuid("id").defaultRandom().primaryKey(),
  storyworldId: integer("storyworld_id").notNull(),
  subjectUserId: integer("subject_user_id").notNull(),
  controlKind: text("control_kind").notNull(),
  appliesTo: text("applies_to").notNull(),
  reasonCode: moderationReasonCodeEnum("reason_code").notNull(),
  imposedByUserId: integer("imposed_by_user_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  liftedAt: timestamp("lifted_at", { withTimezone: true }),
}, (t) => [index("idx_moderation_controls_storyworld").on(t.storyworldId)]);

export const insertModerationCaseSchema = createInsertSchema(moderationCasesTable);
export const selectModerationCaseSchema = createSelectSchema(moderationCasesTable);
export type ModerationCase = typeof moderationCasesTable.$inferSelect;
export type InsertModerationCase = typeof moderationCasesTable.$inferInsert;
export type ModerationEvent = typeof moderationEventsTable.$inferSelect;
export type ModerationControl = typeof storyworldModerationControlsTable.$inferSelect;