import {
  useGetStoryworld,
  getGetStoryworldQueryKey,
  useListStoryPaths,
  getListStoryPathsQueryKey,
  useListContributions,
  getListContributionsQueryKey,
  useListStoryworldProvenance,
  getListStoryworldProvenanceQueryKey,
  StoryPathState,
} from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ReaderLayout, resolveReaderTheme } from "@/components/layout";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ArrowLeft, Sparkles, Network } from "lucide-react";

export default function PathReaderPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const pathId = Number(params.pathId);
  const hasValidIds =
    Number.isSafeInteger(worldId) &&
    worldId > 0 &&
    Number.isSafeInteger(pathId) &&
    pathId > 0;

  const { data: world, isLoading: loadingWorld, error: errorWorld } = useGetStoryworld(worldId, {
    query: { enabled: hasValidIds, queryKey: getGetStoryworldQueryKey(worldId) }
  });
  
  const { data: paths, isLoading: loadingPaths, error: errorPaths } = useListStoryPaths(worldId, {
    query: { enabled: hasValidIds, queryKey: getListStoryPathsQueryKey(worldId) }
  });

  const { data: contributions, isLoading: loadingContributions, error: errorContributions } = useListContributions(worldId, pathId, {
    query: { enabled: hasValidIds, queryKey: getListContributionsQueryKey(worldId, pathId) }
  });

  const {
    data: provenance,
    isLoading: loadingProvenance,
    error: errorProvenance,
  } = useListStoryworldProvenance(worldId, {
    query: {
      enabled: hasValidIds,
      queryKey: getListStoryworldProvenanceQueryKey(worldId),
    },
  });

  const currentPath = paths?.find(p => p.id === pathId);
  const originPath = currentPath?.originPathId
    ? paths?.find((path) => path.id === currentPath.originPathId)
    : undefined;
  const theme = resolveReaderTheme(world?.readerTheme);
  
  // Find paths that branched from this one
  const branchingPaths = paths?.filter(p => p.originPathId === pathId && p.state === StoryPathState["published-alternate"]) || [];
  // A path is in canon if it is open (actively growing) or published-canon (accepted into canon by a steward decision).
  const isCanonPath = currentPath?.state === StoryPathState.open || currentPath?.state === StoryPathState["published-canon"];
  const acceptedMoments = provenance?.filter(
    (record) => record.sourcePathId === pathId,
  ) ?? [];

  if (
    !hasValidIds ||
    errorWorld ||
    errorPaths ||
    (!loadingWorld && !world) ||
    (paths && !currentPath)
  ) {
    return (
      <ReaderLayout theme={theme}>
        <div className="w-full max-w-[var(--reader-line-length)] mt-20 text-center animate-reveal" data-testid="status-path-not-found">
          <h1 className="text-2xl font-light mb-4" style={{ fontFamily: "var(--reader-font-body)" }}>Path Not Found</h1>
          <p className="text-muted-foreground text-lg" style={{ fontFamily: "var(--reader-font-body)" }}>
            This story path could not be located. You can return to the world and choose another path.
          </p>
          <div className="mt-8">
            <Link href={hasValidIds ? `/worlds/${worldId}` : "/"} data-testid="link-recover-world" className="inline-flex items-center text-sm font-semibold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {hasValidIds ? "Return to World" : "Return to Discovery"}
            </Link>
          </div>
        </div>
      </ReaderLayout>
    );
  }

  if (loadingWorld || loadingPaths) {
    return (
      <ReaderLayout theme={theme}>
        <div className="w-full max-w-[var(--reader-line-length)] space-y-16 animate-pulse" aria-live="polite" data-testid="status-path-loading">
          <div className="h-5 w-32 bg-muted/40 rounded-sm" />
          <div className="h-20 w-3/4 bg-muted/40 rounded-sm" />
          <div className="space-y-4 pt-16">
            <div className="h-4 w-full bg-muted/20 rounded-sm" />
            <div className="h-4 w-11/12 bg-muted/20 rounded-sm" />
            <div className="h-4 w-4/5 bg-muted/20 rounded-sm" />
          </div>
        </div>
      </ReaderLayout>
    );
  }

  return (
    <ReaderLayout theme={theme}>
      <div className="w-full max-w-[var(--reader-line-length)]">
        <div className="mb-20 md:mb-32 animate-reveal">
          <Link href={`/worlds/${worldId}`} data-testid="link-back-to-world" className="inline-flex items-center text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {world?.title || "World"}
          </Link>
          
          <h1
            className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-tight mb-8 font-light"
            style={{ fontFamily: "var(--reader-font-body)" }}
          >
            {currentPath?.title}
          </h1>

          {/* Path-type indicator */}
          <div className="flex items-center gap-3">
            {isCanonPath && (
              <>
                <span className="inline-block w-2 h-2 rotate-45" style={{ backgroundColor: "var(--reader-canon-indicator)" }} aria-hidden="true" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "var(--reader-canon-indicator)" }}>
                  Canon
                </span>
              </>
            )}
            {currentPath?.state === StoryPathState["published-alternate"] && (
              <>
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--reader-alternate-indicator)" }} aria-hidden="true" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "var(--reader-alternate-indicator)" }}>
                  Alternate Path
                </span>
              </>
            )}
            {currentPath && !isCanonPath && currentPath.state !== StoryPathState["published-alternate"] && (
              <>
                <span className="inline-block w-2 h-2 border border-current" style={{ color: "var(--reader-draft-indicator)" }} aria-hidden="true" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "var(--reader-draft-indicator)" }}>
                  Draft
                </span>
              </>
            )}
          </div>

          {originPath && (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground" data-testid="text-path-origin">
              This path branches from{" "}
              <Link
                href={`/worlds/${worldId}/paths/${originPath.id}`}
                data-testid={`link-origin-path-${originPath.id}`}
                className="underline underline-offset-4 decoration-current hover:text-foreground"
                style={{ color: "var(--reader-alternate-indicator)" }}
              >
                {originPath.title}
              </Link>
              .
            </p>
          )}
        </div>

        {loadingContributions ? (
          <div className="space-y-32 animate-pulse" aria-live="polite" data-testid="status-contributions-loading">
            {[1, 2].map(i => (
              <div key={i} className="space-y-6">
                <div className="h-10 bg-muted/40 w-1/3 rounded-sm mx-auto" />
                <div className="h-4 bg-muted/20 w-full rounded-sm mt-12" />
                <div className="h-4 bg-muted/20 w-full rounded-sm" />
                <div className="h-4 bg-muted/20 w-5/6 rounded-sm" />
                <div className="h-4 bg-muted/20 w-full rounded-sm mt-8" />
                <div className="h-4 bg-muted/20 w-3/4 rounded-sm" />
              </div>
            ))}
          </div>
        ) : errorContributions ? (
          <div className="border-y border-destructive/20 py-10 text-center text-destructive" role="alert" data-testid="status-contributions-error">
            The saved moments for this path could not be loaded. Please try again later.
          </div>
        ) : (
          <div className="space-y-32 md:space-y-48">
            {contributions?.map((scene, idx) => (
              <article key={scene.id} className="relative animate-reveal" data-testid={`story-moment-${scene.id}`} style={{ animationDelay: `${(idx % 5) * 0.1}s` }}>
                <header className="mb-12 text-center">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Saved moment {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h2 
                    className="text-2xl md:text-4xl font-normal tracking-tight"
                    style={{ fontFamily: "var(--reader-font-body)" }}
                  >
                    {scene.title}
                  </h2>
                </header>

                <div
                  data-testid={`text-story-moment-${scene.id}`}
                  className="prose prose-lg md:prose-xl prose-p:leading-[var(--reader-leading)] prose-headings:font-normal max-w-none text-[length:var(--reader-body-size)] prose-p:text-foreground/90 prose-a:text-foreground prose-strong:text-foreground prose-strong:font-semibold"
                  style={{ 
                    fontFamily: "var(--reader-font-body)",
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(scene.summary || '', { async: false }) as string) }}
                />

                <footer className="mt-16 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground pt-8 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-border/40" />
                  <span className="italic" style={{ fontFamily: "var(--reader-font-body)" }}>
                    by {scene.contributorDisplayName ?? "Anonymous"}
                  </span>
                  {scene.agentAssisted && (
                    <>
                      <span className="hidden md:block w-1 h-1 rounded-full bg-border/50" />
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border/40 text-[10px] font-semibold uppercase tracking-widest bg-muted/10 text-muted-foreground" data-testid={`status-agent-assisted-${scene.id}`}>
                        <Sparkles className="w-3 h-3" />
                        Agent-assisted
                      </span>
                    </>
                  )}
                </footer>
              </article>
            ))}

            {contributions?.length === 0 && (
              <div className="text-center py-20 text-muted-foreground text-xl italic animate-reveal" data-testid="status-contributions-empty" style={{ fontFamily: "var(--reader-font-body)" }}>
                This path is currently empty.
              </div>
            )}
          </div>
        )}

        {loadingProvenance && (
          <section
            className="mt-32 border-t border-border/40 pt-16 text-center text-muted-foreground animate-pulse"
            aria-live="polite"
            data-testid="status-lineage-loading"
          >
            Gathering this path’s lineage…
          </section>
        )}

        {errorProvenance && (
          <section
            className="mt-32 border-y border-destructive/20 py-10 text-center text-destructive"
            role="alert"
            data-testid="status-lineage-error"
          >
            The lineage record is temporarily unavailable. The story remains readable; please try again later for its full history.
          </section>
        )}

        {/* Story Lineage / Provenance */}
        {!loadingProvenance && !errorProvenance && acceptedMoments.length > 0 && (
          <section
            className="mt-32 pt-16 animate-reveal relative"
            aria-labelledby="lineage-heading"
            data-testid="section-path-lineage"
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: "var(--reader-canon-indicator)", opacity: 0.3 }} />

            <h3
              id="lineage-heading"
              className="text-xs font-bold tracking-[0.2em] uppercase mb-8 flex items-center gap-3"
              style={{ color: "var(--reader-canon-indicator)" }}
            >
              <span className="inline-block w-2 h-2 rotate-45 shrink-0 bg-current" aria-hidden="true" />
              Path Lineage
            </h3>
            <div className="space-y-6 pl-5 border-l" style={{ borderColor: "color-mix(in_srgb, var(--reader-canon-indicator) 20%, transparent)" }}>
              {acceptedMoments.map((record) => {
                const contributors = [
                  ...record.contributorNames,
                  ...record.contributorIdentityFallbacks,
                ];
                return (
                  <div
                    key={record.id}
                    className="relative text-sm md:text-base leading-relaxed text-muted-foreground"
                    style={{ fontFamily: "var(--reader-font-body)" }}
                  >
                    <div className="absolute -left-[25px] top-2.5 w-2 h-2 rotate-45 bg-background border" style={{ borderColor: "var(--reader-canon-indicator)" }} aria-hidden="true" />

                    <p className="text-foreground">
                      <strong className="font-semibold text-foreground/80">{record.decision}</strong> on{" "}
                      {new Intl.DateTimeFormat('en-US', {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(record.acceptedAt))}
                    </p>
                    {contributors.length > 0 && (
                      <p className="mt-1">
                        Brought forward by {contributors.join(", ")}.
                      </p>
                    )}
                    {record.stewardName && (
                      <p className="mt-1">
                        Welcomed by {record.stewardName}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Branch-point Callouts */}
        {branchingPaths.length > 0 && (
          <section className="mt-32 pt-16 animate-reveal relative">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: "var(--reader-alternate-indicator)", opacity: 0.3 }} />

            <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-8 flex items-center gap-3" style={{ color: "var(--reader-alternate-indicator)" }}>
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-current" aria-hidden="true" />
              Divergence Points
            </h3>

            <div className="grid gap-6 sm:grid-cols-2">
              {branchingPaths.map(alt => (
                <Link
                  key={alt.id}
                  href={`/worlds/${worldId}/paths/${alt.id}`}
                  data-testid={`link-branch-path-${alt.id}`}
                  className="group block p-6 md:p-8 rounded-lg border transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                  style={{
                    borderColor: "color-mix(in_srgb, var(--reader-alternate-indicator) 20%, transparent)",
                    backgroundColor: "color-mix(in_srgb, var(--reader-alternate-indicator) 3%, transparent)"
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <Network className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--reader-alternate-indicator)" }} aria-hidden="true" />
                    <div>
                      <h4 className="text-xl md:text-2xl font-normal transition-colors group-hover:opacity-80" style={{ fontFamily: "var(--reader-font-body)", color: "var(--reader-alternate-indicator)" }}>
                        {alt.title}
                      </h4>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    An alternate path branching from this story.
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ReaderLayout>
  );
}
