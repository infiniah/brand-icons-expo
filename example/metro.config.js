const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withBrandIcons } = require('@infiniah/brand-icons/metro');

const workspace = path.resolve(__dirname, '..');
const config = withBrandIcons(getDefaultConfig(__dirname));

// Only the example needs these: it consumes the package through a `file:..` link rather than from
// npm, and Metro does not follow that on its own.
config.watchFolders = [workspace];
config.resolver.extraNodeModules = { '@infiniah/brand-icons': workspace };
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspace, 'node_modules'),
];

module.exports = config;
