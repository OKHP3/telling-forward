import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = {
  contentLabel: string;
  updatedAt: number;
};

function formatRelativeTime(updatedAt: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1_000));

  if (elapsedSeconds < 60) return 'just now';

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} ${elapsedHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ${elapsedDays === 1 ? 'day' : 'days'} ago`;
}

export function OfflineCacheNotice({ contentLabel, updatedAt }: Props) {
  const colors = useColors();

  if (!updatedAt) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary + '14',
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
        ]}
      >
        Offline — showing saved {contentLabel}
      </Text>
      <Text
        style={[
          styles.timestamp,
          { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
        ]}
      >
        Last updated {formatRelativeTime(updatedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  title: {
    fontSize: 13,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
});