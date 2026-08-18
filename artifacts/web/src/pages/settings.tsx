import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  Github,
  Globe,
  Twitter,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ThemeSelector } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/60 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40 bg-card">
        <h2 className="font-serif text-lg font-medium text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-6 py-5 bg-card/50 space-y-5">{children}</div>
    </section>
  );
}

/* ── Field row ───────────────────────────────────────────────────────────── */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-6 items-start">
      <div>
        <label className="text-sm font-medium text-foreground leading-6">{label}</label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ── Connector card ──────────────────────────────────────────────────────── */
function ConnectorCard({
  icon: Icon,
  label,
  connected,
  username,
  actionLabel,
  onAction,
  disabled,
}: {
  icon: typeof Github;
  label: string;
  connected: boolean;
  username?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60 bg-background/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary/60 text-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {connected && username ? (
            <p className="text-xs text-muted-foreground">@{username}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Not connected</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
        <button
          onClick={onAction}
          disabled={disabled}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md font-medium transition-colors",
            connected
              ? "text-destructive hover:bg-destructive/10"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: meData, isLoading } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  const user = meData?.user;
  const github = meData?.github ?? null;

  /* Profile form state */
  const [displayName, setDisplayName] = useState("");
  const [nameInitialized, setNameInitialized] = useState(false);
  if (user && !nameInitialized) {
    setDisplayName(user.displayName);
    setNameInitialized(true);
  }
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  /* Social link state (localStorage-backed) */
  const [website, setWebsite] = useState(
    () => localStorage.getItem("tf-social-website") ?? ""
  );
  const [twitter, setTwitter] = useState(
    () => localStorage.getItem("tf-social-twitter") ?? ""
  );

  async function handleSaveName() {
    if (!displayName.trim()) {
      setNameError("Display name cannot be empty.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Update failed");
      }
      await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated" });
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingName(false);
    }
  }

  function handleSaveSocial() {
    localStorage.setItem("tf-social-website", website);
    localStorage.setItem("tf-social-twitter", twitter);
    toast({ title: "Social links saved" });
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="h-48 bg-secondary/30 rounded-xl" />
        <div className="h-32 bg-secondary/30 rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-border">
        <User className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-serif text-lg mb-2">Sign in to manage your settings</h3>
        <Link href="/" className="text-primary hover:underline text-sm">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Back + header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Section
        title="Profile"
        description="How you appear to other contributors and stewards"
      >
        <Field label="Display name" hint="Visible on your contributions">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className={cn(
                  "flex-1 h-9 rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
                  nameError ? "border-destructive" : "border-input"
                )}
                placeholder="Your name"
                maxLength={80}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || displayName.trim() === user.displayName}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
            {nameError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {nameError}
              </p>
            )}
          </div>
        </Field>

        <div className="border-t border-border/40 pt-5">
          <Field
            label="Email"
            hint="Contact support to change your email address"
          >
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-secondary/30 text-sm text-muted-foreground select-all">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {user.email}
            </div>
          </Field>
        </div>

      </Section>

      {/* ── Connections ─────────────────────────────────────────────────── */}
      <Section
        title="Connections"
        description="Link external accounts and add contact info"
      >
        <ConnectorCard
          icon={Github}
          label="GitHub"
          connected={!!github}
          username={github?.githubUsername}
          actionLabel={github ? "Disconnect" : "Connect"}
          onAction={() => {
            if (github) {
              toast({
                title: "GitHub disconnect",
                description: "GitHub unlinking is not yet available.",
              });
            } else {
              window.location.href = "/api/auth/github/authorize";
            }
          }}
        />

        <div className="border-t border-border/40 pt-5 space-y-4">
          <Field label="Website" hint="Your personal or portfolio site">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="https://yoursite.com"
                  type="url"
                />
              </div>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-secondary/40 hover:bg-accent/50 transition-colors"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
            </div>
          </Field>

          <Field label="X / Twitter">
            <div className="relative">
              <Twitter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="@handle"
              />
            </div>
          </Field>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSocial}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Save links
            </button>
          </div>
        </div>
      </Section>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <Section
        title="Appearance"
        description="Choose the color theme for your reading and writing experience"
      >
        <ThemeSelector />
      </Section>
    </div>
  );
}
