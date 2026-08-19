import { useGetStoryworld, getGetStoryworldQueryKey, useListStoryPaths, getListStoryPathsQueryKey, isCanonState, isAlternateState, isDevelopmentState } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ReaderLayout, resolveReaderTheme } from "@/components/layout";
import { ArrowLeft } from "lucide-react";

export default function WorldLandingPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const hasValidWorldId = Number.isSafeInteger(worldId) && worldId > 0;

  const { data: world, isLoading: loadingWorld, error: errorWorld } = useGetStoryworld(worldId, {
    query: { enabled: hasValidWorldId, queryKey: getGetStoryworldQueryKey(worldId) }
  });
  
  const { data: paths, isLoading: loadingPaths, error: errorPaths } = useListStoryPaths(worldId, {
    query: { enabled: hasValidWorldId, queryKey: getListStoryPathsQueryKey(worldId) }
  });
  const theme = resolveReaderTheme(world?.readerTheme);

  const canonPaths = paths?.filter(p => isCanonState(p.state)) || [];
  const alternatePaths = paths?.filter(p => isAlternateState(p.state)) || [];
  const otherPaths = paths?.filter(p => isDevelopmentState(p.state)) || [];

  if (!hasValidWorldId || errorWorld || (!loadingWorld && !world)) {
    return (
      <ReaderLayout theme={theme}>
        <div className="w-full max-w-[var(--reader-line-length)] mt-20 text-center animate-reveal" data-testid="status-world-not-found">
          <h1 className="text-2xl font-light mb-4" style={{ fontFamily: "var(--reader-font-body)" }}>A Lost Record</h1>
          <p className="text-muted-foreground text-lg" style={{ fontFamily: "var(--reader-font-body)" }}>
            This world could not be found in the archive. It may have moved, or its address may be incomplete.
          </p>
          <div className="mt-8">
            <Link href="/" data-testid="link-recover-discovery" className="inline-flex items-center text-sm font-semibold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Discovery
            </Link>
          </div>
        </div>
      </ReaderLayout>
    );
  }

  return (
    <ReaderLayout theme={theme}>
      <div className="w-full max-w-[var(--reader-line-length)]">
        {loadingWorld ? (
          <div className="h-20 w-2/3 bg-muted/40 rounded-sm animate-pulse mb-24" />
        ) : (
          <header className="mb-24 md:mb-32 animate-reveal text-center">
            <h1
              className="text-4xl md:text-6xl lg:text-7xl tracking-tight mb-8 font-light"
              style={{ fontFamily: "var(--reader-font-body)" }}
            >
              {world?.title}
            </h1>
            {world?.seed && (
              <p
                className="text-xl md:text-2xl text-muted-foreground max-w-[45ch] mx-auto leading-relaxed"
                style={{ fontFamily: "var(--reader-font-body)" }}
              >
                {world.seed}
              </p>
            )}
          </header>
        )}

        {errorPaths && (
          <div className="border-y border-destructive/20 py-10 text-center text-destructive" role="alert" data-testid="status-paths-error">
            The paths for this world could not be loaded. Please return to discovery and try again.
          </div>
        )}

        {loadingPaths ? (
          <div className="space-y-12 animate-pulse" data-testid="status-paths-loading" aria-live="polite">
            <div className="h-16 bg-muted/30 rounded-sm w-full" />
            <div className="h-16 bg-muted/30 rounded-sm w-full" />
          </div>
        ) : (
          <div className="space-y-24 md:space-y-32">
            {canonPaths.length > 0 && (
              <section className="animate-reveal animate-reveal-delay-1">
                <h2 className="text-xs font-semibold tracking-[0.2em] uppercase mb-8 pb-4 border-b border-border/40 flex items-center gap-3" style={{ color: "var(--reader-canon-indicator)" }}>
                  <span className="inline-block w-2 h-2 rotate-45 shrink-0 bg-current" aria-hidden="true" />
                  Canon
                </h2>
                <div className="flex flex-col gap-6">
                  {canonPaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} data-testid={`link-canon-path-${path.id}`} className="group block relative outline-none">
                      <div className="absolute -inset-y-4 -inset-x-6 md:-inset-x-8 z-0 scale-95 opacity-0 transition-all duration-500 ease-out bg-[color-mix(in_srgb,var(--reader-canon-indicator)_8%,transparent)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 rounded-lg" />
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-4">
                        <h3 className="text-2xl md:text-3xl transition-colors duration-300 group-hover:[color:var(--reader-canon-indicator)] font-normal" style={{ fontFamily: "var(--reader-font-body)" }}>
                          {path.title}
                        </h3>
                        <span className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase shrink-0">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(path.updatedAt))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {alternatePaths.length > 0 && (
              <section className="animate-reveal animate-reveal-delay-2">
                <h2 className="text-xs font-semibold tracking-[0.2em] uppercase mb-8 pb-4 border-b border-border/40 flex items-center gap-3" style={{ color: "var(--reader-alternate-indicator)" }}>
                  <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-current" aria-hidden="true" />
                  Alternate Paths
                </h2>
                <div className="flex flex-col gap-6">
                  {alternatePaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} data-testid={`link-alternate-path-${path.id}`} className="group block relative outline-none">
                      <div className="absolute -inset-y-4 -inset-x-6 md:-inset-x-8 z-0 scale-95 opacity-0 transition-all duration-500 ease-out bg-[color-mix(in_srgb,var(--reader-alternate-indicator)_8%,transparent)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 rounded-lg" />
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-4">
                        <h3 className="text-xl md:text-2xl transition-colors duration-300 group-hover:[color:var(--reader-alternate-indicator)] font-normal" style={{ fontFamily: "var(--reader-font-body)" }}>
                          {path.title}
                        </h3>
                        <span className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase shrink-0">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(path.updatedAt))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {otherPaths.length > 0 && (
              <section className="animate-reveal animate-reveal-delay-3">
                <h2 className="text-xs font-semibold tracking-[0.2em] uppercase mb-8 pb-4 border-b border-border/40 flex items-center gap-3" style={{ color: "var(--reader-draft-indicator)" }}>
                  <span className="inline-block w-2 h-2 border border-current shrink-0" aria-hidden="true" />
                  Other Drafts
                </h2>
                <div className="flex flex-col gap-4">
                  {otherPaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} data-testid={`link-draft-path-${path.id}`} className="group block relative outline-none">
                      <div className="absolute -inset-y-3 -inset-x-6 md:-inset-x-8 z-0 scale-95 opacity-0 transition-all duration-500 ease-out bg-[color-mix(in_srgb,var(--reader-draft-indicator)_8%,transparent)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 rounded-md" />
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm border" style={{ borderColor: "var(--reader-draft-indicator)", color: "var(--reader-draft-indicator)" }}>
                            {path.state === 'proposed' ? 'Proposed' : 'Draft'}
                          </span>
                          <h3 className="text-lg transition-colors duration-300 group-hover:[color:var(--reader-draft-indicator)] font-normal" style={{ fontFamily: "var(--reader-font-body)" }}>
                            {path.title}
                          </h3>
                        </div>
                        <span className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase shrink-0">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(path.updatedAt))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {paths?.length === 0 && (
              <div className="text-center text-muted-foreground py-20 italic text-xl animate-reveal" data-testid="status-paths-empty" style={{ fontFamily: "var(--reader-font-body)" }}>
                No stories have been started in this world yet.
              </div>
            )}
          </div>
        )}
      </div>
    </ReaderLayout>
  );
}
