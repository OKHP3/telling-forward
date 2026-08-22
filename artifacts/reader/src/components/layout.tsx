import { type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export const readerThemes = [
  "editorial",
  "terminal",
  "archive",
  "dispatch",
  "signal",
] as const;

export type ReaderTheme = (typeof readerThemes)[number];

export function resolveReaderTheme(theme?: string | null): ReaderTheme {
  return readerThemes.includes(theme as ReaderTheme)
    ? (theme as ReaderTheme)
    : "editorial";
}

export function ReaderLayout({
  children,
  theme = "editorial",
}: {
  children: ReactNode;
  theme?: ReaderTheme;
}) {
  const { user, logout } = useAuth();

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center selection:bg-primary/20 transition-colors duration-500"
      data-reader-theme={theme}
      data-testid="reader-layout"
      style={{
        fontFamily: "var(--reader-font-ui)",
        backgroundColor: "var(--reader-bg)",
        color: "var(--reader-text)",
      }}
    >
      <header className="w-full border-b border-[color-mix(in_srgb,var(--tf-teal)_30%,transparent)] bg-[color-mix(in_srgb,var(--tf-paper)_90%,transparent)] mb-12 md:mb-20 shrink-0">
        <div className="mx-auto max-w-[var(--reader-line-length)] px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            data-testid="link-discovery-home"
            className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--tf-teal)] hover:text-[var(--tf-rust)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-orange)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--tf-paper)] rounded-sm"
          >
            Telling Forward
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <span
                  className="text-xs font-medium text-[var(--tf-teal)] hidden sm:block tracking-wide"
                  data-testid="text-signed-in-user"
                >
                  {user.displayName}
                </span>
                <button
                  onClick={() => logout()}
                  data-testid="button-sign-out"
                  className="text-xs font-semibold tracking-[0.1em] uppercase text-[var(--tf-teal)] hover:text-[var(--tf-rust)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-orange)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--tf-paper)] rounded-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                data-testid="link-sign-in"
                className="text-xs font-semibold tracking-[0.1em] uppercase text-[var(--tf-teal)] hover:text-[var(--tf-rust)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-orange)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--tf-paper)] rounded-sm"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="w-full flex-1 flex flex-col items-center px-6 pb-32">
        {children}
      </main>

      <footer className="w-full border-t border-border/20 py-12 shrink-0 text-center mt-auto">
        <p className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
          Telling Forward Archive
        </p>
      </footer>
    </div>
  );
}
