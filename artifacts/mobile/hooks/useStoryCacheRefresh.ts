import { useCallback } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

const STORY_CACHE_QUERY_KEY = ['/api/storyworlds'] as const;

export function useStoryCacheRefresh() {
  const queryClient = useQueryClient();
  const { isConnected, isInternetReachable } = useNetInfo();
  const isOffline = isConnected === false || isInternetReachable === false;
  const hasConnection = isConnected === true && isInternetReachable !== false;

  const refreshStoryCache = useCallback(async () => {
    if (!hasConnection) return;

    await queryClient.invalidateQueries({
      queryKey: STORY_CACHE_QUERY_KEY,
      refetchType: 'active',
    });
  }, [hasConnection, queryClient]);

  return { isOffline, refreshStoryCache };
}