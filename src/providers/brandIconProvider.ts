import type { BrandIconCandidate, BrandIconShape, BrandIconSource, BrandQuery } from '../core/types';

/**
 * A place icons can come from.
 *
 * Providers return *candidates*, not a single answer, and never throw for "no match": an empty
 * array is a normal result. They throw only when something went wrong that the caller might act
 * on, such as being rate limited.
 */
export interface BrandIconProvider {
  readonly source: BrandIconSource;
  candidates(query: BrandQuery): Promise<BrandIconCandidate[]>;
  shape(candidate: BrandIconCandidate): Promise<BrandIconShape>;
}
