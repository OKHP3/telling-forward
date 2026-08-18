---
name: Auto-push hook auth
description: How the workspace authenticates git pushes to GitHub via GITHUB_PAT and where it breaks
---

Git 2.x on Replit does NOT honour `core.askPass` or a credential helper for interactive HTTPS pushes — it only honours the `GIT_ASKPASS` *environment variable*. The fix is to export `GIT_ASKPASS` in `~/.profile` (`.bashrc` is a read-only nix symlink and cannot be edited).

**Current wiring:**
- `scripts/git-askpass.sh` — outputs `OKHP3` (username) or `$GITHUB_PAT` (password) based on the prompt string git passes
- `~/.profile` exports `GIT_ASKPASS=/home/runner/workspace/scripts/git-askpass.sh` so every login shell inherits it
- Post-commit hook (`.git/hooks/post-commit`) also exports `GIT_ASKPASS` before calling `git push` (belt-and-suspenders)

**Why:** Three things that look like they should work but don't on this setup:
1. `git config --global core.askPass <script>` — ignored for HTTPS credential prompts in Git 2.x
2. `git config --global credential.helper '<script>'` — the helper protocol (get/store/erase) works in principle but the subprocess spawned by git does not inherit Replit shell secrets, so `$GITHUB_PAT` is empty inside the helper
3. A plain `git push` with no wiring — fails with "Invalid username or token"

**How to apply:** If `git push` fails with auth errors:
1. Check `echo $GIT_ASKPASS` — if empty, `~/.profile` wasn't sourced (non-login shell); prefix push with `GIT_ASKPASS=/home/runner/workspace/scripts/git-askpass.sh git push github main`
2. Check `echo $GITHUB_PAT` — if empty, the Replit secret is missing or the shell is sandboxed; verify the secret exists in Replit secrets
3. Check `.git/hooks/post-commit` for the `GIT_ASKPASS` export; re-run `bash scripts/setup-hooks.sh` to reinstall
4. Verify with `bash scripts/test-hooks-smoke.sh`
