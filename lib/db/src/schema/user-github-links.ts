import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Stores a user's optional GitHub account link.
 * This is separate from the contributors table (created in the Foundation task)
 * so auth works independently. One row per user who has linked their GitHub account.
 */
export const userGithubLinksTable = pgTable("user_github_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  /** GitHub's numeric user ID — stable even if the username changes */
  githubUserId: text("github_user_id").notNull().unique(),
  githubUsername: text("github_username").notNull(),
  /** Primary email visible on the GitHub account (may differ from platform email) */
  githubEmail: text("github_email"),
  // NOTE: We do NOT store the OAuth access token here. The GitHub sync layer
  // (Task #11) commits on behalf of users via the platform PAT and sets the
  // commit author.name/email from the contributor's profile. If per-user
  // GitHub tokens are needed in future, encrypt them before storage.
  linkedAt: timestamp("linked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserGithubLink = typeof userGithubLinksTable.$inferSelect;
