import type { BrandCatalog } from '../catalog/brandCatalog';
import { rankResult } from '../core/brandIconResult';
import type { BrandIconResult } from '../core/brandIconResult';
import type { BrandIconCandidate, BrandIconShape, BrandQuery } from '../core/types';
import { key } from '../matching/nameNormalizer';
import { AppStoreProvider } from '../providers/appStoreProvider';
import type { BrandIconProvider } from '../providers/brandIconProvider';
import { BundledIconProvider } from '../providers/bundledIconProvider';
import { FaviconProvider } from '../providers/faviconProvider';
import { defaultConfiguration, effectivePreferredSources } from './resolverConfiguration';
import type { ResolverConfiguration } from './resolverConfiguration';

/** What one provider returned for a query, and how long it took. */
export interface ProviderProbe {
  readonly source: BrandIconProvider['source'];
  readonly milliseconds: number;
  readonly candidates: readonly BrandIconCandidate[];
  readonly failure?: string;
}

/**
 * Resolves a service name to ranked brand icon candidates.
 *
 * ```ts
 * const resolver = new BrandIconResolver(catalog);
 * const result = await resolver.resolve({ name: 'NETFLIX.COM' });
 * const icon = best(result, 0.8);
 * ```
 *
 * Providers are consulted cheapest first and the resolver stops early once a candidate is good
 * enough, so the common case never touches the network.
 */
export class BrandIconResolver {
  readonly configuration: ResolverConfiguration;
  readonly providers: readonly BrandIconProvider[];

  private readonly cache = new Map<string, BrandIconResult>();

  constructor(
    catalog: BrandCatalog,
    configuration: Partial<ResolverConfiguration> = {},
    providers?: readonly BrandIconProvider[],
  ) {
    this.configuration = { ...defaultConfiguration, ...configuration };
    this.providers =
      providers ??
      [
        new BundledIconProvider(
          this.configuration.excludesRestrictiveLicenses
            ? catalog.withoutRestrictiveLicenses()
            : catalog,
        ),
        ...(this.configuration.allowsNetwork ? [new FaviconProvider()] : []),
        ...(this.configuration.allowsNetwork && this.configuration.allowsAppStore
          ? [new AppStoreProvider({ isEnabled: true })]
          : []),
      ];
  }

  async resolve(query: BrandQuery): Promise<BrandIconResult> {
    const cacheKey = [key(query.name), query.domain ?? '', query.slug ?? ''].join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const collected: BrandIconCandidate[] = [];
    for (const provider of this.providers) {
      const top = collected[0];
      if (top && top.confidence >= this.configuration.shortCircuitConfidence) break;
      try {
        collected.push(...(await provider.candidates(query)));
      } catch {
        continue;
      }
      collected.sort((a, b) => b.confidence - a.confidence);
    }

    const result = rankResult(
      query.name,
      dedupe(collected)
        .filter((candidate) => candidate.confidence >= this.configuration.minimumConfidence)
        .slice(0, this.configuration.maximumCandidates),
      effectivePreferredSources(this.configuration),
      this.configuration.preferenceThreshold,
    );
    this.cache.set(cacheKey, result);
    return result;
  }

  async shape(candidate: BrandIconCandidate): Promise<BrandIconShape> {
    if (candidate.shape) return candidate.shape;
    for (const provider of this.providers) {
      if (provider.source === candidate.source) return provider.shape(candidate);
    }
    throw new Error(`${candidate.source} is off`);
  }

  /**
   * Asks every provider in parallel and reports what each returned, with timings.
   *
   * The diagnostic path, not the resolution path. It ignores the short circuit so a name the
   * catalogue already knows still reaches the network providers.
   */
  async probe(query: BrandQuery): Promise<ProviderProbe[]> {
    const probes = await Promise.all(
      this.providers.map(async (provider): Promise<ProviderProbe> => {
        const started = Date.now();
        try {
          const candidates = (await provider.candidates(query))
            .sort((a, b) => b.confidence - a.confidence);
          return { source: provider.source, milliseconds: Date.now() - started, candidates };
        } catch (error) {
          return {
            source: provider.source,
            milliseconds: Date.now() - started,
            candidates: [],
            failure: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    return probes.sort((a, b) => {
      const left = a.candidates[0]?.confidence ?? 0;
      const right = b.candidates[0]?.confidence ?? 0;
      if (left !== right) return right - left;
      return a.milliseconds - b.milliseconds;
    });
  }

  removeCachedResults(): void {
    this.cache.clear();
  }
}

/**
 * Keeps the highest scoring candidate per brand, so the same company arriving from two providers
 * is offered once rather than twice.
 */
function dedupe(candidates: readonly BrandIconCandidate[]): BrandIconCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const identity = key(candidate.slug);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
