/**
 * auth-context.tsx — Clerk-backed auth hook for the web app.
 *
 * The heavy lifting is done by Clerk's ClerkProvider (wired in App.tsx).
 * This module exposes a thin useAuth() hook so existing components that
 * imported from here continue to work without changes.
 *
 * The numeric `id` field is not meaningful on the frontend with Clerk auth;
 * it is kept as 0 as a placeholder so component types stay satisfied.
 */
import { useUser, useClerk } from "@clerk/react";

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return {
    user: user
      ? {
          id: 0, // placeholder — Clerk manages identity; local numeric ID not needed in UI
          email: user.primaryEmailAddress?.emailAddress ?? "",
          displayName:
            [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            user.username ||
            user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            "User",
          emailVerified:
            user.primaryEmailAddress?.verification?.status === "verified",
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        }
      : null,
    isLoading: !isLoaded,
    logout: async () => {
      await signOut();
    },
  };
}
