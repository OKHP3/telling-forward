import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Contribution } from '@workspace/api-client-react';

interface Props {
  contribution: Contribution;
  index: number;
}

export function ContributionCard({ contribution, index }: Props) {
  const colors = useColors();
  const accentOpacity = index % 2 === 0 ? 'DD' : '66';

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: colors.primary + accentOpacity },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
        ]}
      >
        {contribution.title}
      </Text>
      {contribution.summary ? (
        <Text
          style={[
            styles.body,
            { color: colors.foreground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {contribution.summary}
        </Text>
      ) : null}
      <Text
        style={[
          styles.meta,
          { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
        ]}
      >
        {new Date(contribution.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 15,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
  },
});
