import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  consentRecordsTable,
  contributorsTable,
  db,
  storyworldsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const POLICY_DOCUMENT_REF = "docs/decisions/consent-ladder-design.md";
const POLICY_VERSION = "private-pilot-v1";
const POLICY_HASH = "consent-ladder-design:private-pilot-v1";
const ACTIONS = new Set([
  "read",
  "react",
  "submit-theory",
  "submit-branch",
  "license-for-display",
  "submit-for-canon-review",
  "ai-assisted-draft",
]);

export async function hasActiveConsent(
  userId: number,
  consentRecordId: string | undefined,
  storyworldId: number,
  actionType: string,
): Promise<boolean> {
  if (!consentRecordId) return false;
  const [record] = await db
    .select({ id: consentRecordsTable.id })
    .from(consentRecordsTable)
    .where(
      and(
        eq(consentRecordsTable.id, consentRecordId),
        eq(consentRecordsTable.subjectUserId, userId),
        eq(consentRecordsTable.storyworldId, storyworldId),
        eq(consentRecordsTable.actionType, actionType),
        eq(consentRecordsTable.status, "granted"),
      ),
    )
    .limit(1);
  return Boolean(record);
}

function publicRecord(record: typeof consentRecordsTable.$inferSelect) {
  return {
    id: record.id,
    storyworldId: record.storyworldId,
    actionType: record.actionType,
    scopeKind: record.scopeKind,
    scopeReference: record.scopeReference,
    status: record.status,
    policyDocumentRef: record.policyDocumentRef,
    policyVersion: record.policyVersion,
    recordedAt: record.recordedAt,
    effectiveAt: record.effectiveAt,
    revokedAt: record.revokedAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const records = await db
      .select()
      .from(consentRecordsTable)
      .where(eq(consentRecordsTable.subjectUserId, userId))
      .orderBy(desc(consentRecordsTable.recordedAt));
    const latest = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      const key = `${record.storyworldId ?? "account"}:${record.actionType}:${record.scopeKind}:${record.scopeReference ?? ""}`;
      if (!latest.has(key)) latest.set(key, record);
    }
    res.json([...latest.values()].filter((record) => record.status === "granted").map(publicRecord));
  } catch (err) {
    req.log.error({ err }, "list consents DB error");
    res.status(500).json({ error: "Failed to load consent settings" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const { actionType, storyworldId, scopeKind = "storyworld", scopeReference } =
    req.body ?? {};
  if (actionType === "cie-pie-derivative") {
    res.status(403).json({ error: "CIE/PIE derivative consent is not available" });
    return;
  }
  if (typeof actionType !== "string" || !ACTIONS.has(actionType)) {
    res.status(400).json({ error: "Unsupported consent action" });
    return;
  }
  if (!Number.isSafeInteger(storyworldId) || storyworldId <= 0) {
    res.status(400).json({ error: "A storyworld is required for this permission" });
    return;
  }
  if (typeof scopeKind !== "string" || (scopeKind !== "storyworld" && !scopeReference)) {
    res.status(400).json({ error: "This permission requires a resource scope" });
    return;
  }
  try {
    const [world] = await db
      .select({ id: storyworldsTable.id })
      .from(storyworldsTable)
      .where(eq(storyworldsTable.id, storyworldId))
      .limit(1);
    if (!world) {
      res.status(404).json({ error: "Storyworld not found" });
      return;
    }
    const [contributor] = await db
      .select({ id: contributorsTable.id })
      .from(contributorsTable)
      .where(eq(contributorsTable.platformIdentity, `platform:${userId}`))
      .limit(1);
    const [record] = await db
      .insert(consentRecordsTable)
      .values({
        subjectUserId: userId,
        contributorId: contributor?.id,
        storyworldId,
        actionType,
        scopeKind,
        scopeReference,
        status: "granted",
        policyDocumentRef: POLICY_DOCUMENT_REF,
        policyVersion: POLICY_VERSION,
        policyHash: POLICY_HASH,
        recordedVia: "consent-settings",
        requestId: req.get("x-request-id") ?? undefined,
      })
      .returning();
    res.status(201).json(publicRecord(record!));
  } catch (err) {
    req.log.error({ err }, "grant consent DB error");
    res.status(500).json({ error: "Failed to save consent" });
  }
});

router.post("/:id/revoke", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const recordId = req.params.id;
  try {
    const [record] = await db
      .select()
      .from(consentRecordsTable)
      .where(
        and(
          eq(consentRecordsTable.id, recordId),
          eq(consentRecordsTable.subjectUserId, userId),
        ),
      )
      .limit(1);
    if (!record || record.status !== "granted") {
      res.status(404).json({ error: "Active consent not found" });
      return;
    }
    const [revoked] = await db
      .insert(consentRecordsTable)
      .values({
        subjectUserId: userId,
        contributorId: record.contributorId,
        storyworldId: record.storyworldId,
        actionType: record.actionType,
        scopeKind: record.scopeKind,
        scopeReference: record.scopeReference,
        status: "revoked",
        policyDocumentRef: record.policyDocumentRef,
        policyVersion: record.policyVersion,
        policyHash: record.policyHash,
        revokedAt: new Date(),
        supersedesConsentId: record.id,
        recordedVia: "consent-settings",
        requestId: req.get("x-request-id") ?? undefined,
      })
      .returning();
    res.json(publicRecord(revoked!));
  } catch (err) {
    req.log.error({ err }, "revoke consent DB error");
    res.status(500).json({ error: "Failed to revoke consent" });
  }
});

export default router;