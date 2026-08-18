import { type ReactNode } from "react";
import { Link } from "wouter";

export function ReaderLayout({ children }: { children: ReactNode }) {
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
        </div>
      </header>
      <main className="w-full flex-1 flex flex-col items-center px-4 pb-24">
        {children}
      </main>
    </div>
  );
}
