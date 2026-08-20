import { useParams, Link } from "wouter";
import { 
  useGetStoryworld, 
  useListContributions, 
  useListStoryPaths,
  getGetStoryworldQueryKey, 
  getListContributionsQueryKey,
  getListStoryPathsQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Clock, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isNotFoundApiError,
  StoryLinkRecovery,
} from "@/components/story-link-recovery";

export function PathReader() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const pathId = Number(params.pathId);
  const hasValidIds =
    Number.isSafeInteger(worldId) &&
    worldId > 0 &&
    Number.isSafeInteger(pathId) &&
    pathId > 0;

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
  
  const world = worldQuery.data;
  const paths = pathsQuery.data;
  const path = paths?.find(p => p.id === pathId);

  const contributionsQuery = useListContributions(worldId, pathId, {
    query: {
      enabled: hasValidIds,
      queryKey: getListContributionsQueryKey(worldId, pathId),
      retry: false,
    }
  });
  const contributions = contributionsQuery.data;

  const errors = [
    worldQuery.error,
    pathsQuery.error,
    contributionsQuery.error,
  ];
  const hasNotFoundError = errors.some(isNotFoundApiError);
  const hasRequestError = errors.some(Boolean);
  const isPathMissing =
    !hasValidIds ||
    hasNotFoundError ||
    (!worldQuery.isLoading && !world && !worldQuery.isError) ||
    (!!paths && !path);
  const isLoading =
    worldQuery.isLoading ||
    pathsQuery.isLoading ||
    contributionsQuery.isLoading;

  function retryStoryLink() {
    void Promise.all([
      worldQuery.refetch(),
      pathsQuery.refetch(),
      contributionsQuery.refetch(),
    ]);
  }

  if (isPathMissing) {
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
      <div className="space-y-12 animate-pulse max-w-3xl mx-auto">
        <div className="h-6 w-32 bg-secondary rounded" />
        <div className="h-12 w-3/4 bg-secondary rounded" />
        <div className="space-y-8 mt-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-1/4 bg-secondary/60 rounded" />
              <div className="h-24 bg-secondary/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sort contributions chronologically (oldest first)
  const sortedContributions = [...(contributions || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const getBadgeLabel = (state?: string) => {
    switch(state) {
      case 'personal': return 'Personal Space';
      case 'open': return 'Active Canon';
      case 'proposed': return 'Proposed Canon';
      case 'published-canon': return 'Canon';
      case 'published-alternate': return 'Alternate Path';
      default: return 'Draft';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link 
        href={`/worlds/${worldId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
        data-testid="link-back-world"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {world?.title || "Storyworld"}
      </Link>

      <header className="mb-16 text-center space-y-6">
        {path?.state && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium tracking-wide uppercase">
            <Bookmark className="h-3 w-3" />
            {getBadgeLabel(path.state)}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-serif text-foreground font-medium leading-tight" data-testid="text-path-title">
          {path?.title || "Reading Path"}
        </h1>
        <div className="w-12 h-px bg-border/80 mx-auto mt-8" />
      </header>

      {sortedContributions.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground italic font-serif">
          No saved moments exist on this path yet.
        </div>
      ) : (
        <div className="space-y-16" data-testid="list-contributions">
          {sortedContributions.map((contribution, index) => (
            <article 
              key={contribution.id} 
              className={cn(
                "relative pl-8 md:pl-0 border-l border-border/40 md:border-none",
                index > 0 && "pt-8"
              )}
              data-testid={`article-contribution-${contribution.id}`}
            >
              {/* Desktop timeline dot */}
              <div className="hidden md:flex absolute -left-12 top-2 h-6 w-6 items-center justify-center rounded-full bg-background border border-border/60 text-muted-foreground/50">
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              </div>

              {/* Mobile timeline dot */}
              <div className="md:hidden absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-border" />

              <div className="space-y-4">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                    <Clock className="h-3.5 w-3.5" />
                    <time dateTime={contribution.createdAt}>
                      {format(new Date(contribution.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                  <h2 className="text-2xl font-serif text-foreground font-medium">
                    {contribution.title}
                  </h2>
                </header>
                
                {contribution.summary && (
                  <div className="prose prose-stone dark:prose-invert max-w-none font-serif leading-loose text-[1.05rem] text-foreground/90">
                    <p>{contribution.summary}</p>
                  </div>
                )}
              </div>
            </article>
          ))}
          
          <div className="flex justify-center pt-12 pb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          </div>
        </div>
      )}
    </div>
  );
}
