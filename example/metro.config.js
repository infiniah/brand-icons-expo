const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withBrandIcons } = require('@infiniah/brand-icons/metro');

const workspace = path.resolve(__dirname, '..');
const config = withBrandIcons(getDefaultConfig(__dirname));

config.watchFolders = [workspace];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspace, 'node_modules'),
];

// The example links the package with `file:..`, so Metro resolves the package's own imports from
// the package's node_modules and bundles a second React Native. Two copies mean two bridges, and
// the one the app registers into is not the one the native side calls. An app installing from npm
// has no second copy; this only exists because the package and the example share a checkout.
const shared = new Set(Object.keys(require(path.join(workspace, 'package.json')).peerDependencies));
const fromProject = { originModulePath: path.join(__dirname, 'index.js') };

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const segments = moduleName.split('/');
  const name = segments[0].startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  const origin = shared.has(name) ? { ...context, ...fromProject } : context;
  return context.resolveRequest(origin, moduleName, platform);
};

module.exports = config;
