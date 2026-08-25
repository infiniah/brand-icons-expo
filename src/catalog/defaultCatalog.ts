import { BrandCatalog, parseCatalog } from './brandCatalog';

/**
 * How the bundled catalogue is read.
 *
 * React Native cannot inline a ten megabyte JSON file into the JavaScript bundle: Metro compiles
 * `require`d JSON into an object literal, and one this size takes the JS thread down with it. So
 * the catalogue ships as a `.txt` asset and is fetched at runtime, which makes loading async.
 *
 * Expo apps get that by adding `withBrandIcons` to their Metro config. A bare React Native app, or
 * a test, passes its own loader instead.
 */
export type CatalogLoader = () => Promise<string>;

let cached: Promise<BrandCatalog> | undefined;
let loader: CatalogLoader | undefined;

/**
 * Supplies the loader used by {@link defaultCatalog}.
 *
 * Only needed outside Expo. Call it once, before the first resolve.
 */
export function setCatalogLoader(next: CatalogLoader): void {
  loader = next;
  cached = undefined;
}

/**
 * The catalogue that ships with this package.
 *
 * Parsed once and held for the process: await it as often as you like.
 */
export function defaultCatalog(): Promise<BrandCatalog> {
  cached ??= load();
  return cached;
}

/** Drops the held catalogue. Only useful in tests. */
export function resetDefaultCatalog(): void {
  cached = undefined;
}

async function load(): Promise<BrandCatalog> {
  if (loader) return parseCatalog(JSON.parse(await loader()));

  const expoLoader = await expoAssetLoader();
  if (expoLoader) return parseCatalog(JSON.parse(await expoLoader()));

  throw new Error(
    'BrandIcons could not load its catalogue. Install expo-asset, or call setCatalogLoader() ' +
      'with something that returns the contents of brand-marks.json.',
  );
}

/**
 * Resolves the asset through `expo-asset` when it is present.
 *
 * Required lazily and behind a try, so this package does not depend on Expo to be used without it.
 */
async function expoAssetLoader(): Promise<CatalogLoader | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Asset } = require('expo-asset') as typeof import('expo-asset');
    // `.txt` rather than `.json` on purpose: Metro compiles JSON into the bundle as source, and
    // ten megabytes of object literal takes the JS thread down. `withBrandIcons` in this
    // package's `metro` entry registers the extension as an asset.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('../../assets/brand-marks.txt');
    return async () => {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      return fetch(uri).then((response) => response.text());
    };
  } catch {
    return undefined;
  }
}
