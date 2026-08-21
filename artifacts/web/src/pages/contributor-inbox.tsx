import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/api-url";
import {
  getGetMeQueryKey,
  useGetMe,
} from "@workspace/api-client-react";

type Notification = {
  id: number;
  proposalId: number;
  kind: "received" | "being-reviewed" | "creative-question" | "official-story" | "alternate-path";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function ContributorInbox() {
  const { data: meData, isLoading: meLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meData?.user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetch(apiUrl("/api/me/notifications"), { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Notification[]) => {
        if (!cancelled) setNotifications(rows);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [meData?.user]);

  async function markRead(notification: Notification) {
    if (notification.readAt) return;
    const response = await fetch(
      apiUrl(`/api/me/notifications/${notification.id}/read`),
      { method: "POST", credentials: "include" },
    );
    if (response.ok) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    }
  }

  if (meLoading || loading) {
    return (
      <div className="flex min-h-[35vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your updates…
      </div>
    );
  }

  if (!meData?.user) {
    return (
      <section className="mx-auto max-w-2xl py-12 text-center">
        <Bell className="mx-auto mb-4 h-8 w-8 text-primary" />
        <h1 className="font-serif text-3xl text-foreground">Your story updates</h1>
        <p className="mt-3 text-muted-foreground">Sign in to see updates about your scenes.</p>
        <Link href="/sign-in" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Contributor inbox
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Your story updates</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Calm notes about what matters to your scene. Technical GitHub details stay with the stewards.
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
          <p className="font-serif text-lg text-foreground">Nothing new yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When a steward receives, reviews, or publishes your scene, you’ll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-xl border p-5 transition-colors ${
                notification.readAt ? "border-border/60 bg-background" : "border-primary/25 bg-primary/[0.04]"
              }`}
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-lg text-foreground">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                </div>
                {!notification.readAt && (
                  <button
                    type="button"
                    onClick={() => void markRead(notification)}
                    className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Mark update as read"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}