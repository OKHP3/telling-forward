import { useListStoryworlds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ReaderLayout } from "@/components/layout";

export default function DiscoveryPage() {
  const { data: worlds, isLoading, error } = useListStoryworlds();

  return (
    <ReaderLayout>
      <div className="w-full max-w-[var(--reader-line-length)]">
        <header
          className="reader-entry-hero mb-20 md:mb-32 animate-reveal"
          style={{
            "--reader-entry-bg-desktop": `url("${import.meta.env.BASE_URL}background-desktop-2560x1440.png")`,
            "--reader-entry-bg-mobile": `url("${import.meta.env.BASE_URL}background-mobile-1290x2796.png")`,
          } as React.CSSProperties}
        >
          <div className="reader-entry-copy">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--tf-rust)]">
              <span className="reader-nucleus" aria-hidden="true" />
              A living story field
            </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6 font-normal"
            style={{ fontFamily: "var(--app-font-serif)" }}
          >
            Storyworlds
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--reader-font-body)" }}>
            Explore collaborative fictions, told forward.
          </p>
          </div>
        </header>

        {isLoading && (
          <div className="space-y-12 animate-pulse" data-testid="status-worlds-loading" aria-live="polite">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-8 bg-muted/40 w-1/3 rounded-sm" />
                <div className="h-4 bg-muted/20 w-2/3 rounded-sm" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            className="text-destructive py-12 border-y border-destructive/20 text-center text-lg animate-reveal"
            data-testid="status-worlds-error"
            role="alert"
          >
            Unable to load storyworlds. Please try again later.
          </div>
        )}

        <div className="flex flex-col gap-16 md:gap-24">
          {worlds?.map((world, idx) => (
            <Link
              key={world.id}
              href={`/worlds/${world.id}`}
              data-testid={`link-storyworld-${world.id}`}
              className="group block outline-none animate-reveal"
              style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
            >
              <article className="relative" data-testid={`card-storyworld-${world.id}`}>
                <div className="absolute -inset-y-6 -inset-x-8 md:-inset-x-12 z-0 scale-95 opacity-0 transition-all duration-500 ease-out bg-[color-mix(in_srgb,var(--tf-amber)_12%,transparent)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 group-focus-visible:ring-2 group-focus-visible:ring-[var(--tf-teal)] rounded-lg" />
                <div className="relative z-10">
                  <header className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 md:gap-6 mb-4">
                    <h2
                      className="text-2xl md:text-3xl lg:text-4xl font-normal group-hover:text-[var(--tf-rust)] transition-colors duration-300"
                      style={{ fontFamily: "var(--reader-font-body)" }}
                    >
                      {world.title}
                    </h2>
                    <span
                      className="reader-strand text-xs font-semibold tracking-[0.1em] text-[var(--tf-teal)] uppercase shrink-0"
                      data-testid={`text-world-activity-${world.id}`}
                    >
                      Updated {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(world.updatedAt))}
                    </span>
                  </header>
                  {world.seed ? (
                    <p
                      className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-[55ch]"
                      style={{ fontFamily: "var(--reader-font-body)" }}
                    >
                      {world.seed}
                    </p>
                  ) : (
                    <p
                      className="text-muted-foreground/60 text-lg md:text-xl leading-relaxed italic max-w-[55ch]"
                      style={{ fontFamily: "var(--reader-font-body)" }}
                    >
                      A world taking shape...
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}

          {worlds?.length === 0 && (
            <div
              className="text-muted-foreground italic text-center py-24 text-xl animate-reveal"
              data-testid="status-worlds-empty"
              style={{ fontFamily: "var(--reader-font-body)" }}
            >
              No storyworlds have been inscribed yet.
            </div>
          )}
        </div>
      </div>
    </ReaderLayout>
  );
}
