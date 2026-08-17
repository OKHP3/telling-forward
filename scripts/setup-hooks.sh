#!/bin/sh
# Installs git hooks that are not tracked by git.
# Run this after a fresh clone, or it is called automatically by the post-merge script.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="${REPO_ROOT}/.git/hooks"

# ── post-commit: auto-push every commit to GitHub ─────────────────────────────
cat > "${HOOKS_DIR}/post-commit" << 'EOF'
#!/bin/sh
REMOTE="github"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null)"
[ -z "$BRANCH" ] && exit 0
REPO_ROOT="$(git rev-parse --show-toplevel)"
# Authenticate via GIT_ASKPASS: git calls scripts/git-askpass.sh at push time,
# which reads the GITHUB_PAT Replit secret from the environment. The token
# never appears in git config, tracked files, or process arguments.
if [ -z "$GITHUB_PAT" ]; then
  echo "[auto-push] Skipped: GITHUB_PAT not set." >&2
  exit 0
fi
ASKPASS="${REPO_ROOT}/scripts/git-askpass.sh"
if [ ! -x "$ASKPASS" ]; then
  echo "[auto-push] Skipped: askpass script missing at $ASKPASS." >&2
  exit 0
fi
export GIT_ASKPASS="$ASKPASS"
echo "[auto-push] Pushing '$BRANCH' to github.com/OKHP3/telling-forward..."
if git push "$REMOTE" "$BRANCH" --quiet 2>&1; then
  echo "[auto-push] ✓ Pushed successfully ($BRANCH)"
else
  echo "[auto-push] ✗ Push failed — check GitHub credentials or network." >&2
fi
EOF
chmod +x "${HOOKS_DIR}/post-commit"

echo "[setup-hooks] ✓ post-commit hook installed."
