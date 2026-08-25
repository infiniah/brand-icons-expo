import { score, type BundledMark } from '@infiniah/brand-icons';

import { inFacet, type MarkFacet } from './markFacet';

/**
 * Substring first, because a browser is a filter and the answer to `spo` is every mark containing
 * it. The scorer only runs when that finds nothing, which is the case a misspelling produces: it
 * shares no substring and edit distance is what catches it.
 */
export function filterMarks(
  marks: readonly BundledMark[],
  facet: MarkFacet,
  query: string,
): BundledMark[] {
  const faceted = marks.filter((mark) => inFacet(mark, facet));
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return faceted;

  const literal: { mark: BundledMark; rank: number }[] = [];
  for (const mark of faceted) {
    const rank = rankOf(mark, needle);
    if (rank !== undefined) literal.push({ mark, rank });
  }
  if (literal.length > 0) {
    literal.sort((a, b) => (a.rank === b.rank ? a.mark.slug.localeCompare(b.mark.slug) : a.rank - b.rank));
    return literal.map((entry) => entry.mark);
  }

  return faceted
    .map((mark) => ({ mark, value: score(needle, mark.title, mark.slug) }))
    .filter((entry) => entry.value >= 0.35)
    .sort((a, b) => b.value - a.value)
    .map((entry) => entry.mark);
}

/**
 * Lower sorts first. A name that starts with what was typed is what the typist meant, so `spo`
 * puts Spotify above Diaspora rather than leaving it to the alphabet.
 */
function rankOf(mark: BundledMark, needle: string): number | undefined {
  const title = mark.title.toLowerCase();
  if (mark.slug.startsWith(needle)) return 0;
  if (title.startsWith(needle)) return 1;
  if (mark.slug.includes(needle)) return 2;
  if (title.includes(needle)) return 3;
  return undefined;
}
