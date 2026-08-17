/**
 * Storyworld detail screen — shows all story paths for a storyworld.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useGetStoryworld, useListStoryPaths } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { PathCard } from '@/components/PathCard';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { StoryPath } from '@workspace/api-client-react';

export default function StoryworldScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyworldId = Number(id);

  const { data: storyworld } = useGetStoryworld(storyworldId);
  const {
    data: paths,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useListStoryPaths(storyworldId);

  const renderItem = useCallback(
    ({ item }: { item: StoryPath }) => (
      <PathCard
        path={item}
        onPress={() =>
          router.push({
            pathname: '/path/[id]',
            params: {
              id: item.id,
              storyworldId: item.storyworldId,
              title: item.title,
            },
          })
        }
      />
    ),
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: storyworld?.title ?? 'Storyworld',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
        }}
      />

      {/* Description strip */}
      {storyworld ? (
        <View
          style={[
            styles.meta,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.repoLabel,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            {storyworld.repoOwner}/{storyworld.repoName}
          </Text>
          <Text
            style={[
              styles.branchLabel,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Canon: {storyworld.canonBranchRef}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load paths"
          subtitle="Pull down to retry."
        />
      ) : (
        <FlatList
          data={paths ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            !(paths?.length) && styles.listEmpty,
            { paddingBottom: Platform.OS === 'web' ? 34 : 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="git-branch"
              title="No story paths yet"
              subtitle="This storyworld is waiting for its first path. Narrate a scene to begin."
            />
          }
          scrollEnabled={!!(paths?.length)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  meta: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  repoLabel: { fontSize: 13 },
  branchLabel: { fontSize: 12 },
  list: { padding: 16 },
  listEmpty: { flex: 1 },
});
