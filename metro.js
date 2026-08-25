/**
 * Metro configuration for apps using @infiniah/brand-icons.
 *
 * The catalogue is 10 MB. Metro treats `.json` as source and compiles it into an object literal
 * inside the JavaScript bundle, which at this size takes the JS thread down with it. So the
 * catalogue ships as `brand-marks.txt` and this registers that extension as an asset, which means
 * it is downloaded and read at runtime instead of parsed at startup.
 *
 * ```js
 * // metro.config.js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withBrandIcons } = require('@infiniah/brand-icons/metro');
 *
 * module.exports = withBrandIcons(getDefaultConfig(__dirname));
 * ```
 */
function withBrandIcons(config) {
  const assetExts = config.resolver?.assetExts ?? [];
  return {
    ...config,
    resolver: {
      ...config.resolver,
      assetExts: assetExts.includes('txt') ? assetExts : [...assetExts, 'txt'],
    },
  };
}

module.exports = { withBrandIcons };
