---
name: Auto-push hook auth
description: How the workspace post-commit auto-push authenticates and how it silently broke once
---

The post-commit auto-push to GitHub must export `GIT_ASKPASS=scripts/git-askpass.sh` so git reads the `GITHUB_PAT` Replit secret at push time.

**Why:** The hook installed by `scripts/setup-hooks.sh` once drifted to a plain `git push` with no askpass wiring, so every push failed with "Invalid username or token" even though the secret was fine. Docs (`replit.md`, ADRs) claimed askpass wiring that the hook no longer had.

**How to apply:** If auto-push fails with auth errors, check `.git/hooks/post-commit` for the `GIT_ASKPASS` export before suspecting the token. Re-run `bash scripts/setup-hooks.sh` to reinstall, and `bash scripts/test-hooks-smoke.sh` verifies the wiring (it requires graceful skips when `GITHUB_PAT` or the askpass script is absent).
