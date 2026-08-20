import { useListStoryworlds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { BookOpen, UserCircle, Clock, ChevronRight, GitBranch, Sparkles } from "lucide-react";
import { format } from "date-fns";

export function Home() {
  const { data: storyworlds, isLoading, isError } = useListStoryworlds();

  return (
    <div className="space-y-12">
      <section className="space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-serif text-foreground font-medium tracking-tight" data-testid="text-hero-title">
          Storyworlds
        </h1>
        <p className="text-lg text-muted-foreground font-sans leading-relaxed" data-testid="text-hero-subtitle">
          Discover evolving narratives, follow character paths, and explore alternate possibilities proposed by fellow storytellers.
        </p>
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
        <div className="p-12 text-center rounded-lg border border-dashed border-border flex flex-col items-center gap-3">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
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
              className="group block p-6 rounded-xl border border-border/60 bg-card hover:bg-accent/30 hover:border-primary/30 transition-all duration-300"
              data-testid={`card-storyworld-${world.id}`}
            >
              <div className="flex flex-col h-full gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <UserCircle className="h-3.5 w-3.5" />
                      World Steward: {world.repoOwner}
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif text-card-foreground font-medium group-hover:text-primary transition-colors">
                    {world.title}
                  </h2>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
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
