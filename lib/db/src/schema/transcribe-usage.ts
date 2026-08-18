/**
 * Per-user transcription rate-limit tracking.
 *
 * Replaces the original in-memory Map in transcribe.ts so that usage counters
 * survive server restarts and are shared across all instances. Each row holds
 * the rolling-window count and the timestamp at which the window resets.
 * One row per user, upserted on every request.
 */
import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transcribeUsageTable = pgTable("transcribe_usage", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
