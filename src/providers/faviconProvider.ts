import { BrandIconSource, normalizeDomain } from '../core/types';
import type { BrandIconCandidate, BrandIconShape, BrandQuery } from '../core/types';
import { score } from '../matching/matchScorer';
import type { BrandIconProvider } from './brandIconProvider';

/**
 * The service's own site, via the icons it declares.
 *
 * No third party sits between the user and the brand, which is the point: an icon service would
 * work just as well and would also learn every domain your users look up.
 *
 * Two things are uncertain here and both belong in the number. Whether this is the right brand at
 * all, which caps the tier at {@link CEILING}. And whether the icon is usable, which the declared
 * size scales within that range. Unlike the native ports this cannot measure the bytes, because it
 * hands React Native a URI rather than downloading the image, so it trusts what the site declared
 * and stays a notch more cautious for it.
 */
export class FaviconProvider implements BrandIconProvider {
  static readonly FLOOR = 0.35;
  static readonly CEILING = 0.65;
  static readonly MANIFEST_PATHS = ['/site.webmanifest', '/manifest.json'];
  static readonly FALLBACK_PATHS = [
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/favicon.ico',
  ];

  readonly source = BrandIconSource.favicon;

  constructor(private readonly options: { readonly fetchImpl?: typeof fetch } = {}) {}

  async candidates(query: BrandQuery): Promise<BrandIconCandidate[]> {
    const domain = query.domain ?? `${query.name.replace(/[^a-z0-9]/gi, '').toLowerCase()}.com`;
    const found = await this.bestIcon(domain);
    if (!found) return [];

    const label = secondLevelLabel(domain);
    return [
      {
        slug: domain,
        title: label.length === 0 ? domain : label[0]!.toUpperCase() + label.slice(1),
        confidence: confidence(score(query.name, label, label), found.declaredSize),
        source: BrandIconSource.favicon,
        shape: { kind: 'raster', uri: found.uri },
      },
    ];
  }

  async shape(candidate: BrandIconCandidate): Promise<BrandIconShape> {
    if (candidate.shape) return candidate.shape;
    const found = await this.bestIcon(candidate.slug);
    if (!found) throw new Error('no match');
    return { kind: 'raster', uri: found.uri };
  }

  private async bestIcon(
    domain: string,
  ): Promise<{ uri: string; declaredSize?: number } | undefined> {
    const host = normalizeDomain(domain);
    if (host.length === 0) return undefined;
    const request = this.options.fetchImpl ?? fetch;

    for (const path of FaviconProvider.MANIFEST_PATHS) {
      try {
        const response = await request(`https://${host}${path}`);
        if (!response.ok) continue;
        const manifest = (await response.json()) as { icons?: { src?: string; sizes?: string }[] };
        const icons: { uri: string; declaredSize?: number }[] = [];
        for (const icon of manifest.icons ?? []) {
          if (!icon.src) continue;
          const size = parseSize(icon.sizes);
          icons.push({
            uri: new URL(icon.src, `https://${host}${path}`).toString(),
            ...(size === undefined ? {} : { declaredSize: size }),
          });
        }
        // A manifest icon with no declared size is still likelier to be large than a favicon.
        icons.sort((a, b) => (b.declaredSize ?? 128) - (a.declaredSize ?? 128));
        const best = icons[0];
        if (best) return best;
      } catch {
        continue;
      }
    }

    for (const path of FaviconProvider.FALLBACK_PATHS) {
      try {
        const response = await request(`https://${host}${path}`, { method: 'HEAD' });
        if (response.ok) return { uri: `https://${host}${path}` };
      } catch {
        continue;
      }
    }
    return undefined;
  }
}

function parseSize(sizes: string | undefined): number | undefined {
  if (!sizes) return undefined;
  let best: number | undefined;
  for (const match of sizes.matchAll(/(\d+)\s*[xX]\s*(\d+)/g)) {
    const value = Math.min(Number(match[1]), Number(match[2]));
    if (best === undefined || value > best) best = value;
  }
  return best;
}

/** `netflix.com` and `bbc.co.uk` both reduce to the word a person would call the brand. */
export function secondLevelLabel(domain: string): string {
  const parts = normalizeDomain(domain).split('.').filter((part) => part.length > 0);
  if (parts.length < 2) return parts[0] ?? '';
  const secondLevelSuffixes = new Set(['co', 'com', 'net', 'org', 'ac', 'gov', 'edu']);
  if (parts.length >= 3 && parts[parts.length - 1]!.length === 2 &&
      secondLevelSuffixes.has(parts[parts.length - 2]!)) {
    return parts[parts.length - 3]!;
  }
  return parts[parts.length - 2]!;
}

/** Match strength sets the range, declared resolution scales within it. */
export function confidence(match: number, pixelSize: number | undefined): number {
  return (
    FaviconProvider.FLOOR +
    (FaviconProvider.CEILING - FaviconProvider.FLOOR) * match * (0.4 + 0.6 * resolutionScore(pixelSize))
  );
}

/** 0 at 16 pixels, 1 at 512, log scaled between. */
export function resolutionScore(pixelSize: number | undefined): number {
  if (pixelSize === undefined || pixelSize <= 0) return 0;
  const position = (Math.log2(pixelSize) - 4) / 5;
  return Math.min(Math.max(position, 0), 1);
}
