/**
 * Scene Writer — /worlds/:worldId/scene-writer/:capsuleId
 *
 * Maturation (PME): streams an agent-assisted scene draft from a capsule via SSE,
 * then lets the author shape the prose before copying it into a contribution.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useListCapsules,
  getListCapsulesQueryKey,
  useGetStoryworld,
  getGetStoryworldQueryKey,
} from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCheck,
  Loader2,
  User,
  Flag,
  Zap,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Type metadata (mirrors concept-board.tsx)
// ---------------------------------------------------------------------------

const TYPE_META = {
  character: {
    icon:  User,
    label: "Character",
    badge: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800",
  },
  arc: {
    icon:  Flag,
    label: "Arc",
    badge: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
  },
  event: {
    icon:  Zap,
    label: "Event",
    badge: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/40 dark:border-purple-800",
  },
} as const;

// ---------------------------------------------------------------------------
// Rung badge (observation — never gates any action)
// ---------------------------------------------------------------------------

function MaturityRung({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="text-xs font-mono text-muted-foreground/70 bg-secondary/60 px-1.5 py-0.5 rounded border border-border/40">
      R{value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SceneWriter() {
  const params   = useParams();
  const worldId  = parseInt(params.worldId  ?? "0", 10);
  const capsuleId = parseInt(params.capsuleId ?? "0", 10);

  const { data: world } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) },
  });

  const { data: capsules, isLoading: isLoadingCapsules } = useListCapsules(worldId, {
    query: {
      enabled: !!worldId,
      queryKey: getListCapsulesQueryKey(worldId),
      staleTime: 30_000,
    },
  });
  const capsule = capsules?.find(c => c.id === capsuleId) ?? null;
  const capsuleAccessQuery = useQuery({
    queryKey: ["storyworld-capsule-access", worldId],
    enabled: !!worldId,
    retry: false,
    queryFn: async (): Promise<{ isSteward: boolean }> => {
      const response = await fetch(
        apiUrl(`/api/storyworlds/${worldId}/capsules/access`),
        { credentials: "include" },
      );
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { isSteward: false };
        }
        throw new Error("Could not check capsule access");
      }
      return response.json() as Promise<{ isSteward: boolean }>;
    },
  });
  const isSteward = capsuleAccessQuery.data?.isSteward === true;

  const [sceneTitle, setSceneTitle] = useState("");
  const [draft, setDraft]               = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!capsule) return;
    const requestedTitle =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("title")
        : null;
    setSceneTitle(requestedTitle?.trim() || capsule.title);
  }, [capsule?.id]);

  const handleGenerate = useCallback(async () => {
    if (!capsule || isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);
    setDraft("");

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(apiUrl(`/api/storyworlds/${worldId}/capsules/${capsuleId}/promote`), {
        method: "POST",
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setGenerateError(
          res.status === 403
            ? "You need steward access to use the Scene Writer."
            : "Generation failed — the AI layer may be unavailable. Try again.",
        );
        setIsGenerating(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(part.slice(6)) as {
              content?: string;
              done?: boolean;
              error?: string;
            };
            if (data.content) setDraft(prev => prev + data.content);
            if (data.done)    setIsGenerating(false);
            if (data.error)   setGenerateError(data.error);
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setGenerateError("Generation was interrupted. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [capsule, capsuleId, isGenerating, worldId]);

  function handleStop() {
    abortRef.current?.abort();
    setIsGenerating(false);
  }

  function handleCopy() {
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Loading / not-found guards ───────────────────────────────────────────

  if (isLoadingCapsules) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="text-center p-12 space-y-3">
        <p className="text-muted-foreground">Capsule not found on this board.</p>
        <Link
          href={`/worlds/${worldId}/board`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Concept Board
        </Link>
      </div>
    );
  }

  const meta     = TYPE_META[capsule.type as keyof typeof TYPE_META] ?? TYPE_META.character;
  const TypeIcon = meta.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/worlds/${worldId}`}
          className="hover:text-foreground transition-colors"
        >
          {world?.title ?? "Storyworld"}
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/worlds/${worldId}/board`}
          className="hover:text-foreground transition-colors"
        >
          Concept Board
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground truncate max-w-[16rem]">{capsule.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          <h1 className="font-serif text-3xl font-medium text-foreground">Scene Writer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isSteward
            ? "Generate an agent-assisted opening scene from this capsule, then shape it into your own prose."
            : "Use this prompt as a starting point, then write the scene in your own words."}
        </p>
      </header>

      <div className="max-w-2xl space-y-2">
        <label
          htmlFor="scene-title"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Scene title
        </label>
        <input
          id="scene-title"
          value={sceneTitle}
          onChange={e => setSceneTitle(e.target.value)}
          placeholder="Give this scene a title"
          className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-base font-serif text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="input-scene-title"
        />
      </div>

      {/* Body — two-column on large screens */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">

        {/* ── Capsule reference card ──────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border font-medium",
                meta.badge,
              )}>
                <TypeIcon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <MaturityRung value={capsule.maturity} />
            </div>

            <h2 className="font-serif text-lg font-medium text-foreground leading-snug">
              {capsule.title}
            </h2>

            {capsule.roleTag && (
              <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded block w-fit">
                {capsule.roleTag}
              </span>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Epiphany note
              </p>
              {capsule.epiphanyNote ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {capsule.epiphanyNote}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No epiphany note — the draft will lean on the name and type.
                </p>
              )}
            </div>
          </div>

          <Link
            href={`/worlds/${worldId}/board`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to board
          </Link>
        </aside>

        {/* ── Draft area ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {!isGenerating ? (
                isSteward && (
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {draft ? "Regenerate" : "Generate draft"}
                  </button>
                )
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  Stop
                </button>
              )}
              {isGenerating && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Drafting…
                </span>
              )}
            </div>

            {draft && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/60 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy draft
                  </>
                )}
              </button>
            )}
          </div>

          {generateError && (
            <p className="text-sm text-destructive">{generateError}</p>
          )}

          {/* Draft textarea */}
          <div className="relative">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={isGenerating
                ? ""
                : isSteward
                  ? 'Click "Generate draft" to get an agent-assisted opening scene, then shape it into your own prose.'
                  : "Write the opening scene inspired by this prompt."}
              className={cn(
                "w-full min-h-[480px] rounded-xl border border-input bg-background px-5 py-4",
                "text-sm text-foreground leading-relaxed font-serif",
                "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring",
                "resize-y transition-colors",
                isGenerating && "border-primary/30 bg-primary/[0.02]",
              )}
              readOnly={isGenerating}
            />
            {isGenerating && (
              <span className="absolute bottom-4 right-4 text-xs text-primary/50 animate-pulse select-none">
                Generating…
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {isSteward
              ? "This draft is raw material — edit it freely. When you're ready to submit prose as a path contribution, use the submission action below."
              : "This scene is your draft. Keep shaping it here, then use the submission flow when you're ready."}
          </p>
        </div>
      </div>
    </div>
  );
}
