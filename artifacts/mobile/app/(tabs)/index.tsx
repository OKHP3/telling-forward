/**
 * Discover tab — browse all storyworlds.
 *
 * Connects to GET /api/storyworlds. Since the GitHub sync layer is not yet
 * built, a dev-only "Seed sample data" button calls POST /api/dev/seed to
 * populate the database with demo storyworlds so the app has content to show.
 */
import React, { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useListStoryworlds } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { StoryWorldCard } from '@/components/StoryWorldCard';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { Storyworld } from '@workspace/api-client-react';

export default function DiscoverScreen() {
  const colors = useColors();
  const { data: storyworlds, isLoading, error, refetch, isFetching } = useListStoryworlds();
  const [seeding, setSeeding] = React.useState(false);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const domain = process.env['EXPO_PUBLIC_DOMAIN'];
      const base = domain ? `https://${domain}` : '';
      await fetch(`${base}/api/dev/seed`, { method: 'POST', credentials: 'include' });
      await refetch();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Storyworld }) => (
      <StoryWorldCard
        storyworld={item}
        onPress={() =>
          router.push({
            pathname: '/storyworld/[id]',
            params: { id: item.id },
          })
        }
      />
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
          Storyworlds
        </Text>
        <Text
          style={[
            styles.headerSub,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Collaborative fiction, open to all voices
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load storyworlds"
          subtitle="Check your connection and pull to refresh."
        />
      ) : (
        <FlatList
          data={storyworlds ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            !(storyworlds?.length) && styles.listEmpty,
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
            <View style={styles.emptyWrapper}>
              <EmptyState
                icon="book-open"
                title="No storyworlds yet"
                subtitle="The library is waiting to be filled. Seed sample data to explore the app."
              />
              {__DEV__ && (
                <TouchableOpacity
                  style={[
                    styles.seedButton,
                    { backgroundColor: colors.primary, opacity: seeding ? 0.6 : 1 },
                  ]}
                  onPress={handleSeed}
                  disabled={seeding}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.seedButtonText,
                      { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' },
                    ]}
                  >
                    {seeding ? 'Seeding...' : 'Seed sample data'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
  list: {
    padding: 16,
  },
  listEmpty: {
    flex: 1,
  },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  seedButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  seedButtonText: {
    fontSize: 15,
  },
});
