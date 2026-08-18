import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  // One outstanding reset token per user — enforced by the UNIQUE constraint so
  // a concurrent upsert atomically replaces any existing token.
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // SHA-256 digest of the raw token sent to the user. Never store the raw
  // token — a DB read must not yield a usable credential.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PasswordResetToken =
  typeof passwordResetTokensTable.$inferSelect;
