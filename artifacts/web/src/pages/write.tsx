import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListStoryworldsQueryKey,
  useListStoryworlds,
  useRegisterStoryworld,
} from "@workspace/api-client-react";
import { ArrowRight, BookOpen, CheckCircle2, GitBranch, Github, Lightbulb, Loader2, Mic2, PenLine, ShieldCheck } from "lucide-react";

type ToolCardProps = {
  id?: string;
  icon: typeof PenLine;
  title: string;
  description: string;
  href: (worldId: number) => string;
  worlds: Array<{ id: number; title: string }>;
};

function ToolCard({ id, icon: Icon, title, description, href, worlds }: ToolCardProps) {
  return (
    <section id={id} className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h2 className="font-serif text-xl text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {worlds.map((world) => (
          <Link key={world.id} href={href(world.id)} className="group flex items-center justify-between rounded-lg border border-border/60 px-3.5 py-3 text-sm hover:border-primary/40 hover:bg-accent/40">
            <span className="flex min-w-0 items-center gap-2"><BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="truncate">{world.title}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
        {!worlds.length && <p className="rounded-lg border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">No accessible storyworlds yet. This tool will appear here when one is registered.</p>}
      </div>
    </section>
  );
}

function registrationError(error: unknown): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === "string"
    ? data.error
    : "Registration could not be completed. Check the repository and try again.";
}

function StoryworldRegistration() {
  const queryClient = useQueryClient();
  const register = useRegisterStoryworld();
  const [repository, setRepository] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    register.mutate(
      { data: { repository: repository.trim(), rightsConfirmed } },
      {
        onSuccess: async (world) => {
          setRepository("");
          setRightsConfirmed(false);
          setSuccess(`${world.title} is registered and ready for the Author workspace.`);
          await queryClient.invalidateQueries({ queryKey: getListStoryworldsQueryKey() });
        },
      },
    );
  };

  return (
    <section className="rounded-xl border border-[var(--tf-amber)]/40 bg-[var(--tf-amber)]/10 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tf-rust)]" />
        <div className="min-w-0">
          <h2 className="font-serif text-xl text-foreground">Register a storyworld</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            A steward can index an existing GitHub repository after its Storyworld Kit and rights boundary have been checked. This never creates or changes a repository.
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="storyworld-repository" className="text-sm font-medium text-foreground">
            GitHub repository
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:ring-1 focus-within:ring-ring">
            <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              id="storyworld-repository"
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
              placeholder="https://github.com/owner/storyworld"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              required
              disabled={register.isPending}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Use a GitHub URL or an owner/name reference.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tf-rust)]"
            disabled={register.isPending}
          />
          <span className="text-sm leading-6 text-foreground">
            I am the steward for this world, and I have checked that the repository content is authorized for this storyworld.
          </span>
        </label>

        {register.isError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {registrationError(register.error)}
          </p>
        )}
        {success && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending || !repository.trim() || !rightsConfirmed}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {register.isPending ? "Checking repository…" : "Register existing repository"}
        </button>
        <p className="text-xs text-muted-foreground">Only authenticated stewards can complete registration. Invalid or duplicate repositories are not indexed.</p>
      </form>
    </section>
  );
}

export function Write() {
  const { data: storyworlds, isLoading, isError } = useListStoryworlds({ query: { retry: false, queryKey: getListStoryworldsQueryKey() } });
  const worlds = useMemo(() => (storyworlds ?? []).map((world) => ({ id: world.id, title: world.title })), [storyworlds]);

  return (
    <div className="mx-auto max-w-5xl space-y-9">
      <header className="tf-hero rounded-[1.25rem] !min-h-0">
        <div className="tf-hero-copy space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tf-rust)]"><span className="tf-nucleus" /> Author workspace</div>
          <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl">Make the next mark.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">One place for ideas, scenes, paths, and the quiet work around them. Choose a storyworld before opening a world-specific tool.</p>
        </div>
      </header>

      {isError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Storyworlds could not be loaded. Try again before opening a writing tool.</p>}
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-secondary/40" /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ToolCard id="concept-board" icon={Lightbulb} title="Concept Board" description="Capture characters, arcs, events, and the epiphany notes that give an idea a pulse." href={(id) => `/worlds/${id}/board`} worlds={worlds} />
          <ToolCard icon={PenLine} title="Scene Writer" description="Turn a board capsule into a scene draft, then shape and submit your own prose." href={(id) => `/worlds/${id}/board`} worlds={worlds} />
          <ToolCard id="story-graph" icon={GitBranch} title="Story Graph" description="See how each storyworld’s canon and alternate paths branch and connect." href={(id) => `/worlds/${id}/graph`} worlds={worlds} />
          <section className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-sm">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Mic2 className="h-5 w-5" /></div><div><h2 className="font-serif text-xl text-foreground">Transcription</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Bring a supported audio file into a text draft. Nothing is published automatically.</p></div></div>
            <Link href="/write/transcribe" className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Open transcription <ArrowRight className="h-4 w-4" /></Link>
            <p className="mt-3 text-xs text-muted-foreground">Input: audio file · Output: editable transcript</p>
          </section>
        </div>
      )}

      <StoryworldRegistration />
    </div>
  );
}