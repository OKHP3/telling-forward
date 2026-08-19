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
import { ReaderLayout } from "@/components/layout";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ArrowLeft } from "lucide-react";

export default function PathReaderPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const pathId = Number(params.pathId);

  const { data: world } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) }
  });
  
  const { data: paths } = useListStoryPaths(worldId, {
    query: { enabled: !!worldId, queryKey: getListStoryPathsQueryKey(worldId) }
  });

  const { data: contributions, isLoading: loadingContributions } = useListContributions(worldId, pathId, {
    query: { enabled: !!(worldId && pathId), queryKey: getListContributionsQueryKey(worldId, pathId) }
  });

  const { data: provenance } = useListStoryworldProvenance(worldId, {
    query: {
      enabled: !!worldId,
      queryKey: getListStoryworldProvenanceQueryKey(worldId),
    },
  });

  const currentPath = paths?.find(p => p.id === pathId);
  
  // Find paths that branched from this one
  const branchingPaths = paths?.filter(p => p.originPathId === pathId && p.state === StoryPathState["published-alternate"]) || [];
  const acceptedMoments = provenance?.filter(
    (record) => record.sourcePathId === pathId,
  ) ?? [];

  return (
    <ReaderLayout>
      <div className="w-full max-w-[var(--reader-line-length)]">
        <div className="mb-12 md:mb-20">
          <Link href={`/worlds/${worldId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {world?.title || "World"}
          </Link>
          
          <h1
            className="text-4xl md:text-5xl lg:text-6xl tracking-tight"
            style={{ fontFamily: "var(--reader-font-body)" }}
          >
            {currentPath?.title}
          </h1>
          {/* Path-type indicator — always present, non-colour marker (shape + label) required by theme contract */}
          {currentPath?.state === StoryPathState.open && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-none rotate-45" style={{ backgroundColor: "var(--reader-canon-indicator)" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-canon-indicator)" }}>
                Canon
              </span>
            </div>
          )}
          {currentPath?.state === StoryPathState["published-alternate"] && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--reader-alternate-indicator)" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-alternate-indicator)" }}>
                Alternate Path
              </span>
            </div>
          )}
          {currentPath && currentPath.state !== StoryPathState.open && currentPath.state !== StoryPathState["published-alternate"] && (
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 border border-current" style={{ color: "var(--reader-draft-indicator)" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-draft-indicator)" }}>
                Draft
              </span>
            </div>
          )}
        </div>

        {loadingContributions ? (
          <div className="space-y-24 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-muted/40 w-1/3 rounded" />
                <div className="h-4 bg-muted/20 w-full rounded" />
                <div className="h-4 bg-muted/20 w-full rounded" />
                <div className="h-4 bg-muted/20 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-24 md:space-y-32">
            {contributions?.map((scene) => (
              <article key={scene.id} className="relative">
                {/* Scene Header */}
                <header className="mb-8 text-center">
                  <h2 
                    className="text-2xl md:text-3xl"
                    style={{ fontFamily: "var(--reader-font-body)" }}
                  >
                    {scene.title}
                  </h2>
                </header>

                {/* Prose */}
                <div 
                  className="prose prose-lg prose-p:leading-[var(--reader-leading)] prose-headings:font-normal max-w-none text-[length:var(--reader-body-size)]"
                  style={{ 
                    fontFamily: "var(--reader-font-body)",
                    color: "var(--reader-text)"
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(scene.summary || '', { async: false }) as string) }}
                />

                {/* Attribution Row */}
                <footer className="mt-12 flex items-center justify-center gap-3 text-sm text-muted-foreground border-t border-border/30 pt-6">
                  <span className="italic">
                    by {scene.contributorDisplayName ?? (scene.contributorId ? `Contributor #${scene.contributorId}` : "Anonymous")}
                  </span>
                  {scene.agentAssisted && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="px-2 py-0.5 rounded-sm border border-border/50 text-[10px] uppercase tracking-widest bg-muted/10">
                        Agent-assisted
                      </span>
                    </>
                  )}
                </footer>
              </article>
            ))}

            {contributions?.length === 0 && (
              <div className="text-center py-20 italic text-muted-foreground" style={{ fontFamily: "var(--reader-font-body)" }}>
                This path is currently empty.
              </div>
            )}
          </div>
        )}

        {acceptedMoments.length > 0 && (
          <section
            className="mt-20 pt-10"
            style={{ borderTop: "1px solid var(--reader-canon-indicator)" }}
            aria-labelledby="lineage-heading"
          >
            <h3
              id="lineage-heading"
              className="text-xs font-semibold tracking-widest uppercase mb-5"
              style={{ color: "var(--reader-canon-indicator)" }}
            >
              This path in the canon
            </h3>
            <div className="space-y-5">
              {acceptedMoments.map((record) => {
                const contributors = [
                  ...record.contributorNames,
                  ...record.contributorIdentityFallbacks,
                ];
                return (
                  <div
                    key={record.id}
                    className="rounded-sm border border-border/40 bg-muted/10 p-5 text-sm leading-relaxed"
                  >
                    <p className="font-medium">
                      {record.decision} on{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(record.acceptedAt))}
                    </p>
                    {contributors.length > 0 && (
                      <p className="mt-2 text-muted-foreground">
                        Brought forward by {contributors.join(", ")}.
                      </p>
                    )}
                    {record.stewardName && (
                      <p className="mt-1 text-muted-foreground">
                        Welcomed by {record.stewardName}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Branch-point Callouts — alternate-indicator styling, circle marker + label per theme contract */}
        {branchingPaths.length > 0 && (
          <div className="mt-32 pt-12" style={{ borderTop: "1px solid var(--reader-alternate-indicator)" }}>
            <div className="flex items-center gap-2 mb-6">
              {/* Circle marker — same shape used for alternate paths throughout the app */}
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--reader-alternate-indicator)" }} aria-hidden="true" />
              <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--reader-alternate-indicator)" }}>
                Alternate Paths
              </h3>
            </div>
            <ul className="space-y-4">
              {branchingPaths.map(alt => (
                <li key={alt.id} className="flex items-start gap-3 text-sm md:text-base">
                  <span className="mt-1.5 inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--reader-alternate-indicator)" }} aria-hidden="true" />
                  <span>
                    <span className="text-muted-foreground mr-2">This story also branches:</span>
                    <Link
                      href={`/worlds/${worldId}/paths/${alt.id}`}
                      className="underline underline-offset-4 transition-colors"
                      style={{ fontFamily: "var(--reader-font-body)", color: "var(--reader-alternate-indicator)", textDecorationColor: "var(--reader-alternate-indicator)" }}
                    >
                      {alt.title}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ReaderLayout>
  );
}
