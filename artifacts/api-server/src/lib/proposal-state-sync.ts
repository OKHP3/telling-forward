import { sql } from "drizzle-orm";
import { proposalsTable } from "@workspace/db";

/**
 * Creates the conflict-update expressions shared by webhook delivery and
 * backfill reconciliation. GitHub may report a PR outcome, but it must not
 * reverse a product-level restriction, withdrawal, archive, or canon decision.
 */
export function proposalSyncConflictSet(isTerminalEvent: boolean) {
  const protectedTerminalStates =
    "'accepted-into-canon', 'restricted', 'withdrawn', 'archived'";
  const protectedNonTerminalStates =
    "'under-review', 'returned-with-notes', 'accepted-into-canon', " +
    "'restricted', 'withdrawn', 'archived'";
  const preservedStates = isTerminalEvent
    ? protectedTerminalStates
    : protectedNonTerminalStates;

  return {
    state: sql`
      CASE
        WHEN ${proposalsTable.state} IN (${sql.raw(preservedStates)})
        THEN ${proposalsTable.state}
        ELSE excluded.state
      END`,
    decidedAt: sql`
      CASE
        WHEN ${proposalsTable.state} IN (${sql.raw(preservedStates)})
        THEN ${proposalsTable.decidedAt}
        ELSE excluded.decided_at
      END`,
  };
}