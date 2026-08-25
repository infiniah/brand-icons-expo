import { BrandIconSource } from '../core/types';
import type { BrandIconCandidate, BrandIconShape, BrandQuery } from '../core/types';
import { score } from '../matching/matchScorer';
import type { BrandIconProvider } from './brandIconProvider';

/**
 * App Store artwork, via Apple's iTunes Search API.
 *
 * Off unless you turn it on, because two facts about this source belong to the adopter. Apple
 * limits the Search API to roughly twenty requests a minute per client and answers `429` beyond
 * that. Apple's terms describe the artwork as promotional material for store content, to be shown
 * near a store badge. Labelling a row of your own interface is a different use.
 *
 * Artwork is returned as a URI rather than bytes, because React Native's `Image` takes a URI and
 * downloading it here would only mean handing the same bytes back.
 */
export class AppStoreProvider implements BrandIconProvider {
  readonly source = BrandIconSource.appStore;

  private readonly artwork = new Map<string, string>();

  constructor(
    private readonly options: {
      readonly isEnabled?: boolean;
      readonly country?: string;
      readonly limit?: number;
      readonly fetchImpl?: typeof fetch;
    } = {},
  ) {}

  async candidates(query: BrandQuery): Promise<BrandIconCandidate[]> {
    if (this.options.isEnabled !== true) return [];
    const term = query.name.trim();
    if (term.length === 0) return [];

    const url =
      'https://itunes.apple.com/search?' +
      new URLSearchParams({
        term,
        entity: 'software',
        limit: String(Math.max(1, this.options.limit ?? 3)),
        country: this.options.country ?? 'US',
      }).toString();

    const request = this.options.fetchImpl ?? fetch;
    const response = await request(url, { headers: { Accept: 'application/json' } });
    if (response.status === 429) throw new Error('rate limited');
    if (!response.ok) return [];

    const payload = (await response.json()) as { results?: unknown };
    if (!Array.isArray(payload.results)) throw new Error('unreadable response');

    const candidates: BrandIconCandidate[] = [];
    for (const raw of payload.results as Record<string, unknown>[]) {
      const bundleId = raw['bundleId'];
      const trackName = raw['trackName'];
      const artwork = raw['artworkUrl512'];
      if (typeof bundleId !== 'string' || typeof trackName !== 'string' ||
          typeof artwork !== 'string') {
        continue;
      }
      this.artwork.set(bundleId, artwork);
      candidates.push({
        slug: bundleId,
        title: trackName,
        confidence: score(query.name, trackName),
        source: BrandIconSource.appStore,
        shape: { kind: 'raster', uri: artwork },
      });
    }
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  async shape(candidate: BrandIconCandidate): Promise<BrandIconShape> {
    if (candidate.shape) return candidate.shape;
    const uri = this.artwork.get(candidate.slug);
    if (uri === undefined) throw new Error('no match');
    return { kind: 'raster', uri };
  }
}
