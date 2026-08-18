import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from '@/components/auth-modal';

export function Nav() {
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <nav className="h-[4.5rem] flex justify-between items-center border-b border-line px-5 sm:px-10">
        <Link href="/" className="flex items-center gap-4">
          <div className="w-[2.3rem] h-[2.3rem] border border-ink flex items-center justify-center font-mono text-[.68rem] tracking-[-.08em] shrink-0">
            TF/
          </div>
          <span className="font-serif text-[1.15rem] tracking-[.01em]">Telling Forward</span>
        </Link>

        <div className="flex items-center gap-[1.7rem]">
          <Link href="/" className="text-coral text-[.68rem] tracking-[.11em] uppercase py-[.45rem] font-mono hover:text-coral transition-colors">
            Archive
          </Link>

          {user ? (
            <>
              <span className="font-mono text-[.68rem] tracking-[.08em] text-ink/60 hidden sm:block">{user.displayName}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="font-mono text-[.68rem] tracking-[.1em] uppercase text-coral hover:opacity-70 transition-opacity cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="bg-ink text-paper border-0 px-[.9rem] py-[.65rem] font-mono text-[.68rem] tracking-[.1em] uppercase cursor-pointer hover:bg-ink/90 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
