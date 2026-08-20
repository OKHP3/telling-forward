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

if (!String(process.env.npm_config_user_agent ?? '').startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}
