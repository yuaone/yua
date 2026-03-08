const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root so Metro can find yua-shared source
config.watchFolders = [monorepoRoot];

// 2. Ensure Metro resolves node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Force single copies of React/RN — prevents duplicate React from
//    yua-web/yua-console node_modules being picked up by Metro
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, "node_modules/react"),
  "react-dom": path.resolve(monorepoRoot, "node_modules/react-dom"),
  "react-native": path.resolve(monorepoRoot, "node_modules/react-native"),
};

// 4. Block ALL nested react copies — only root node_modules/react is allowed.
//    Matches: node_modules/*/node_modules/react/  (any depth)
//    Also blocks: yua-web/node_modules/react/, yua-console/node_modules/react/
config.resolver.blockList = [
  // Any nested react inside another package's node_modules
  /node_modules\/(?!\.pnpm)[^/]+\/node_modules\/react\//,
  /node_modules\/(?!\.pnpm)[^/]+\/node_modules\/react-dom\//,
  // Other workspace packages' own react copies
  /yua-web\/node_modules\//,
  /yua-console\/node_modules\//,
  /yua-sdk\/node_modules\//,
];

module.exports = config;
