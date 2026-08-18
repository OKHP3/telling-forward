import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { BookOpen, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: meData } = useGetMe({
    query: {
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-3 transition-colors hover:opacity-80" data-testid="link-home">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-serif text-xl font-medium tracking-tight text-primary">
              Telling Forward
            </span>
          </Link>

          {/* Primary nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link
              href="/"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/" ? "text-foreground bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
              data-testid="link-nav-storyworlds"
            >
              Storyworlds
            </Link>
            <Link
              href="/submissions"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/submissions" ? "text-foreground bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
              data-testid="link-nav-submissions"
            >
              Submissions
            </Link>
          </nav>

          {/* Right rail: theme toggle + user/settings */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {meData?.user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-username">
                  <span className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">
                    {meData.user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline-block text-sm">{meData.user.displayName}</span>
                </div>
                <Link
                  href="/settings"
                  aria-label="Settings"
                  title="Settings"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    location === "/settings"
                      ? "bg-accent/60 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                  data-testid="link-settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground ml-1" data-testid="text-guest">
                Guest Reader
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-border/40 py-8 md:py-12 mt-12">
        <div className="container mx-auto max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 opacity-50" />
            <span>© {new Date().getFullYear()} Telling Forward</span>
          </div>
          <p className="italic font-serif">A quiet place for stories to grow.</p>
        </div>
      </footer>
    </div>
  );
}
