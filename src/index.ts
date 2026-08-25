/** Resolve a messy service name to a brand icon, with a confidence score you can act on. */

export { BrandCatalog, parseCatalog, isRestrictive } from './catalog/brandCatalog';
export type { BundledMark } from './catalog/brandCatalog';

export { best, isAmbiguous, rankResult } from './core/brandIconResult';
export type { BrandIconResult } from './core/brandIconResult';

export {
  BrandIconSource, SOURCE_LABELS, argb, candidateId, colorFromHex, hexString, isMultiColor,
  normalizeDomain, relativeLuminance,
} from './core/types';
export type {
  BrandColor, BrandIconCandidate, BrandIconShape, BrandQuery, VectorLayer,
} from './core/types';

export { brandTokens, key, normalize, qualifiers, tokens } from './matching/nameNormalizer';
export { normalizedEditDistance, score } from './matching/matchScorer';

export type { BrandIconProvider } from './providers/brandIconProvider';
export { BundledIconProvider, shapeFor } from './providers/bundledIconProvider';
export { AppStoreProvider } from './providers/appStoreProvider';
export { FaviconProvider, secondLevelLabel } from './providers/faviconProvider';

export { BrandIconResolver } from './resolver/brandIconResolver';
export type { ProviderProbe } from './resolver/brandIconResolver';
export {
  defaultConfiguration, effectivePreferredSources, exhaustiveConfiguration, offlineConfiguration,
} from './resolver/resolverConfiguration';
export type { ResolverConfiguration } from './resolver/resolverConfiguration';

export { parsePath } from './vector/svgPathParser';
export type { PathSegment } from './vector/pathSegment';

export { BrandIcon } from './ui/BrandIcon';
export type { BrandIconProps } from './ui/BrandIcon';
