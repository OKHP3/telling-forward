import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import mermaid from "mermaid";
import {
  ArrowLeft,
  GitBranch,
  Compass,
  CircleDot,
  ExternalLink,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  getGetStoryworldQueryKey,
  getListStoryPathsQueryKey,
  isAlternateState,
  useGetStoryworld,
  useListStoryPaths,
} from "@workspace/api-client-react";
import { isNotFoundApiError, StoryLinkRecovery } from "@/components/story-link-recovery";
import { cn } from "@/lib/utils";

const labelForState = (state: string) => {
  if (state === "published-canon" || state === "open") return "Canon";
  if (state === "published-alternate") return "Alternate";
  if (state === "proposed") return "Proposed";
  return "Personal";
};

const escapeLabel = (value: string) =>
  value.replace(/["\\]/g, "").replace(/\r?\n/g, " ").slice(0, 28);

const commitIdForPath = (pathId: number) => `plotline_${pathId}`;

export function StoryGraph() {
  const { worldId: rawWorldId } = useParams();
  const worldId = Number(rawWorldId);
  const validId = Number.isSafeInteger(worldId) && worldId > 0;
  const worldQuery = useGetStoryworld(worldId, {
    query: { enabled: validId, queryKey: getGetStoryworldQueryKey(worldId), retry: false },
  });
  const pathsQuery = useListStoryPaths(worldId, {
    query: { enabled: validId, queryKey: getListStoryPathsQueryKey(worldId), retry: false },
  });
  const world = worldQuery.data;
  const paths = pathsQuery.data;
  const notFound = !validId || isNotFoundApiError(worldQuery.error) || isNotFoundApiError(pathsQuery.error) ||
    (!worldQuery.isLoading && !world && !worldQuery.isError);

  if (notFound) return <StoryLinkRecovery kind="not-found" subject="storyworld" />;
  if (worldQuery.error || pathsQuery.error) {
    return <StoryLinkRecovery kind="error" subject="storyworld" onRetry={() => void Promise.all([worldQuery.refetch(), pathsQuery.refetch()])} />;
  }
  if (worldQuery.isLoading || pathsQuery.isLoading) return <GraphSkeleton />;
  if (!world) return <StoryLinkRecovery kind="not-found" subject="storyworld" />;

  return <GraphContent world={world} paths={paths ?? []} worldId={worldId} />;
}

function GraphContent({ world, paths, worldId }: { world: any; paths: any[]; worldId: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const canon = paths.filter((path) => !isAlternateState(path.state));
  const alternate = paths.filter((path) => isAlternateState(path.state));
  const selected = paths.find((path) => path.id === selectedId);
  const graphRef = useRef<HTMLDivElement>(null);
  const graphDefinition = useMemo(() => {
    const ordered = [...paths].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lines = ["gitGraph", '  commit id: "Beginning" tag: "Shared seed"'];
    const branches = new Set<string>();
    ordered.forEach((path) => {
      const branch = `path_${path.id}`;
      const parent = path.originPathId && branches.has(`path_${path.originPathId}`) ? `path_${path.originPathId}` : "main";
      lines.push(`  checkout ${parent}`);
      if (!branches.has(branch)) {
        lines.push(`  branch ${branch}`);
        lines.push(`  checkout ${branch}`);
        branches.add(branch);
      }
      lines.push(
        `  commit id: "${commitIdForPath(path.id)}" tag: "${escapeLabel(path.title)}"`,
      );
    });
    return lines.join("\n");
  }, [paths]);

  useEffect(() => {
    let alive = true;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: document.documentElement.classList.contains("dark") ? "dark" : "base",
      themeVariables: {
        primaryColor: "#e8e0d3",
        primaryTextColor: "#302d29",
        primaryBorderColor: "#aa8060",
        lineColor: "#b6a38e",
        secondaryColor: "#e4edf0",
        tertiaryColor: "#f4eee6",
      },
    });
    mermaid.render(`story-graph-${worldId}`, graphDefinition).then(({ svg }) => {
      if (!alive || !graphRef.current) return;

      graphRef.current.innerHTML = svg;
      const graphNodes = graphRef.current.querySelectorAll<SVGElement>(
        '[class*="plotline_"]',
      );

      graphNodes.forEach((node) => {
        const pathId = Number(
          node.getAttribute("class")?.match(/plotline_(\d+)/)?.[1],
        );
        const path = paths.find((candidate) => candidate.id === pathId);
        if (!path || !Number.isSafeInteger(pathId)) return;

        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.setAttribute(
          "aria-label",
          `Select ${path.title} plotLINE and open its reading link`,
        );
        node.dataset.pathId = String(pathId);
        node.classList.add("story-graph-node");

        const selectPath = () => setSelectedId(pathId);
        node.addEventListener("click", selectPath);
        node.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectPath();
          }
        });
      });
    }).catch(() => {
      if (alive && graphRef.current) graphRef.current.textContent = "The story graph could not be drawn.";
    });
    return () => { alive = false; };
  }, [graphDefinition, paths, worldId]);

  useEffect(() => {
    graphRef.current?.querySelectorAll<SVGElement>("[data-path-id]").forEach((node) => {
      const isSelected = Number(node.dataset.pathId) === selectedId;
      node.dataset.selected = String(isSelected);
      const shapes = node.matches("circle, rect")
        ? [node]
        : [...node.querySelectorAll<SVGElement>("circle, rect")];
      shapes.forEach((shape) => {
        shape.style.strokeWidth = isSelected ? "4px" : "";
      });
    });
  }, [selectedId]);

  const retry = () => setSelectedId(null);
  return (
    <div className="space-y-10" data-testid="page-story-graph">
      <div>
        <Link href={`/worlds/${worldId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-world">
          <ArrowLeft className="h-4 w-4" /> Back to {world.title}
        </Link>
        <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <GitBranch className="h-4 w-4" /> Story graph
            </div>
            <h1 className="text-4xl font-serif font-medium leading-tight md:text-5xl">Every path begins somewhere.</h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Follow {world.title} as it grows. Solid paths belong to the shared story; quieter branches are possibilities still finding their shape.
            </p>
          </header>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground" data-testid="text-graph-count">
            <CircleDot className="h-3.5 w-3.5 text-primary" /> {paths.length} {paths.length === 1 ? "path" : "paths"} in this world
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm" aria-labelledby="graph-heading">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
          <div>
            <h2 id="graph-heading" className="font-serif text-xl">The branching history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a plotted node or a path below to open its reading route.</p>
          </div>
          <button type="button" onClick={retry} className="inline-flex items-center gap-2 self-start rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" data-testid="button-reset-selection">
            <RotateCcw className="h-3.5 w-3.5" /> Clear selection
          </button>
        </div>
        <div className="graph-scroll min-h-[360px] overflow-x-auto px-3 py-8 sm:px-8" aria-label="Mermaid Git Graph">
          <div ref={graphRef} className="story-mermaid flex min-w-[680px] justify-center [&_svg]:max-w-none" data-testid="visual-story-graph" />
        </div>
        <div className="border-t border-border/60 bg-muted/20 px-5 py-3 text-xs leading-relaxed text-muted-foreground md:px-7">
          Branch colors distinguish plotted routes only. Editorial status is shown in each path card below.
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-4" aria-labelledby="paths-heading">
          <div className="flex items-end justify-between">
            <div>
              <h2 id="paths-heading" className="font-serif text-2xl">Choose a path</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select a branch to read its current story.</p>
            </div>
            <Compass className="h-5 w-5 text-primary/70" />
          </div>
          <div className="grid gap-3">
            {[...canon, ...alternate].map((path) => (
              <button type="button" key={path.id} onClick={() => setSelectedId(path.id)} className={cn("group flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm", selectedId === path.id ? "border-primary ring-2 ring-primary/15" : "border-border/70", isAlternateState(path.state) && "border-dashed")} data-testid={`button-select-path-${path.id}`} aria-pressed={selectedId === path.id}>
                <span className="min-w-0">
                  <span className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", isAlternateState(path.state) ? "bg-sky-400" : "bg-primary")} /> {labelForState(path.state)}</span>
                  <span className="block truncate font-serif text-lg group-hover:text-primary">{path.title}</span>
                </span>
                <ExternalLink className="ml-4 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
            {paths.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">This world has no paths to map yet.</div>}
          </div>
        </section>
        <aside className="h-fit rounded-xl border border-primary/15 bg-primary/[0.04] p-5">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="mt-4 font-serif text-xl">How to read this</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The beginning is the shared seed. Each new branch is a different answer to what might happen next. Nothing here exposes the machinery behind the story.</p>
          {selected && <Link href={`/worlds/${worldId}/paths/${selected.id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" data-testid={`link-read-selected-${selected.id}`}>Read {selected.title}<ExternalLink className="h-3.5 w-3.5" /></Link>}
        </aside>
      </div>
    </div>
  );
}

function GraphSkeleton() {
  return <div className="space-y-8 animate-pulse" aria-live="polite" data-testid="status-graph-loading"><div className="h-4 w-28 rounded bg-secondary" /><div className="h-20 w-2/3 rounded bg-secondary/70" /><div className="h-[380px] rounded-2xl bg-secondary/40" /><div className="h-16 rounded-xl bg-secondary/50" /></div>;
}