import { Router, type IRouter } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  contributionsTable,
  proposalsTable,
} from "@workspace/db";
import {
  GetStoryworldParams,
  ListStoryPathsParams,
  ListContributionsParams,
  ListStoryworldProposalsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireStewardForStoryworld } from "../middlewares/steward";
import { getGitHubClient, type GitHubIssue, type EnsureLabelsEntry } from "../lib/github";

// ---------------------------------------------------------------------------
// Capsule helpers (GitHub Issues as capsule data layer)
// ---------------------------------------------------------------------------

const CAPSULE_TYPE_LABELS = {
  character: { name: "capsule:character", color: "0075ca", description: "Character capsule" },
  arc:       { name: "capsule:arc",       color: "e4e669", description: "Arc capsule" },
  event:     { name: "capsule:event",     color: "d4c5f9", description: "Event capsule" },
} as const;

type CapsuleType = keyof typeof CAPSULE_TYPE_LABELS;
const CAPSULE_PREFIX = "capsule:";
const ROLE_PREFIX    = "role:";
const ROLE_COLOR     = "f9d0c4";

function mapIssueToCapsule(issue: GitHubIssue, storyworldId: number) {
  const typeRaw = issue.labels.find(l => l.startsWith(CAPSULE_PREFIX))
    ?.slice(CAPSULE_PREFIX.length) ?? "character";
  const type: CapsuleType = (["character", "arc", "event"] as const).includes(typeRaw as CapsuleType)
    ? (typeRaw as CapsuleType)
    : "character";
  const roleRaw = issue.labels.find(l => l.startsWith(ROLE_PREFIX));
  return {
    id:            issue.number,
    storyworldId,
    title:         issue.title,
    type,
    roleTag:       roleRaw ? roleRaw.slice(ROLE_PREFIX.length) : null,
    epiphanyNote:  issue.body ?? null,
    createdAt:     issue.createdAt,
    updatedAt:     issue.updatedAt,
  };
}

async function getStoryworldRepo(id: number) {
  const rows = await db
    .select({ repoOwner: storyworldsTable.repoOwner, repoName: storyworldsTable.repoName })
    .from(storyworldsTable)
    .where(eq(storyworldsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function parseParam(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

function parseCapsuleId(raw: string | string[] | undefined): number | null {
  const n = parseInt(parseParam(raw), 10);
  return isNaN(n) ? null : n;
}

const router: IRouter = Router();

// GET /api/storyworlds
router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(storyworldsTable)
      .orderBy(desc(storyworldsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listStoryworlds DB error");
    res.status(500).json({ error: "Failed to load storyworlds" });
  }
});

// GET /api/storyworlds/:id
router.get("/:id", async (req, res) => {
  const params = GetStoryworldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(storyworldsTable)
      .where(eq(storyworldsTable.id, params.data.id))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Storyworld not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "getStoryworld DB error");
    res.status(500).json({ error: "Failed to load storyworld" });
  }
});

// GET /api/storyworlds/:id/paths
router.get("/:id/paths", async (req, res) => {
  const params = ListStoryPathsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(storyPathsTable)
      .where(eq(storyPathsTable.storyworldId, params.data.id))
      .orderBy(desc(storyPathsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listStoryPaths DB error");
    res.status(500).json({ error: "Failed to load story paths" });
  }
});

// GET /api/storyworlds/:id/paths/:pathId/contributions
router.get("/:id/paths/:pathId/contributions", async (req, res) => {
  const params = ListContributionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld or path id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(contributionsTable)
      .where(
        and(
          eq(contributionsTable.storyworldId, params.data.id),
          eq(contributionsTable.pathId, params.data.pathId),
        ),
      )
      .orderBy(asc(contributionsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listContributions DB error");
    res.status(500).json({ error: "Failed to load contributions" });
  }
});

// GET /api/storyworlds/:id/proposals — steward dashboard data
router.get(
  "/:id/proposals",
  requireAuth,
  requireStewardForStoryworld,
  async (req, res) => {
    const params = ListStoryworldProposalsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid storyworld id" });
      return;
    }
    try {
      const rows = await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.storyworldId, params.data.id))
        .orderBy(desc(proposalsTable.submittedAt));
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "listStoryworldProposals DB error");
      res.status(500).json({ error: "Failed to load proposals" });
    }
  },
);

// ---------------------------------------------------------------------------
// Capsule routes
// ---------------------------------------------------------------------------

// GET /api/storyworlds/:id/capsules
// requireStewardForStoryworld guards draft capsule content — Task #41 will
// add an explicit contributor read policy when contributor access is designed.
router.get("/:id/capsules", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id = parseInt(parseParam(req.params["id"]), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid storyworld id" }); return; }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  try {
    const gh = getGitHubClient();
    // Fetch all open issues and filter by capsule:* label in code.
    // GitHub's label API requires exact label names; we can't filter by prefix.
    const issues = await gh.listIssues({
      owner: world.repoOwner,
      repo:  world.repoName,
      state: "open",
    });
    const capsuleIssues = issues.filter(i =>
      i.labels.some(l => l.startsWith(CAPSULE_PREFIX)),
    );
    res.json(capsuleIssues.map(i => mapIssueToCapsule(i, id)));
  } catch (err) {
    req.log.error({ err }, "listCapsules GitHub error");
    res.status(502).json({ error: "Failed to load capsules from GitHub" });
  }
});

// POST /api/storyworlds/:id/capsules
router.post("/:id/capsules", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id = parseInt(parseParam(req.params["id"]), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid storyworld id" }); return; }

  const { title, type, roleTag, epiphanyNote } = req.body as Record<string, unknown>;
  if (typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title is required" }); return;
  }
  if (!["character", "arc", "event"].includes(String(type))) {
    res.status(400).json({ error: "type must be character, arc, or event" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  const capsuleType = String(type) as CapsuleType;
  const typeLabel = CAPSULE_TYPE_LABELS[capsuleType];

  try {
    const gh = getGitHubClient();

    // Ensure type labels exist on the repo (idempotent)
    const labelsToEnsure: EnsureLabelsEntry[] = Object.values(CAPSULE_TYPE_LABELS).map(l => ({
      name: l.name as string, color: l.color as string, description: l.description,
    }));
    if (roleTag && typeof roleTag === "string" && roleTag.trim()) {
      labelsToEnsure.push({
        name: `${ROLE_PREFIX}${roleTag.trim()}`,
        color: ROLE_COLOR,
        description: `Role: ${roleTag.trim()}`,
      });
    }
    await gh.ensureLabels(world.repoOwner, world.repoName, labelsToEnsure);

    const labels: string[] = [typeLabel.name];
    if (roleTag && typeof roleTag === "string" && roleTag.trim()) {
      labels.push(`${ROLE_PREFIX}${roleTag.trim()}`);
    }

    const issue = await gh.createIssue({
      owner:  world.repoOwner,
      repo:   world.repoName,
      title:  title.trim(),
      body:   typeof epiphanyNote === "string" ? epiphanyNote : undefined,
      labels,
    });

    res.status(201).json(mapIssueToCapsule(issue, id));
  } catch (err) {
    req.log.error({ err }, "createCapsule GitHub error");
    res.status(502).json({ error: "Failed to create capsule on GitHub" });
  }
});

// PATCH /api/storyworlds/:id/capsules/:capsuleId
router.patch("/:id/capsules/:capsuleId", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id        = parseInt(parseParam(req.params["id"]), 10);
  const capsuleId = parseCapsuleId(req.params["capsuleId"]);
  if (isNaN(id) || capsuleId === null) {
    res.status(400).json({ error: "Invalid storyworld or capsule id" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  const { title, roleTag, epiphanyNote } = req.body as Record<string, unknown>;

  try {
    const gh = getGitHubClient();

    // Fetch current issue to preserve existing type label
    const current = await gh.listIssues({
      owner: world.repoOwner,
      repo:  world.repoName,
      state: "open",
    }).then(issues => issues.find(i => i.number === capsuleId));

    if (!current) {
      res.status(404).json({ error: "Capsule not found" }); return;
    }

    // Authorization boundary: the target issue must be a capsule.
    // Without this check a steward could update any open issue in the repo.
    const typeLabels = current.labels.filter(l => l.startsWith(CAPSULE_PREFIX));
    if (typeLabels.length === 0) {
      res.status(404).json({ error: "Capsule not found" }); return;
    }

    // Build new label set: keep type label(s), replace role label
    const otherLabels = current.labels.filter(
      l => !l.startsWith(CAPSULE_PREFIX) && !l.startsWith(ROLE_PREFIX),
    );
    const newLabels = [...typeLabels, ...otherLabels];

    if (roleTag !== undefined) {
      if (roleTag && typeof roleTag === "string" && roleTag.trim()) {
        const roleName = `${ROLE_PREFIX}${String(roleTag).trim()}`;
        await gh.ensureLabels(world.repoOwner, world.repoName, [
          { name: roleName, color: ROLE_COLOR, description: `Role: ${roleTag}` },
        ]);
        newLabels.push(roleName);
      }
      // else roleTag is null/empty → role label removed
    } else {
      // Keep existing role label
      const existingRole = current.labels.find(l => l.startsWith(ROLE_PREFIX));
      if (existingRole) newLabels.push(existingRole);
    }

    const updated = await gh.updateIssue({
      owner:        world.repoOwner,
      repo:         world.repoName,
      issueNumber:  capsuleId,
      ...(title !== undefined && { title: String(title).trim() }),
      ...(epiphanyNote !== undefined && { body: epiphanyNote === null ? "" : String(epiphanyNote) }),
      labels: newLabels,
    });

    res.json(mapIssueToCapsule(updated, id));
  } catch (err) {
    req.log.error({ err }, "updateCapsule GitHub error");
    res.status(502).json({ error: "Failed to update capsule on GitHub" });
  }
});

// DELETE /api/storyworlds/:id/capsules/:capsuleId
router.delete("/:id/capsules/:capsuleId", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id        = parseInt(parseParam(req.params["id"]), 10);
  const capsuleId = parseCapsuleId(req.params["capsuleId"]);
  if (isNaN(id) || capsuleId === null) {
    res.status(400).json({ error: "Invalid storyworld or capsule id" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  try {
    const gh = getGitHubClient();

    // Fetch and verify the issue is a capsule before closing it.
    // Without this check a steward could close any open issue in the repo.
    const issues = await gh.listIssues({ owner: world.repoOwner, repo: world.repoName, state: "open" });
    const target = issues.find(i => i.number === capsuleId);
    if (!target || !target.labels.some(l => l.startsWith(CAPSULE_PREFIX))) {
      res.status(404).json({ error: "Capsule not found" }); return;
    }

    await gh.closeIssue({
      owner:       world.repoOwner,
      repo:        world.repoName,
      issueNumber: capsuleId,
    });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteCapsule GitHub error");
    res.status(502).json({ error: "Failed to archive capsule on GitHub" });
  }
});

export default router;
