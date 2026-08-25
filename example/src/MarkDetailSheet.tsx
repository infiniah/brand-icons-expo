import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandIcon, hexString, shapeFor, type BundledMark } from '@infiniah/brand-icons';

import type { Theme } from './palette';

export function MarkDetailSheet({
  mark, theme, onClose,
}: {
  mark: BundledMark;
  theme: Theme;
  onClose: () => void;
}): React.ReactElement {
  const candidate = {
    slug: mark.slug,
    title: mark.title,
    confidence: 1,
    source: 'bundled' as const,
    shape: shapeFor(mark),
  };
  const box = mark.colorViewBox ?? mark.viewBox;
  const bytes = mark.layers.length === 0
    ? mark.path.length
    : mark.layers.reduce((total, layer) => total + layer.path.length, 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.canvas }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.title }]}>{mark.title}</Text>
          <Text style={[styles.slug, { color: theme.tertiary }]}>{mark.slug}</Text>
        </View>
        <Pressable onPress={onClose} style={[styles.close, { backgroundColor: theme.card }]}>
          <Text style={[styles.closeGlyph, { color: theme.secondary }]}>✕</Text>
        </Pressable>
      </View>

      <View style={[styles.hero, { backgroundColor: theme.card }]}>
        <BrandIcon candidate={candidate} size={120} surfaceLuminance={theme.cardLuminance} />
      </View>

      <Text style={[styles.facts, { color: theme.secondary }]}>{facts(mark)}</Text>

      <Panel label="Every size from one path" theme={theme}>
        <View style={styles.ladder}>
          {[20, 28, 40, 56].map((size) => (
            <View key={size} style={styles.rung}>
              <BrandIcon
                candidate={candidate}
                size={size}
                surfaceLuminance={theme.cardLuminance}
              />
              <Text style={[styles.caption, { color: theme.tertiary }]}>{size}</Text>
            </View>
          ))}
        </View>
      </Panel>

      {/* A mark that reads on one ground can vanish on the other, so the component puts a
          contrasting tile behind one that would. Both grounds are shown because only one of them
          is the reader's. */}
      <Panel label="On either ground" theme={theme}>
        <View style={styles.grounds}>
          {[{ bg: '#f4f4f2', luminance: 0.956 }, { bg: '#141414', luminance: 0.077 }].map((ground) => (
            <View key={ground.bg} style={[styles.ground, { backgroundColor: ground.bg }]}>
              <BrandIcon candidate={candidate} size={44} surfaceLuminance={ground.luminance} />
            </View>
          ))}
        </View>
      </Panel>

      <Panel
        label="Geometry"
        badge={mark.layers.length === 0 ? 'VECTOR' : 'LAYERED'}
        theme={theme}
      >
        <Row label="View box" value={`${Math.round(box[2] ?? 0)} × ${Math.round(box[3] ?? 0)}`} theme={theme} />
        <Row label="Path data" value={`${bytes.toLocaleString('en-US')} bytes`} theme={theme} />
        <Row
          label="Layers"
          value={mark.layers.length === 0 ? 'none' : String(mark.layers.length)}
          theme={theme}
        />
      </Panel>
    </ScrollView>
  );
}

function facts(mark: BundledMark): string {
  const parts = [
    mark.layers.length === 0 ? 'Monochrome' : `${mark.layers.length} colour layers`,
    mark.tint ? hexString(mark.tint).toUpperCase() : 'no tint',
    mark.license?.type ?? 'no licence on file',
  ];
  if (/-NC|-ND/.test(mark.license?.type ?? '')) parts.push('restrictive');
  return parts.join(' · ');
}

function Panel({
  label, badge, theme, children,
}: {
  label: string;
  badge?: string;
  theme: Theme;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={[styles.panel, { backgroundColor: theme.card }]}>
      <View style={styles.panelHead}>
        <Text style={[styles.panelLabel, { color: theme.secondary }]}>{label}</Text>
        {badge ? (
          <Text style={[styles.badge, { color: theme.tertiary, backgroundColor: theme.canvas }]}>
            {badge}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Row({
  label, value, theme,
}: { label: string; value: string; theme: Theme }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.secondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.title }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700' },
  slug: { fontSize: 14, marginTop: 2 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontSize: 13, fontWeight: '700' },
  hero: { height: 200, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  facts: { fontSize: 13 },
  panel: { borderRadius: 16, padding: 16, gap: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center' },
  panelLabel: { flex: 1, fontSize: 12, fontWeight: '500' },
  badge: {
    fontSize: 9, fontWeight: '700', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden',
  },
  ladder: { flexDirection: 'row', alignItems: 'flex-end', gap: 22 },
  rung: { alignItems: 'center', gap: 8 },
  caption: { fontSize: 10 },
  grounds: { flexDirection: 'row', gap: 12 },
  ground: { flex: 1, height: 72, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
});
