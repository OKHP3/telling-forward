import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectNpm, compare, inventory, npmRelease, packageKey, pypiRelease, stable, status } from './check-technology-updates.mjs';

test('version comparison is numeric and never recommends a downgrade', () => {
  assert.equal(compare('1.10.0', '1.9.0'), 1);
  assert.equal(status(['2.0.0', '1.5.0'], '1.6.0'), 'update available');
  assert.equal(status(['2.0.0'], '1.6.0'), 'current or newer');
  assert.equal(status([], '1.0.0'), 'review');
  assert.equal(status(['v4'], 'v6.0.0'), 'review');
  assert.equal(status(['1.0.0'], null), 'unknown');
  assert.equal(stable('1.0.0-rc.1'), false);
});
test('quoted scoped catalogs, peer suffixes and separate installed versions are preserved', () => {
  const manifests = [['package.json', { dependencies: { '@scope/tool': 'catalog:', local: 'workspace:*' } }],
    ['artifacts/example/package.json', { devDependencies: { '@scope/tool': 'catalog:older' } }]];
  const workspace = { catalog: { '@scope/tool': '^2.0.0' }, catalogs: { older: { '@scope/tool': '^1.0.0' } } };
  const lock = { importers: { '.': { dependencies: { '@scope/tool': { version: '2.0.1(react@19.1.0)' } } },
    'artifacts/example': { devDependencies: { '@scope/tool': { version: '1.0.1' } } } },
    packages: { '@scope/tool@2.0.1': {}, '@scope/tool@1.0.1': {}, 'other@3.0.0': {} } };
  const rows = collectNpm(manifests, workspace, lock);
  assert.deepEqual(rows[0].current, ['1.0.1', '2.0.1']);
  assert.deepEqual(rows[0].declared, ['^1.0.0', '^2.0.0']);
  assert.equal(rows[1].scope, 'transitive');
  assert.deepEqual(packageKey('@scope/tool@1.2.3'), { name: '@scope/tool', version: '1.2.3' });
  assert.throws(() => collectNpm(manifests, {}, lock), /Unresolved catalog/);
});
test('publisher prereleases and yanked Python releases do not become stable updates', () => {
  assert.throws(() => npmRelease({ version: '2.0.0-beta.1' }), /not a stable/);
  assert.equal(npmRelease({ version: '1.2.3', deprecated: 'Use replacement' }).deprecated, 'Use replacement');
  assert.equal(pypiRelease({ releases: {
    '1.9.0': [{ yanked: false }], '1.10.0': [{ yanked: false }],
    '2.0.0': [{ yanked: true }], '3.0.0rc1': [{ yanked: false }], '4.0.0': [],
  } }).latest, '1.10.0');
});
test('repository inventory resolves every direct dependency without network access', async () => {
  const report = await inventory({ offline: true });
  assert.ok(report.counts.npmDirect > 100);
  assert.ok(report.counts.npmTransitiveOnly > 500);
  assert.equal(report.counts.pip, 6);
  assert.ok(report.actions.some((r) => r.name === 'actions/setup-python'));
  for (const row of report.npm.filter((r) => r.scope === 'direct')) {
    assert.ok(row.current.length, `${row.name} lacks a lockfile resolution`);
    assert.ok(!row.declared.includes('catalog:'), `${row.name} has an unresolved catalog`);
    assert.equal(row.latest, null);
  }
  assert.ok(report.system.packages.includes('redis'));
});


test('scheduled setup failure cannot upload a committed inventory as fresh', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/technology-watch.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const cleanup = workflow.indexOf('run: rm -f docs/technology-inventory.md');
  assert.ok(cleanup > 0 && cleanup < workflow.indexOf('uses: pnpm/action-setup'));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request'"));
  const summary = workflow.split("<<'NODE' >> \"$GITHUB_STEP_SUMMARY\"\n")[1].split('          NODE')[0];
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'telling-watch-failure-'));
  try {
    const output = execFileSync(process.execPath, ['--input-type=module'], { cwd: temporary, input: summary, encoding: 'utf8' });
    assert.match(output, /failed before a fresh report was produced/);
    assert.doesNotMatch(output, /Checked /);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
