import type { BrandIconCandidate, BrandIconSource } from './types';

export interface BrandIconResult {
  readonly query: string;
  /** Candidates ranked by preferred source, then descending confidence. May be empty. */
  readonly candidates: readonly BrandIconCandidate[];
}

/**
 * Ranks candidates and wraps them.
 *
 * Sources in `preferring` come first in the order given, but only once they reach
 * `preferenceThreshold`. A preferred source that is unsure about the brand sorts on its score like
 * anything else, so a favicon scraped off a guessed domain cannot displace a certain match.
 */
export function rankResult(
  query: string,
  candidates: readonly BrandIconCandidate[],
  preferring: readonly BrandIconSource[] = [],
  preferenceThreshold = 0.8,
): BrandIconResult {
  const rank = (candidate: BrandIconCandidate): number => {
    if (candidate.confidence < preferenceThreshold) return preferring.length;
    const index = preferring.indexOf(candidate.source);
    return index >= 0 ? index : preferring.length;
  };

  const sorted = [...candidates].sort((a, b) => {
    const left = rank(a);
    const right = rank(b);
    if (left !== right) return left - right;
    return b.confidence - a.confidence;
  });

  return { query, candidates: sorted };
}

/**
 * The single best candidate, if one clears `minimum`.
 *
 * Pick a threshold from what a wrong answer costs. A dashboard that can show a letter tile is
 * happy at 0.5. A flow that writes the choice to a database should ask below roughly 0.8.
 */
export function best(
  result: BrandIconResult,
  minimum = 0.5,
): BrandIconCandidate | undefined {
  const first = result.candidates[0];
  return first !== undefined && first.confidence >= minimum ? first : undefined;
}

/** True when the top two are close enough that picking silently is a guess. */
export function isAmbiguous(result: BrandIconResult, margin = 0.15): boolean {
  const [first, second] = result.candidates;
  if (first === undefined || second === undefined) return false;
  return first.confidence - second.confidence < margin;
}
