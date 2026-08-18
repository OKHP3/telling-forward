/**
 * auth-context.tsx — Clerk-backed auth hook for the Archive app.
 */
import { useUser, useClerk } from "@clerk/react";

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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
          id: 0,
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
          createdAt: user.createdAt ?? new Date(),
          updatedAt: user.updatedAt ?? new Date(),
        }
      : null,
    isLoading: !isLoaded,
    logout: async () => {
      await signOut();
    },
  };
}
