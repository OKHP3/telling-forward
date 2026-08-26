import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  moderationCasesTable,
  moderationEventsTable,
  storyworldModerationControlsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireStewardFor, requireStewardForStoryworld } from "../middlewares/steward";

const router: IRouter = Router();
const subjectKinds = new Set(["proposal", "contribution", "capsule", "reaction", "theory", "account"]);
const reasons = new Set(["spam", "harassment", "nsfw", "plagiarism-review", "rights-concern", "safety", "other"]);
const statuses = new Set(["open", "triaged", "awaiting-steward", "resolved", "dismissed", "appealed"]);
const visibility = new Set(["none", "hold", "restricted", "muted", "blocked"]);
function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function requireStewardForCase(req: any, res: any, next: any) {
  const caseId = routeParam(req.params.caseId);
  const rows = await db.select({ storyworldId: moderationCasesTable.storyworldId })
    .from(moderationCasesTable).where(eq(moderationCasesTable.id, caseId)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Moderation case not found" }); return; }
  return requireStewardFor(req, res, next, rows[0].storyworldId);
}

router.get("/storyworlds/:id/moderation/cases", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const storyworldId = Number(req.params.id);
  try {
    const cases = await db.select().from(moderationCasesTable)
      .where(eq(moderationCasesTable.storyworldId, storyworldId))
      .orderBy(desc(moderationCasesTable.openedAt));
    const events = cases.length
      ? await db.select().from(moderationEventsTable)
          .where(inArray(moderationEventsTable.caseId, cases.map((item) => item.id)))
          .orderBy(desc(moderationEventsTable.createdAt))
      : [];
    res.json(cases.map((item) => ({ ...item, events: events.filter((event) => event.caseId === item.id) })));
  } catch (err) {
    req.log.error({ err }, "moderation cases list failed");
    res.status(500).json({ error: "Failed to load moderation cases" });
  }
});

router.post("/storyworlds/:id/moderation/cases", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const storyworldId = Number(req.params.id);
  const body = req.body ?? {};
  if (!subjectKinds.has(body.subjectKind) || typeof body.subjectReference !== "string" ||
      !body.subjectReference.trim() || !reasons.has(body.primaryReasonCode)) {
    res.status(400).json({ error: "A subject, reference, and valid reason are required" }); return;
  }
  try {
    const created = await db.transaction(async (tx) => {
      const [createdCase] = await tx.insert(moderationCasesTable).values({
        storyworldId,
        subjectKind: body.subjectKind,
        subjectReference: body.subjectReference.trim(),
        openedByUserId: req.session.userId,
        assignedStewardId: null,
        primaryReasonCode: body.primaryReasonCode,
        contributorMessage: typeof body.contributorMessage === "string" ? body.contributorMessage.trim() || null : null,
        visibilityAction: visibility.has(body.visibilityAction) ? body.visibilityAction : "none",
      }).returning();
      if (!createdCase) throw new Error("Moderation case was not created");

      await tx.insert(moderationEventsTable).values({
        caseId: createdCase.id,
        actorUserId: req.session.userId,
        eventType: "case-opened",
        reasonCode: body.primaryReasonCode,
        privateNote: typeof body.privateNote === "string" ? body.privateNote.trim() || null : null,
        evidenceReference: typeof body.evidenceReference === "string" ? body.evidenceReference.trim() || null : null,
      });
      return createdCase;
    });
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "moderation case creation failed");
    res.status(500).json({ error: "Failed to create moderation case" });
  }
});

router.post("/moderation/cases/:caseId/events", requireAuth, requireStewardForCase, async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.eventType !== "string" || !body.eventType.trim()) {
    res.status(400).json({ error: "Event type is required" }); return;
  }
  try {
    const [event] = await db.insert(moderationEventsTable).values({
      caseId: routeParam(req.params.caseId),
      actorUserId: req.session.userId,
      eventType: body.eventType.trim(),
      reasonCode: reasons.has(body.reasonCode) ? body.reasonCode : null,
      privateNote: typeof body.privateNote === "string" ? body.privateNote.trim() || null : null,
      evidenceReference: typeof body.evidenceReference === "string" ? body.evidenceReference.trim() || null : null,
    }).returning();
    res.status(201).json(event);
  } catch (err) {
    req.log.error({ err }, "moderation event creation failed");
    res.status(500).json({ error: "Failed to record moderation event" });
  }
});

router.post("/moderation/cases/:caseId/action", requireAuth, requireStewardForCase, async (req, res) => {
  const body = req.body ?? {};
  if (!statuses.has(body.status) || !visibility.has(body.visibilityAction)) {
    res.status(400).json({ error: "Invalid moderation outcome" }); return;
  }
  try {
    const updated = await db.transaction(async (tx) => {
      const [caseRecord] = await tx.update(moderationCasesTable).set({
        status: body.status,
        visibilityAction: body.visibilityAction,
        resolvedAt: ["resolved", "dismissed"].includes(body.status) ? new Date() : null,
        contributorMessage: typeof body.contributorMessage === "string" ? body.contributorMessage.trim() || null : undefined,
      }).where(eq(moderationCasesTable.id, routeParam(req.params.caseId))).returning();
      if (!caseRecord) return null;

      await tx.insert(moderationEventsTable).values({
        caseId: caseRecord.id,
        actorUserId: req.session.userId,
        eventType: `case-${body.status}`,
        reasonCode: reasons.has(body.reasonCode) ? body.reasonCode : null,
        privateNote: typeof body.privateNote === "string" ? body.privateNote.trim() || null : null,
        evidenceReference: typeof body.evidenceReference === "string" ? body.evidenceReference.trim() || null : null,
      });
      return caseRecord;
    });
    if (!updated) { res.status(404).json({ error: "Moderation case not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "moderation action failed");
    res.status(500).json({ error: "Failed to apply moderation outcome" });
  }
});

router.get("/storyworlds/:id/moderation/controls", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const controls = await db.select().from(storyworldModerationControlsTable)
    .where(eq(storyworldModerationControlsTable.storyworldId, Number(req.params.id)));
  res.json(controls);
});

router.post("/storyworlds/:id/moderation/controls", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const actorUserId = req.session.userId;
  if (!actorUserId) { res.status(401).json({ error: "Authentication required" }); return; }
  const body = req.body ?? {};
  if (!Number.isSafeInteger(body.subjectUserId) || !["mute", "block"].includes(body.controlKind) ||
      !["reaction", "theory", "submission", "contact", "all-contributions"].includes(body.appliesTo) ||
      !reasons.has(body.reasonCode)) {
    res.status(400).json({ error: "A valid user, control, scope, and reason are required" }); return;
  }
  const [control] = await db.insert(storyworldModerationControlsTable).values({
    storyworldId: Number(req.params.id), subjectUserId: body.subjectUserId,
    controlKind: body.controlKind, appliesTo: body.appliesTo, reasonCode: body.reasonCode,
    imposedByUserId: actorUserId,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
  }).returning();
  res.status(201).json(control);
});

router.post("/storyworlds/:id/moderation/batch-dismiss", requireAuth, requireStewardForStoryworld, async (req, res) => {
  const storyworldId = Number(req.params.id);
  const ids = Array.isArray(req.body?.caseIds) ? req.body.caseIds.filter((id: unknown): id is string => typeof id === "string") : [];
  if (!ids.length || ids.length > 50 || req.body?.reasonCode !== "spam") {
    res.status(400).json({ error: "Batch dismissal is limited to up to 50 homogeneous spam cases" }); return;
  }
  const cases = await db.select().from(moderationCasesTable).where(and(
    eq(moderationCasesTable.storyworldId, storyworldId),
    inArray(moderationCasesTable.id, ids),
  ));
  if (cases.length !== ids.length || cases.some((item) => item.status !== "open" || item.primaryReasonCode !== "spam")) {
    res.status(409).json({ error: "Every selected case must still be an open spam case in this storyworld" }); return;
  }
  if (req.body?.confirm !== true) {
    res.json({ preview: true, count: cases.length, caseIds: cases.map((item) => item.id), resultingStatus: "dismissed" }); return;
  }
  try {
    await db.transaction(async (tx) => {
      await tx.update(moderationCasesTable).set({
        status: "dismissed",
        resolvedAt: new Date(),
        visibilityAction: "none",
      }).where(inArray(moderationCasesTable.id, ids));
      await tx.insert(moderationEventsTable).values(cases.map((item) => ({
        caseId: item.id,
        actorUserId: req.session.userId,
        eventType: "batch-dismissed",
        reasonCode: "spam" as const,
        privateNote: "Homogeneous low-risk spam batch review",
        evidenceReference: null,
      })));
    });
    res.json({ preview: false, count: cases.length, caseIds: cases.map((item) => item.id), resultingStatus: "dismissed" });
  } catch (err) {
    req.log.error({ err, storyworldId, caseCount: cases.length }, "moderation batch dismissal failed");
    res.status(500).json({ error: "Failed to dismiss moderation cases" });
  }
});

router.post("/moderation/controls/:controlId/lift", requireAuth, async (req, res, next) => {
  const rows = await db.select({ storyworldId: storyworldModerationControlsTable.storyworldId })
    .from(storyworldModerationControlsTable).where(eq(storyworldModerationControlsTable.id, routeParam(req.params.controlId))).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Moderation control not found" }); return; }
  return requireStewardFor(req, res, next, rows[0].storyworldId);
}, async (req, res) => {
  const [control] = await db.update(storyworldModerationControlsTable)
    .set({ liftedAt: new Date() }).where(eq(storyworldModerationControlsTable.id, routeParam(req.params.controlId))).returning();
  res.json(control);
});

export default router;