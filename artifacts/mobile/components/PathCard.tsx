import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { StoryPath } from '@workspace/api-client-react';

const STATE_LABEL: Record<string, string> = {
  personal: 'Personal Work',
  open: 'Open Path',
  proposed: 'Proposed Canon',
  'published-alternate': 'Published',
};

interface Props {
  path: StoryPath;
  onPress: () => void;
}

function stateColor(primary: string, accent: string, mutedFg: string, state: string) {
  switch (state) {
    case 'proposed':
      return primary;
    case 'published-alternate':
      return '#4CAF50';
    case 'open':
      return accent;
    default:
      return mutedFg;
  }
}

export function PathCard({ path, onPress }: Props) {
  const colors = useColors();
  const badgeColor = stateColor(colors.primary, colors.accent, colors.mutedForeground, path.state);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor + '22',
                borderColor: badgeColor + '66',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeColor, fontFamily: 'Inter_500Medium' },
              ]}
            >
              {STATE_LABEL[path.state] ?? path.state}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.title,
            {
              color: colors.cardForeground,
              fontFamily: 'Inter_600SemiBold',
            },
          ]}
          numberOfLines={2}
        >
          {path.title}
        </Text>
        <Text
          style={[
            styles.branch,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
          numberOfLines={1}
        >
          {path.branchRef}
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
    marginBottom: 10,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
  },
  title: {
    fontSize: 15,
  },
  branch: {
    fontSize: 12,
  },
  chevron: {
    marginRight: 16,
  },
});
