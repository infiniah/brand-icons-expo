import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList, Modal, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import {
  defaultCatalog, type BrandCatalog, type BundledMark, type CatalogVariant,
} from '@infiniah/brand-icons';

import { FacetTabs } from './src/FacetTabs';
import { MarkCell } from './src/MarkCell';
import { MarkDetailSheet } from './src/MarkDetailSheet';
import { MarkSearchField } from './src/MarkSearchField';
import { filterMarks } from './src/filterMarks';
import type { MarkFacet } from './src/markFacet';
import { dark, light } from './src/palette';

const COLUMNS = 5;

export default function App(): React.ReactElement {
  const theme = useColorScheme() === 'dark' ? dark : light;

  const [catalog, setCatalog] = useState<BrandCatalog | undefined>();
  const [variant, setVariant] = useState<CatalogVariant>('full');
  const [facet, setFacet] = useState<MarkFacet>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<BundledMark | undefined>();

  useEffect(() => {
    let live = true;
    setCatalog(undefined);
    void defaultCatalog(variant).then((loaded) => {
      if (live) setCatalog(loaded);
    });
    return () => { live = false; };
  }, [variant]);

  const visible = useMemo(
    () => (catalog ? filterMarks(catalog.marks, facet, query) : []),
    [catalog, facet, query],
  );

  const summary = useMemo(() => {
    if (!catalog) return 'Loading the catalogue…';
    const colour = catalog.marks.filter((mark) => mark.layers.length > 0).length;
    return `${catalog.marks.length.toLocaleString('en-US')} brands · ${colour.toLocaleString('en-US')} in colour`;
  }, [catalog]);

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <StatusBar style={theme === dark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.title }]}>Marks</Text>
          <Text style={[styles.summary, { color: theme.secondary }]}>{summary}</Text>
        </View>
        <MarkSearchField
          query={query}
          onQuery={setQuery}
          variant={variant}
          onToggleVariant={() => setVariant(variant === 'full' ? 'compact' : 'full')}
          theme={theme}
        />
        <FacetTabs selection={facet} onSelect={setFacet} theme={theme} />
      </View>

      <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.title }]}>
            {catalog ? `Nothing matches “${query}”` : 'Loading the catalogue…'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(mark) => mark.slug}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          initialNumToRender={40}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <MarkCell
              mark={item}
              theme={theme}
              size={46}
              onPress={() => setSelected(item)}
            />
          )}
        />
      )}

      <Modal
        visible={selected !== undefined}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(undefined)}
      >
        {selected ? (
          <MarkDetailSheet
            mark={selected}
            theme={theme}
            onClose={() => setSelected(undefined)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  summary: { fontSize: 13, marginTop: 2 },
  hairline: { height: 1 },
  grid: { padding: 16, gap: 16 },
  gridRow: { gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '500' },
});
