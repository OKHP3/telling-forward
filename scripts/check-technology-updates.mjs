import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse the workspace's explicit YAML dependency, never a global/transitive install.
const require = createRequire(new URL('../artifacts/api-server/package.json', import.meta.url));
const { parse } = require('yaml');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(resolve(root, file), 'utf8');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
export const stable = (version) => /^v?\d+\.\d+\.\d+$/.test(String(version));
export function compare(a, b) {
  const left = a.replace(/^v/, '').split('.').map(Number);
  const right = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return Math.sign(left[i] - right[i]);
  return 0;
}
export function status(current, latest) {
  if (!latest) return 'unknown';
  if (!current.length || current.some((v) => !stable(v))) return 'review';
  return current.some((v) => compare(v, latest) < 0) ? 'update available' : 'current or newer';
}
export function packageKey(key) {
  const match = key.match(/^(.+)@(\d[^()]*)/);
  return match ? { name: match[1], version: match[2] } : null;
}
export function collectNpm(manifests, workspace, lock) {
  const result = new Map();
  function row(name) {
    if (!result.has(name)) result.set(name, { ecosystem: 'npm', name, declared: [], current: [], locations: [], scope: 'transitive' });
    return result.get(name);
  }
  for (const [file, manifest] of manifests) {
    const importer = file === 'package.json' ? '.' : file.slice(0, -'/package.json'.length);
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
        if (spec.startsWith('workspace:')) continue;
        const item = row(name);
        item.scope = file.startsWith('.agents/') || file.startsWith('skills/') ? 'skill tooling' : 'direct';
        let declared = spec;
        if (spec.startsWith('catalog:')) {
          const catalog = spec.slice('catalog:'.length);
          declared = (catalog ? workspace.catalogs?.[catalog] : workspace.catalog)?.[name];
          if (!declared) throw new Error(`Unresolved catalog: ${name} in ${file}`);
        }
        item.declared.push(declared);
        item.locations.push(`${file} (${section})`);
        const locked = lock.importers?.[importer]?.[section]?.[name]?.version;
        if (locked && !locked.startsWith('link:')) item.current.push(locked.split('(')[0]);
      }
    }
  }
  // All resolved packages, including optional native binaries, are included.
  for (const key of Object.keys(lock.packages ?? {})) {
    const parsed = packageKey(key);
    if (!parsed) throw new Error(`Unsupported lockfile package key: ${key}`);
    const item = row(parsed.name);
    item.lockedAll ??= [];
    item.lockedAll.push(parsed.version);
    if (item.scope === 'transitive') item.current.push(parsed.version);
  }
  for (const item of result.values()) {
    for (const key of ['declared', 'current', 'locations', 'lockedAll']) item[key] = [...new Set(item[key] ?? [])].sort();
    item.source = `https://registry.npmjs.org/${encodeURIComponent(item.name)}/latest`;
  }
  return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
}

let nextRequestAt = 0;
const cooldowns = new Map();
async function request(url, json = true) {
  const headers = { 'User-Agent': 'telling-forward-technology-inventory' };
  // Never send the GitHub token to a registry or to a redirect destination.
  if (new URL(url).origin === 'https://api.github.com' && process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const delay = Math.max(0, nextRequestAt - Date.now());
      nextRequestAt = Math.max(nextRequestAt, Date.now()) + 250;
      if (delay) await new Promise((done) => setTimeout(done, delay));
      const origin = new URL(url).origin;
      while ((cooldowns.get(origin) ?? 0) > Date.now()) {
        await new Promise((done) => setTimeout(done, Math.min(60000, cooldowns.get(origin) - Date.now())));
      }
      const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (response.status === 429 && attempt < 2) {
        const header = response.headers.get('retry-after');
        const seconds = Number(header);
        const retry = seconds > 0 ? seconds * 1000 : Math.max(30000, Date.parse(header) - Date.now() || 0);
        cooldowns.set(origin, Math.max(cooldowns.get(origin) ?? 0, Date.now() + retry));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return json ? await response.json() : await response.text();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((done) => setTimeout(done, 300 * (attempt + 1)));
    }
  }
}
export function npmRelease(metadata) {
  if (!stable(metadata.version)) throw new Error('The npm latest tag is not a stable release');
  return { latest: metadata.version, deprecated: metadata.deprecated ?? null, engines: metadata.engines ?? null };
}
export function pypiRelease(metadata) {
  const versions = Object.entries(metadata.releases)
    .filter(([v, files]) => stable(v) && files.some((file) => !file.yanked))
    .map(([v]) => v).sort(compare);
  if (!versions.length) throw new Error('No non-yanked stable PyPI release');
  return { latest: versions.at(-1) };
}
async function enrich(rows, offline, cached = new Map()) {
  let cursor = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      row.latest = null;
      if (!offline) {
        try {
          const prior = cached.get(row.source);
          if ((prior?.latest || prior?.releaseState) && Date.now() - Date.parse(prior.checkedAt) < 3600000) {
            Object.assign(row, { latest: prior.latest, checkedAt: prior.checkedAt, deprecated: prior.deprecated, engines: prior.engines, note: prior.note, releaseSource: prior.releaseSource, releaseState: prior.releaseState, latestTag: prior.latestTag });
          } else {
            const metadata = await request(row.source);
            if (row.ecosystem === 'npm' && !stable(metadata.version)) {
              const all = await request(row.source.replace(/\/latest$/, ''));
              const version = Object.keys(all.versions ?? {}).filter(stable).sort(compare).at(-1);
              if (version) {
                Object.assign(row, npmRelease(all.versions[version]));
                row.note = 'latest tag was a prerelease; selected highest stable version';
              } else {
                row.releaseState = 'no stable release published';
                row.latestTag = metadata.version;
                row.note = 'Every published version has a prerelease suffix; no numeric stable release exists';
              }
              row.releaseSource = row.source.replace(/\/latest$/, '');
            } else Object.assign(row, row.ecosystem === 'npm' ? npmRelease(metadata) : row.ecosystem === 'pip' ? pypiRelease(metadata) : { latest: metadata.tag_name });
            row.checkedAt = new Date().toISOString();
          }
          if (!row.releaseState && !stable(row.latest)) throw new Error('Publisher release is not stable');
        } catch (error) { row.latest = null; row.error = error.message; }
      }
      row.status = row.releaseState ?? status(row.current, row.latest);
    }
  }));
}
const cell = (text) => String(text ?? 'unknown').replaceAll('|', '\\|').replaceAll('\n', ' ');
function table(rows) {
  return ['| Technology | Declared | Locked / configured | Latest stable | State | Evidence / primary source |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${cell(r.name)} | ${cell(r.declared.join(', ') || 'indirect')} | ${cell(r.current.join(', ') || 'unknown')} | ${cell(r.releaseState ? `none (latest tag: ${r.latestTag})` : r.latest)} | ${cell(r.status)}${r.deprecated ? '; deprecated' : ''}${r.error ? `; ${cell(r.error)}` : ''} | ${cell(r.locations.join('; '))} [publisher](${r.releaseSource ?? r.source}) |`)];
}

export async function inventory({ offline = false, transitive = false, resume = false } = {}) {
  // Git's file inventory excludes generated files and nested node_modules.
  const files = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  const manifests = await Promise.all(files.filter((f) => /(^|\/)package\.json$/.test(f)).map(async (f) => [f, JSON.parse(await read(f))]));
  const workspace = parse(await read('pnpm-workspace.yaml'));
  const lock = parse(await read('pnpm-lock.yaml'));
  const npm = collectNpm(manifests, workspace, lock);
  const pip = [];
  for (const file of files.filter((f) => /(^|\/)requirements[^/]*\.txt$/.test(f))) {
    for (const line of (await read(file)).split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const match = line.match(/^([\w.-]+)==([\w.+-]+)\s*(?:#.*)?$/);
      if (!match) throw new Error(`Unsupported Python requirement in ${file}: ${line}`);
      pip.push({ ecosystem: 'pip', name: match[1], declared: [match[2]], current: [match[2]], locations: [file], source: `https://pypi.org/pypi/${match[1]}/json` });
    }
  }
  const actions = new Map();
  const runtimePins = new Map();
  for (const file of files.filter((f) => /^\.github\/workflows\/.*\.ya?ml$/.test(f))) {
    const workflow = parse(await read(file));
    for (const job of Object.values(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        if (!step.uses?.includes('@') || step.uses.startsWith('./')) continue;
        const [name, ref] = step.uses.split('@');
        if (!actions.has(name)) actions.set(name, { ecosystem: 'github-actions', name, declared: [], current: [], locations: [], source: `https://api.github.com/repos/${name}/releases/latest` });
        const row = actions.get(name);
        row.current.push(ref); row.declared.push(ref); row.locations.push(file);
        for (const [key, value] of Object.entries(step.with ?? {})) {
          if ((name === 'pnpm/action-setup' && key === 'version') || ['node-version', 'python-version'].includes(key)) {
            const tech = key === 'version' ? 'pnpm' : key === 'node-version' ? 'Node.js' : 'Python';
            if (!runtimePins.has(tech)) runtimePins.set(tech, []);
            runtimePins.get(tech).push(`${value} (${file})`);
          }
        }
      }
    }
  }
  for (const row of actions.values()) for (const key of ['current', 'declared', 'locations']) row[key] = [...new Set(row[key])];
  const pnpmPins = [...new Set((runtimePins.get('pnpm') ?? []).map((p) => p.split(' ')[0]))];
  npm.push({ ecosystem: 'npm', name: 'pnpm', scope: 'toolchain', declared: pnpmPins, current: pnpmPins, locations: ['.github/workflows/*.yml'], source: 'https://registry.npmjs.org/pnpm/latest' });
  const queried = [...npm.filter((r) => transitive || r.scope !== 'transitive'), ...pip, ...actions.values()];
  const cached = new Map();
  if (resume && !offline) {
    const prior = JSON.parse(await read('docs/technology-inventory.json'));
    for (const row of [...prior.npm, ...prior.pip, ...prior.actions]) {
      cached.set(row.source, { ...row, checkedAt: row.checkedAt ?? prior.generatedAt });
    }
  }
  await enrich(queried, offline, cached);
  const runtimes = [];
  const replit = await read('.replit');
  const modules = JSON.parse(replit.match(/^modules\s*=\s*(\[.*\])/m)[1]);
  const systemPackages = JSON.parse(replit.match(/^packages\s*=\s*(\[.*\])/m)[1]);
  const channel = replit.match(/^channel\s*=\s*"([^"]+)"/m)[1];
  const addRuntime = (name, current, source) => { const row = { name, declared: current, current, locations: ['.replit / workflows'], source, latest: null, status: 'unknown' }; runtimes.push(row); return row; };
  const node = addRuntime('Node.js', modules.filter((m) => m.startsWith('nodejs-')), 'https://nodejs.org/dist/index.json');
  const python = addRuntime('Python', [...modules.filter((m) => m.startsWith('python-')), ...new Set((runtimePins.get('Python') ?? []).map((p) => p.split(' ')[0]))], 'https://www.python.org/downloads/');
  const pg = addRuntime('PostgreSQL', modules.filter((m) => m.startsWith('postgresql-')), 'https://www.postgresql.org/support/versioning/');
  const pandoc = addRuntime('Pandoc', [channel, 'apt (CI); exact version unverified'], 'https://api.github.com/repos/jgm/pandoc/releases/latest');
  const redis = addRuntime('Redis server', [channel, 'exact version unverified'], 'https://api.github.com/repos/redis/redis/releases/latest');
  const openapi = addRuntime('OpenAPI', [parse(await read('lib/api-spec/openapi.yaml')).openapi], 'https://api.github.com/repos/OAI/OpenAPI-Specification/releases/latest');
  openapi.locations = ['lib/api-spec/openapi.yaml'];
  if (!offline) {
    await Promise.all(runtimes.map(async (row) => {
      try {
        if (row === node) {
          const versions = (await request(row.source)).filter((r) => stable(r.version));
          row.latest = versions[0].version;
          row.latestLts = versions.find((r) => r.lts)?.version;
          row.latestConfigured = modules.filter((m) => m.startsWith('nodejs-')).map((m) => versions.find((v) => v.version.startsWith(`v${m.slice(7)}.`))?.version);
        } else if (row === python) {
          const html = await request(row.source, false);
          const versions = [...html.matchAll(/>Python (\d+\.\d+\.\d+)</g)].map((m) => m[1]);
          row.latest = versions.sort(compare).at(-1);
        } else if (row === pg) {
          const html = await request(row.source, false);
          const versions = [...html.matchAll(/<td>\s*(\d+\.\d+)\s*<\/td>/g)].map((m) => m[1]);
          row.latest = versions[0]; row.listedVersions = versions;
        } else row.latest = (await request(row.source)).tag_name;
        if (!row.latest) throw new Error('Publisher response did not contain a release');
        row.status = 'review runtime / compatibility';
      } catch (error) { row.error = error.message; }
    }));
  }
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), sourceCommit: git('rev-parse', 'HEAD'),
    workingTree: git('status', '--porcelain') ? 'modified' : 'clean', mode: offline ? 'offline' : 'live', transitiveQueried: transitive,
    npm, pip, actions: [...actions.values()], runtimes, runtimePins: Object.fromEntries(runtimePins),
    system: { channel, packages: systemPackages, exactVersions: 'unverified; requires Replit host inspection' },
    counts: { manifests: manifests.length, npmDirect: npm.filter((r) => r.scope === 'direct').length, npmTransitiveOnly: npm.filter((r) => r.scope === 'transitive').length, pip: pip.length, actions: actions.size },
    lookupFailures: [...queried, ...runtimes].filter((r) => r.error).map((r) => `${r.name}: ${r.error}`),
  };
  return report;
}
export function markdown(report) {
  const core = ['typescript', 'vite', 'tailwindcss', 'mermaid', 'react', 'react-native', 'expo', 'express', 'drizzle-orm', 'drizzle-kit', 'zod', 'openai', '@modelcontextprotocol/sdk', 'vitest', '@playwright/test', 'pnpm'];
  return ['# Technology inventory', '', `Generated: ${report.generatedAt}. Source commit: \`${report.sourceCommit}\` (${report.workingTree} working tree).`, '',
    '## Evidence and scope', '',
    'Confirmed from tracked manifests, the pnpm lockfile, workflow definitions and .replit. Locked means resolved in the repository, not verified in a deployed process. Python entries are declared pins, not a pip installation inventory. GitHub Action major tags float within a major; their executed commit is unknown without run logs.', '',
    `Coverage: ${report.counts.manifests} package manifests, ${report.counts.npmDirect} direct npm packages, ${report.counts.npmTransitiveOnly} additional npm package names, ${report.counts.pip} Python packages and ${report.counts.actions} GitHub Actions. Mode: ${report.mode}.`, '',
    'Latest stable for npm is the publisher latest tag, with a highest-stable fallback if that tag is a prerelease. Deprecated packages are flagged. PyPI selects the highest numeric non-yanked release. GitHub uses the publisher latest non-prerelease release. Per-package checkedAt timestamps in the JSON preserve any observations reused by --resume (maximum age one hour); runtime lookups are fresh. Lookup failures stay unknown. Versions are facts, not compatibility or security approvals.', '',
    '[Update policy and activation plan](technology-update-policy.md). [Machine-readable inventory](technology-inventory.json). [Transitive dependency appendix](technology-transitive-inventory.md).', '',
    '## Core solution stack at a glance', '',
    '| Technology | Locked / configured | Latest stable | Primary source |', '| --- | --- | --- | --- |',
    ...core.map((name) => report.npm.find((r) => r.name === name)).filter(Boolean).map((r) => `| ${r.name} | ${r.current.join(', ')} | ${r.latest ?? 'unknown'} | [publisher](${r.source}) |`), '',
    '## Languages, runtimes and system tools', '', ...table(report.runtimes), '',
    `Node latest LTS: ${report.runtimes.find((r) => r.name === 'Node.js')?.latestLts ?? 'unknown'}. Latest on configured Node lines: ${(report.runtimes.find((r) => r.name === 'Node.js')?.latestConfigured ?? []).join(', ') || 'unknown'}.`, '',
    'JavaScript targets ES2022 in tsconfig.base.json. A language edition is not an installed package; TypeScript, Node and browsers implement it. HTML, CSS, JSON, YAML, TOML, Markdown/GFM, SQL and shell scripts are formats/languages, not independently updatable application binaries. See the update policy for their standards and hosting boundaries.', '',
    `Replit Nix channel: \`${report.system.channel}\`. Explicit native packages: ${report.system.packages.map((p) => `\`${p}\``).join(', ')}. Exact installed versions, native transitive packages, and platform-supported upgrade targets are unknown until the Replit host can be inspected. Upgrade these through a supported Nix channel and host rebuild, not individual npm updates.`, '',
    '## Direct JavaScript / TypeScript dependencies and toolchain', '', ...table(report.npm.filter((r) => r.scope !== 'transitive')), '',
    '## Python ingestion dependencies', '', ...table(report.pip), '',
    'Python transitive packages are not locked in this repository. Resolve and record them in an isolated Python 3.12 ingestion environment before claiming a complete installed Python environment.', '',
    '## GitHub Actions', '', ...table(report.actions), '',
    '## Lookup failures', '', ...(report.lookupFailures.length ? report.lookupFailures.map((e) => `- ${e}`) : ['None for queried packages and runtimes.']), '',
    'Hosted services, model pins, source-copied UI components, standards, and the remaining evidence boundaries are recorded in the update policy.', ''].join('\n');
}
async function main() {
  const args = process.argv.slice(2);
  const report = await inventory({ offline: args.includes('--offline'), transitive: args.includes('--include-transitive'), resume: args.includes('--resume') });
  const output = markdown(report);
  if (args.includes('--write')) {
    await mkdir(resolve(root, 'docs'), { recursive: true });
    await writeFile(resolve(root, 'docs/technology-inventory.md'), output);
    await writeFile(resolve(root, 'docs/technology-inventory.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(resolve(root, 'docs/technology-transitive-inventory.md'), ['# Transitive npm inventory', '', `Generated: ${report.generatedAt}. Queries enabled: ${report.transitiveQueried}.`, '', 'All lockfile package names, including optional platform binaries. Some are not installed on this host. Update via parent dependencies and lockfile maintenance. Direct packages can also have older transitive copies: these appear in lockedAll in the JSON inventory.', '', ...table(report.npm.filter((r) => r.scope === 'transitive')), ''].join('\n'));
  } else process.stdout.write(output);
  if (!args.includes('--offline') && report.lookupFailures.length) process.exitCode = 2;
  else if (args.includes('--fail-on-outdated') && [...report.npm, ...report.pip].some((r) => r.status === 'update available')) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 2; });
}
