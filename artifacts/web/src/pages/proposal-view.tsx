import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProposal, 
  getGetProposalQueryKey,
  useGetStoryworld,
  getGetStoryworldQueryKey,
  useListStoryPaths,
  getListStoryPathsQueryKey,
  useMarkProposalUnderReview,
  useAcceptProposal,
  useReturnProposal,
  useRestrictProposal,
  useWithdrawProposal,
  useArchiveProposal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send, Search, MessageSquare, CheckCircle, FileText, Eye, CheckCircle2, Loader2, ShieldCheck, ShieldAlert, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isNotFoundApiError,
  StoryLinkRecovery,
} from "@/components/story-link-recovery";

export function ProposalView() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const proposalId = Number(params.proposalId);
  const hasValidIds =
    Number.isSafeInteger(worldId) &&
    worldId > 0 &&
    Number.isSafeInteger(proposalId) &&
    proposalId > 0;
  const queryClient = useQueryClient();

  const proposalQuery = useGetProposal(proposalId, {
    query: {
      enabled: hasValidIds,
      queryKey: getGetProposalQueryKey(proposalId),
      retry: false,
    }
  });

  const worldQuery = useGetStoryworld(worldId, {
    query: {
      enabled: hasValidIds,
      queryKey: getGetStoryworldQueryKey(worldId),
      retry: false,
    }
  });

  const pathsQuery = useListStoryPaths(worldId, {
    query: {
      enabled: hasValidIds,
      queryKey: getListStoryPathsQueryKey(worldId),
      retry: false,
    }
  });

  const proposal = proposalQuery.data;
  const world = worldQuery.data;
  const paths = pathsQuery.data;
  const refetchProposal = proposalQuery.refetch;
  const path = paths?.find(p => p.id === proposal?.pathId);
  const errors = [proposalQuery.error, worldQuery.error, pathsQuery.error];
  const hasNotFoundError = errors.some(isNotFoundApiError);
  const hasRequestError = errors.some(Boolean);
  const isProposalMissing =
    !hasValidIds ||
    hasNotFoundError ||
    (!proposalQuery.isLoading && !proposal && !proposalQuery.isError) ||
    (!worldQuery.isLoading && !world && !worldQuery.isError);
  const isLoading =
    proposalQuery.isLoading || worldQuery.isLoading || pathsQuery.isLoading;

  function retryStoryLink() {
    void Promise.all([
      proposalQuery.refetch(),
      worldQuery.refetch(),
      pathsQuery.refetch(),
    ]);
  }

  // Steward actions
  const [showReturnInput, setShowReturnInput] = useState(false);
  const [returnQuestion, setReturnQuestion] = useState("");
  const [showRestrictInput, setShowRestrictInput] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [stewardError, setStewardError] = useState<string | null>(null);

  const markReview = useMarkProposalUnderReview();
  const accept = useAcceptProposal();
  const returnProp = useReturnProposal();
  const restrict = useRestrictProposal();
  const withdraw = useWithdrawProposal();
  const archive = useArchiveProposal();

  const isBusy =
    markReview.isPending ||
    accept.isPending ||
    returnProp.isPending ||
    restrict.isPending ||
    withdraw.isPending ||
    archive.isPending;

  async function handleMarkReview() {
    setStewardError(null);
    try {
      await markReview.mutateAsync({ id: proposalId });
      void refetchProposal();
    } catch { setStewardError("Couldn't update status. Please try again."); }
  }

  async function handleAccept() {
    setStewardError(null);
    try {
      await accept.mutateAsync({ id: proposalId });
      void queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
    } catch { setStewardError("GitHub merge failed. Check the storyworld's repository."); }
  }

  async function handleReturn() {
    if (!returnQuestion.trim()) return;
    setStewardError(null);
    try {
      await returnProp.mutateAsync({ id: proposalId, data: { editorQuestion: returnQuestion.trim() } });
      setShowReturnInput(false);
      setReturnQuestion("");
      void refetchProposal();
    } catch { setStewardError("Couldn't send the question. Please try again."); }
  }

  async function handleRestrict() {
    setStewardError(null);
    try {
      await restrict.mutateAsync({
        id: proposalId,
        data: { reason: restrictionReason.trim() || undefined },
      });
      setShowRestrictInput(false);
      setRestrictionReason("");
      void refetchProposal();
    } catch {
      setStewardError("Couldn't restrict this submission. Please try again.");
    }
  }

  async function handleWithdraw() {
    setStewardError(null);
    try {
      await withdraw.mutateAsync({ id: proposalId });
      void refetchProposal();
    } catch {
      setStewardError("Only the contributor who opened this submission can withdraw it.");
    }
  }

  async function handleArchive() {
    setStewardError(null);
    try {
      await archive.mutateAsync({ id: proposalId });
      void refetchProposal();
    } catch {
      setStewardError("Couldn't archive this submission. Please try again.");
    }
  }

  const canMarkReview = proposal?.state === "submitted" || proposal?.state === "returned-with-notes";
  const canAccept = proposal?.state === "submitted" || proposal?.state === "under-review";
  const canReturn = proposal?.state === "submitted" || proposal?.state === "under-review";
  const canRestrict =
    proposal?.state === "submitted" ||
    proposal?.state === "under-review" ||
    proposal?.state === "returned-with-notes";
  const canWithdraw =
    proposal?.state === "draft" ||
    proposal?.state === "submitted" ||
    proposal?.state === "under-review" ||
    proposal?.state === "returned-with-notes";
  const canArchive =
    proposal?.state === "accepted-into-canon" ||
    proposal?.state === "published-alternate" ||
    proposal?.state === "restricted" ||
    proposal?.state === "withdrawn";

  if (isProposalMissing) {
    return <StoryLinkRecovery kind="not-found" subject="path" />;
  }

  if (hasRequestError) {
    return (
      <StoryLinkRecovery
        kind="error"
        subject="path"
        onRetry={retryStoryLink}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded" />
        <div className="h-32 bg-secondary/30 rounded-xl" />
        <div className="h-64 bg-card border border-border/40 rounded-xl" />
      </div>
    );
  }

  if (!proposal || !world) {
    return <StoryLinkRecovery kind="not-found" subject="path" />;
  }

  const steps = [
    { id: 'submitted', label: 'Submitted', icon: Send },
    { id: 'under-review', label: 'Under Review', icon: Search },
    { id: 'decided', label: 'Decision Reached', icon: CheckCircle },
  ];

  const getCurrentStepIndex = (state: string) => {
    switch (state) {
      case 'draft': return -1;
      case 'submitted': return 0;
      case 'under-review': return 1;
      case 'returned-with-notes':
      case 'accepted-into-canon':
      case 'restricted':
      case 'withdrawn':
      case 'archived':
      // published-canon is a path state, not a proposal state, but included for completeness
      case 'published-alternate': return 2;
      default: return 0;
    }
  };

  const currentStep = getCurrentStepIndex(proposal.state);

  const getStateDisplay = (state: string) => {
    switch (state) {
      case 'draft': return { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-secondary' };
      case 'submitted': return { label: 'Awaiting Review', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50' };
      case 'under-review': return { label: 'Under Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50' };
      case 'returned-with-notes': return { label: 'Returned with Editor Questions', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' };
      case 'accepted-into-canon': return { label: 'Accepted into Canon', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50' };
      case 'published-alternate': return { label: 'Published as Alternate Path', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50' };
      case 'restricted': return { label: 'Submission Restricted', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' };
      case 'withdrawn': return { label: 'Submission Withdrawn', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' };
      case 'archived': return { label: 'Submission Archived', color: 'text-muted-foreground', bg: 'bg-secondary border-border/50' };
      // published-canon is the path state set when accepted; the proposal state is accepted-into-canon
      default: return { label: state, color: 'text-foreground', bg: 'bg-secondary' };
    }
  };

  const stateDisplay = getStateDisplay(proposal.state);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <Link 
        href={`/worlds/${worldId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {world?.title || "Storyworld"}
      </Link>

      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-medium text-foreground mb-2" data-testid="text-proposal-title">
              Proposed Addition to Canon
            </h1>
            <p className="text-muted-foreground">
              From path: <span className="font-medium text-foreground">{path?.title || `Path #${proposal.pathId}`}</span>
            </p>
          </div>
          
          <div className={cn("px-4 py-2 rounded-lg border font-medium text-sm flex items-center gap-2", stateDisplay.bg, stateDisplay.color)} data-testid="badge-proposal-state">
            <span className="relative flex h-2.5 w-2.5">
              {(proposal.state === 'submitted' || proposal.state === 'under-review') && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current"></span>
            </span>
            {stateDisplay.label}
          </div>
        </div>

        {/* Editorial Progress Indicator */}
        <div className="pt-8 pb-4">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-border"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${currentStep < 0 ? 0 : currentStep >= 2 ? 100 : (currentStep / 2) * 100}%` }}
            ></div>
            
            <div className="relative flex justify-between">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = currentStep >= idx;
                const isCurrent = currentStep === idx;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-3 bg-background px-2">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 z-10 bg-background",
                      isCompleted ? "border-primary text-primary" : "border-border text-muted-foreground",
                      isCurrent && "ring-4 ring-primary/10"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 bg-accent/20 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-serif font-medium text-lg">Editorial Pitch Details</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Submitted</span>
                <p className="font-medium text-foreground text-base">
                  {format(new Date(proposal.submittedAt), "MMMM d, yyyy")}
                </p>
              </div>
              
              {proposal.decidedAt && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Decision Reached</span>
                  <p className="font-medium text-foreground text-base">
                    {format(new Date(proposal.decidedAt), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-border/40">
              <p className="text-muted-foreground italic font-serif leading-relaxed">
                This submission contains proposed story moments to be reviewed by the World Steward. 
                The steward will read through the addition to ensure it aligns with the narrative direction of the world, 
                and may return it with editor questions or choose to integrate it.
              </p>
            </div>
          </div>
        </div>

        {proposal.state === 'returned-with-notes' && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-200/50 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400">
              <MessageSquare className="h-5 w-5" />
              <h2 className="font-serif font-medium text-lg">Editor Questions</h2>
            </div>
            <div className="p-6">
              <p className="text-rose-800/80 dark:text-rose-300/80 text-sm">
                The World Steward has reviewed this submission and left notes for revision. 
                Please check the associated discussion thread for detailed feedback.
              </p>
            </div>
          </div>
        )}

        {proposal.state === 'restricted' && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-200/50 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="font-serif font-medium text-lg">Submission restricted</h2>
            </div>
            <div className="p-6 text-sm text-red-800/80 dark:text-red-200/80">
              <p>This submission is no longer available for editorial review.</p>
              {proposal.decisionReason && (
                <p className="mt-3 rounded-md border border-red-200/70 dark:border-red-900/50 bg-background/50 p-3 whitespace-pre-wrap">
                  {proposal.decisionReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Steward action panel — only shown for actionable proposals */}
        {(canMarkReview || canAccept || canReturn || canRestrict || canArchive) && (
          <div
            className="rounded-xl border border-border/60 bg-card overflow-hidden"
            data-testid="section-steward-actions"
          >
            <div className="px-6 py-4 border-b border-border/40 bg-accent/10 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-serif font-medium text-lg">Steward Actions</h2>
              <span className="text-xs text-muted-foreground font-sans">(visible only if you are the world steward)</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {canMarkReview && (
                  <button
                    onClick={handleMarkReview}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-50 transition-colors"
                    data-testid="btn-mark-under-review"
                  >
                    {markReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Begin reading
                  </button>
                )}
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 disabled:opacity-50 transition-colors"
                    data-testid="btn-accept-into-canon"
                  >
                    {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Accept into canon
                  </button>
                )}
                {canReturn && !showReturnInput && (
                  <button
                    onClick={() => setShowReturnInput(true)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400 disabled:opacity-50 transition-colors"
                    data-testid="btn-open-return"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Return with question
                  </button>
                )}
                {canRestrict && !showRestrictInput && (
                  <button
                    onClick={() => setShowRestrictInput(true)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300 disabled:opacity-50 transition-colors"
                    data-testid="btn-open-restrict"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Restrict submission
                  </button>
                )}
                {canArchive && (
                  <button
                    onClick={handleArchive}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-border bg-secondary/50 text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                    data-testid="btn-archive-proposal"
                  >
                    {archive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                    Archive submission
                  </button>
                )}
              </div>

              {showReturnInput && (
                <div className="space-y-3 p-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/10">
                  <label className="block text-sm font-medium text-rose-700 dark:text-rose-400">
                    Editor question for the contributor
                  </label>
                  <textarea
                    className="w-full min-h-[80px] text-sm rounded-md border border-rose-300 dark:border-rose-800 bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                    placeholder="Describe what needs to change before this can be accepted..."
                    value={returnQuestion}
                    onChange={e => setReturnQuestion(e.target.value)}
                    data-testid="input-return-question"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowReturnInput(false); setReturnQuestion(""); }}
                      className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReturn}
                      disabled={!returnQuestion.trim() || isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      data-testid="btn-send-return"
                    >
                      {returnProp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Send question
                    </button>
                  </div>
                </div>
              )}

              {showRestrictInput && (
                <div className="space-y-3 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10">
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300">
                    Reason for restriction <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    className="w-full min-h-[80px] text-sm rounded-md border border-red-300 dark:border-red-800 bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    placeholder="Share a clear, contributor-facing reason if appropriate..."
                    value={restrictionReason}
                    maxLength={2000}
                    onChange={e => setRestrictionReason(e.target.value)}
                    data-testid="input-restriction-reason"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowRestrictInput(false); setRestrictionReason(""); }}
                      className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRestrict}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 transition-colors"
                      data-testid="btn-confirm-restrict"
                    >
                      {restrict.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Restrict submission
                    </button>
                  </div>
                </div>
              )}

              {stewardError && (
                <p className="text-sm text-destructive" data-testid="error-steward-action">{stewardError}</p>
              )}
            </div>
          </div>
        )}

        {canWithdraw && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 bg-accent/10">
              <h2 className="font-serif font-medium text-lg">Your submission</h2>
            </div>
            <div className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground max-w-xl">
                If you opened this submission, you can withdraw it from editorial review. Your linked GitHub identity will be verified first.
              </p>
              <button
                onClick={handleWithdraw}
                disabled={isBusy}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200 disabled:opacity-50 transition-colors"
                data-testid="btn-withdraw-proposal"
              >
                {withdraw.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Withdraw submission
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
