const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const { resolver } = config;
config.resolver = {
  ...resolver,
  sourceExts: [...resolver.sourceExts, 'mjs', 'cjs'],
  // three.js ships GLSL chunks that Metro must treat as source, not assets.
  assetExts: resolver.assetExts.filter((ext) => ext !== 'glsl'),
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
