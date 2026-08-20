/**
 * Read tab — browse open story paths across all storyworlds.
 * Tapping a path opens the full contribution reader with TTS.
 */
import React, { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useListStoryworlds, useListStoryPaths } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useStoryCacheRefresh } from '@/hooks/useStoryCacheRefresh';
import { PathCard } from '@/components/PathCard';
import { EmptyState } from '@/components/EmptyState';
import { OfflineCacheNotice } from '@/components/OfflineCacheNotice';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { StoryPath, Storyworld } from '@workspace/api-client-react';

// Loads paths for a single storyworld
function StoryworldSection({
  storyworld,
}: {
  storyworld: Storyworld;
}) {
  const colors = useColors();
  const { data: paths, isLoading } = useListStoryPaths(storyworld.id);

  if (isLoading) return <SkeletonCard />;
  if (!paths?.length) return null;

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
        ]}
        numberOfLines={1}
      >
        {storyworld.title}
      </Text>
      {paths.map((path) => (
        <PathCard
          key={path.id}
          path={path}
          onPress={() =>
            router.push({
              pathname: '/path/[id]',
              params: {
                id: path.id,
                storyworldId: path.storyworldId,
                title: path.title,
              },
            })
          }
        />
      ))}
    </View>
  );
}

export default function ReadScreen() {
  const colors = useColors();
  const {
    data: storyworlds,
    isLoading,
    error,
    isFetching,
    dataUpdatedAt,
  } = useListStoryworlds();
  const { isOffline, refreshStoryCache } = useStoryCacheRefresh();

  const renderItem = useCallback(
    ({ item }: { item: Storyworld }) => (
      <StoryworldSection storyworld={item} />
    ),
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Inline header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === 'web' ? 67 : 0,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Open Paths
        </Text>
        <Text
          style={[
            styles.headerSub,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Tap any path to read and listen
        </Text>
      </View>

      {isOffline && (
        <OfflineCacheNotice contentLabel="paths" updatedAt={dataUpdatedAt} />
      )}

      {isLoading ? (
        <View style={styles.content}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load story paths"
          subtitle="Pull down to retry."
        />
      ) : (
        <FlatList
          data={storyworlds ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.content,
            !(storyworlds?.length) && styles.contentEmpty,
            { paddingBottom: Platform.OS === 'web' ? 34 : 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refreshStoryCache}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="book"
              title="No open paths yet"
              subtitle="Discover a storyworld first, then paths will appear here."
            />
          }
          scrollEnabled={!!(storyworlds?.length)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 26,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
  },
  content: {
    padding: 16,
  },
  contentEmpty: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
});
