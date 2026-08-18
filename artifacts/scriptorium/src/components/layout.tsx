import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-primary/10 relative z-10 bg-background/50 backdrop-blur-sm">
        <Link href="/" className="flex items-baseline gap-3 group">
          <span className="font-serif text-xl text-primary tracking-wide whitespace-nowrap group-hover:text-amber-400 transition-colors">Telling Forward</span>
          <span className="font-mono text-[10px] text-[#1c3a34] bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-sm tracking-widest hidden sm:inline-block">SCRIPTORIUM EDITION</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          {['Worlds', 'Paths', 'Archive'].map(nav => (
            <Link key={nav} href="/" className="font-sans text-[0.7rem] md:text-[0.8rem] font-medium text-muted-foreground tracking-widest uppercase cursor-pointer hover:text-foreground transition-colors duration-150">
              {nav}
            </Link>
          ))}
          <span className="text-muted-foreground/20 text-xs hidden md:block">│</span>
          {user ? (
            <>
              <span className="font-mono text-[0.7rem] text-muted-foreground tracking-widest hidden md:block">{user.displayName}</span>
              <button
                onClick={() => logout()}
                className="font-mono text-[0.7rem] text-primary hover:opacity-70 tracking-widest uppercase transition-opacity"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="font-mono text-[0.7rem] font-medium text-primary tracking-widest uppercase hover:opacity-70 transition-opacity"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10 w-full mx-auto pb-32">
        {children}
      </main>

      <footer className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 flex flex-col sm:flex-row justify-between items-center border-t border-primary/10 pt-4 z-10 gap-2">
        <span className="font-mono text-[0.6rem] text-muted-foreground tracking-wider">Built by <span className="text-primary">OverKill Hill P³</span></span>
        <span className="font-mono text-[0.6rem] text-muted-foreground tracking-wider">© 2026 · overkillhill.com</span>
      </footer>
    </div>
  );
}
