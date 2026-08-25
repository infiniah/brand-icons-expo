import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FACETS, type MarkFacet } from './markFacet';
import type { Theme } from './palette';

export function FacetTabs({
  selection, onSelect, theme,
}: {
  selection: MarkFacet;
  onSelect: (facet: MarkFacet) => void;
  theme: Theme;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      {FACETS.map((facet) => {
        const active = facet.key === selection;
        return (
          <Pressable key={facet.key} onPress={() => onSelect(facet.key)}>
            <Text
              style={[
                styles.label,
                { color: active ? theme.title : theme.tertiary, fontWeight: active ? '600' : '400' },
              ]}
            >
              {facet.label}
            </Text>
            <View
              style={[styles.rule, { backgroundColor: active ? theme.title : 'transparent' }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 20 },
  label: { fontSize: 14 },
  rule: { height: 2, marginTop: 6, borderRadius: 1 },
});
