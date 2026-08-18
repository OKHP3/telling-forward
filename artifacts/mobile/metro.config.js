const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch shared workspace libs so hot-reload works across packages.
config.watchFolders = [workspaceRoot];

// @tailwindcss/typography creates _tmp_NNNN/ scratch dirs during its build and
// removes them immediately after. Metro's FallbackWatcher walks node_modules,
// finds those paths, then crashes when it calls fs.watch() on a path that has
// since been deleted. We block those paths so Metro never tries to watch them.
//
// Metro requires all blockList entries to share the same regex flags. The
// default list has no flags, so our new entries also use no flags.
const extraPatterns = [
  // Any _tmp_NNN scratch directory created by @tailwindcss/typography post-install
  new RegExp(
    String.raw`node_modules[\\/]\.pnpm[\\/]@tailwindcss\+typography[^\\/]*[\\/]node_modules[\\/]@tailwindcss[\\/]typography_tmp_[^\\/]+[\\/].*`
  ),
  // Generic guard: any node_modules sub-dir whose name ends with _tmp_<digits>
  new RegExp(String.raw`node_modules[\\/].*_tmp_\d+[\\/].*`),
];

const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, ...extraPatterns]
  : existing != null
    ? [existing, ...extraPatterns]
    : extraPatterns;

module.exports = config;
