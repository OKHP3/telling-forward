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

Every commit made in Replit attempts a guarded push to `github.com/OKHP3/telling-forward` via a `post-commit` Git hook. A commit is only published when the push succeeds.

- **Remote**: `github` → `https://github.com/OKHP3/telling-forward.git` (no credentials in remote URL)
- **Auth**: Uses `GIT_ASKPASS` — git calls `scripts/git-askpass.sh` at push time to retrieve the `GITHUB_PAT` Replit secret via subprocess stdout. The token never appears in process arguments, git config, or any file.
- **Scope**: Checks and pushes the current branch after each commit. If the push fails, the commit is preserved locally and the actual error is printed. The hook never rolls back a commit or pulls remote changes automatically.
- **Hook location**: Git's resolved hooks directory, normally `.git/hooks/post-commit` (not tracked; reinstall after cloning). The askpass helper `scripts/git-askpass.sh` is committed to the repo.

### Reliable pull and push

Run `sh scripts/sync-github.sh` (or `git sync` after installing the hooks).
This fetches without pruning, fast-forwards a clean behind-only checkout, pushes
committed work, and verifies exact local/remote SHA equality. It never stages
files, commits work, resets, force-pushes, or resolves divergent histories.
Use `sh scripts/sync-github.sh --check` for a fetch and push dry-run.

Replit can inject a credential helper or `GIT_ASKPASS` that takes precedence over
`core.askpass`. Therefore setting `core.askpass` alone does not establish working
shell authentication. When `GITHUB_PAT` is present, this command explicitly uses
the tracked askpass helper and bypasses credential helpers for its own Git calls.
It never reads or prints the token itself. A new shell needs no exported variables.
Ordinary clones without that secret retain their normal credential manager.

On Replit, the hook installer also registers `scripts/git-credential-replit.sh`
as a repository-local, URL-scoped credential helper. It supplies credentials only
for this exact GitHub repository through `git-askpass.sh`, so ordinary Git pushes
can use the same working path even when Replit injects its own askpass. The token
is never stored in Git config. Re-run the installer after moving the checkout.

If both sides advanced, preserve the local commits and review an explicit merge
or publish a review branch for a PR. A workflow-permission rejection needs a
credential with the required permission, not repeated pushes. Do not infer that
the Replit Git panel is healthy from a successful shell command; refresh it and
verify its status separately. The panel uses Replit's own connection.

### Re-creating the hook after a fresh clone

Run the committed helper script — it writes and activates the hook in one step:

```sh
sh scripts/setup-hooks.sh
```

This is also called automatically by `scripts/post-merge.sh`, so after any task merge the hook is restored without manual intervention.

The installer uses Git's hook-path resolution, including linked worktrees, and
sets repository-local fast-forward-only pulls. Test with
`bash scripts/test-hooks-smoke.sh` and `bash scripts/test-sync-github.sh`.
