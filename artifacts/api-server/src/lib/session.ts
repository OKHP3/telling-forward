import { pool } from "@workspace/db";

/**
 * Invalidate every server-side session that belongs to a local account.
 *
 * connect-pg-simple stores the Express session as JSON. Keep this operation
 * scoped to the numeric bridge identity so resetting one account cannot revoke
 * unrelated users' sessions.
 */
export async function destroyUserSessions(userId: number): Promise<void> {
  await pool.query(
    `DELETE FROM sessions WHERE sess->>'userId' = $1`,
    [String(userId)],
  );
}