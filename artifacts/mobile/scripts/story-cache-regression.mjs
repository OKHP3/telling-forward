import assert from 'node:assert/strict';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { shouldPersistStoryQuery, STORY_CACHE_BUSTER, STORY_CACHE_MAX_AGE, STORY_CACHE_STORAGE_KEY } from '../lib/story-cache.ts';

const storage = { value: null };
const asyncStorage = {
  getItem: async () => storage.value,
  setItem: async (_key, value) => { storage.value = value; },
  removeItem: async () => { storage.value = null; },
};
const persister = createAsyncStoragePersister({ storage: asyncStorage, key: STORY_CACHE_STORAGE_KEY, throttleTime: 0 });
const storyworlds = [{ id: 7, title: 'The Lantern Room' }];
const paths = [{ id: 11, storyworldId: 7, title: 'Opening' }];
const contributions = [{ id: 19, pathId: 11, title: 'The door opened.' }];
const queryOptions = { defaultOptions: { queries: { gcTime: 2_000_000_000, networkMode: 'offlineFirst' } } };
const firstRun = new QueryClient(queryOptions);
const savedAt = Date.now();
firstRun.setQueryData(['/api/storyworlds'], storyworlds, { updatedAt: savedAt });
firstRun.setQueryData(['/api/storyworlds', 7, 'paths'], paths, { updatedAt: savedAt });
firstRun.setQueryData(['/api/storyworlds', 7, 'paths', 11, 'contributions'], contributions, { updatedAt: savedAt });
await persistQueryClientSave({ queryClient: firstRun, persister, buster: STORY_CACHE_BUSTER, dehydrateOptions: { shouldDehydrateQuery: shouldPersistStoryQuery } });

const afterRestart = new QueryClient(queryOptions);
onlineManager.setOnline(false);
await persistQueryClientRestore({ queryClient: afterRestart, persister, maxAge: STORY_CACHE_MAX_AGE, buster: STORY_CACHE_BUSTER });
assert.deepEqual(afterRestart.getQueryData(['/api/storyworlds']), storyworlds);
assert.deepEqual(afterRestart.getQueryData(['/api/storyworlds', 7, 'paths']), paths);
assert.deepEqual(afterRestart.getQueryData(['/api/storyworlds', 7, 'paths', 11, 'contributions']), contributions);
assert.ok((afterRestart.getQueryState(['/api/storyworlds'])?.dataUpdatedAt ?? 0) >= savedAt);

onlineManager.setOnline(true);
const latest = [{ id: 7, title: 'The Lantern Room — revised' }];
await afterRestart.fetchQuery({ queryKey: ['/api/storyworlds'], queryFn: async () => latest });
assert.deepEqual(afterRestart.getQueryData(['/api/storyworlds']), latest);
firstRun.clear();
afterRestart.clear();
console.log('story cache restart/offline/reconnect regression passed');