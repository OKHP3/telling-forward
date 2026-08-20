import type { Query } from '@tanstack/react-query';

export const STORY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
export const STORY_CACHE_STORAGE_KEY = 'telling-forward-story-cache';
export const STORY_CACHE_BUSTER = 'telling-forward-story-cache-v2';

export function shouldPersistStoryQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  const [queryPath] = query.queryKey;
  return (
    query.state.status === 'success' &&
    typeof queryPath === 'string' &&
    queryPath.startsWith('/api/storyworlds')
  );
}