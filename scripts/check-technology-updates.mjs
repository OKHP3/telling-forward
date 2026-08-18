import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const root = process.cwd();
const excluded = ['node_modules', '.git', '.agents/skills'];
const manifestPaths = [];

async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.relative(root, path.join(directory, entry.name)).replaceAll('\\', '/');
    if (excluded.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (entry.name === 'package.json') manifestPaths.push(fullPath);
  }
}

const execFileAsync = promisify(execFile);
const installedVersions = new Map();
const lockfile = await fs.readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8');

function collectInstalledPackages(value) {
  if (!value || typeof value !== 'object') return;
  for (const [name, detail] of Object.entries(value)) {
    if (detail && typeof detail === 'object' && detail.from && detail.version && !String(detail.version).startsWith('link:')) {
      installedVersions.set(name, detail.version);
    }
    if (detail && typeof detail === 'object') collectInstalledPackages(detail.dependencies);
  }
}

try {
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const { stdout } = await execFileAsync(pnpmCommand, ['list', '-r', '--depth', '0', '--json'], { cwd: root, maxBuffer: 20 * 1024 * 1024 });
  const jsonStart = stdout.search(/\[\s*\{/);
  for (const workspace of JSON.parse(stdout.slice(jsonStart))) {
    collectInstalledPackages(workspace.dependencies);
    collectInstalledPackages(workspace.devDependencies);
    collectInstalledPackages(workspace.optionalDependencies);
  }
} catch {
  // The report still remains useful from manifests and the registry when pnpm is unavailable.
}

async function latestStable(packageName) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName).replace('%2F', '/')}`);
  if (!response.ok) throw new Error(`${packageName}: registry returned ${response.status}`);
  const metadata = await response.json();
  return metadata['dist-tags']?.latest ?? 'unknown';
}

async function catalogVersions() {
  const text = await fs.readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  const catalog = new Map();
  let inCatalog = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^catalog:\s*$/.test(line)) { inCatalog = true; continue; }
    if (inCatalog && line && !/^\s/.test(line)) break;
    if (inCatalog) {
      const match = line.match(/^\s{2}([^:#]+):\s*(.+?)\s*$/);
      if (match) catalog.set(match[1].trim(), match[2].trim());
    }
  }
  return catalog;
}

await walk(root);
const catalog = await catalogVersions();
const dependencies = new Map();
for (const manifestPath of manifestPaths.sort()) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, declared] of Object.entries(manifest[section] ?? {})) {
      if (name.startsWith('@workspace/')) continue;
      if (!dependencies.has(name)) dependencies.set(name, { declared: new Set(), locations: new Set() });
      const item = dependencies.get(name);
      item.declared.add(declared === 'catalog:' ? (catalog.get(name) ?? declared) : declared);
      item.locations.add(path.relative(root, manifestPath).replaceAll('\\', '/'));
    }
  }
}

const rows = [];
for (const name of [...dependencies.keys()].sort()) {
  const item = dependencies.get(name);
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const locked = [...lockfile.matchAll(new RegExp(`^      ['"]?${escapedName}['"]?:\\r?\\n        specifier:[^\\n]+\\r?\\n        version:\\s*([^\\s(]+)`, 'gm'))].map((match) => match[1]);
  let latest = 'lookup failed';
  try { latest = await latestStable(name); } catch (error) { latest = `lookup failed: ${error.message}`; }
  rows.push({
    name,
    declared: [...item.declared].sort().join(', '),
    installed: [...new Set(locked.length ? locked : [installedVersions.get(name) ?? 'not resolved by pnpm'])].join(', '),
    latest,
    locations: [...item.locations].sort().join(', '),
  });
}

const output = [
  '# Technology inventory',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This file inventories direct npm dependencies declared by the workspace. `Installed` is the version resolved by the committed pnpm lockfile. `Latest stable` is the npm `latest` dist-tag observed at generation time. The checker does not silently upgrade packages.',
  '',
  '| Package | Declared range | Installed | Latest stable | Used by |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| \`${row.name}\` | \`${row.declared}\` | \`${row.installed}\` | \`${row.latest}\` | ${row.locations} |`),
  '',
  '## Runtime and platform technologies',
  '',
  '| Technology | In-place evidence | Update authority |',
  '| --- | --- | --- |',
  '| Node.js | `replit.md` specifies Node 24; local runtime is reported separately by the command environment | Node.js release schedule and LTS policy |',
  '| pnpm | pnpm workspace and lockfile; local runtime is reported separately by the command environment | pnpm releases and workspace documentation |',
  '| JavaScript | ESM and JavaScript source are present; TypeScript targets ES2022 | ECMAScript standard and runtime support |',
  '| TypeScript | `typescript` dependency, currently `~5.9.2` in the root manifest | TypeScript release notes |',
  '| Python | `.github/scripts/ingestion/*.py` uses Python; no pinned Python version or requirements file was found | Python release schedule |',
  '| PostgreSQL | `pg` and Drizzle packages are declared; no server image or PostgreSQL server version is pinned in this checkout | PostgreSQL supported versions |',
  '',
  '## Update policy',
  '',
  '- Dependabot opens weekly npm update pull requests for the root and workspace manifests listed in `.github/dependabot.yml`.',
  '- Shared catalog versions should be updated in `pnpm-workspace.yaml`; the lockfile must be regenerated with `pnpm install --lockfile-only` or a normal frozen CI install after review.',
  '- Automated checks are gates, not permission to merge. Review major upgrades, especially Expo/React Native, Node, TypeScript, Vite, Tailwind, and database tooling against their migration notes.',
  '',
  'Sources for the policy and major technologies: [GitHub Dependabot version updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates), [Node.js releases](https://nodejs.org/en/about/previous-releases), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/blog), [Tailwind CSS](https://tailwindcss.com/blog), [React](https://react.dev/versions), and [Expo SDK versions](https://docs.expo.dev/versions/latest/).',
  '',
].join('\n');

if (process.argv.includes('--write')) {
  await fs.writeFile(path.join(root, 'docs/technology-inventory.md'), output, 'utf8');
} else {
  process.stdout.write(output);
}

const outdated = rows.filter((row) => /^\d/.test(row.installed) && /^\d/.test(row.latest) && row.installed !== row.latest);
if (process.argv.includes('--fail-on-outdated') && outdated.length) process.exitCode = 1;
