import { useListProposals } from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, Clock, Send, Search, CheckCircle, ArrowUpRight, Inbox } from "lucide-react";
import { format } from "date-fns";
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

function getStateDisplay(state: ProposalState) {
  switch (state) {
    case "draft":
      return { label: "Draft", color: "text-muted-foreground", bg: "bg-secondary border-transparent" };
    case "submitted":
      return { label: "Awaiting Review", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50" };
    case "under-review":
      return { label: "Under Review", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50" };
    case "returned-with-notes":
      return { label: "Returned with Editor Questions", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50" };
    case "accepted-into-canon":
      return { label: "Accepted into Canon", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50" };
    case "published-alternate":
      return { label: "Published as Alternate Path", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50" };
    case "restricted":
      return { label: "Submission Restricted", color: "text-red-700 dark:text-red-300", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50" };
    case "withdrawn":
      return { label: "Submission Withdrawn", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" };
    case "archived":
      return { label: "Submission Archived", color: "text-muted-foreground", bg: "bg-secondary border-border/50" };
    default:
      return { label: state, color: "text-foreground", bg: "bg-secondary border-transparent" };
  }
}

function StateIcon({ state }: { state: ProposalState }) {
  switch (state) {
    case "submitted":
      return <Send className="h-4 w-4" />;
    case "under-review":
      return <Search className="h-4 w-4" />;
    case "accepted-into-canon":
    case "published-alternate":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export function Submissions() {
  const { data: proposals, isLoading, isError } = useListProposals();

  return (
    <div className="space-y-12">
      <section className="space-y-4 max-w-2xl">
        <h1
          className="text-4xl md:text-5xl font-serif text-foreground font-medium tracking-tight"
          data-testid="text-submissions-title"
        >
          Story Submissions
        </h1>
        <p className="text-lg text-muted-foreground font-sans leading-relaxed" data-testid="text-submissions-subtitle">
          Proposed canon additions from contributors across all storyworlds — each one a pitch to the world steward.
        </p>
      </section>

      {isLoading && (
        <div className="space-y-4" data-testid="skeleton-submissions">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-secondary/50 animate-pulse border border-border/50" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-8 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
          <p>We couldn't load submissions at this time. Please try again later.</p>
        </div>
      )}

      {!isLoading && !isError && proposals?.length === 0 && (
        <div className="p-12 text-center rounded-xl border border-dashed border-border flex flex-col items-center gap-3">
          <Inbox className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-lg font-serif font-medium text-foreground">No Submissions Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Contributors haven't proposed any canon additions yet. Check back after paths have been opened.
          </p>
        </div>
      )}

      {!isLoading && !isError && proposals && proposals.length > 0 && (
        <div className="space-y-4" data-testid="list-submissions">
          {proposals.map((proposal) => {
            const state = getStateDisplay(proposal.state as ProposalState);
            const isActive = proposal.state === "submitted" || proposal.state === "under-review";

            return (
              <Link
                key={proposal.id}
                href={`/worlds/${proposal.storyworldId}/proposals/${proposal.id}`}
                className="group flex items-center gap-5 p-5 rounded-xl border border-border/60 bg-card hover:bg-accent/30 hover:border-primary/30 transition-all duration-300"
                data-testid={`card-submission-${proposal.id}`}
              >
                {/* State icon bubble */}
                <div
                  className={cn(
                    "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border",
                    state.bg,
                    state.color
                  )}
                >
                  {isActive ? (
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 bg-current" />
                      <StateIcon state={proposal.state as ProposalState} />
                    </span>
                  ) : (
                    <StateIcon state={proposal.state as ProposalState} />
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn("text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border", state.bg, state.color)}
                      data-testid={`badge-submission-state-${proposal.id}`}
                    >
                      {state.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Storyworld #{proposal.storyworldId} · Path #{proposal.pathId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Submitted {format(new Date(proposal.submittedAt), "MMM d, yyyy")}
                    </span>
                    {proposal.decidedAt && (
                      <span className="text-muted-foreground/60">
                        · Decided {format(new Date(proposal.decidedAt), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover arrow */}
                <ArrowUpRight className="flex-shrink-0 h-5 w-5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
