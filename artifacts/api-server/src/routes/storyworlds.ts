import { Router, type IRouter } from "express";
import { eq, and, asc, count, desc, inArray } from "drizzle-orm";
import {
  db,
  storyworldsTable,
  storyPathsTable,
  contributionsTable,
  contributionPathMembershipsTable,
  contributorsTable,
  proposalsTable,
  provenanceRecordsTable,
  stewardsTable,
  usersTable,
} from "@workspace/db";
import {
  GetStoryworldParams,
  ListStoryPathsParams,
  ListContributionsParams,
  ListStoryworldProposalsParams,
  CreateContributionBody,
  CreateContributionParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { requireStewardForStoryworld } from "../middlewares/steward";
import { getGitHubClient, type GitHubIssue, type EnsureLabelsEntry } from "../lib/github";
import {
  buildNarrationCommitMessage,
  parseNarrationCommit,
} from "../lib/provenance";
import { openai } from "@workspace/integrations-openai-ai-server";

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
const RUNG_PREFIX    = "rung:";
const RUNG_COLOR     = "566272";

function mapIssueToCapsule(issue: GitHubIssue, storyworldId: number) {
  const typeRaw = issue.labels.find(l => l.startsWith(CAPSULE_PREFIX))
    ?.slice(CAPSULE_PREFIX.length) ?? "character";
  const type: CapsuleType = (["character", "arc", "event"] as const).includes(typeRaw as CapsuleType)
    ? (typeRaw as CapsuleType)
    : "character";
  const roleRaw = issue.labels.find(l => l.startsWith(ROLE_PREFIX));
  const rungRaw = issue.labels.find(l => l.startsWith(RUNG_PREFIX));
  const rungVal = rungRaw ? parseInt(rungRaw.slice(RUNG_PREFIX.length), 10) : null;
  return {
    id:           issue.number,
    storyworldId,
    title:        issue.title,
    type,
    roleTag:      roleRaw ? roleRaw.slice(ROLE_PREFIX.length) : null,
    epiphanyNote: issue.body ?? null,
    maturity:     (rungVal !== null && !isNaN(rungVal) && rungVal >= 0 && rungVal <= 10) ? rungVal : null,
    createdAt:    issue.createdAt,
    updatedAt:    issue.updatedAt,
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
      .select({
        id: storyworldsTable.id,
        repoOwner: storyworldsTable.repoOwner,
        repoName: storyworldsTable.repoName,
        title: storyworldsTable.title,
        stewardId: storyworldsTable.stewardId,
        canonBranchRef: storyworldsTable.canonBranchRef,
        seed: storyworldsTable.seed,
        readerTheme: storyworldsTable.readerTheme,
        createdAt: storyworldsTable.createdAt,
        updatedAt: storyworldsTable.updatedAt,
        pathCount: count(storyPathsTable.id).mapWith(Number),
      })
      .from(storyworldsTable)
      .leftJoin(
        storyPathsTable,
        eq(storyPathsTable.storyworldId, storyworldsTable.id),
      )
      .groupBy(storyworldsTable.id)
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
      .select({
        id: storyworldsTable.id,
        repoOwner: storyworldsTable.repoOwner,
        repoName: storyworldsTable.repoName,
        title: storyworldsTable.title,
        stewardId: storyworldsTable.stewardId,
        canonBranchRef: storyworldsTable.canonBranchRef,
        seed: storyworldsTable.seed,
        readerTheme: storyworldsTable.readerTheme,
        createdAt: storyworldsTable.createdAt,
        updatedAt: storyworldsTable.updatedAt,
        pathCount: count(storyPathsTable.id).mapWith(Number),
      })
      .from(storyworldsTable)
      .leftJoin(
        storyPathsTable,
        eq(storyPathsTable.storyworldId, storyworldsTable.id),
      )
      .where(eq(storyworldsTable.id, params.data.id))
      .groupBy(storyworldsTable.id)
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
      .select({
        id: contributionsTable.id,
        storyworldId: contributionsTable.storyworldId,
        pathId: contributionsTable.pathId,
        commitSha: contributionsTable.commitSha,
        contributorId: contributionsTable.contributorId,
        title: contributionsTable.title,
        summary: contributionsTable.summary,
        agentAssisted: contributionsTable.agentAssisted,
        createdAt: contributionsTable.createdAt,
        contributorDisplayName: contributorsTable.displayName,
      })
      .from(contributionPathMembershipsTable)
      .innerJoin(
        contributionsTable,
        eq(
          contributionPathMembershipsTable.contributionId,
          contributionsTable.id,
        ),
      )
      .leftJoin(
        contributorsTable,
        eq(contributionsTable.contributorId, contributorsTable.id),
      )
      .where(
        and(
          eq(contributionsTable.storyworldId, params.data.id),
          eq(contributionPathMembershipsTable.pathId, params.data.pathId),
        ),
      )
      .orderBy(asc(contributionsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listContributions DB error");
    res.status(500).json({ error: "Failed to load contributions" });
  }
});

// POST /api/storyworlds/:id/paths/:pathId/contributions
// Authenticated contributors submit a narrated scene to an open path.
router.post(
  "/:id/paths/:pathId/contributions",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateContributionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid storyworld or path id" });
      return;
    }

    const body = CreateContributionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { id: storyworldId, pathId } = params.data;
    const { title, content, submissionId } = body.data;

    try {
      const [world] = await db
        .select({
          repoOwner: storyworldsTable.repoOwner,
          repoName: storyworldsTable.repoName,
        })
        .from(storyworldsTable)
        .where(eq(storyworldsTable.id, storyworldId))
        .limit(1);

      if (!world) {
        res.status(404).json({ error: "Storyworld not found" });
        return;
      }

      const [path] = await db
        .select({
          id: storyPathsTable.id,
          storyworldId: storyPathsTable.storyworldId,
          branchRef: storyPathsTable.branchRef,
          state: storyPathsTable.state,
        })
        .from(storyPathsTable)
        .where(
          and(
            eq(storyPathsTable.id, pathId),
            eq(storyPathsTable.storyworldId, storyworldId),
          ),
        )
        .limit(1);

      if (!path) {
        res.status(404).json({ error: "Story path not found" });
        return;
      }
      if (path.state !== "open") {
        res.status(409).json({ error: "This story path is not open for contributions" });
        return;
      }

      const [user] = await db
        .select({
          displayName: usersTable.displayName,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user) {
        res.status(401).json({ error: "Session refers to a deleted account" });
        return;
      }

      // Platform service identity used for ALL Git commit author/committer fields.
      // Real user attribution stays in Postgres (contributors table) only.
      // Never put a user's login email into commit metadata — it is durable and
      // public. A linked GitHub identity (optional, future) is the only approved
      // path for first-party attribution in Git history.
      const PLATFORM_GIT_AUTHOR_NAME =
        process.env["PLATFORM_GIT_AUTHOR_NAME"] ?? "Telling Forward";
      const PLATFORM_GIT_AUTHOR_EMAIL =
        process.env["PLATFORM_GIT_AUTHOR_EMAIL"] ??
        "noreply@tellingforward.app";

      // The mobile client retains this UUID while retrying. It is embedded in
      // the Git commit trailer and filename, allowing a retry (or
      // reconciliation) to reuse the same durable commit after an index write
      // fails instead of creating a duplicate scene.
      const platformIdentity = `platform:${userId}`;
      let commitSha: string;
      const gh = getGitHubClient();
      try {
        const existingCommit = (
          await gh.listCommitsForBranch(
            world.repoOwner,
            world.repoName,
            path.branchRef,
          )
        ).find(
          (commit) =>
            parseNarrationCommit(commit.message)?.submissionId === submissionId,
        );
        if (existingCommit) {
          const metadata = parseNarrationCommit(existingCommit.message);
          if (
            !metadata ||
            metadata.platformIdentity !== platformIdentity ||
            metadata.title !== title
          ) {
            res.status(409).json({
              error: "This submission id already belongs to a different narration",
            });
            return;
          }
          const committedContent = await gh.getFileContent(
            world.repoOwner,
            world.repoName,
            `narrations/${submissionId}.md`,
            existingCommit.sha,
          );
          if (committedContent !== `# ${title}\n\n${content}\n`) {
            res.status(409).json({
              error: "This submission id already belongs to a different narration",
            });
            return;
          }
          commitSha = existingCommit.sha;
        } else {
          commitSha = await gh.createCommit({
            owner: world.repoOwner,
            repo: world.repoName,
            branch: path.branchRef,
            files: {
              [`narrations/${submissionId}.md`]: `# ${title}\n\n${content}\n`,
            },
            message: buildNarrationCommitMessage({
              submissionId,
              platformIdentity,
              title,
              displayName: user.displayName,
            }),
            authorName: PLATFORM_GIT_AUTHOR_NAME,
            authorEmail: PLATFORM_GIT_AUTHOR_EMAIL,
          });
        }
      } catch (err) {
        req.log.error(
          { err, storyworldId, pathId },
          "createContribution GitHub sync error",
        );
        res.status(502).json({ error: "Failed to save narration to GitHub" });
        return;
      }

      // Every Postgres row that makes the commit visible in the app is written
      // as one transaction. If this fails after GitHub has accepted the
      // commit, the retry/reconciliation path above can recover it by
      // Submission-Id without producing a second commit.
      const contribution = await db.transaction(async (tx) => {
        const [contributor] = await tx
          .insert(contributorsTable)
          .values({
            displayName: user.displayName,
            platformIdentity,
            githubIdentity: null,
          })
          .onConflictDoUpdate({
            target: contributorsTable.platformIdentity,
            set: { displayName: user.displayName },
          })
          .returning({ id: contributorsTable.id });
        if (!contributor) throw new Error("Failed to create contributor record");

        const [indexed] = await tx
          .insert(contributionsTable)
          .values({
            storyworldId,
            pathId,
            commitSha,
            contributorId: contributor.id,
            title,
            summary: content,
            agentAssisted: false,
          })
          .onConflictDoUpdate({
            target: [
              contributionsTable.storyworldId,
              contributionsTable.commitSha,
            ],
            set: {
              contributorId: contributor.id,
              title,
              summary: content,
              agentAssisted: false,
            },
          })
          .returning();
        if (!indexed) throw new Error("Failed to index contribution");

        await tx
          .insert(contributionPathMembershipsTable)
          .values({ contributionId: indexed.id, pathId })
          .onConflictDoNothing();
        return indexed;
      });

      res.status(201).json({
        ...contribution,
        contributorDisplayName: user.displayName,
      });
    } catch (err) {
      req.log.error({ err, storyworldId, pathId }, "createContribution DB error");
      res.status(500).json({ error: "Failed to save contribution" });
    }
  },
);

// GET /api/storyworlds/:id/provenance
// Public, reader-facing lineage for moments a steward accepted into canon.
// Deliberately returns product language only; GitHub-native mechanics remain
// the durable implementation source, not reader-facing vocabulary.
router.get("/:id/provenance", async (req, res) => {
  const params = GetStoryworldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }

  try {
    const records = await db
      .select({
        id: provenanceRecordsTable.id,
        storyworldId: provenanceRecordsTable.storyworldId,
        sourcePathId: provenanceRecordsTable.sourcePathId,
        sourcePathTitle: storyPathsTable.title,
        contributorIds: provenanceRecordsTable.contributorIds,
        contributorIdentities: provenanceRecordsTable.contributorIdentities,
        stewardId: provenanceRecordsTable.stewardId,
        stewardGithubIdentity: provenanceRecordsTable.stewardGithubIdentity,
        decision: provenanceRecordsTable.decision,
        decidedAt: provenanceRecordsTable.decidedAt,
      })
      .from(provenanceRecordsTable)
      .leftJoin(
        storyPathsTable,
        eq(provenanceRecordsTable.sourcePathId, storyPathsTable.id),
      )
      .where(eq(provenanceRecordsTable.storyworldId, params.data.id))
      .orderBy(desc(provenanceRecordsTable.decidedAt));

    const contributorIds = [
      ...new Set(records.flatMap((record) => record.contributorIds)),
    ];
    const contributors = contributorIds.length
      ? await db
          .select({
            id: contributorsTable.id,
            displayName: contributorsTable.displayName,
            githubIdentity: contributorsTable.githubIdentity,
          })
          .from(contributorsTable)
          .where(inArray(contributorsTable.id, contributorIds))
      : [];
    const contributorNames = new Map(
      contributors.map((contributor) => [
        contributor.id,
        contributor.displayName,
      ]),
    );
    const contributorNamesByIdentity = new Map(
      contributors
        .filter(
          (contributor): contributor is typeof contributor & {
            githubIdentity: string;
          } => contributor.githubIdentity !== null,
        )
        .map((contributor) => [
          contributor.githubIdentity,
          contributor.displayName,
        ]),
    );

    const stewardIds = [
      ...new Set(
        records
          .map((record) => record.stewardId)
          .filter((id): id is number => id !== null),
      ),
    ];
    const stewards = stewardIds.length
      ? await db
          .select({
            id: stewardsTable.id,
            displayName: usersTable.displayName,
          })
          .from(stewardsTable)
          .innerJoin(usersTable, eq(stewardsTable.userId, usersTable.id))
          .where(inArray(stewardsTable.id, stewardIds))
      : [];
    const stewardNames = new Map(
      stewards.map((steward) => [steward.id, steward.displayName]),
    );

    res.json(
      records.map((record) => ({
        id: record.id,
        storyworldId: record.storyworldId,
        sourcePathId: record.sourcePathId,
        sourcePathTitle: record.sourcePathTitle ?? "A story path",
        contributorNames: record.contributorIds
          .map((id) => contributorNames.get(id))
          .filter((name): name is string => Boolean(name)),
        // An older rebuilt record can have identities before a contributor row
        // is indexed. Show a readable identity rather than a numeric placeholder.
        contributorIdentityFallbacks: record.contributorIdentities
          .filter((identity) => !contributorNamesByIdentity.has(identity))
          .map((identity) => identity.replace(/^(github:|git-email:|git-name:)/, "")),
        stewardName:
          (record.stewardId
            ? stewardNames.get(record.stewardId)
            : null) ??
          record.stewardGithubIdentity?.replace(/^github:/, "") ??
          null,
        decision: "Accepted into canon",
        acceptedAt: record.decidedAt,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "listProvenance DB error");
    res.status(500).json({ error: "Failed to load story lineage" });
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

  const { title, roleTag, epiphanyNote, maturity } = req.body as Record<string, unknown>;

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

    // Build new label set: keep type labels; rebuild role and rung separately
    const otherLabels = current.labels.filter(
      l => !l.startsWith(CAPSULE_PREFIX) && !l.startsWith(ROLE_PREFIX) && !l.startsWith(RUNG_PREFIX),
    );
    const newLabels = [...typeLabels, ...otherLabels];

    // Role label
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

    // Rung (maturity) label
    if (maturity !== undefined && maturity !== null && !isNaN(Number(maturity))) {
      const rungValue = Math.min(10, Math.max(0, Math.floor(Number(maturity))));
      const rungName  = `${RUNG_PREFIX}${rungValue}`;
      await gh.ensureLabels(world.repoOwner, world.repoName, [
        { name: rungName, color: RUNG_COLOR, description: `Maturity rung ${rungValue}` },
      ]);
      newLabels.push(rungName);
    } else if (maturity === undefined) {
      // Not in patch body → preserve existing rung label
      const existingRung = current.labels.find(l => l.startsWith(RUNG_PREFIX));
      if (existingRung) newLabels.push(existingRung);
    }
    // maturity === null → rung label cleared (no push)

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

// ---------------------------------------------------------------------------
// Capsule maturation + inversion actions (PME/CIE/PIE/CME layer)
// ---------------------------------------------------------------------------

/**
 * Resolve a capsule issue from the repo; returns null if not found or not a capsule.
 */
async function resolveCapsule(
  owner: string,
  repo:  string,
  capsuleId: number,
  storyworldId: number,
) {
  const gh = getGitHubClient();
  const issues = await gh.listIssues({ owner, repo, state: "open" });
  const issue  = issues.find(i => i.number === capsuleId);
  if (!issue || !issue.labels.some(l => l.startsWith(CAPSULE_PREFIX))) return null;
  return mapIssueToCapsule(issue, storyworldId);
}

// POST /api/storyworlds/:id/capsules/:capsuleId/promote
// Maturation (PME): stream an agent-assisted scene draft via SSE.
router.post("/:id/capsules/:capsuleId/promote", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id        = parseInt(parseParam(req.params["id"]), 10);
  const capsuleId = parseCapsuleId(req.params["capsuleId"]);
  if (isNaN(id) || capsuleId === null) {
    res.status(400).json({ error: "Invalid storyworld or capsule id" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  const capsule = await resolveCapsule(world.repoOwner, world.repoName, capsuleId, id);
  if (!capsule) { res.status(404).json({ error: "Capsule not found" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a scene writer for a collaborative fiction storyworld. \
Write vivid, literary prose in third-person limited perspective. \
The scene should open with a concrete sensory image, build to a moment of meaningful action or revelation, \
and close on an unresolved beat that invites continuation. \
Do not include a title, section headers, or any meta-commentary — produce only narrative prose.`,
        },
        {
          role: "user",
          content: `Write an opening scene featuring this capsule from the storyworld:

**${capsule.title}** (${capsule.type}${capsule.roleTag ? ` · ${capsule.roleTag}` : ""})

${capsule.epiphanyNote
  ? `Epiphany note:\n${capsule.epiphanyNote}`
  : "No epiphany note — lean on the name and type to inspire the scene."}

Begin the scene now.`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "promoteCapsule OpenAI error");
    if (!res.headersSent) {
      res.status(502).json({ error: "Failed to generate scene draft" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Generation interrupted" })}\n\n`);
      res.end();
    }
  }
});

// POST /api/storyworlds/:id/capsules/:capsuleId/disrupt
// Prose-level inversion (PIE): divergent variant capsule from an accepted scene.
router.post("/:id/capsules/:capsuleId/disrupt", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id        = parseInt(parseParam(req.params["id"]), 10);
  const capsuleId = parseCapsuleId(req.params["capsuleId"]);
  if (isNaN(id) || capsuleId === null) {
    res.status(400).json({ error: "Invalid storyworld or capsule id" }); return;
  }

  const { sourceText } = req.body as Record<string, unknown>;
  if (typeof sourceText !== "string" || !sourceText.trim()) {
    res.status(400).json({ error: "sourceText is required" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  const capsule = await resolveCapsule(world.repoOwner, world.repoName, capsuleId, id);
  if (!capsule) { res.status(404).json({ error: "Capsule not found" }); return; }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a disruptive fiction editor. Given a scene and its capsule context, \
produce the seed of a deliberately discontinuous alternate path.
The output must NOT summarize or recapitulate the source — it must diverge: \
introduce a different opening image, a character acting against their stated role, \
or an event that invalidates the scene's premise.
Return a JSON object with exactly three fields:
  "title": a short punchy name for the new divergent capsule
  "type": one of "character", "arc", or "event" — what kind of capsule this disruption seeds
  "epiphanyNote": 2–4 sentences of raw, vivid insight about this divergent direction
Return ONLY the JSON object. No markdown fences, no explanation.`,
        },
        {
          role: "user",
          content: `Source capsule: **${capsule.title}** \
(${capsule.type}${capsule.roleTag ? ` · ${capsule.roleTag}` : ""})
${capsule.epiphanyNote ? `\nCapsule notes: ${capsule.epiphanyNote}` : ""}

Accepted scene to disrupt:
---
${sourceText.trim().slice(0, 3000)}
---

Generate the disruption capsule.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: { title?: unknown; type?: unknown; epiphanyNote?: unknown };
    try { parsed = JSON.parse(raw); }
    catch { res.status(502).json({ error: "AI returned unexpected format" }); return; }

    const validTypes = ["character", "arc", "event"];
    const type = validTypes.includes(String(parsed.type)) ? parsed.type : "event";
    res.json({
      title:        String(parsed.title ?? "Disrupted Path"),
      type:         type as "character" | "arc" | "event",
      epiphanyNote: String(parsed.epiphanyNote ?? ""),
    });
  } catch (err) {
    req.log.error({ err }, "disruptCapsule OpenAI error");
    res.status(502).json({ error: "Failed to generate disruption" });
  }
});

// POST /api/storyworlds/:id/capsules/:capsuleId/invert
// Concept-level inversion (CIE): symbolic shadow of a capsule.
router.post("/:id/capsules/:capsuleId/invert", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const id        = parseInt(parseParam(req.params["id"]), 10);
  const capsuleId = parseCapsuleId(req.params["capsuleId"]);
  if (isNaN(id) || capsuleId === null) {
    res.status(400).json({ error: "Invalid storyworld or capsule id" }); return;
  }

  const world = await getStoryworldRepo(id);
  if (!world) { res.status(404).json({ error: "Storyworld not found" }); return; }

  const capsule = await resolveCapsule(world.repoOwner, world.repoName, capsuleId, id);
  if (!capsule) { res.status(404).json({ error: "Capsule not found" }); return; }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a structural fiction analyst. Given a capsule (character, arc, or event), \
produce its symbolic inversion — not its simple opposite, but its shadow: \
the version that mirrors its structure while reversing its purpose or charge.
Return a JSON object with exactly three fields:
  "title": the name of the inverted concept (a true shadow, not a simple antonym)
  "type": same type as the original capsule ("character", "arc", or "event")
  "epiphanyNote": 2–3 sentences capturing what makes this inversion generatively interesting
Return ONLY the JSON object. No markdown fences, no explanation.`,
        },
        {
          role: "user",
          content: `Capsule to invert: **${capsule.title}**
Type: ${capsule.type}${capsule.roleTag ? ` · role: ${capsule.roleTag}` : ""}
${capsule.epiphanyNote ? `\nNotes: ${capsule.epiphanyNote}` : ""}

Generate the symbolic inversion.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: { title?: unknown; type?: unknown; epiphanyNote?: unknown };
    try { parsed = JSON.parse(raw); }
    catch { res.status(502).json({ error: "AI returned unexpected format" }); return; }

    const validTypes = ["character", "arc", "event"];
    const type = validTypes.includes(String(parsed.type)) ? parsed.type : capsule.type;
    res.json({
      title:        String(parsed.title ?? "Inverted Capsule"),
      type:         type as "character" | "arc" | "event",
      epiphanyNote: String(parsed.epiphanyNote ?? ""),
    });
  } catch (err) {
    req.log.error({ err }, "invertCapsule OpenAI error");
    res.status(502).json({ error: "Failed to generate inversion" });
  }
});

export default router;
