import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CatalogVariant } from '@infiniah/brand-icons';

import type { Theme } from './palette';

export function MarkSearchField({
  query, onQuery, variant, onToggleVariant, theme,
}: {
  query: string;
  onQuery: (value: string) => void;
  variant: CatalogVariant;
  onToggleVariant: () => void;
  theme: Theme;
}): React.ReactElement {
  return (
    <View style={[styles.field, { backgroundColor: theme.card }]}>
      <Text style={[styles.glyph, { color: theme.tertiary }]}>⌕</Text>
      <TextInput
        style={[styles.input, { color: theme.title }]}
        value={query}
        onChangeText={onQuery}
        placeholder="Search marks"
        placeholderTextColor={theme.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={onToggleVariant}
        style={[styles.pill, { backgroundColor: theme.canvas }]}
      >
        <Text style={[styles.pillText, { color: theme.title }]}>
          {variant === 'full' ? 'Full' : 'Compact'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingLeft: 12, paddingRight: 6, paddingVertical: 7,
  },
  glyph: { fontSize: 18 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: '600' },
});
