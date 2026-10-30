// Metro enxerga o pacote compartilhado do monorepo (packages/shared).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.join(root, "packages/shared")];
config.resolver.extraNodeModules = { "@vyz/shared": path.join(root, "packages/shared/src") };
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];
module.exports = config;
