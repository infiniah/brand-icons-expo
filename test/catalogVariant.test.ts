import { readFileSync } from 'node:fs';
import { parseCatalog } from '../src/catalog/brandCatalog';
import { BrandIconResolver } from '../src/resolver/brandIconResolver';

/** The two catalogues differ only in which marks they hold. */
const full = parseCatalog(JSON.parse(readFileSync('assets/brand-marks.json', 'utf8')));
const compact = parseCatalog(JSON.parse(readFileSync('assets/brand-marks-compact.txt', 'utf8')));

describe('catalogue variants', () => {
  it('compact is the smaller subset', () => {
    expect(full.marks.length).toBe(4770);
    expect(compact.marks.length).toBe(4473);
    const fullSlugs = new Set(full.marks.map((m) => m.slug));
    for (const mark of compact.marks) expect(fullSlugs.has(mark.slug)).toBe(true);
  });

  it('scores a brand in both the same either way', async () => {
    const a = new BrandIconResolver(full, { allowsNetwork: false });
    const b = new BrandIconResolver(compact, { allowsNetwork: false });
    for (const name of ['Figma', 'Spotify', 'NOTION LABS INC', 'Microsoft']) {
      const one = await a.resolve({ name });
      const two = await b.resolve({ name });
      expect([name, two.candidates[0]?.slug]).toEqual([name, one.candidates[0]?.slug]);
      expect(two.candidates[0]?.confidence).toBe(one.candidates[0]?.confidence);
    }
  });

  it('leaves out only illustration sized marks', () => {
    const compactSlugs = new Set(compact.marks.map((m) => m.slug));
    const omitted = full.marks.filter((m) => !compactSlugs.has(m.slug));
    expect(omitted.length).toBe(297);
    for (const mark of omitted) {
      const bytes = mark.path.length + mark.layers.reduce((t, l) => t + l.path.length, 0);
      expect(bytes).toBeGreaterThan(4096);
    }
  });
});
