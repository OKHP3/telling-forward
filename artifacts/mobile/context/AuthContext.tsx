import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import {
  ClerkProvider,
  ClerkLoaded,
  useAuth as useClerkAuth,
  useUser,
  useClerk,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter } from '@workspace/api-client-react';

const PUBLISHABLE_KEY = process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'] ?? '';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: async () => {},
});

// ---------------------------------------------------------------------------
// Token bridge — wires Clerk session token into the API client's Bearer header
// ---------------------------------------------------------------------------

function ClerkTokenBridge() {
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

// ---------------------------------------------------------------------------
// Inner provider — lives inside ClerkLoaded, so Clerk hooks are safe to call
// ---------------------------------------------------------------------------

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const authUser: AuthUser | null =
    isLoaded && user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? '',
          username: user.username ?? user.firstName ?? user.id,
        }
      : null;

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        isLoading: !isLoaded,
        logout: () => signOut(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * AuthProvider wraps ClerkProvider so that the entire app tree has access
 * to Clerk hooks.  It also installs a ClerkTokenBridge that keeps the API
 * client's auth header in sync with the active Clerk session.
 *
 * Usage in _layout.tsx (unchanged from before):
 *   <AuthProvider>{children}</AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ClerkTokenBridge />
        <AuthContextProvider>{children}</AuthContextProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
