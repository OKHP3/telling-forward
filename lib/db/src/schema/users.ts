import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Nullable: Clerk-authenticated users have no local password hash.
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  // Clerk user ID — populated on first sign-in via JIT provisioning.
  // NULL for legacy bcrypt-only accounts that have not yet signed in via Clerk.
  clerkId: text("clerk_id").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  // Account-level brute-force lockout — durable across restarts and shared
  // across all server instances. Incremented on each wrong-password attempt;
  // cleared on a successful login. lockedUntil is set once failedLoginAttempts
  // reaches LOCKOUT_THRESHOLD and acts as the authoritative lock guard.
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "passwordHash">;
