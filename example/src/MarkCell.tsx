import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BrandIcon, shapeFor, type BundledMark } from '@infiniah/brand-icons';

import type { Theme } from './palette';

export function MarkCell({
  mark, theme, size, onPress,
}: {
  mark: BundledMark;
  theme: Theme;
  size: number;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.cell} onPress={onPress}>
      <BrandIcon
        candidate={{
          slug: mark.slug,
          title: mark.title,
          confidence: 1,
          source: 'bundled',
          shape: shapeFor(mark),
        }}
        size={size}
        fallbackText={mark.title}
        surfaceLuminance={theme.canvasLuminance}
      />
      <Text style={[styles.label, { color: theme.secondary }]} numberOfLines={1}>
        {mark.slug}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', gap: 6 },
  label: { fontSize: 10 },
});
