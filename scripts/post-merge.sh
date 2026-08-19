#!/bin/bash
set -e

# Re-install git hooks (not tracked by git, so must be restored after a fresh clone)
sh "$(git rev-parse --show-toplevel)/scripts/setup-hooks.sh"

pnpm install --frozen-lockfile
pnpm --filter db run push-force
