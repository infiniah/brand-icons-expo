import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';

import {
  BrandIcon, BrandIconResolver, best, offlineConfiguration, relativeLuminance,
} from '@infiniah/brand-icons';
import type { BrandIconCandidate } from '@infiniah/brand-icons';

const STATUS = {
  applied: { label: 'Applied', tint: '#6b7380' },
  interview: { label: 'Interview', tint: '#1c66de' },
  offer: { label: 'Offer', tint: '#107f4f' },
  rejected: { label: 'Rejected', tint: '#b33133' },
} as const;

interface Application {
  readonly company: string;
  readonly role: string;
  readonly postedAgo: string;
  readonly status: keyof typeof STATUS;
  icon?: BrandIconCandidate;
}

/**
 * Seed rows, chosen to make the library's limits visible rather than to flatter it.
 *
 * Microsoft is here because Simple Icons removed it on trademark request, so only the colour sets
 * carry it. Figma and Duolingo are here because their monochrome marks are a hollow outline and a
 * flat silhouette of logos that are really full colour.
 */
const SEED: Application[] = [
  { company: 'Figma', role: 'Senior Product Engineer', postedAgo: '2d ago', status: 'interview' },
  { company: 'Duolingo', role: 'Android Engineer, Learning', postedAgo: '5d ago', status: 'applied' },
  { company: 'Spotify', role: 'Engineering Manager, Playback', postedAgo: '1w ago', status: 'offer' },
  { company: 'Microsoft', role: 'Principal SWE, Developer Division', postedAgo: '1w ago', status: 'applied' },
  { company: 'Notion', role: 'Product Engineer, Databases', postedAgo: '2w ago', status: 'rejected' },
  { company: 'GitHub', role: 'Staff Engineer, Actions', postedAgo: '3w ago', status: 'interview' },
];

export default function App(): React.ReactElement {
  const isDark = useColorScheme() === 'dark';
  const [applications, setApplications] = useState<Application[] | undefined>();

  useEffect(() => {
    void (async () => {
      // The package bundles and parses its own catalogue, and holds it for the process.
      const resolver = await BrandIconResolver.bundled(offlineConfiguration);

      const resolved = await Promise.all(
        SEED.map(async (application) => ({
          ...application,
          icon: best(await resolver.resolve({ name: application.company }), 0.5),
        })),
      );
      setApplications(resolved);
    })();
  }, []);

  const theme = isDark ? dark : light;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.title }]}>Applied</Text>
        <Text style={[styles.subtitle, { color: theme.secondary }]}>
          {applications ? `${applications.length} applications` : 'Loading the catalogue…'}
        </Text>

        {applications ? (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            {applications.map((application, index) => (
              <View key={application.company}>
                <Row application={application} theme={theme} />
                {index < applications.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({
  application, theme,
}: { application: Application; theme: Theme }): React.ReactElement {
  const status = STATUS[application.status];
  return (
    <View style={styles.row}>
      <BrandIcon
        candidate={application.icon}
        size={40}
        fallbackText={application.company}
        surfaceLuminance={relativeLuminance(theme.cardColor)}
      />
      <View style={styles.rowText}>
        <Text style={[styles.company, { color: theme.title }]}>{application.company}</Text>
        <Text style={[styles.role, { color: theme.secondary }]} numberOfLines={1}>
          {application.role}
        </Text>
      </View>
      <View style={styles.rowTrailing}>
        <View style={[styles.pill, { backgroundColor: `${status.tint}1f` }]}>
          <Text style={[styles.pillText, { color: status.tint }]}>{status.label}</Text>
        </View>
        <Text style={[styles.ago, { color: theme.secondary }]}>{application.postedAgo}</Text>
      </View>
    </View>
  );
}

interface Theme {
  canvas: string;
  card: string;
  hairline: string;
  title: string;
  secondary: string;
  cardColor: { red: number; green: number; blue: number };
}

/** The same palette the other three samples use, so Applied is one product on four platforms. */
const light: Theme = {
  canvas: '#f4f4f2', card: '#ffffff', hairline: '#e6e5e1',
  title: '#14161a', secondary: '#6c7076',
  cardColor: { red: 0xff, green: 0xff, blue: 0xff },
};

const dark: Theme = {
  canvas: '#0e0f11', card: '#191b1e', hairline: '#2a2d31',
  title: '#f4f4f2', secondary: '#9aa0a6',
  cardColor: { red: 0x19, green: 0x1b, blue: 0x1e },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: '700', paddingHorizontal: 4 },
  subtitle: { fontSize: 14, paddingHorizontal: 4, marginTop: 2, marginBottom: 16 },
  card: { borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowText: { flex: 1, marginLeft: 12 },
  rowTrailing: { alignItems: 'flex-end', marginLeft: 12 },
  company: { fontSize: 15, fontWeight: '600' },
  role: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginLeft: 68 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '500' },
  ago: { fontSize: 11, marginTop: 6 },
});
