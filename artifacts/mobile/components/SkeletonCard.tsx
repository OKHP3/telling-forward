import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SkeletonCard() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: colors.border }]} />
      <View style={styles.content}>
        <View
          style={[
            styles.line,
            { backgroundColor: colors.border, width: '72%' },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              backgroundColor: colors.border,
              width: '45%',
              marginTop: 10,
              height: 12,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    padding: 18,
  },
  line: {
    height: 14,
    borderRadius: 4,
  },
});
