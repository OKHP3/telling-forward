/**
 * Dev-only seed route — populates the database with sample storyworlds,
 * paths, and contributions so the mobile app has data to display before
 * the GitHub sync layer (task #11) is built.
 *
 * Only registered in NODE_ENV !== "production".
 * DELETE /api/dev/seed clears all seeded data.
 * POST   /api/dev/seed inserts fresh sample data (idempotent via ON CONFLICT DO NOTHING).
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  storyworldsTable,
  storyPathsTable,
  contributionsTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// POST /api/dev/seed
router.post("/seed", async (req, res) => {
  try {
    // Insert sample storyworlds
    const worlds = await db
      .insert(storyworldsTable)
      .values([
        {
          repoOwner: "telling-forward",
          repoName: "magnus-progenitor-saga",
          title: "The Magnus Progenitor Saga",
          canonBranchRef: "main",
          readerTheme: "terminal",
        },
        {
          repoOwner: "telling-forward",
          repoName: "echoes-of-the-drift",
          title: "Echoes of the Drift",
          canonBranchRef: "main",
          readerTheme: "signal",
        },
        {
          repoOwner: "telling-forward",
          repoName: "the-cartographers-oath",
          title: "The Cartographer's Oath",
          canonBranchRef: "main",
          readerTheme: "archive",
        },
      ])
      .onConflictDoNothing()
      .returning();

    if (worlds.length === 0) {
      // Already seeded — return current state
      const existing = await db.select().from(storyworldsTable).limit(3);
      const paths = await db.select().from(storyPathsTable).limit(10);
      const contributions = await db
        .select()
        .from(contributionsTable)
        .limit(20);
      res.json({
        message: "Already seeded",
        storyworlds: existing.length,
        paths: paths.length,
        contributions: contributions.length,
      });
      return;
    }

    // Insert sample story paths for each world
    const paths = [];
    for (const world of worlds) {
      const worldPaths = await db
        .insert(storyPathsTable)
        .values([
          {
            storyworldId: world.id,
            branchRef: "main",
            title: "Canon Path",
            state: "open" as const,
          },
          {
            storyworldId: world.id,
            branchRef: "path/the-awakening",
            title: "The Awakening",
            state: "open" as const,
          },
          {
            storyworldId: world.id,
            branchRef: "path/shadow-council",
            title: "The Shadow Council",
            state: "proposed" as const,
          },
        ])
        .onConflictDoNothing()
        .returning();
      paths.push(...worldPaths);
    }

    // Insert sample contributions for each path
    let contribCount = 0;
    const sampleContribs = [
      {
        title: "The First Light",
        summary:
          "The council chamber fell silent as the emissary stepped forward, her voice carrying the weight of a thousand years. 'The convergence begins at dawn,' she said, and no one dared look away.",
        commitSha: () =>
          Math.random().toString(16).slice(2, 10) +
          Math.random().toString(16).slice(2, 10),
      },
      {
        title: "Beneath the Archive",
        summary:
          "Three levels below the capital, in a room that didn't appear on any official blueprint, the archivist pressed her palm against the cold panel and waited. The door had not opened in forty years.",
        commitSha: () =>
          Math.random().toString(16).slice(2, 10) +
          Math.random().toString(16).slice(2, 10),
      },
      {
        title: "The Signal from the Outer Ring",
        summary:
          "It came as a rhythmic pulse — not random noise, not a natural source. Someone out there was counting. And they'd been counting long before the colony ships left port.",
        commitSha: () =>
          Math.random().toString(16).slice(2, 10) +
          Math.random().toString(16).slice(2, 10),
      },
      {
        title: "A Name Written in Salt",
        summary:
          "The inscription was in no known language, yet every person who read it understood it perfectly. That was, of course, the first warning they chose to ignore.",
        commitSha: () =>
          Math.random().toString(16).slice(2, 10) +
          Math.random().toString(16).slice(2, 10),
      },
    ];

    for (const path of paths.slice(0, 6)) {
      for (const contrib of sampleContribs.slice(0, 2)) {
        await db
          .insert(contributionsTable)
          .values({
            storyworldId: path.storyworldId,
            pathId: path.id,
            commitSha: contrib.commitSha(),
            title: contrib.title,
            summary: contrib.summary,
          })
          .onConflictDoNothing();
        contribCount++;
      }
    }

    res.json({
      message: "Seeded successfully",
      storyworlds: worlds.length,
      paths: paths.length,
      contributions: contribCount,
    });
  } catch (err) {
    req.log.error({ err }, "Seed failed");
    res.status(500).json({ error: "Seed failed" });
  }
});

// DELETE /api/dev/seed
router.delete("/seed", async (req, res) => {
  try {
    await db.execute(sql`TRUNCATE contributions, story_paths, storyworlds CASCADE`);
    res.json({ message: "All seeded data cleared" });
  } catch (err) {
    req.log.error({ err }, "Clear seed failed");
    res.status(500).json({ error: "Clear failed" });
  }
});

export default router;
