import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'sign-in' | 'register';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsPending(true);
    try {
      if (tab === 'sign-in') {
        await login({ email, password });
      } else {
        await register({ email, password, displayName });
      }
      reset();
      onClose();
    } catch (err: unknown) {
      const raw = err as { data?: { error?: string }; message?: string };
      setError(raw?.data?.error ?? raw?.message ?? 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {tab === 'sign-in' ? 'Sign in to Telling Forward' : 'Create an account'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 rounded-md border border-border overflow-hidden text-sm">
          {(['sign-in', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`py-2 transition-colors ${
                tab === t
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'sign-in' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {tab === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={1}
                placeholder="Your name"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              autoComplete={tab === 'sign-in' ? 'current-password' : 'new-password'}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity mt-1"
          >
            {isPending
              ? 'Please wait…'
              : tab === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
