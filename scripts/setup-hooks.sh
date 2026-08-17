#!/bin/sh
# Installs git hooks that are not tracked by git.
# Run this after a fresh clone, or it is called automatically by the post-merge script.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="${REPO_ROOT}/.git/hooks"
ASKPASS_SCRIPT="${REPO_ROOT}/scripts/git-askpass.sh"

# ── post-commit: auto-push every commit to GitHub ─────────────────────────────
cat > "${HOOKS_DIR}/post-commit" << 'EOF'
#!/bin/sh
REMOTE="github"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
ASKPASS_SCRIPT="${REPO_ROOT}/scripts/git-askpass.sh"
[ -z "$BRANCH" ] && exit 0
[ -z "$GITHUB_PAT" ] && echo "[auto-push] GITHUB_PAT not set — skipping." >&2 && exit 0
[ ! -x "$ASKPASS_SCRIPT" ] && echo "[auto-push] askpass script missing — skipping." >&2 && exit 0
echo "[auto-push] Pushing '$BRANCH' to github.com/OKHP3/telling-forward..."
if GIT_ASKPASS="$ASKPASS_SCRIPT" git push "$REMOTE" "$BRANCH" --quiet; then
  echo "[auto-push] ✓ Pushed successfully ($BRANCH)"
else
  echo "[auto-push] ✗ Push failed — check GITHUB_PAT or network." >&2
fi
EOF
chmod +x "${HOOKS_DIR}/post-commit"

echo "[setup-hooks] ✓ post-commit hook installed."
