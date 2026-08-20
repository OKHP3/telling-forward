import { useParams } from "wouter";
import { useGetStoryworld, useListStoryPaths, getGetStoryworldQueryKey, getListStoryPathsQueryKey, isAlternateState } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { BookOpen, Map, ArrowLeft, PenTool, Globe, ChevronRight, ShieldCheck, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isNotFoundApiError,
  StoryLinkRecovery,
} from "@/components/story-link-recovery";

export function WorldDetail() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const hasValidWorldId = Number.isSafeInteger(worldId) && worldId > 0;

  const worldQuery = useGetStoryworld(worldId, {
    query: {
      enabled: hasValidWorldId,
      queryKey: getGetStoryworldQueryKey(worldId),
      retry: false,
    }
  });

  const pathsQuery = useListStoryPaths(worldId, {
    query: {
      enabled: hasValidWorldId,
      queryKey: getListStoryPathsQueryKey(worldId),
      retry: false,
    }
  });

  const world = worldQuery.data;
  const paths = pathsQuery.data;
  const errors = [worldQuery.error, pathsQuery.error];
  const hasNotFoundError = errors.some(isNotFoundApiError);
  const hasRequestError = errors.some(Boolean);

  function retryStoryworld() {
    void Promise.all([worldQuery.refetch(), pathsQuery.refetch()]);
  }

  // Canon: open (actively growing) or published-canon (accepted into canon by steward decision).
  // Alternate: published-alternate (visible continuity that never entered canon).
  // Everything else (personal, proposed) falls into canon section as in-progress.
  const canonPaths = paths?.filter(p => !isAlternateState(p.state)) || [];
  const alternatePaths = paths?.filter(p => isAlternateState(p.state)) || [];

  if (
    !hasValidWorldId ||
    hasNotFoundError ||
    (!worldQuery.isLoading && !world && !worldQuery.isError)
  ) {
    return <StoryLinkRecovery kind="not-found" subject="storyworld" />;
  }

  if (hasRequestError) {
    return (
      <StoryLinkRecovery
        kind="error"
        subject="storyworld"
        onRetry={retryStoryworld}
      />
    );
  }

  if (worldQuery.isLoading || pathsQuery.isLoading) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-8 w-24 bg-secondary rounded" />
        <div className="space-y-4">
          <div className="h-12 w-2/3 bg-secondary rounded" />
          <div className="h-6 w-1/3 bg-secondary/60 rounded" />
        </div>
        <div className="h-48 bg-secondary/30 rounded-xl" />
      </div>
    );
  }

  if (!world) {
    return <StoryLinkRecovery kind="not-found" subject="storyworld" />;
  }

  return (
    <div className="space-y-12">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>
        
        <header className="space-y-4 pb-8 border-b border-border/40">
          <h1 className="text-4xl md:text-5xl font-serif text-foreground font-medium" data-testid="text-world-title">
            {world.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-sans">
            <span className="flex items-center gap-1.5" data-testid="text-world-steward">
              <Globe className="h-4 w-4" />
              World Steward: <span className="font-medium text-foreground">{world.repoOwner}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <Map className="h-4 w-4" />
              {paths?.length || 0} {(paths?.length === 1) ? 'Path' : 'Paths'}
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Since {format(new Date(world.createdAt), "MMM yyyy")}</span>
          </div>
          {/* Story prompts are read-only for contributors; editing remains steward-gated. */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link
              href={`/worlds/${worldId}/board`}
              className="group inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/40"
              data-testid="link-concept-board"
            >
              <Lightbulb className="h-4 w-4" />
              Browse Concept Board
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/worlds/${worldId}/steward`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-steward-panel"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Steward Panel
            </Link>
          </div>
        </header>
      </div>

      <div className="space-y-16">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-serif font-medium text-foreground">Canon & Proposals</h2>
          </div>
          
          {canonPaths.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border/60 text-center text-muted-foreground">
              No canon paths established yet.
            </div>
          ) : (
            <div className="grid gap-4" data-testid="list-canon-paths">
              {canonPaths.map(path => (
                <PathCard key={path.id} worldId={world.id} path={path} />
              ))}
            </div>
          )}
        </section>

        {alternatePaths.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <PenTool className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-2xl font-serif font-medium text-foreground text-muted-foreground">Alternate Paths</h2>
            </div>
            
            <div className="grid gap-4" data-testid="list-alternate-paths">
              {alternatePaths.map(path => (
                <PathCard key={path.id} worldId={world.id} path={path} isAlternate />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PathCard({ worldId, path, isAlternate = false }: { worldId: number, path: any, isAlternate?: boolean }) {
  const getBadgeStyles = (state: string) => {
    switch(state) {
      case 'personal': return 'bg-secondary text-secondary-foreground border-secondary-border';
      case 'open': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'proposed': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'published-canon': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'published-alternate': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      default: return 'bg-secondary text-secondary-foreground border-secondary-border';
    }
  };

  const getBadgeLabel = (state: string) => {
    switch(state) {
      case 'personal': return 'Personal Space';
      case 'open': return 'Active Canon';
      case 'proposed': return 'Proposed Canon';
      case 'published-canon': return 'Canon';
      case 'published-alternate': return 'Alternate Path';
      default: return 'Unknown';
    }
  };

  return (
    <Link 
      href={`/worlds/${worldId}/paths/${path.id}`}
      className={cn(
        "group flex items-center justify-between p-5 rounded-xl border bg-card hover:bg-accent/40 transition-all duration-300",
        isAlternate ? "border-dashed border-border/80" : "border-border/60 hover:border-primary/40"
      )}
      data-testid={`card-path-${path.id}`}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs px-2.5 py-0.5 rounded-full font-medium border", 
            getBadgeStyles(path.state)
          )}>
            {getBadgeLabel(path.state)}
          </span>
          <span className="text-xs text-muted-foreground">
            Updated {format(new Date(path.updatedAt), "MMM d")}
          </span>
        </div>
        <h3 className={cn(
          "text-xl font-serif font-medium group-hover:text-primary transition-colors",
          isAlternate && "text-muted-foreground group-hover:text-foreground"
        )}>
          {path.title}
        </h3>
      </div>
      <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        <ChevronRight className="h-5 w-5" />
      </div>
    </Link>
  );
}
