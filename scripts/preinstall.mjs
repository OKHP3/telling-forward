import { unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = dirname(dirname(fileURLToPath(import.meta.url)));

for (const filename of ['package-lock.json', 'yarn.lock']) {
  try {
    unlinkSync(join(workspaceRoot, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const packageManagerUserAgent = String(process.env.npm_config_user_agent ?? '');
const packageManagerExecutable = String(process.env.npm_execpath ?? '');
const isPnpm =
  packageManagerUserAgent.startsWith('pnpm/') ||
  /(?:^|[/\\])pnpm(?:\.c?js)?$/.test(packageManagerExecutable);

if (!isPnpm) {
  console.error('Use pnpm instead');
  process.exit(1);
}
