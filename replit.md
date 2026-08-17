# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Sync

Every commit made in Replit is automatically pushed to `github.com/OKHP3/telling-forward` via a `post-commit` git hook.

- **Remote**: `github` → `https://github.com/OKHP3/telling-forward.git` (no credentials stored)
- **Auth**: The `GITHUB_PAT` Replit secret is read from the environment at push time and injected into the push URL transiently — it is never written to `.git/config` or any file.
- **Scope**: Pushes the current branch after each commit. If the push fails (e.g. network issue or missing PAT), the commit is preserved locally and the error is printed — the commit is never rolled back.
- **Hook location**: `.git/hooks/post-commit` (not tracked by git; must be re-created if the workspace is re-cloned — see below).

### Re-creating the hook after a fresh clone

```sh
cat > .git/hooks/post-commit << 'EOF'
#!/bin/sh
REMOTE_URL="https://github.com/OKHP3/telling-forward.git"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null)"
[ -z "$BRANCH" ] && exit 0
[ -z "$GITHUB_PAT" ] && echo "[auto-push] GITHUB_PAT not set — skipping." >&2 && exit 0
AUTH_URL="https://OKHP3:${GITHUB_PAT}@github.com/OKHP3/telling-forward.git"
echo "[auto-push] Pushing '$BRANCH' to github.com/OKHP3/telling-forward..."
if git push "$AUTH_URL" "$BRANCH" --quiet 2>/dev/null; then
  echo "[auto-push] ✓ Pushed successfully ($BRANCH)"
else
  echo "[auto-push] ✗ Push failed — check GITHUB_PAT or network." >&2
fi
EOF
chmod +x .git/hooks/post-commit
```
