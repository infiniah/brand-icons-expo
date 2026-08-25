import { brandTokens, key, qualifiers } from './nameNormalizer';

/**
 * Scores how well a query names a brand, 0 to 1.
 *
 * The number is meant to be *acted on*, so it is built from signals that can be explained rather
 * than a single fuzzy distance. In descending order of trust:
 *
 * 1. the normalised keys are identical
 * 2. every brand token of one appears in the other
 * 3. tokens overlap partially
 * 4. the strings are merely close in edit distance
 *
 * A tier word present on one side only applies a penalty, because `Apple Music` and `Apple TV`
 * must not collapse into `Apple`.
 */
export function score(query: string, name: string, slug?: string): number {
  const queryKey = key(query);
  if (queryKey.length === 0) return 0;

  let best = 0;
  for (const target of slug === undefined ? [name] : [name, slug]) {
    best = Math.max(best, rawScore(queryKey, query, target));
  }
  return Math.min(Math.max(best, 0), 1);
}

function rawScore(queryKey: string, query: string, target: string): number {
  const targetKey = key(target);
  if (targetKey.length === 0) return 0;

  if (queryKey === targetKey) return 1 - qualifierPenalty(query, target);

  const queryTokens = new Set(brandTokens(query));
  const targetTokens = new Set(brandTokens(target));

  let structural = 0;
  if (queryTokens.size > 0 && targetTokens.size > 0) {
    const ratio =
      Math.min(queryTokens.size, targetTokens.size) / Math.max(queryTokens.size, targetTokens.size);

    if ([...targetTokens].every((token) => queryTokens.has(token))) {
      // The query carries extra words the brand does not, which is what a statement descriptor
      // looks like: "SPOTIFY USA" is Spotify with a region bolted on.
      structural = 0.72 + 0.18 * ratio;
    } else if ([...queryTokens].every((token) => targetTokens.has(token))) {
      // The brand carries extra words the query does not, so the brand is the more specific
      // thing. `Apple` is not `Apple TV`. Every sibling scores alike here, deliberately.
      structural = 0.42 + 0.18 * ratio;
    } else {
      const shared = [...queryTokens].filter((token) => targetTokens.has(token)).length;
      if (shared > 0) {
        const union = new Set([...queryTokens, ...targetTokens]).size;
        structural = 0.38 + 0.3 * (shared / union);
      }
    }
  }

  // Substring containment on the joined key catches "netflixcom" against "netflix". The floor and
  // the ratio gate keep a brand named "E" from matching inside "sqbluebottle".
  if (structural === 0) {
    const shorter = Math.min(queryKey.length, targetKey.length);
    const ratio = shorter / Math.max(queryKey.length, targetKey.length);
    if (shorter >= 3 && ratio >= 0.5 &&
        (queryKey.includes(targetKey) || targetKey.includes(queryKey))) {
      structural = 0.28 + 0.24 * ratio;
    }
  }

  const similarity = 1 - normalizedEditDistance(queryKey, targetKey);
  // Edit distance alone is a weak signal, so it can never carry a match on its own.
  const fuzzy = similarity >= 0.82 ? similarity * 0.6 : 0;

  return Math.max(structural, fuzzy) - qualifierPenalty(query, target);
}

/** Penalises a tier word present on one side only. */
function qualifierPenalty(query: string, target: string): number {
  const queryQualifiers = new Set(qualifiers(query));
  const targetQualifiers = new Set(qualifiers(target));
  const difference =
    [...queryQualifiers].filter((word) => !targetQualifiers.has(word)).length +
    [...targetQualifiers].filter((word) => !queryQualifiers.has(word)).length;
  if (difference === 0) return 0;
  return Math.min(0.12, 0.06 * difference);
}

/** Levenshtein distance divided by the longer length, so 0 is identical and 1 is unrelated. */
export function normalizedEditDistance(lhs: string, rhs: string): number {
  if (lhs === rhs) return 0;
  if (lhs.length === 0 || rhs.length === 0) return 1;

  let previous = Array.from({ length: rhs.length + 1 }, (_, index) => index);
  let current = new Array<number>(rhs.length + 1).fill(0);

  for (let i = 1; i <= lhs.length; i++) {
    current[0] = i;
    for (let j = 1; j <= rhs.length; j++) {
      const cost = lhs[i - 1] === rhs[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
    }
    [previous, current] = [current, previous];
  }
  return previous[rhs.length]! / Math.max(lhs.length, rhs.length);
}
