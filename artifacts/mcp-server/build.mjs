// Minimal esbuild bundle for the MCP server, ESM output to match
// package.json's "bin" and "start" script pointing at dist/index.mjs.
// Not yet run in this environment (this package has not been through
// `pnpm run build` in the actual workspace) — verify before relying on it.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/index.mjs",
  // No banner here: src/index.ts already starts with its own
  // "#!/usr/bin/env node" shebang, and esbuild preserves a source
  // shebang at the top of the bundle automatically. Adding a banner too
  // duplicates it onto line 2, which node's ESM loader then rejects as
  // invalid syntax (confirmed by a real build + run in this environment
  // before this fix; do not re-add a banner without re-testing).
  external: [],
  sourcemap: true,
});
