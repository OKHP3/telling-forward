import { useListStoryworlds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ReaderLayout } from "@/components/layout";

export default function DiscoveryPage() {
  const { data: worlds, isLoading, error } = useListStoryworlds();

  return (
    <ReaderLayout>
      <div className="w-full max-w-[var(--reader-line-length)]">
        <header className="mb-16">
          <h1
            className="text-4xl md:text-5xl tracking-tight mb-4"
            style={{ fontFamily: "var(--reader-font-body)" }}
          >
            Storyworlds
          </h1>
          <p className="text-lg text-muted-foreground" style={{ fontFamily: "var(--reader-font-body)" }}>
            Explore collaborative fictions, told forward.
          </p>
        </header>

        {isLoading && (
          <div className="space-y-8 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-sm w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-destructive py-8 border-y border-destructive/20 text-center">
            Unable to load storyworlds.
          </div>
        )}

        <div className="flex flex-col gap-12">
          {worlds?.map((world) => (
            <Link key={world.id} href={`/worlds/${world.id}`} className="group block">
              <article className="transition-transform group-hover:-translate-y-1">
                <h2
                  className="text-2xl md:text-3xl mb-3 group-hover:text-primary transition-colors"
                  style={{ fontFamily: "var(--reader-font-body)" }}
                >
                  {world.title}
                </h2>
                {world.seed && (
                  <p
                    className="text-muted-foreground text-lg leading-relaxed max-w-prose"
                    style={{ fontFamily: "var(--reader-font-body)" }}
                  >
                    {world.seed}
                  </p>
                )}
              </article>
            </Link>
          ))}

          {worlds?.length === 0 && (
            <div className="text-muted-foreground italic text-center py-16" style={{ fontFamily: "var(--reader-font-body)" }}>
              No storyworlds found.
            </div>
          )}
        </div>
      </div>
    </ReaderLayout>
  );
}
