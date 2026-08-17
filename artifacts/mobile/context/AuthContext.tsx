import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetMe,
  useLogin,
  useRegister,
  useLogout,
  type PublicUser,
  type LoginRequest,
  type RegisterRequest,
} from '@workspace/api-client-react';

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // A 401 here means "not logged in" — React Query puts it in error state.
  // useQuery does not throw by default, so the component won't crash.
  // We treat missing data as logged-out.
  const { data: me, isLoading } = useGetMe();

  const { mutateAsync: loginMutate } = useLogin();
  const { mutateAsync: registerMutate } = useRegister();
  const { mutateAsync: logoutMutate } = useLogout();

  const login = useCallback(
    async (data: LoginRequest) => {
      await loginMutate({ data });
      await queryClient.invalidateQueries();
    },
    [loginMutate, queryClient],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      await registerMutate({ data });
      await queryClient.invalidateQueries();
    },
    [registerMutate, queryClient],
  );

  const logout = useCallback(async () => {
    await logoutMutate();
    await queryClient.invalidateQueries();
  }, [logoutMutate, queryClient]);

  return (
    <AuthContext.Provider
      value={{ user: me?.user ?? null, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
