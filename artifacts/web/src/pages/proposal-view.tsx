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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send, Search, MessageSquare, CheckCircle, FileText, Eye, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProposalView() {
  const params = useParams();
  const worldId = params.worldId ? parseInt(params.worldId, 10) : 0;
  const proposalId = params.proposalId ? parseInt(params.proposalId, 10) : 0;
  const queryClient = useQueryClient();

  const { data: proposal, isLoading: isProposalLoading, refetch: refetchProposal } = useGetProposal(proposalId, {
    query: { enabled: !!proposalId, queryKey: getGetProposalQueryKey(proposalId) }
  });

  const { data: world } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) }
  });

  const { data: paths } = useListStoryPaths(worldId, {
    query: { enabled: !!worldId, queryKey: getListStoryPathsQueryKey(worldId) }
  });

  const path = paths?.find(p => p.id === proposal?.pathId);

  // Steward actions
  const [showReturnInput, setShowReturnInput] = useState(false);
  const [returnQuestion, setReturnQuestion] = useState("");
  const [stewardError, setStewardError] = useState<string | null>(null);

  const markReview = useMarkProposalUnderReview();
  const accept = useAcceptProposal();
  const returnProp = useReturnProposal();

  const isBusy = markReview.isPending || accept.isPending || returnProp.isPending;

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

  const canMarkReview = proposal?.state === "submitted" || proposal?.state === "returned-with-notes";
  const canAccept = proposal?.state === "submitted" || proposal?.state === "under-review";
  const canReturn = proposal?.state === "submitted" || proposal?.state === "under-review";

  if (isProposalLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded" />
        <div className="h-32 bg-secondary/30 rounded-xl" />
        <div className="h-64 bg-card border border-border/40 rounded-xl" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center p-12">
        <p className="text-muted-foreground">Submission not found.</p>
        <Link href={`/worlds/${worldId}`} className="text-primary mt-4 inline-block hover:underline">
          Return to Storyworld
        </Link>
      </div>
    );
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

        {/* Steward action panel — only shown for actionable proposals */}
        {(canMarkReview || canAccept || canReturn) && (
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

              {stewardError && (
                <p className="text-sm text-destructive" data-testid="error-steward-action">{stewardError}</p>
              )}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
