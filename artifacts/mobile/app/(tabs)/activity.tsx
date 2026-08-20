import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useListMyContributions } from '@workspace/api-client-react';
import type { MyContribution } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useStoryCacheRefresh } from '@/hooks/useStoryCacheRefresh';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/SkeletonCard';

function formatSubmittedAt(value: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function statusLabel(status: MyContribution['status']): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'returned':
      return 'Returned';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

export default function ActivityScreen() {
  const colors = useColors();
  const { user, isLoading: authLoading } = useAuth();
  const { isOffline, refreshStoryCache } = useStoryCacheRefresh();
  const {
    data: contributions,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useListMyContributions({
    query: { enabled: !!user, queryKey: ['my-contributions', user?.id] },
  });

  const renderItem = useCallback(
    ({ item }: { item: MyContribution }) => (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: '/path/[id]',
            params: {
              id: item.pathId,
              storyworldId: item.storyworldId,
              title: item.pathTitle,
            },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardCopy}>
            <Text
              style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.location, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
              numberOfLines={1}
            >
              {item.storyworldTitle} · {item.pathTitle}
            </Text>
          </View>
          <Feather name="arrow-up-right" size={18} color={colors.primary} />
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Submitted {formatSubmittedAt(item.submittedAt)}
          </Text>
          <Text
            style={[
              styles.status,
              {
                color: item.status === 'accepted' ? colors.accent : colors.primary,
                borderColor: item.status === 'accepted' ? colors.accent : colors.primary,
                fontFamily: 'Inter_500Medium',
              },
            ]}
          >
            {statusLabel(item.status)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          My Contributions
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Keep track of your saved scenes and submissions
        </Text>
      </View>

      {isOffline && (
        <Text style={[styles.offline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Showing your last saved activity
        </Text>
      )}

      {authLoading || isLoading ? (
        <View style={styles.content}>
          {[1, 2, 3].map((key) => <SkeletonCard key={key} />)}
        </View>
      ) : !user ? (
        <EmptyState
          icon="user"
          title="Sign in to see your contributions"
          subtitle="Your submitted scenes will appear here once you sign in."
        />
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load your contributions"
          subtitle="Pull down to retry."
        />
      ) : (
        <FlatList
          data={contributions ?? []}
          keyExtractor={(item) => `${item.source}:${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.content,
            !(contributions?.length) && styles.contentEmpty,
            { paddingBottom: Platform.OS === 'web' ? 34 : 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={async () => {
                await refreshStoryCache();
                await refetch();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="feather"
              title="No contributions yet"
              subtitle="Your saved scenes and submissions will appear here."
            />
          }
          scrollEnabled={!!(contributions?.length)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, marginBottom: 2 },
  headerSub: { fontSize: 13 },
  offline: { paddingHorizontal: 20, paddingTop: 10, fontSize: 12 },
  content: { padding: 16, gap: 12 },
  contentEmpty: { flex: 1 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardCopy: { flex: 1, gap: 5 },
  title: { fontSize: 17, lineHeight: 23 },
  location: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  date: { fontSize: 12, flex: 1 },
  status: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
});