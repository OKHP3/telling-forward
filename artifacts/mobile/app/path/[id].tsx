/**
 * Story path reader — lists all contributions in order with a "Read aloud"
 * button that speaks the full text via device TTS (expo-speech).
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useListContributions } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { ContributionCard } from '@/components/ContributionCard';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { Contribution } from '@workspace/api-client-react';

export default function PathScreen() {
  const colors = useColors();
  const { id, storyworldId, title } = useLocalSearchParams<{
    id: string;
    storyworldId: string;
    title: string;
  }>();

  const pathId = Number(id);
  const swId = Number(storyworldId);

  const {
    data: contributions,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useListContributions(swId, pathId);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const buildReadAloudText = useCallback((items: Contribution[]) => {
    return items
      .map((c) => {
        const parts = [c.title];
        if (c.summary) parts.push(c.summary);
        return parts.join('. ');
      })
      .join('\n\n');
  }, []);

  const handleReadAloud = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!contributions?.length) return;
    const text = buildReadAloudText(contributions);
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, [isSpeaking, contributions, buildReadAloudText]);

  const renderItem = useCallback(
    ({ item, index }: { item: Contribution; index: number }) => (
      <ContributionCard contribution={item} index={index} />
    ),
    [],
  );

  const headerRight = useCallback(() => {
    if (!contributions?.length) return null;
    return (
      <TouchableOpacity
        style={[
          styles.ttsButton,
          {
            backgroundColor: isSpeaking ? colors.accent + '22' : colors.primary + '22',
            borderColor: isSpeaking ? colors.accent : colors.primary,
          },
        ]}
        onPress={handleReadAloud}
        activeOpacity={0.8}
      >
        <Feather
          name={isSpeaking ? 'volume-x' : 'volume-2'}
          size={18}
          color={isSpeaking ? colors.accent : colors.primary}
        />
        <Text
          style={[
            styles.ttsLabel,
            {
              color: isSpeaking ? colors.accent : colors.primary,
              fontFamily: 'Inter_500Medium',
            },
          ]}
        >
          {isSpeaking ? 'Stop' : 'Read aloud'}
        </Text>
      </TouchableOpacity>
    );
  }, [isSpeaking, contributions, colors, handleReadAloud]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: title ?? 'Story Path',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerRight,
        }}
      />

      {isLoading ? (
        <View style={styles.content}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title="Could not load contributions"
          subtitle="Pull down to retry."
        />
      ) : (
        <FlatList
          data={contributions ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.content,
            !(contributions?.length) && styles.contentEmpty,
            { paddingBottom: Platform.OS === 'web' ? 34 : 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            contributions?.length ? (
              <View style={styles.listHeader}>
                <Text
                  style={[
                    styles.chapterCount,
                    {
                      color: colors.mutedForeground,
                      fontFamily: 'Inter_400Regular',
                    },
                  ]}
                >
                  {contributions.length} saved{' '}
                  {contributions.length === 1 ? 'moment' : 'moments'}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="feather"
              title="No contributions yet"
              subtitle="This path is waiting for its first voice. Use the Narrate tab to add a scene."
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
  content: { padding: 20 },
  contentEmpty: { flex: 1 },
  listHeader: { marginBottom: 20 },
  chapterCount: { fontSize: 13 },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 4,
  },
  ttsLabel: { fontSize: 13 },
});
