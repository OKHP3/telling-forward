import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light",  icon: Sun,     label: "Light"  },
  { value: "dark",   icon: Moon,    label: "Dark"   },
  { value: "system", icon: Monitor, label: "System" },
];

/** Compact three-way toggle for the nav bar */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-border/60 bg-secondary/50 p-0.5 gap-0.5",
        className
      )}
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-sm transition-all duration-150",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/** Full-width appearance section for the settings page */
export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cards = [
    {
      value: "light" as Theme,
      label: "Light",
      icon: Sun,
      description: "Warm parchment — classic reading surface",
      preview: (
        <div className="w-full h-full rounded-sm overflow-hidden border border-amber-200 bg-amber-50">
          <div className="h-2 bg-amber-100 border-b border-amber-200 flex items-center px-1 gap-0.5">
            <span className="w-1 h-1 rounded-full bg-amber-300" />
            <span className="w-1 h-1 rounded-full bg-amber-300" />
          </div>
          <div className="p-1.5 space-y-1">
            <div className="h-1 w-3/4 rounded-full bg-amber-700/25" />
            <div className="h-0.5 w-full rounded-full bg-amber-300/60" />
            <div className="h-0.5 w-5/6 rounded-full bg-amber-300/60" />
          </div>
        </div>
      ),
    },
    {
      value: "dark" as Theme,
      label: "Dark",
      icon: Moon,
      description: "Midnight study — easy on the eyes",
      preview: (
        <div className="w-full h-full rounded-sm overflow-hidden border border-slate-700 bg-slate-900">
          <div className="h-2 bg-slate-800 border-b border-slate-700 flex items-center px-1 gap-0.5">
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
          </div>
          <div className="p-1.5 space-y-1">
            <div className="h-1 w-3/4 rounded-full bg-orange-400/50" />
            <div className="h-0.5 w-full rounded-full bg-slate-600/60" />
            <div className="h-0.5 w-5/6 rounded-full bg-slate-600/60" />
          </div>
        </div>
      ),
    },
    {
      value: "system" as Theme,
      label: "System",
      icon: Monitor,
      description: "Follows your device preference automatically",
      preview: (
        <div className="w-full h-full rounded-sm overflow-hidden border border-border bg-gradient-to-br from-amber-50 to-slate-900">
          <div className="h-2 bg-gradient-to-r from-amber-100 to-slate-800 border-b border-border flex items-center px-1 gap-0.5">
            <span className="w-1 h-1 rounded-full bg-amber-400/60" />
            <span className="w-1 h-1 rounded-full bg-slate-500/60" />
          </div>
          <div className="p-1.5 space-y-1">
            <div className="h-1 w-3/4 rounded-full bg-orange-400/30" />
            <div className="h-0.5 w-full rounded-full bg-border/60" />
            <div className="h-0.5 w-5/6 rounded-full bg-border/60" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ value, label, icon: Icon, description, preview }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "group flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
              active
                ? "border-primary bg-primary/5"
                : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30"
            )}
          >
            <div className="w-full aspect-video rounded-md overflow-hidden shadow-sm">
              {preview}
            </div>
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center gap-1.5">
                <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
                {active && value === "system" && (
                  <span className="text-xs text-muted-foreground">
                    ({resolvedTheme})
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center leading-snug hidden sm:block">
                {description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
