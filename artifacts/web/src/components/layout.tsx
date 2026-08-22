import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Bell, BookOpen, Settings, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  getGetMeQueryKey,
  useGetMe,
  useLogout,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadCount } from "@/hooks/use-unread-count";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: meData } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
      },
    },
  });
  const user = meData?.user ?? null;
  const { data: unreadCount = 0 } = useUnreadCount(!!user);

  async function handleLogout() {
    await logoutMutation.mutateAsync();
  }

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <header className="tf-editorial-header sticky top-0 z-50 w-full">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-3 transition-colors hover:opacity-80" data-testid="link-home">
            <div className="tf-nucleus-mark h-8 w-8 border-0 bg-transparent shadow-none">
              <span aria-hidden="true" />
            </div>
            <span className="font-sans text-sm font-semibold tracking-[0.18em] uppercase text-[var(--tf-paper)]">
              Telling Forward
            </span>
          </Link>

          {/* Primary nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link
              href="/"
              className={cn(
                 "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                 location === "/" ? "tf-nav-active" : "opacity-75 hover:opacity-100 hover:bg-white/10"
              )}
              data-testid="link-nav-storyworlds"
            >
              Storyworlds
            </Link>
            <Link
              href="/submissions"
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                 location === "/submissions" ? "tf-nav-active" : "opacity-75 hover:opacity-100 hover:bg-white/10"
              )}
              data-testid="link-nav-submissions"
            >
              Submissions
            </Link>
          </nav>

          {/* Right rail */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-username">
                  <span className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline-block text-sm">{user.displayName}</span>
                </div>
                <Link
                  href="/inbox"
                  aria-label={
                    unreadCount > 0
                      ? `Story updates — ${unreadCount} unread`
                      : "Story updates"
                  }
                  title={
                    unreadCount > 0
                      ? `Story updates — ${unreadCount} unread`
                      : "Story updates"
                  }
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    location === "/inbox"
                      ? "bg-accent/60 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                  data-testid="link-inbox"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-full border border-background bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground"
                      style={{ height: "1.1rem" }}
                      aria-hidden="true"
                      data-testid="inbox-unread-count"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
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
                <button
                  onClick={() => void handleLogout()}
                  disabled={logoutMutation.isPending}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="ml-1 flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
                  data-testid="text-guest"
                >
                  Guest Reader
                </Link>
                <Link
                  href="/sign-in"
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  data-testid="button-sign-in"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="tf-bond-divider flex-1 container mx-auto max-w-6xl border-l border-r px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-[color-mix(in_srgb,var(--tf-teal)_28%,transparent)] py-8 md:py-12 mt-12">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
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
