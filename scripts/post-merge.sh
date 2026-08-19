#!/bin/bash
set -e

# Re-install git hooks (not tracked by git, so must be restored after a fresh clone)
sh "$(git rev-parse --show-toplevel)/scripts/setup-hooks.sh"

pnpm install --frozen-lockfile
# Schema changes are applied by the API's additive ensure-schema guard at
# startup. Never run a forced Drizzle schema sync automatically after merge:
# it can apply destructive changes without a human-reviewed migration.
