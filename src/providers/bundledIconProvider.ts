import type { BrandCatalog, BundledMark } from '../catalog/brandCatalog';
import { BrandIconSource } from '../core/types';
import type { BrandIconCandidate, BrandIconShape, BrandQuery } from '../core/types';
import { score } from '../matching/matchScorer';
import type { BrandIconProvider } from './brandIconProvider';

/**
 * The marks compiled into the library.
 *
 * Costs no network and cannot be rate limited, so the resolver asks it first and often never asks
 * anything else. Everything clearing a low floor is returned rather than only the winner, because
 * the caller may want to show a chooser when two brands score alike.
 */
export class BundledIconProvider implements BrandIconProvider {
  /** Below this a mark is noise rather than a weak answer. */
  static readonly floor = 0.3;

  readonly source = BrandIconSource.bundled;

  constructor(private readonly catalog: BrandCatalog) {}

  async candidates(query: BrandQuery): Promise<BrandIconCandidate[]> {
    // An exact key match cannot be beaten, so scoring the rest of the catalogue to discover that
    // is wasted work on every common name.
    const exact = this.catalog.exactMatches(query.name);
    if (exact.length > 0) return exact.map((mark) => candidateFor(mark, 1));

    return this.catalog
      .shortlist(query.name)
      .map((mark) => candidateFor(mark, score(query.name, mark.title, mark.slug)))
      .filter((candidate) => candidate.confidence > BundledIconProvider.floor)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async shape(candidate: BrandIconCandidate): Promise<BrandIconShape> {
    if (candidate.shape) return candidate.shape;
    const mark = this.catalog.mark(candidate.slug);
    if (!mark) throw new Error('no match');
    return shapeFor(mark);
  }
}

function candidateFor(mark: BundledMark, confidence: number): BrandIconCandidate {
  return {
    slug: mark.slug,
    title: mark.title,
    confidence,
    source: BrandIconSource.bundled,
    shape: shapeFor(mark),
  };
}

/** The colour artwork when the brand has it, and the flattened mark otherwise. */
export function shapeFor(mark: BundledMark): BrandIconShape {
  if (mark.layers.length > 0 && mark.colorViewBox) {
    return {
      kind: 'layered',
      layers: mark.layers,
      viewBoxWidth: mark.colorViewBox[2]!,
      viewBoxHeight: mark.colorViewBox[3]!,
    };
  }
  return {
    kind: 'vector',
    path: mark.path,
    viewBoxWidth: mark.viewBox[2]!,
    viewBoxHeight: mark.viewBox[3]!,
    ...(mark.tint ? { tint: mark.tint } : {}),
  };
}
