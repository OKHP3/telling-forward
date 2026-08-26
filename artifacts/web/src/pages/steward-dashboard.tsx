/**
 * Steward Dashboard — /worlds/:worldId/steward
 *
 * Lists all proposals for a storyworld with inline accept / return / review
 * actions. Accessible only to authenticated stewards; the API enforces this
 * boundary (401/403) independently of the UI gate.
 */

import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetStoryworld,
  getGetStoryworldQueryKey,
  getListStoryworldsQueryKey,
  useListStoryworldProposals,
  getListStoryworldProposalsQueryKey,
  useListWebhookDeliveryEvidence,
  getListWebhookDeliveryEvidenceQueryKey,
  useUpdateStoryworld,
  useMarkProposalUnderReview,
  useAcceptProposal,
  useReturnProposal,
  useRestrictProposal,
  useArchiveProposal,
  type StewardProposal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  BookOpen,
  Eye,
  Clock,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Check,
  Save,
  RefreshCw,
  GitBranch,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProposalState =
  | "draft"
  | "submitted"
  | "under-review"
  | "returned-with-notes"
  | "accepted-into-canon"
  | "published-alternate"
  | "restricted"
  | "withdrawn"
  | "archived";

type ModerationCase = {
  id: string;
  subjectKind: string;
  subjectReference: string;
  status: string;
  visibilityAction: string;
  primaryReasonCode: string;
  contributorMessage: string | null;
  openedAt: string;
  events: Array<{ eventType: string; privateNote: string | null; evidenceReference: string | null; createdAt: string }>;
};

type RebuildLedgerEntry = {
  kind: "path" | "contribution" | "proposal" | "provenance";
  identifier: string;
  action: "created" | "updated" | "preserved" | "skipped";
  reason?: string;
};

type RebuildResult = {
  canonicalSource: "github";
  rebuildableIndex: boolean;
  summary: Record<string, number>;
  ledger: Record<RebuildLedgerEntry["action"], RebuildLedgerEntry[]>;
};

type WebhookDeliveryEvidence = {
  id: number;
  deliveryId: string;
  eventType: string;
  processingResult: "processed" | "ignored" | "failed";
  replayOutcome: "new" | "duplicate";
  proposalId: number | null;
  editorQuestionId: number | null;
  notificationKey: string | null;
  provenanceRecordId: number | null;
  receivedAt: string;
};

function getStateBadge(state: ProposalState) {
  switch (state) {
    case "submitted":
      return { label: "Awaiting Review", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50" };
    case "under-review":
      return { label: "Under Review", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50" };
    case "returned-with-notes":
      return { label: "Returned with Questions", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50" };
    case "accepted-into-canon":
      return { label: "Accepted", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50" };
    case "published-alternate":
      return { label: "Alternate Path", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50" };
    case "restricted":
      return { label: "Submission Restricted", color: "text-red-700 dark:text-red-300", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50" };
    case "withdrawn":
      return { label: "Submission Withdrawn", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" };
    case "archived":
      return { label: "Submission Archived", color: "text-muted-foreground", bg: "bg-secondary border-border/50" };
    default:
      return { label: state, color: "text-muted-foreground", bg: "bg-secondary border-transparent" };
  }
}

function isActionable(state: ProposalState) {
  return state === "submitted" || state === "under-review" || state === "returned-with-notes";
}

// ---------------------------------------------------------------------------
// Return dialog
// ---------------------------------------------------------------------------

function ReturnDialog({
  proposalId,
  onReturn,
  onCancel,
}: {
  proposalId: number;
  onReturn: (question: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-4 space-y-3 p-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/10">
      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
        Editor question for the contributor
      </p>
      <textarea
        className="w-full min-h-[80px] text-sm rounded-md border border-rose-300 dark:border-rose-800 bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/50"
        placeholder="Describe what needs to change before this can be accepted..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid={`input-editor-question-${proposalId}`}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => text.trim() && onReturn(text.trim())}
          disabled={!text.trim()}
          className="px-3 py-1.5 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
          data-testid={`btn-send-question-${proposalId}`}
        >
          Send question
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proposal card with steward actions
// ---------------------------------------------------------------------------

function ProposalCard({
  proposal,
  worldId,
  onActionComplete,
}: {
  proposal: StewardProposal;
  worldId: number;
  onActionComplete: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showRestrict, setShowRestrict] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const markReview = useMarkProposalUnderReview();
  const accept = useAcceptProposal();
  const returnProp = useReturnProposal();
  const restrict = useRestrictProposal();
  const archive = useArchiveProposal();

  const badge = getStateBadge(proposal.state);
  const canAct = isActionable(proposal.state);
  const isActive =
    proposal.state === "submitted" || proposal.state === "under-review";

  const isBusy =
    markReview.isPending ||
    accept.isPending ||
    returnProp.isPending ||
    restrict.isPending ||
    archive.isPending;

  async function handleMarkReview() {
    setActionError(null);
    try {
      await markReview.mutateAsync({ id: proposal.id });
      onActionComplete();
    } catch {
      setActionError("Couldn't update the review status. Please try again.");
    }
  }

  async function handleAccept() {
    setActionError(null);
    try {
      await accept.mutateAsync({ id: proposal.id });
      onActionComplete();
    } catch {
      setActionError("Couldn't accept this submission. The merge may have failed — check GitHub.");
    }
  }

  async function handleReturn(question: string) {
    setActionError(null);
    try {
      await returnProp.mutateAsync({
        id: proposal.id,
        data: { editorQuestion: question },
      });
      setShowReturn(false);
      onActionComplete();
    } catch {
      setActionError("Couldn't send the editor question. Please try again.");
    }
  }

  async function handleRestrict() {
    setActionError(null);
    try {
      await restrict.mutateAsync({
        id: proposal.id,
        data: { reason: restrictionReason.trim() || undefined },
      });
      setShowRestrict(false);
      setRestrictionReason("");
      onActionComplete();
    } catch {
      setActionError("Couldn't restrict this submission. Please try again.");
    }
  }

  async function handleArchive() {
    setActionError(null);
    try {
      await archive.mutateAsync({ id: proposal.id });
      onActionComplete();
    } catch {
      setActionError("Couldn't archive this submission. Please try again.");
    }
  }

  const canRestrict = isActionable(proposal.state);
  const canArchive =
    proposal.state === "accepted-into-canon" ||
    proposal.state === "published-alternate" ||
    proposal.state === "restricted" ||
    proposal.state === "withdrawn";

  return (
    <div
      className={cn("rounded-xl border bg-card overflow-hidden", proposal.state === "accepted-into-canon" && "tf-gold-connection")}
      data-testid={`card-proposal-${proposal.id}`}
    >
      <div className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", badge.bg, badge.color)}
              data-testid={`badge-state-${proposal.id}`}
            >
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 bg-current" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
              )}
              {badge.label}
            </span>
            <span className="text-xs text-muted-foreground">
              Path #{proposal.pathId}
            </span>
          </div>
          <Link
            href={`/worlds/${worldId}/proposals/${proposal.id}`}
            className="flex-shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
            data-testid={`link-view-proposal-${proposal.id}`}
          >
            View full submission <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Submitted {format(new Date(proposal.submittedAt), "MMM d, yyyy")}
          {proposal.decidedAt && (
            <> · Decided {format(new Date(proposal.decidedAt), "MMM d, yyyy")}</>
          )}
        </div>

        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={() => setShowPreview((visible) => !visible)}
            aria-expanded={showPreview}
            aria-controls={`submission-preview-${proposal.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            data-testid={`btn-read-submission-${proposal.id}`}
          >
            <BookOpen className="h-4 w-4" />
            {showPreview ? "Hide submission" : "Read submission"}
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showPreview && "rotate-90",
              )}
            />
          </button>

          {showPreview && (
            <div
              id={`submission-preview-${proposal.id}`}
              className="mt-3 space-y-3 rounded-lg border border-border/60 bg-secondary/20 p-4"
              data-testid={`submission-preview-${proposal.id}`}
            >
              {proposal.contributionPreviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No narration content is indexed for this story path yet.
                </p>
              ) : (
                proposal.contributionPreviews.map((contribution) => (
                  <article
                    key={contribution.id}
                    className="space-y-2"
                    data-testid={`submission-contribution-${contribution.id}`}
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <h3 className="font-serif font-medium text-foreground">
                        {contribution.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {contribution.contributorDisplayName
                          ? `By ${contribution.contributorDisplayName}`
                          : "Contributor not identified"}
                      </p>
                    </div>
                    <p className="text-sm leading-7 text-foreground/85 whitespace-pre-wrap break-words">
                      {contribution.content ?? "This contribution has no text."}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </div>

        {/* Steward action buttons — only for actionable states */}
        {(canAct || canArchive) && (
          <div className="pt-2 flex flex-wrap gap-2">
            {proposal.state === "submitted" && (
              <button
                onClick={handleMarkReview}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/40 disabled:opacity-50 transition-colors"
                data-testid={`btn-mark-review-${proposal.id}`}
              >
                {markReview.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                Begin reading
              </button>
            )}

            <button
              onClick={handleAccept}
              disabled={isBusy || proposal.state === "returned-with-notes"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 disabled:opacity-50 transition-colors"
              data-testid={`btn-accept-${proposal.id}`}
            >
              {accept.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Accept into canon
            </button>

            {!showReturn && (
              <button
                onClick={() => setShowReturn(true)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors"
                data-testid={`btn-return-${proposal.id}`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Return with question
              </button>
            )}
            {!showRestrict && canRestrict && (
              <button
                onClick={() => setShowRestrict(true)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300 disabled:opacity-50 transition-colors"
                data-testid={`btn-restrict-${proposal.id}`}
              >
                Restrict submission
              </button>
            )}
            {canArchive && (
              <button
                onClick={handleArchive}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border bg-secondary/50 text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                data-testid={`btn-archive-${proposal.id}`}
              >
                Archive submission
              </button>
            )}
          </div>
        )}

        {actionError && (
          <p className="text-xs text-destructive mt-2" data-testid={`error-action-${proposal.id}`}>
            {actionError}
          </p>
        )}

        {showReturn && (
          <ReturnDialog
            proposalId={proposal.id}
            onReturn={handleReturn}
            onCancel={() => setShowReturn(false)}
          />
        )}

        {showRestrict && (
          <div className="mt-4 space-y-3 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Reason for restriction <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <textarea
              className="w-full min-h-[80px] text-sm rounded-md border border-red-300 dark:border-red-800 bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/50"
              value={restrictionReason}
              maxLength={2000}
              onChange={(event) => setRestrictionReason(event.target.value)}
              placeholder="Share a clear, contributor-facing reason if appropriate..."
              data-testid={`input-restriction-reason-${proposal.id}`}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowRestrict(false); setRestrictionReason(""); }}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestrict}
                disabled={isBusy}
                className="px-3 py-1.5 text-sm rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 transition-colors"
                data-testid={`btn-confirm-restrict-${proposal.id}`}
              >
                Restrict submission
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function StewardDashboard() {
  const params = useParams();
  const worldId = params.worldId ? parseInt(params.worldId, 10) : 0;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [seedDraft, setSeedDraft] = useState("");
  const [isSeedDirty, setIsSeedDirty] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({ subjectKind: "proposal", subjectReference: "", reason: "spam", note: "" });
  const [controlForm, setControlForm] = useState({ subjectUserId: "", kind: "mute", appliesTo: "submission", reason: "spam" });
  const [rebuildResult, setRebuildResult] = useState<RebuildResult | null>(null);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const { data: world, isLoading: isLoadingWorld } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) },
  });
  const updateStoryworld = useUpdateStoryworld();

  useEffect(() => {
    if (!isSeedDirty) {
      setSeedDraft(world?.seed ?? "");
    }
  }, [isSeedDirty, world?.seed]);

  const {
    data: proposals,
    isLoading: isLoadingProposals,
    isError,
    error,
    refetch,
  } = useListStoryworldProposals(worldId, {
    query: {
      enabled: !!worldId,
      queryKey: getListStoryworldProposalsQueryKey(worldId),
    },
  });
  const {
    data: webhookEvidence = [],
    isLoading: isLoadingWebhookEvidence,
    isError: isWebhookEvidenceError,
    refetch: refetchWebhookEvidence,
  } = useListWebhookDeliveryEvidence(worldId, {
    query: {
      enabled: !!worldId,
      queryKey: getListWebhookDeliveryEvidenceQueryKey(worldId),
    },
  });

  function onActionComplete() {
    // Invalidate both the dashboard list and individual proposal queries
    void queryClient.invalidateQueries({
      queryKey: getListStoryworldProposalsQueryKey(worldId),
    });
  }

  async function loadModerationCases() {
    if (!worldId) return;
    const response = await fetch(`/api/storyworlds/${worldId}/moderation/cases`, { credentials: "include" });
    if (!response.ok) throw new Error("Could not load moderation cases");
    setModerationCases(await response.json());
  }

  useEffect(() => {
    void loadModerationCases().catch(() => setModerationError("Moderation cases could not be loaded."));
  }, [worldId]);

  async function openModerationCase(event: React.FormEvent) {
    event.preventDefault();
    setModerationError(null);
    const response = await fetch(`/api/storyworlds/${worldId}/moderation/cases`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectKind: reportForm.subjectKind,
        subjectReference: reportForm.subjectReference,
        primaryReasonCode: reportForm.reason,
        privateNote: reportForm.note,
        visibilityAction: "hold",
      }),
    });
    if (!response.ok) { setModerationError("The report could not be recorded."); return; }
    setReportForm({ ...reportForm, subjectReference: "", note: "" });
    await loadModerationCases();
  }

  async function applyCaseAction(item: ModerationCase, status: string, visibilityAction: string) {
    const response = await fetch(`/api/moderation/cases/${item.id}/action`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, visibilityAction, reasonCode: item.primaryReasonCode }),
    });
    if (!response.ok) { setModerationError("That moderation action could not be applied."); return; }
    await loadModerationCases();
  }

  async function applyControl(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/storyworlds/${worldId}/moderation/controls`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectUserId: Number(controlForm.subjectUserId),
        controlKind: controlForm.kind,
        appliesTo: controlForm.appliesTo,
        reasonCode: controlForm.reason,
      }),
    });
    if (!response.ok) { setModerationError("The storyworld control could not be applied."); return; }
    setControlForm({ ...controlForm, subjectUserId: "" });
  }

  async function handleSeedSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worldId) return;

    setSeedError(null);
    const seed = seedDraft.trim();
    try {
      const updatedWorld = await updateStoryworld.mutateAsync({
        id: worldId,
        data: { seed: seed || null },
      });
      setSeedDraft(updatedWorld.seed ?? "");
      setIsSeedDirty(false);
      queryClient.setQueryData(getGetStoryworldQueryKey(worldId), updatedWorld);
      queryClient.setQueryData(
        getListStoryworldsQueryKey(),
        (worlds: typeof updatedWorld[] | undefined) =>
          worlds?.map((item) => (item.id === updatedWorld.id ? updatedWorld : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: getListStoryworldsQueryKey(),
      });
    } catch {
      setSeedError("Couldn't save the discovery invitation. Please try again.");
    }
  }

  async function handleRebuild() {
    if (!worldId) return;
    setIsRebuilding(true);
    setRebuildError(null);
    try {
      const response = await fetch(`/api/admin/reconcile-for-steward/${worldId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Rebuild failed");
      }
      setRebuildResult((await response.json()) as RebuildResult);
    } catch {
      setRebuildError("The rebuild could not be completed. GitHub remains unchanged; try again when the repository is reachable.");
    } finally {
      setIsRebuilding(false);
    }
  }

  // 401/403 from the API → not a steward, redirect home
  if (isError) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return (
        <div className="text-center p-12 space-y-4">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h2 className="text-xl font-serif font-medium">Steward access required</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Only the world steward can view this panel. Sign in with steward credentials to continue.
          </p>
          <Link href={`/worlds/${worldId}`} className="text-primary hover:underline text-sm">
            Return to storyworld
          </Link>
        </div>
      );
    }
    return (
      <div className="p-8 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
        <p>Couldn't load submissions. Please try again.</p>
        <button onClick={() => refetch()} className="mt-3 text-sm underline">Retry</button>
      </div>
    );
  }

  const openProposals = proposals?.filter(p =>
    p.state === "submitted" || p.state === "under-review" || p.state === "returned-with-notes"
  ) ?? [];
  const closedProposals = proposals?.filter(p =>
    p.state === "accepted-into-canon" ||
    p.state === "published-alternate" ||
    p.state === "restricted" ||
    p.state === "withdrawn" ||
    p.state === "archived"
  ) ?? [];

  return (
    <div className="tf-strand max-w-3xl mx-auto space-y-10">
      {/* Breadcrumb */}
      <Link
        href={`/worlds/${worldId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        data-testid="link-back-to-world"
      >
        <ArrowLeft className="h-4 w-4" />
        {isLoadingWorld ? "Storyworld" : (world?.title ?? "Storyworld")}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="tf-nucleus-mark" aria-hidden="true"><span /></span>
          <h1 className="text-3xl font-serif font-medium text-foreground" data-testid="text-dashboard-title">
            Steward Panel
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Review submitted paths and decide what enters the canon of{" "}
          <span className="font-medium text-foreground">{world?.title}</span>.
        </p>
      </header>

      <section
        className="rounded-xl border border-primary/15 bg-primary/[0.025] p-5 sm:p-6"
        aria-labelledby="discovery-invitation-heading"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="discovery-invitation-heading"
              className="font-serif text-lg font-medium text-foreground"
            >
              Discovery invitation
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Give readers one sentence that invites them into this storyworld.
              It appears beneath the title in the Reader App.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/20 bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
            Reader
          </span>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSeedSave}>
          <label
            htmlFor="storyworld-seed"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Seed sentence
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="storyworld-seed"
              type="text"
              value={seedDraft}
              onChange={(event) => {
                setSeedDraft(event.target.value);
                setIsSeedDirty(true);
                setSeedError(null);
              }}
              maxLength={120}
              placeholder="A quiet world on the verge of becoming something else."
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-storyworld-seed"
            />
            <button
              type="submit"
              disabled={updateStoryworld.isPending || !isSeedDirty}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-save-storyworld-seed"
            >
              {updateStoryworld.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSeedDirty ? (
                <Save className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {updateStoryworld.isPending
                ? "Saving"
                : isSeedDirty
                  ? "Save invitation"
                  : "Saved"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="text-muted-foreground">
              Leave it blank and save to return to the default discovery message.
            </p>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                seedDraft.length >= 110 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              {seedDraft.length}/120
            </span>
          </div>
          {seedError && (
            <p className="text-sm text-destructive" role="alert">
              {seedError}
            </p>
          )}
        </form>
      </section>

      <section
        className="rounded-xl border border-slate-300/80 bg-slate-50/70 p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-950/30"
        aria-labelledby="rebuild-heading"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <GitBranch className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 id="rebuild-heading" className="font-serif text-lg font-medium">
                Rebuild the local index
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                GitHub is the canonical record. Request a fresh comparison, inspect what changed,
                and remember that this local index can always be rebuilt from the repository.
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-slate-300 bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:inline-flex">
            Steward only
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleRebuild()}
          disabled={isRebuilding}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="button-rebuild-index"
        >
          <RefreshCw className={cn("h-4 w-4", isRebuilding && "animate-spin")} />
          {isRebuilding ? "Comparing with GitHub…" : "Request rebuild"}
        </button>
        {rebuildError && <p className="mt-3 text-sm text-destructive" role="alert">{rebuildError}</p>}
        {rebuildResult && (
          <div className="mt-6 space-y-5" data-testid="rebuild-ledger">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-400">
                Source: GitHub
              </span>
              <span>Completed comparison · local index remains rebuildable</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {(["created", "updated", "preserved", "skipped"] as const).map((action) => (
                <div key={action} className="rounded-lg border border-border/60 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{action}</p>
                  <p className="mt-1 text-2xl font-serif tabular-nums">{rebuildResult.ledger[action]?.length ?? 0}</p>
                </div>
              ))}
            </div>
            {(["created", "updated", "preserved", "skipped"] as const).map((action) => {
              const entries = rebuildResult.ledger[action] ?? [];
              if (!entries.length) return null;
              return (
                <div key={action} className="space-y-2">
                  <h3 className="text-sm font-medium capitalize">{action} records</h3>
                  <div className="divide-y divide-border/50 rounded-lg border border-border/60 bg-background">
                    {entries.map((entry, index) => (
                      <div key={`${entry.identifier}-${index}`} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                        <div className="min-w-0">
                          <p className="font-mono text-xs break-all text-foreground">{entry.identifier}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.kind}</p>
                        </div>
                        {entry.reason && <p className="max-w-md text-xs leading-5 text-muted-foreground">{entry.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950/20"
        aria-labelledby="webhook-evidence-heading"
        data-testid="webhook-evidence"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Webhook className="mt-0.5 h-5 w-5 text-slate-700 dark:text-slate-300" />
            <div>
              <h2 id="webhook-evidence-heading" className="font-serif text-lg font-medium">
                Delivery evidence
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                A redacted record of signed GitHub deliveries for this storyworld. It shows what the sync processed, including safe links to affected records, never the payload or signature.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetchWebhookEvidence()}
            disabled={isLoadingWebhookEvidence}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Refresh delivery evidence"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingWebhookEvidence && "animate-spin")} />
            Refresh
          </button>
        </div>
        {isWebhookEvidenceError && (
          <p className="mt-4 text-sm text-destructive" role="alert">Delivery evidence could not be loaded.</p>
        )}
        {isLoadingWebhookEvidence && webhookEvidence.length === 0 && (
          <div className="mt-5 h-20 animate-pulse rounded-lg bg-background" />
        )}
        {!isLoadingWebhookEvidence && !isWebhookEvidenceError && webhookEvidence.length === 0 && (
          <p className="mt-5 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
            No signed GitHub deliveries have been recorded for this storyworld yet.
          </p>
        )}
        {webhookEvidence.length > 0 && (
          <div className="mt-5 divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-background">
            {webhookEvidence.map((item) => (
              <article key={item.id} className="space-y-3 p-4" data-testid={`webhook-evidence-${item.id}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-xs break-all text-foreground">{item.deliveryId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.eventType} · {format(new Date(item.receivedAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.1em]">
                    <span className={cn(
                      "rounded-full border px-2 py-1",
                      item.processingResult === "processed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : item.processingResult === "failed"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
                    )}>
                      {item.processingResult}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-400">
                      {item.replayOutcome === "duplicate" ? "Replay · no-op" : "First delivery"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {item.proposalId !== null && (
                    <Link className="text-primary hover:underline" href={`/worlds/${worldId}/proposals/${item.proposalId}`}>
                      Proposal #{item.proposalId}
                    </Link>
                  )}
                  {item.editorQuestionId !== null && (
                    <span>Editor question #{item.editorQuestionId}</span>
                  )}
                  {item.notificationKey !== null && (
                    <span className="font-mono break-all">Notification: {item.notificationKey}</span>
                  )}
                  {item.provenanceRecordId !== null && (
                    <Link className="text-primary hover:underline" href={`/worlds/${worldId}/provenance`}>
                      Provenance #{item.provenanceRecordId}
                    </Link>
                  )}
                  {item.proposalId === null &&
                    item.editorQuestionId === null &&
                    item.notificationKey === null &&
                    item.provenanceRecordId === null && <span>No related product record</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-red-200/70 bg-red-50/30 p-5 sm:p-6 dark:border-red-900/40 dark:bg-red-950/10" aria-labelledby="moderation-heading">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-red-700 dark:text-red-300" />
          <div>
            <h2 id="moderation-heading" className="font-serif text-lg font-medium">Private moderation desk</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Safety, spam, rights, and conduct reports stay private here. They are separate from editorial review and never become GitHub comments or labels.
            </p>
          </div>
        </div>
        <form onSubmit={openModerationCase} className="mt-4 grid gap-2 sm:grid-cols-4">
          <select value={reportForm.subjectKind} onChange={(e) => setReportForm({ ...reportForm, subjectKind: e.target.value })} className="h-10 rounded-md border bg-background px-2 text-sm">
            <option value="proposal">Proposal</option><option value="contribution">Contribution</option><option value="account">Account</option><option value="reaction">Reaction</option>
          </select>
          <input required value={reportForm.subjectReference} onChange={(e) => setReportForm({ ...reportForm, subjectReference: e.target.value })} placeholder="Subject reference" className="h-10 rounded-md border bg-background px-3 text-sm" />
          <select value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })} className="h-10 rounded-md border bg-background px-2 text-sm">
            <option value="spam">Spam</option><option value="harassment">Harassment</option><option value="nsfw">NSFW</option><option value="plagiarism-review">Plagiarism review</option><option value="rights-concern">Rights concern</option><option value="safety">Safety</option><option value="other">Other</option>
          </select>
          <button className="h-10 rounded-md bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-800">Open private case</button>
          <input value={reportForm.note} onChange={(e) => setReportForm({ ...reportForm, note: e.target.value })} placeholder="Private note or evidence reference (optional)" className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-4" />
        </form>
        {moderationCases.length > 0 && <div className="mt-5 space-y-2">
          {moderationCases.map((item) => (
            <div key={item.id} className="rounded-lg border border-red-200/70 bg-background p-3 text-sm dark:border-red-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{item.primaryReasonCode} · {item.subjectKind} {item.subjectReference}</span>
                <span className="text-xs text-muted-foreground">{item.status} · {item.visibilityAction}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => void applyCaseAction(item, "triaged", "hold")} className="rounded border px-2 py-1 text-xs">Keep on hold</button>
                <button onClick={() => void applyCaseAction(item, "dismissed", "none")} className="rounded border px-2 py-1 text-xs">Dismiss</button>
                <button onClick={() => void applyCaseAction(item, "resolved", "restricted")} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Resolve + restrict</button>
              </div>
            </div>
          ))}
        </div>}
        <form onSubmit={applyControl} className="mt-5 flex flex-wrap gap-2 border-t border-red-200/60 pt-4 dark:border-red-900/30">
          <input required inputMode="numeric" value={controlForm.subjectUserId} onChange={(e) => setControlForm({ ...controlForm, subjectUserId: e.target.value })} placeholder="Contributor user ID" className="h-9 w-40 rounded-md border bg-background px-3 text-sm" />
          <select value={controlForm.kind} onChange={(e) => setControlForm({ ...controlForm, kind: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="mute">Mute</option><option value="block">Block</option></select>
          <select value={controlForm.appliesTo} onChange={(e) => setControlForm({ ...controlForm, appliesTo: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="submission">Submissions</option><option value="contact">Contact</option><option value="all-contributions">All contributions</option><option value="reaction">Reactions</option></select>
          <button className="h-9 rounded-md border border-red-300 px-3 text-xs font-medium text-red-700">Apply storyworld control</button>
        </form>
        {moderationError && <p className="mt-3 text-sm text-destructive" role="alert">{moderationError}</p>}
      </section>

      {/* Open submissions */}
      <section className="space-y-4">
        <h2 className="text-lg font-serif font-medium text-foreground border-b border-border/40 pb-2">
          Open Submissions
          {!isLoadingProposals && (
            <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
              ({openProposals.length})
            </span>
          )}
        </h2>

        {isLoadingProposals && (
          <div className="space-y-3" data-testid="skeleton-proposals">
            {[1, 2].map(i => (
              <div key={i} className="h-28 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoadingProposals && openProposals.length === 0 && (
          <div className="p-10 text-center rounded-xl border border-dashed border-border flex flex-col items-center gap-3">
            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No open submissions right now.</p>
          </div>
        )}

        {!isLoadingProposals && openProposals.map(proposal => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal as StewardProposal}
            worldId={worldId}
            onActionComplete={onActionComplete}
          />
        ))}
      </section>

      {/* Decided submissions */}
      {!isLoadingProposals && closedProposals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-serif font-medium text-muted-foreground border-b border-border/40 pb-2">
            Decided
            <span className="ml-2 text-sm font-sans font-normal">
              ({closedProposals.length})
            </span>
          </h2>
          {closedProposals.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal as StewardProposal}
              worldId={worldId}
              onActionComplete={onActionComplete}
            />
          ))}
        </section>
      )}
    </div>
  );
}
