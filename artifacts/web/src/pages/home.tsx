import { useListStoryworlds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { UserCircle, Clock, ChevronRight, GitBranch, Sparkles } from "lucide-react";
import { format } from "date-fns";

export function Home() {
  const { data: storyworlds, isLoading, isError } = useListStoryworlds();

  return (
    <div className="space-y-10">
      <section className="tf-hero rounded-[1.25rem]" aria-labelledby="hero-title">
        <div className="tf-hero-copy space-y-5">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tf-rust)]">
            <span className="tf-nucleus" aria-hidden="true" />
            A living story field
          </div>
          <h1 id="hero-title" className="text-4xl md:text-5xl font-serif text-foreground font-medium tracking-tight" data-testid="text-hero-title">
            Storyworlds
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed" data-testid="text-hero-subtitle">
            Discover evolving narratives, follow character paths, and explore alternate possibilities proposed by fellow storytellers.
          </p>
        </div>
      </section>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="skeleton-storyworlds">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-secondary/50 animate-pulse border border-border/50" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-8 text-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
          <p>We couldn't load the storyworlds at this time. Please try again later.</p>
        </div>
      )}

      {!isLoading && !isError && storyworlds?.length === 0 && (
          <div className="p-12 text-center rounded-lg border border-dashed border-[var(--tf-bond)]/40 flex flex-col items-center gap-4">
           <span className="tf-nucleus-mark" aria-hidden="true"><span /></span>
           <h3 className="text-lg font-serif font-medium text-foreground">No Storyworlds Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            The library is currently empty. Check back soon for new stories.
          </p>
        </div>
      )}

      {!isLoading && !isError && storyworlds && storyworlds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="list-storyworlds">
          {storyworlds.map((world) => (
            <Link 
              key={world.id} 
              href={`/worlds/${world.id}`}
               className="group block p-6 rounded-xl border border-[color-mix(in_srgb,var(--tf-teal)_22%,transparent)] bg-card hover:bg-[color-mix(in_srgb,var(--tf-amber)_10%,var(--tf-paper))] hover:border-[var(--tf-amber)] transition-all duration-300"
              data-testid={`card-storyworld-${world.id}`}
            >
              <div className="flex flex-col h-full gap-4">
                 <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between mb-2">
                     <span className="inline-flex items-center gap-2 text-[var(--tf-rust)] text-xs font-medium">
                       <span className="tf-nucleus" aria-hidden="true" />
                      <UserCircle className="h-3.5 w-3.5" />
                      World Steward: {world.repoOwner}
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif text-card-foreground font-medium group-hover:text-primary transition-colors">
                    {world.title}
                  </h2>
                  <div
                     className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--tf-teal)_10%,transparent)] text-[var(--tf-teal)] text-xs font-medium"
                    data-testid={`text-path-count-${world.id}`}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>
                      {world.pathCount === 0
                        ? "No paths yet"
                        : `${world.pathCount} ${world.pathCount === 1 ? "path" : "paths"}`}
                    </span>
                  </div>
                  <div
                     className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--tf-amber)_22%,transparent)] text-[var(--tf-espresso)] text-xs font-medium"
                    data-testid={`text-saved-moment-count-${world.id}`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {world.savedMomentCount === 0
                        ? world.pathCount === 0
                          ? "No saved moments yet"
                          : "Paths, no saved moments yet"
                        : `${world.savedMomentCount} saved ${world.savedMomentCount === 1 ? "moment" : "moments"}`}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/40 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>Updated {format(new Date(world.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <span>Enter</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
