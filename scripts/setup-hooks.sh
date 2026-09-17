#!/bin/sh
# Installs git hooks that are not tracked by git.
# Run this after a fresh clone, or it is called automatically by the post-merge script.
set -e

HOOKS_DIR="$(git rev-parse --git-path hooks)"
mkdir -p "$HOOKS_DIR"

# ── post-commit: auto-push every commit to GitHub ─────────────────────────────
cat > "${HOOKS_DIR}/post-commit" << 'EOF'
#!/bin/sh
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
echo "[auto-push] Checking and pushing '$BRANCH' to GitHub..."
if sh "$REPO_ROOT/scripts/sync-github.sh" --push-only; then
  echo "[auto-push] ✓ Pushed successfully ($BRANCH)"
else
  echo "[auto-push] Push not completed. Commit preserved locally; follow the sync diagnostic above." >&2
fi
EOF
chmod +x "${HOOKS_DIR}/post-commit"

# A bare pull cannot silently merge or rebase across competing writers.
git config --local pull.ff only
git config --local alias.sync '!sh "$(git rev-parse --show-toplevel)/scripts/sync-github.sh"'

# On Replit, make ordinary Git commands use the same credential as git sync.
# No token is written to config, and unrelated repositories keep their helpers.
if [ -n "${GITHUB_PAT:-}" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  for endpoint in https://github.com/OKHP3/telling-forward https://github.com/OKHP3/telling-forward.git; do
    git config --local "credential.$endpoint.useHttpPath" true
    git config --local --replace-all "credential.$endpoint.helper" ''
    git config --local --add "credential.$endpoint.helper" "!sh \"$REPO_ROOT/scripts/git-credential-replit.sh\""
  done
fi

echo "[setup-hooks] ✓ post-commit hook installed."
