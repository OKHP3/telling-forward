/**
 * Steward Dashboard — /worlds/:worldId/steward
 *
 * Lists all proposals for a storyworld with inline accept / return / review
 * actions. Accessible only to authenticated stewards; the API enforces this
 * boundary (401/403) independently of the UI gate.
 */

import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetStoryworld,
  getGetStoryworldQueryKey,
  useListStoryworldProposals,
  getListStoryworldProposalsQueryKey,
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
  Loader2,
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
      className="rounded-xl border border-border/60 bg-card overflow-hidden"
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

  const { data: world, isLoading: isLoadingWorld } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) },
  });

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

  function onActionComplete() {
    // Invalidate both the dashboard list and individual proposal queries
    void queryClient.invalidateQueries({
      queryKey: getListStoryworldProposalsQueryKey(worldId),
    });
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
    <div className="max-w-3xl mx-auto space-y-10">
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
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-serif font-medium text-foreground" data-testid="text-dashboard-title">
            Steward Panel
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Review submitted paths and decide what enters the canon of{" "}
          <span className="font-medium text-foreground">{world?.title}</span>.
        </p>
      </header>

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
