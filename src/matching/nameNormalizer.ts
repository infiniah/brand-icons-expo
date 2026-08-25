/**
 * Turns the many ways a service gets written into something comparable.
 *
 * Real inputs are messy: a bank statement says `NETFLIX.COM`, an Apple receipt says
 * `Apple Music (Family)`, a person types `netflix`. All three should reach the same brand.
 *
 * Every rule here is mirrored in the Swift, Kotlin and Dart ports and pinned by
 * `golden-corpus.json`. Change one and you have to change all four.
 */

/**
 * Words that describe a *tier* rather than a *brand*.
 *
 * Stripped for matching but kept in {@link qualifiers}, because they are exactly what separates
 * two real brands: `Apple Music` and `Apple TV` share a root and are not the same product.
 */
export const TIER_WORDS: ReadonlySet<string> = new Set([
  'plus', 'premium', 'pro', 'family', 'individual', 'student', 'duo', 'basic',
  'standard', 'unlimited', 'annual', 'monthly', 'yearly', 'subscription', 'plan',
  'membership', 'trial', 'tier', 'account',
]);

/** Noise a payment processor bolts onto a descriptor, safe to drop anywhere it appears. */
export const PROCESSOR_NOISE: ReadonlySet<string> = new Set([
  'com', 'www', 'inc', 'ltd', 'llc', 'co', 'corp', 'gmbh', 'bv', 'sa', 'ag',
  'payment', 'payments', 'recurring', 'autopay', 'bill', 'billing', 'purchase',
]);

/**
 * Processors that are also real brands.
 *
 * `APPLE.COM/BILL SPOTIFY` is Spotify, so the leading `apple` is noise. `Apple TV` is Apple, so
 * the same token is the brand. Position alone does not separate them, since both lead. What
 * separates them is what follows: a descriptor puts processor noise after the prefix.
 */
export const PROCESSOR_PREFIXES: ReadonlySet<string> = new Set([
  'apple', 'google', 'paypal', 'stripe', 'sq', 'sumup', 'chk', 'pos',
]);

/** Lowercased, diacritic free, punctuation collapsed to single spaces. */
export function normalize(raw: string): string {
  const folded = raw.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
  let out = '';
  for (const character of folded) {
    out += /\p{L}|\p{N}/u.test(character) ? character : ' ';
  }
  return out.split(' ').filter((word) => word.length > 0).join(' ');
}

/**
 * Word tokens, with processor noise removed.
 *
 * `APPLE.COM/BILL SPOTIFY` becomes `['spotify']`, which is the only useful token in it.
 */
export function tokens(raw: string, keepingProcessorNoise = false): string[] {
  const words = normalize(raw).split(' ').filter((word) => word.length > 0);
  if (keepingProcessorNoise) return words;

  let kept = words;
  const lead = words[0];
  if (lead !== undefined && PROCESSOR_PREFIXES.has(lead) && words.length > 1) {
    const second = words[1];
    if (second !== undefined && PROCESSOR_NOISE.has(second)) kept = words.slice(1);
  }

  const meaningful = kept.filter((word) => !PROCESSOR_NOISE.has(word));
  // Falling back to the kept words matters for a descriptor that is *only* noise, such as a bare
  // "APPLE.COM", where "apple" really is the brand.
  return meaningful.length > 0 ? meaningful : kept;
}

/** Brand tokens only, with tier words removed. */
export function brandTokens(raw: string): string[] {
  const all = tokens(raw);
  const stripped = all.filter((word) => !TIER_WORDS.has(word));
  return stripped.length > 0 ? stripped : all;
}

/** The tier words present, in order. `Kalend Plus` reports `['plus']`. */
export function qualifiers(raw: string): string[] {
  return tokens(raw, true).filter((word) => TIER_WORDS.has(word));
}

/** The comparable key: brand tokens, joined, no spaces. */
export function key(raw: string): string {
  return brandTokens(raw).join('');
}
