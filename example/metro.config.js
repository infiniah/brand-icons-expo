const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const workspace = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

// Metro does not follow the `file:..` link on its own, so the package is watched where it lives
// and resolved explicitly. Only the example needs this; a real consumer installs from npm.
config.watchFolders = [workspace];
config.resolver.extraNodeModules = {
  '@infiniah/brand-icons': workspace,
};
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspace, 'node_modules'),
];

module.exports = config;
