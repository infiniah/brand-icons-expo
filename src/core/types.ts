/** Where a candidate came from. */
export const BrandIconSource = {
  /** The catalogue compiled into the library. No network, microseconds. */
  bundled: 'bundled',
  /**
   * Apple's iTunes Search API. Real app artwork, in colour, rate limited.
   *
   * Named for Apple on every platform: Google publishes no equivalent public search API, so
   * "App Store" beside a Play Store button would read like a mistake.
   */
  appStore: 'appStore',
  /** The site's own declared icon, from its HTML or web manifest. */
  favicon: 'favicon',
} as const;

export type BrandIconSource = (typeof BrandIconSource)[keyof typeof BrandIconSource];

/** What to call a tier in front of a person. */
export const SOURCE_LABELS: Record<BrandIconSource, string> = {
  bundled: 'Bundled',
  appStore: 'Apple App Store',
  favicon: 'Site icon',
};

/** A brand tint, kept as sRGB components so the library stays free of platform colour types. */
export interface BrandColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** One filled path of a multi colour mark. */
export interface VectorLayer {
  readonly path: string;
  /** The layer's own fill. Undefined means the artwork left it unset, which SVG paints black. */
  readonly fill?: BrandColor;
  /**
   * Whether the layer fills by the even odd rule rather than the non zero winding default.
   *
   * A mark that punches holes with `fill-rule="evenodd"` fills them in if drawn by winding.
   */
  readonly isEvenOdd?: boolean;
}

/** Resolved artwork, as either a vector to draw or bytes to decode. */
export type BrandIconShape =
  | { readonly kind: 'vector'; readonly path: string; readonly viewBoxWidth: number;
      readonly viewBoxHeight: number; readonly tint?: BrandColor }
  | { readonly kind: 'layered'; readonly layers: readonly VectorLayer[];
      readonly viewBoxWidth: number; readonly viewBoxHeight: number }
  | { readonly kind: 'raster'; readonly uri: string };

/** One possible answer, with how sure the library is about it. */
export interface BrandIconCandidate {
  readonly slug: string;
  readonly title: string;
  readonly confidence: number;
  readonly source: BrandIconSource;
  readonly shape?: BrandIconShape;
}

/** What you know about the thing you want an icon for. */
export interface BrandQuery {
  readonly name: string;
  /** The service's website host, without scheme. Improves both accuracy and speed. */
  readonly domain?: string;
  readonly slug?: string;
}

export function candidateId(candidate: BrandIconCandidate): string {
  return `${candidate.source}:${candidate.slug}`;
}

/** True when the mark carries the brand's real colours rather than one flat tint. */
export function isMultiColor(shape: BrandIconShape | undefined): boolean {
  if (shape?.kind !== 'layered') return false;
  const fills = new Set(
    shape.layers.map((layer) => layer.fill).filter(Boolean).map((fill) => argb(fill!)),
  );
  return fills.size > 1;
}

export function argb(color: BrandColor): number {
  return (0xff << 24) | (color.red << 16) | (color.green << 8) | color.blue;
}

export function hexString(color: BrandColor): string {
  const part = (value: number) => value.toString(16).padStart(2, '0');
  return `#${part(color.red)}${part(color.green)}${part(color.blue)}`;
}

/**
 * Perceived brightness, 0 for black and 1 for white.
 *
 * sRGB weights rather than a plain average: a mean calls `#0000FF` as bright as `#00FF00`.
 */
export function relativeLuminance(color: BrandColor): number {
  return (0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue) / 255;
}

/**
 * Parses `F24E1E`, `#F24E1E`, the `FFF` and `FFFF` shorthands, and the eight digit form.
 *
 * The artwork writes white as `#fff`, so rejecting shorthand drops the light layer of a two tone
 * mark and paints it in the fallback colour.
 */
export function colorFromHex(hex: string | null | undefined): BrandColor | undefined {
  // The generated catalogue writes `null` for a layer the artwork left unfilled, so this has to
  // survive one as readily as a missing key.
  if (typeof hex !== 'string') return undefined;
  let text = hex.startsWith('#') ? hex.slice(1) : hex;
  if (text.length === 3 || text.length === 4) {
    text = [...text].map((character) => character + character).join('');
  }
  if (text.length !== 6 && text.length !== 8) return undefined;
  const value = Number.parseInt(text, 16);
  if (Number.isNaN(value)) return undefined;
  if (text.length === 6) {
    return { red: (value >> 16) & 0xff, green: (value >> 8) & 0xff, blue: value & 0xff };
  }
  return { red: (value >>> 24) & 0xff, green: (value >> 16) & 0xff, blue: (value >> 8) & 0xff };
}

export function normalizeDomain(raw: string): string {
  let value = raw.toLowerCase();
  for (const prefix of ['https://', 'http://', 'www.']) {
    if (value.startsWith(prefix)) value = value.slice(prefix.length);
  }
  const slash = value.indexOf('/');
  if (slash >= 0) value = value.slice(0, slash);
  return value;
}
