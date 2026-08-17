import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Storyworld } from '@workspace/api-client-react';

interface Props {
  storyworld: Storyworld;
  onPress: () => void;
}

export function StoryWorldCard({ storyworld, onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.cardForeground, fontFamily: 'Inter_600SemiBold' },
          ]}
          numberOfLines={2}
        >
          {storyworld.title}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
          numberOfLines={1}
        >
          {storyworld.repoOwner}/{storyworld.repoName}
        </Text>
      </View>
      <Feather
        name="chevron-right"
        size={18}
        color={colors.mutedForeground}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
  },
  title: {
    fontSize: 16,
  },
  meta: {
    fontSize: 12,
  },
  chevron: {
    marginRight: 14,
  },
});
