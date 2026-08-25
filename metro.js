/**
 * Metro configuration for apps using @infiniah/brand-icons.
 *
 * Metro treats `.json` as source and compiles it into an object literal inside the JavaScript
 * bundle, which a catalogue this size does not survive. The catalogue therefore ships as
 * `brand-marks.txt`, and this registers that extension as an asset so it is read at runtime
 * rather than compiled into the bundle.
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
