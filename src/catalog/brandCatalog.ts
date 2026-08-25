import { colorFromHex } from '../core/types';
import type { BrandColor, VectorLayer } from '../core/types';
import { brandTokens, key } from '../matching/nameNormalizer';

/** One mark as it appears in the compiled catalogue. */
export interface BundledMark {
  readonly slug: string;
  readonly title: string;
  /** SVG path data in the coordinate space of `viewBox`. */
  readonly path: string;
  readonly viewBox: readonly number[];
  readonly tint?: BrandColor;
  /**
   * The brand's real artwork, when a multi colour rendition exists for it.
   *
   * Empty for most marks. When present it is what should be drawn, because `path` is the
   * flattened silhouette of the same brand.
   */
  readonly layers: readonly VectorLayer[];
  /** The coordinate space `layers` are drawn in, which is not `viewBox`. */
  readonly colorViewBox?: readonly number[];
  readonly license?: { readonly type: string; readonly url?: string };
}

export function isRestrictive(mark: BundledMark): boolean {
  const type = mark.license?.type?.toUpperCase() ?? '';
  return type.includes('NC') || type.includes('ND') || type.includes('AGPL');
}

/**
 * The marks compiled into the library, plus the indexes that make them fast to search.
 *
 * Build one with {@link parseCatalog} and keep it. Construction walks every mark twice to build
 * the indexes, which costs real milliseconds at four thousand marks.
 */
export class BrandCatalog {
  readonly marks: readonly BundledMark[];
  readonly sourceVersion: string;

  private readonly bySlug = new Map<string, BundledMark>();
  private readonly byKey = new Map<string, BundledMark[]>();
  private readonly byToken = new Map<string, BundledMark[]>();

  constructor(marks: readonly BundledMark[], sourceVersion: string) {
    this.marks = marks;
    this.sourceVersion = sourceVersion;

    for (const mark of marks) {
      this.bySlug.set(mark.slug, mark);
      // A set, because a mark whose title normalises to its slug would otherwise be indexed under
      // that one key twice and returned twice.
      for (const entry of new Set([key(mark.title), key(mark.slug)])) {
        if (entry.length === 0) continue;
        const bucket = this.byKey.get(entry);
        if (bucket) bucket.push(mark);
        else this.byKey.set(entry, [mark]);
      }
      for (const token of new Set([...brandTokens(mark.title), mark.slug])) {
        if (token.length === 0) continue;
        const bucket = this.byToken.get(token);
        if (bucket) bucket.push(mark);
        else this.byToken.set(token, [mark]);
      }
    }
  }

  mark(slug: string): BundledMark | undefined {
    return this.bySlug.get(slug);
  }

  /** Marks whose recorded terms forbid commercial use or derivative works. See NOTICE. */
  get restrictivelyLicensed(): BundledMark[] {
    return this.marks.filter(isRestrictive);
  }

  withoutRestrictiveLicenses(): BrandCatalog {
    return new BrandCatalog(this.marks.filter((mark) => !isRestrictive(mark)), this.sourceVersion);
  }

  /** Marks whose normalised key equals the query's exactly. */
  exactMatches(query: string): readonly BundledMark[] {
    return this.byKey.get(key(query)) ?? [];
  }

  /**
   * Every mark sharing a token, plus the whole catalogue when nothing shares one.
   *
   * A query whose tokens appear nowhere falls back to everything, because a misspelling has no
   * shared token and edit distance is exactly what should catch it.
   */
  shortlist(query: string): readonly BundledMark[] {
    const queryTokens = brandTokens(query);
    if (queryTokens.length === 0) return this.marks;

    const seen = new Set<string>();
    const shortlist: BundledMark[] = [];
    for (const token of queryTokens) {
      for (const mark of this.byToken.get(token) ?? []) {
        if (seen.has(mark.slug)) continue;
        seen.add(mark.slug);
        shortlist.push(mark);
      }
    }

    // A prefix hit catches "netflixcom" against "netflix" when nothing tokenised the same.
    if (shortlist.length === 0) {
      const queryKey = key(query);
      for (const mark of this.marks) {
        if (seen.has(mark.slug)) continue;
        seen.add(mark.slug);
        const markKey = key(mark.slug);
        if (queryKey.startsWith(markKey) || markKey.startsWith(queryKey)) shortlist.push(mark);
      }
    }

    return shortlist.length > 0 ? shortlist : this.marks;
  }
}

interface RawLayer { path?: string; fill?: string | null; evenOdd?: boolean }
interface RawMark {
  slug?: string; title?: string; path?: string; viewBox?: number[]; tint?: string | null;
  layers?: RawLayer[]; colorViewBox?: number[]; license?: { type?: string; url?: string };
}

/** Parses the generated catalogue. */
export function parseCatalog(payload: unknown): BrandCatalog {
  const document = payload as { marks?: RawMark[]; sourceVersion?: string };
  const marks: BundledMark[] = [];

  for (const entry of document.marks ?? []) {
    const { slug, title } = entry;
    // `path` is absent on a mark with colour layers, which are drawn instead.
    const path = entry.path ?? '';
    if (!slug || !title) continue;

    const viewBox = numbers(entry.viewBox) ?? [0, 0, 24, 24];
    const colorViewBox = numbers(entry.colorViewBox);
    const layers: VectorLayer[] = [];
    for (const raw of entry.layers ?? []) {
      if (!raw.path) continue;
      const fill = colorFromHex(raw.fill);
      layers.push({ path: raw.path, ...(fill ? { fill } : {}), isEvenOdd: raw.evenOdd === true });
    }

    // Colour artwork is only usable with the canvas it was drawn on.
    const usableColor = layers.length > 0 && colorViewBox !== undefined;
    if (path.length === 0 && !usableColor) continue;
    const tint = colorFromHex(entry.tint);

    marks.push({
      slug,
      title,
      path,
      viewBox,
      ...(tint ? { tint } : {}),
      layers: usableColor ? layers : [],
      ...(usableColor ? { colorViewBox } : {}),
      ...(entry.license?.type
        ? { license: { type: entry.license.type, ...(entry.license.url ? { url: entry.license.url } : {}) } }
        : {}),
    });
  }

  return new BrandCatalog(marks, document.sourceVersion ?? '');
}

function numbers(raw: number[] | undefined): number[] | undefined {
  if (!raw || raw.length !== 4) return undefined;
  if (raw[2]! <= 0 || raw[3]! <= 0) return undefined;
  return raw;
}
