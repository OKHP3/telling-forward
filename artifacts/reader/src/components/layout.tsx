import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "@/components/auth-modal";

export function ReaderLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center selection:bg-primary/20"
      style={{
        fontFamily: "var(--reader-font-ui)",
        backgroundColor: "var(--reader-bg)",
        color: "var(--reader-text)",
      }}
    >
      <header className="w-full border-b border-border/40 mb-8 md:mb-16">
        <div className="mx-auto max-w-[var(--reader-line-length)] px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors">
            Telling Forward
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">{user.displayName}</span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="text-sm font-medium tracking-wide uppercase text-muted-foreground hover:text-primary transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full flex-1 flex flex-col items-center px-4 pb-24">
        {children}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
