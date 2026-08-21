import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

export const UNREAD_COUNT_QUERY_KEY = [
  "me",
  "notifications",
  "unread-count",
] as const;

/**
 * Fetches the authenticated contributor's unread notification count.
 * Pass `enabled: false` when the user is not signed in so no request is made.
 */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async (): Promise<number> => {
      const res = await fetch(
        apiUrl("/api/me/notifications/unread-count"),
        { credentials: "include" },
      );
      if (!res.ok) return 0;
      const body = (await res.json()) as { count: number };
      return body.count ?? 0;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // Failures are non-critical — degrade silently to 0.
    retry: false,
    placeholderData: 0,
  });
}

/** Returns a stable callback that invalidates the unread count cache. */
export function useInvalidateUnreadCount() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
}
