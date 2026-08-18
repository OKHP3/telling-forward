import { useGetStoryworld, getGetStoryworldQueryKey, useListStoryPaths, getListStoryPathsQueryKey, StoryPathState } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ReaderLayout } from "@/components/layout";

export default function WorldLandingPage() {
  const params = useParams();
  const worldId = Number(params.worldId);

  const { data: world, isLoading: loadingWorld, error: errorWorld } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) }
  });
  
  const { data: paths, isLoading: loadingPaths } = useListStoryPaths(worldId, {
    query: { enabled: !!worldId, queryKey: getListStoryPathsQueryKey(worldId) }
  });

  const canonPaths = paths?.filter(p => p.state === StoryPathState.open) || [];
  const alternatePaths = paths?.filter(p => p.state === StoryPathState["published-alternate"]) || [];
  const otherPaths = paths?.filter(p => p.state !== StoryPathState.open && p.state !== StoryPathState["published-alternate"]) || [];

  if (errorWorld) {
    return (
      <ReaderLayout>
        <div className="w-full max-w-[var(--reader-line-length)] text-center py-16 text-muted-foreground" style={{ fontFamily: "var(--reader-font-body)" }}>
          This world could not be found.
        </div>
      </ReaderLayout>
    );
  }

  return (
    <ReaderLayout>
      <div className="w-full max-w-[var(--reader-line-length)]">
        {loadingWorld ? (
          <div className="h-16 w-2/3 bg-muted/50 rounded-sm animate-pulse mb-16" />
        ) : (
          <header className="mb-16 md:mb-24 text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6"
              style={{ fontFamily: "var(--reader-font-body)" }}
            >
              {world?.title}
            </h1>
            {world?.seed && (
              <p
                className="text-lg md:text-xl text-muted-foreground max-w-prose mx-auto italic"
                style={{ fontFamily: "var(--reader-font-body)" }}
              >
                {world.seed}
              </p>
            )}
          </header>
        )}

        {loadingPaths ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-muted/30 rounded-sm w-full" />
            <div className="h-24 bg-muted/30 rounded-sm w-full" />
          </div>
        ) : (
          <div className="space-y-16">
            {canonPaths.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-6 pb-2 border-b border-border/50">
                  Canon
                </h2>
                <div className="flex flex-col gap-4">
                  {canonPaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} className="group block p-6 -mx-6 rounded-md hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Diamond marker — shape distinguishes Canon without relying on color alone */}
                        <span className="inline-block w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: "var(--reader-canon-indicator)" }} aria-hidden="true" />
                        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-canon-indicator)" }}>Canon</span>
                      </div>
                      <h3 className="text-2xl transition-colors group-hover:[color:var(--reader-canon-indicator)]" style={{ fontFamily: "var(--reader-font-body)" }}>
                        {path.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {alternatePaths.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-6 pb-2 border-b border-border/50">
                  Alternate Paths
                </h2>
                <div className="flex flex-col gap-4">
                  {alternatePaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} className="group block p-6 -mx-6 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--reader-alternate-indicator)_5%,transparent)]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--reader-alternate-indicator)" }} />
                        <span className="text-xs tracking-wider uppercase" style={{ color: "var(--reader-alternate-indicator)" }}>Alternate</span>
                      </div>
                      <h3 className="text-2xl" style={{ fontFamily: "var(--reader-font-body)" }}>
                        {path.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {otherPaths.length > 0 && (
              <section>
                <h2 className="text-xs font-bold tracking-widest uppercase mb-6 pb-2 border-b border-border/50" style={{ color: "var(--reader-draft-indicator)" }}>
                  Other Drafts
                </h2>
                <div className="flex flex-col gap-2">
                  {otherPaths.map(path => (
                    <Link key={path.id} href={`/worlds/${worldId}/paths/${path.id}`} className="block p-6 -mx-6 rounded-md hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Square marker — shape distinguishes Draft without relying on color alone */}
                        <span className="inline-block w-2 h-2 shrink-0 border" style={{ borderColor: "var(--reader-draft-indicator)", backgroundColor: "transparent" }} aria-hidden="true" />
                        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-draft-indicator)" }}>
                          {path.state === 'proposed' ? 'Proposed' : 'Draft'}
                        </span>
                      </div>
                      <h3 className="text-lg" style={{ fontFamily: "var(--reader-font-body)" }}>
                        {path.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {paths?.length === 0 && (
              <div className="text-center text-muted-foreground py-12" style={{ fontFamily: "var(--reader-font-body)" }}>
                No stories have been started in this world yet.
              </div>
            )}
          </div>
        )}
      </div>
    </ReaderLayout>
  );
}
