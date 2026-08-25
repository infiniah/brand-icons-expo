import { BrandIconSource } from '../core/types';

/** How the resolver should behave. */
export interface ResolverConfiguration {
  /** Stop as soon as a candidate reaches this confidence, without asking slower providers. */
  readonly shortCircuitConfidence: number;
  /** Candidates below this are discarded rather than returned. */
  readonly minimumConfidence: number;
  readonly maximumCandidates: number;
  /**
   * Whether the App Store provider may be used.
   *
   * Off by default, deliberately. Apple's Search API is limited to roughly twenty calls a minute
   * per client, and its terms describe that artwork as promotional material for store content.
   */
  readonly allowsAppStore: boolean;
  readonly allowsNetwork: boolean;
  readonly requestsPerMinute: number;
  readonly excludesRestrictiveLicenses: boolean;
  /**
   * Sources that win over a higher scoring candidate from somewhere else.
   *
   * Confidence answers "is this the right brand" and says nothing about whether the artwork is any
   * good. Leaving this undefined derives it from what is enabled.
   */
  readonly preferredSources?: readonly BrandIconSource[];
  /**
   * How sure a preferred source must be before it may jump the queue.
   *
   * Without a bar, preference is harmful: the favicon tier answers for a domain guessed from the
   * name, and letting that outrank a certain catalogue match trades a dull icon for a wrong one.
   */
  readonly preferenceThreshold: number;
}

export const defaultConfiguration: ResolverConfiguration = {
  shortCircuitConfidence: 0.95,
  minimumConfidence: 0.35,
  maximumCandidates: 5,
  allowsAppStore: false,
  allowsNetwork: true,
  requestsPerMinute: 15,
  excludesRestrictiveLicenses: false,
  preferenceThreshold: 0.8,
};

/** Bundled marks only. No network, no third party, works on a plane. */
export const offlineConfiguration: ResolverConfiguration = {
  ...defaultConfiguration,
  allowsNetwork: false,
};

/** Asks every provider and never stops early. The diagnostic path, not the resolution path. */
export const exhaustiveConfiguration: ResolverConfiguration = {
  ...defaultConfiguration,
  shortCircuitConfidence: 2,
  minimumConfidence: 0,
  maximumCandidates: 12,
};

/**
 * The ordering actually applied, after deriving it from what is enabled.
 *
 * Ordered by how good the artwork tends to be rather than by how fast the tier is.
 */
export function effectivePreferredSources(
  configuration: ResolverConfiguration,
): readonly BrandIconSource[] {
  if (configuration.preferredSources !== undefined) return configuration.preferredSources;
  if (!configuration.allowsNetwork) return [];
  return configuration.allowsAppStore
    ? [BrandIconSource.appStore, BrandIconSource.favicon]
    : [BrandIconSource.favicon];
}
