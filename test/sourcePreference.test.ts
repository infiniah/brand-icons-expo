import { rankResult } from '../src/core/brandIconResult';
import { BrandIconSource, colorFromHex } from '../src/core/types';
import type { BrandIconCandidate } from '../src/core/types';
import {
  defaultConfiguration, effectivePreferredSources, offlineConfiguration,
} from '../src/resolver/resolverConfiguration';

/**
 * The ranking rules, which answer a real complaint: a monochrome catalogue draws Figma as a hollow
 * outline, so the bundled mark scores 1.00 and looks nothing like the logo.
 */
const candidate = (
  slug: string, confidence: number, source: BrandIconSource,
): BrandIconCandidate => ({ slug, title: slug, confidence, source });

describe('source preference', () => {
  it('prefers real artwork tiers, best artwork first', () => {
    expect(effectivePreferredSources({ ...defaultConfiguration, allowsAppStore: true }))
      .toEqual([BrandIconSource.appStore, BrandIconSource.favicon]);
    expect(effectivePreferredSources(defaultConfiguration)).toEqual([BrandIconSource.favicon]);
  });

  it('prefers nothing offline, because there is nothing to prefer', () => {
    expect(effectivePreferredSources(offlineConfiguration)).toEqual([]);
  });

  it('lets a confident preferred source outrank an equally confident bundled mark', () => {
    const result = rankResult('Figma', [
      candidate('figma', 1, BrandIconSource.bundled),
      candidate('com.figma.FigmaMirror', 1, BrandIconSource.appStore),
    ], [BrandIconSource.appStore]);
    expect(result.candidates[0]!.source).toBe(BrandIconSource.appStore);
  });

  it('does not let an unsure preferred source jump the queue', () => {
    const result = rankResult('Figma', [
      candidate('figma', 1, BrandIconSource.bundled),
      candidate('figma.com', 0.65, BrandIconSource.favicon),
    ], [BrandIconSource.favicon]);
    expect(result.candidates[0]!.source).toBe(BrandIconSource.bundled);
  });

  it('lets a favicon for a domain you supplied jump the queue', () => {
    const result = rankResult('Figma', [
      candidate('figma', 1, BrandIconSource.bundled),
      candidate('figma.com', 0.86, BrandIconSource.favicon),
    ], [BrandIconSource.favicon]);
    expect(result.candidates[0]!.source).toBe(BrandIconSource.favicon);
  });

  it('still decides on confidence within one source', () => {
    const result = rankResult('Apple', [
      candidate('appletv', 0.51, BrandIconSource.bundled),
      candidate('apple', 0.94, BrandIconSource.bundled),
    ], [BrandIconSource.appStore]);
    expect(result.candidates.map((c) => c.slug)).toEqual(['apple', 'appletv']);
  });

  it('parses the shorthand hex a two tone mark depends on', () => {
    expect(colorFromHex('FFF')).toEqual(colorFromHex('FFFFFF'));
    expect(colorFromHex('FFFF')).toEqual(colorFromHex('FFFFFF'));
    expect(colorFromHex(null)).toBeUndefined();
    expect(colorFromHex('nope')).toBeUndefined();
  });
});
