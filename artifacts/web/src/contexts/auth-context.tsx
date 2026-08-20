import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useGetMe,
  useLogout,
  type PublicUser,
} from "@workspace/api-client-react";

export interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const queryClient = useQueryClient();
  const meQuery = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
      },
    },
  });

  return {
    user: meQuery.data?.user ?? null,
    isLoading: meQuery.isLoading,
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}
