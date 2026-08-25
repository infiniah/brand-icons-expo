import { readFileSync } from 'node:fs';
import { parseCatalog } from '../src/catalog/brandCatalog';
import { brandTokens, key } from '../src/matching/nameNormalizer';
import { BundledIconProvider } from '../src/providers/bundledIconProvider';

interface Row {
  query: string;
  normalizedKey: string;
  brandTokens: string[];
  candidates: { slug: string; confidence: number }[];
}

const corpus: Row[] = JSON.parse(readFileSync('test/fixtures/golden-corpus.json', 'utf8'));
const catalog = parseCatalog(JSON.parse(readFileSync('assets/brand-marks.json', 'utf8')));

/**
 * Proves this port scores identically to the Swift reference.
 *
 * If the scores drift, the ports have silently stopped agreeing about what "Netflix" means, and
 * this is the only thing that would notice.
 */
describe('golden corpus', () => {
  it('normalises identically to the reference', () => {
    for (const row of corpus) {
      expect([row.query, key(row.query)]).toEqual([row.query, row.normalizedKey]);
      expect([row.query, brandTokens(row.query)]).toEqual([row.query, row.brandTokens]);
    }
  });

  it('scores identically to the reference', async () => {
    const provider = new BundledIconProvider(catalog);
    for (const row of corpus) {
      const found = (await provider.candidates({ name: row.query })).slice(0, 5);
      expect([row.query, found.map((candidate) => candidate.slug)])
        .toEqual([row.query, row.candidates.map((candidate) => candidate.slug)]);
      found.forEach((candidate, index) => {
        expect(candidate.confidence).toBeCloseTo(row.candidates[index]!.confidence, 4);
      });
    }
  });

  it('is the catalogue the corpus was generated from', () => {
    expect(catalog.sourceVersion).toBe('16.28.0');
    expect(catalog.marks.length).toBe(4309);
  });
});
