import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useGetMe,
  useLogout,
  type PublicUser,
} from "@workspace/api-client-react";
import { UNREAD_COUNT_QUERY_KEY } from "@/hooks/use-unread-count";

const AUTH_SYNC_CHANNEL_NAME = "telling-forward-auth";
const AUTH_SYNC_STORAGE_KEY = "telling-forward-auth-event";

type AuthSyncMessage = {
  type: "signed-out";
  id: string;
};

let authSyncChannel: BroadcastChannel | null | undefined;

function getAuthSyncChannel(): BroadcastChannel | null {
  if (authSyncChannel !== undefined) return authSyncChannel;
  if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") {
    authSyncChannel = null;
    return authSyncChannel;
  }
  authSyncChannel = new window.BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
  return authSyncChannel;
}

function resetAuthSyncChannel() {
  authSyncChannel?.close();
  authSyncChannel = undefined;
}

function isSignedOutMessage(value: unknown): value is AuthSyncMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "signed-out" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function clearUserSession(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
  queryClient.removeQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
  queryClient.clear();
}

function publishSignedOut() {
  if (typeof window === "undefined") return;

  const message: AuthSyncMessage = {
    type: "signed-out",
    id: String(Date.now()),
  };
  getAuthSyncChannel()?.postMessage(message);

  // Storage events reach browsers without BroadcastChannel support. The
  // immediate removal keeps the event ephemeral and avoids leaving auth state
  // in persistent storage.
  try {
    window.localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message));
    window.localStorage.removeItem(AUTH_SYNC_STORAGE_KEY);
  } catch {
    // BroadcastChannel remains available when storage is restricted.
  }
}

export interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const queryClient = useQueryClient();
  const [sessionCleared, setSessionCleared] = useState(false);
  const meQuery = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const handleRemoteSignOut = useCallback(() => {
    setSessionCleared(true);
    clearUserSession(queryClient);
  }, [queryClient]);

  useEffect(() => {
    let channel = getAuthSyncChannel();
    const handledMessageIds = new Set<string>();
    const handleMessage = (value: unknown) => {
      if (!isSignedOutMessage(value) || handledMessageIds.has(value.id)) return;
      handledMessageIds.add(value.id);
      handleRemoteSignOut();
    };
    const handleChannelMessage = (event: MessageEvent<AuthSyncMessage>) => {
      handleMessage(event.data);
    };
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;
      try {
        handleMessage(JSON.parse(event.newValue));
      } catch {
        // Ignore unrelated or malformed storage events.
      }
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      // A page restored from the back-forward cache may have missed the
      // cross-tab sign-out event while it was frozen. Hide user-scoped UI and
      // clear its cache before checking the session again.
      channel = getAuthSyncChannel();
      channel?.addEventListener("message", handleChannelMessage);
      handleRemoteSignOut();
      void meQuery.refetch();
    };
    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      channel?.removeEventListener("message", handleChannelMessage);
      resetAuthSyncChannel();
    };

    channel?.addEventListener("message", handleChannelMessage);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      channel?.removeEventListener("message", handleChannelMessage);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [handleRemoteSignOut, meQuery.refetch]);

  useEffect(() => {
    if (meQuery.data?.user) setSessionCleared(false);
  }, [meQuery.data?.user]);

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        setSessionCleared(true);
        clearUserSession(queryClient);
        publishSignedOut();
      },
    },
  });

  return {
    user: sessionCleared ? null : meQuery.data?.user ?? null,
    isLoading: sessionCleared ? false : meQuery.isLoading,
    isLoggingOut: logoutMutation.isPending,
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}
