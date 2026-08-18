import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStoryworld,
  getGetStoryworldQueryKey,
  useListCapsules,
  getListCapsulesQueryKey,
  useCreateCapsule,
  useUpdateCapsule,
  useDeleteCapsule,
} from "@workspace/api-client-react";
import type { Capsule } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Plus,
  User,
  Flag,
  Zap,
  ChevronRight,
  Sparkles,
  Pencil,
  Archive,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Type metadata
// ---------------------------------------------------------------------------

const TYPE_META = {
  character: {
    icon:  User,
    label: "Character",
    card:  "border-l-blue-400 dark:border-l-blue-500",
    badge: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800",
    dot:   "bg-blue-400",
  },
  arc: {
    icon:  Flag,
    label: "Arc",
    card:  "border-l-amber-400 dark:border-l-amber-500",
    badge: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    dot:   "bg-amber-400",
  },
  event: {
    icon:  Zap,
    label: "Event",
    card:  "border-l-purple-400 dark:border-l-purple-500",
    badge: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/40 dark:border-purple-800",
    dot:   "bg-purple-400",
  },
} as const;

type CapsuleType = keyof typeof TYPE_META;

// ---------------------------------------------------------------------------
// Capsule card
// ---------------------------------------------------------------------------

function CapsuleCard({
  capsule,
  worldId,
  isExpanded,
  onToggle,
  onDeleted,
}: {
  capsule: Capsule;
  worldId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const meta = TYPE_META[capsule.type as CapsuleType] ?? TYPE_META.character;
  const TypeIcon = meta.icon;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(capsule.title);
  const [editNote, setEditNote] = useState(capsule.epiphanyNote ?? "");
  const [editRole, setEditRole] = useState(capsule.roleTag ?? "");

  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCapsulesQueryKey(worldId) });
        setEditing(false);
        toast({ title: "Capsule updated" });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const { mutate: deleteCapsule, isPending: isDeleting } = useDeleteCapsule({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCapsulesQueryKey(worldId) });
        onDeleted();
        toast({ title: "Capsule archived" });
      },
      onError: () => toast({ title: "Archive failed", variant: "destructive" }),
    },
  });

  function handleSaveEdit() {
    if (!editTitle.trim()) return;
    updateCapsule({
      id: worldId,
      capsuleId: capsule.id,
      data: {
        title: editTitle.trim(),
        epiphanyNote: editNote || null,
        roleTag: editRole.trim() || null,
      },
    });
  }

  function handleArchive() {
    if (!confirm(`Archive "${capsule.title}"? It will be closed on GitHub and hidden from the board.`)) return;
    deleteCapsule({ id: worldId, capsuleId: capsule.id });
  }

  const expanded = isExpanded;

  return (
    <div
      className={cn(
        "group bg-card border border-l-4 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md",
        meta.card,
        expanded ? "col-span-full shadow-lg" : "cursor-pointer hover:border-primary/40"
      )}
      onClick={!expanded ? onToggle : undefined}
    >
      {/* Card header (always visible) */}
      <div className={cn("p-4 flex items-start justify-between gap-3", expanded && "border-b border-border/40")}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
            meta.badge
          )}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditing(false); }}
                className="w-full text-base font-serif font-medium bg-transparent border-b border-primary focus:outline-none pb-0.5"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h3 className="text-base font-serif font-medium text-foreground leading-snug line-clamp-2">
                {capsule.title}
              </h3>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", meta.badge)}>
                {meta.label}
              </span>
              {capsule.roleTag && !editing && (
                <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded">
                  {capsule.roleTag}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent/50 text-muted-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-90")} />
        </button>
      </div>

      {/* Epiphany note preview (collapsed) */}
      {!expanded && capsule.epiphanyNote && (
        <p className="px-4 pb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {capsule.epiphanyNote}
        </p>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="p-5 grid md:grid-cols-[1fr_auto] gap-6">
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Role tag
                  </label>
                  <input
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    placeholder="e.g. protagonist, antagonist, mentor"
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Epiphany note
                  </label>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    rows={5}
                    placeholder="What makes this capsule interesting? What's the story opportunity here?"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleSaveEdit(); }}
                    disabled={isUpdating || !editTitle.trim()}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setEditing(false); setEditTitle(capsule.title); setEditNote(capsule.epiphanyNote ?? ""); setEditRole(capsule.roleTag ?? ""); }}
                    className="h-8 px-3 rounded-md border border-input text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Epiphany note
                </p>
                {capsule.epiphanyNote ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                    {capsule.epiphanyNote}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No epiphany note yet — what's the story opportunity here?
                  </p>
                )}
              </div>
            )}
          </div>

          {!editing && (
            <div className="flex md:flex-col gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); /* Promote to Scene Writer placeholder */ toast({ title: "Scene Writer", description: "Scene Writer is coming in the next release." }); }}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                Promote to Scene Writer
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditing(true); }}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 text-muted-foreground text-sm hover:bg-accent/40 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Edit
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleArchive(); }}
                disabled={isDeleting}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 text-muted-foreground text-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5 shrink-0" />}
                Archive
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creation form card
// ---------------------------------------------------------------------------

function CreateCapsuleCard({
  worldId,
  onDone,
}: {
  worldId: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CapsuleType>("character");
  const [roleTag, setRoleTag] = useState("");
  const [note, setNote] = useState("");

  const { mutate: createCapsule, isPending } = useCreateCapsule({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCapsulesQueryKey(worldId) });
        onDone();
        toast({ title: "Capsule sketched" });
      },
      onError: () => toast({ title: "Could not create capsule", variant: "destructive" }),
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createCapsule({
      id: worldId,
      data: {
        title: title.trim(),
        type,
        ...(roleTag.trim() && { roleTag: roleTag.trim() }),
        ...(note.trim() && { epiphanyNote: note.trim() }),
      },
    });
  }

  const meta = TYPE_META[type];

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "col-span-full bg-card border border-l-4 rounded-xl p-5 space-y-4",
        meta.card
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-medium text-foreground">New capsule</h3>
        <button
          type="button"
          onClick={onDone}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Character name, arc title, or event description"
            required
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Type <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["character", "arc", "event"] as CapsuleType[]).map(t => {
              const m = TYPE_META[t];
              const Icon = m.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                    type === t
                      ? cn("border-current", m.badge)
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Role tag
          </label>
          <input
            value={roleTag}
            onChange={e => setRoleTag(e.target.value)}
            placeholder="protagonist, mentor, catalyst…"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Epiphany note
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="The insight, the story opportunity, the thing that makes this interesting…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-9 px-4 rounded-md border border-input text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Sketch capsule
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Filter pill
// ---------------------------------------------------------------------------

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary/50 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ConceptBoard() {
  const params = useParams();
  const worldId = params.worldId ? parseInt(params.worldId, 10) : 0;

  const { data: world } = useGetStoryworld(worldId, {
    query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) },
  });

  const { data: capsules = [], isLoading, error } = useListCapsules(worldId, {
    query: {
      enabled: !!worldId,
      queryKey: getListCapsulesQueryKey(worldId),
      staleTime: 30_000,
    },
  });

  const [filterType, setFilterType] = useState<CapsuleType | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = filterType === "all"
    ? capsules
    : capsules.filter(c => c.type === filterType);

  const counts = {
    all: capsules.length,
    character: capsules.filter(c => c.type === "character").length,
    arc: capsules.filter(c => c.type === "arc").length,
    event: capsules.filter(c => c.type === "event").length,
  };

  function handleToggle(id: number) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/worlds/${worldId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {world?.title ?? "Storyworld"}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Concept Board
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sketch the shape of your storyworld — characters, arcs, and events as index cards
            </p>
          </div>
          <button
            onClick={() => { setCreating(true); setExpandedId(null); }}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New capsule</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <FilterPill active={filterType === "all"} onClick={() => setFilterType("all")}>
          All ({counts.all})
        </FilterPill>
        {(["character", "arc", "event"] as CapsuleType[]).map(t => (
          <FilterPill key={t} active={filterType === t} onClick={() => setFilterType(t)}>
            {TYPE_META[t].label} ({counts[t]})
          </FilterPill>
        ))}
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border/40 bg-secondary/20 animate-pulse" />
          ))}
        </div>
      ) : error && (error as { status?: number }).status === 403 ? (
        <div className="p-16 text-center rounded-xl border border-dashed border-border/40">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg font-medium mb-2">Stewards only</h3>
          <p className="text-sm text-muted-foreground">
            The concept board is a private planning space for this storyworld's steward.
          </p>
        </div>
      ) : error ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-destructive/40">
          <p className="text-sm text-muted-foreground">
            Could not load capsules. GitHub may be unavailable or the storyworld repo is not configured.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Creation form card (always spans full width) */}
          {creating && (
            <CreateCapsuleCard
              worldId={worldId}
              onDone={() => setCreating(false)}
            />
          )}

          {/* Capsule cards */}
          {filtered.length === 0 && !creating ? (
            <div className="col-span-full p-16 text-center rounded-xl border border-dashed border-border/40">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-lg font-medium mb-2">
                {filterType === "all" ? "The board is blank" : `No ${filterType} capsules yet`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filterType === "all"
                  ? "Sketch your first idea — a character, arc, or event that wants to exist in this world."
                  : `Add a ${filterType} to start filling out this type.`}
              </p>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Sketch a capsule
              </button>
            </div>
          ) : (
            filtered.map(capsule => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                worldId={worldId}
                isExpanded={expandedId === capsule.id}
                onToggle={() => handleToggle(capsule.id)}
                onDeleted={() => setExpandedId(null)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
