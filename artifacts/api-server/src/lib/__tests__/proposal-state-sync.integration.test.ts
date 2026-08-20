import { describe, expect, it } from "vitest";

const describeWithDatabase = process.env["DATABASE_URL"] ? describe : describe.skip;

describeWithDatabase("proposal synchronization conflict update", () => {
  it.each([
    ["restricted", true],
    ["withdrawn", true],
    ["archived", true],
    ["restricted", false],
    ["withdrawn", false],
    ["archived", false],
  ] as const)(
    "preserves %s and its decision timestamp for terminal=%s synchronization",
    async (existingState, isTerminalEvent) => {
      const [{ pool }, { drizzle }, { sql }, { proposalSyncConflictSet }] =
        await Promise.all([
          import("@workspace/db"),
          import("drizzle-orm/node-postgres"),
          import("drizzle-orm"),
          import("../proposal-state-sync"),
        ]);
      const client = await pool.connect();
      const retainedDecidedAt = new Date("2026-01-18T12:00:00.000Z");
      const incomingDecidedAt = new Date("2026-02-19T12:00:00.000Z");

      try {
        await client.query("BEGIN");
        // The temporary table shadows the application table only on this
        // connection and is discarded at transaction end.
        await client.query(`
          CREATE TEMP TABLE proposals (
            id integer PRIMARY KEY,
            state text NOT NULL,
            decided_at timestamptz
          ) ON COMMIT DROP
        `);
        await client.query(
          "INSERT INTO proposals (id, state, decided_at) VALUES ($1, $2, $3)",
          [1, existingState, retainedDecidedAt],
        );

        const conflictSet = proposalSyncConflictSet(isTerminalEvent);
        const connectionDb = drizzle(client);
        const result = await connectionDb.execute(sql`
          INSERT INTO proposals (id, state, decided_at)
          VALUES (1, 'accepted-into-canon', ${incomingDecidedAt})
          ON CONFLICT (id) DO UPDATE SET
            state = ${conflictSet.state},
            decided_at = ${conflictSet.decidedAt}
          RETURNING state, decided_at
        `);
        const row = (result as unknown as {
          rows: Array<{ state: string; decided_at: string }>;
        }).rows[0];

        expect(row?.state).toBe(existingState);
        expect(new Date(String(row?.decided_at)).toISOString()).toBe(
          retainedDecidedAt.toISOString(),
        );
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    },
  );
});