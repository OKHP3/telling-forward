import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { contributorsTable, storyworldsTable } from "./telling-forward";

export const consentRecordsTable = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectUserId: integer("subject_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    contributorId: integer("contributor_id").references(
      () => contributorsTable.id,
      { onDelete: "set null" },
    ),
    storyworldId: integer("storyworld_id").references(
      () => storyworldsTable.id,
      { onDelete: "cascade" },
    ),
    actionType: text("action_type").notNull(),
    scopeKind: text("scope_kind").notNull(),
    scopeReference: text("scope_reference"),
    status: text("status").notNull(),
    policyDocumentRef: text("policy_document_ref").notNull(),
    policyVersion: text("policy_version").notNull(),
    policyHash: text("policy_hash").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    supersedesConsentId: uuid("supersedes_consent_id"),
    recordedVia: text("recorded_via").notNull(),
    requestId: text("request_id"),
  },
  (t) => [
    index("consent_records_subject_scope_action_idx").on(
      t.subjectUserId,
      t.storyworldId,
      t.actionType,
      t.recordedAt,
    ),
    index("consent_records_contributor_idx").on(t.contributorId, t.recordedAt),
  ],
);