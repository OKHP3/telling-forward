#!/bin/sh
# Smoke test: verifies the full path from setup-hooks.sh → hook installed → GIT_ASKPASS wired.
# Runs entirely in a temp directory so it never touches the real repo's .git or pushes anything.
set -e

PASS=0
FAIL=0

ok()   { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

# Resolve the real scripts directory regardless of where this script is called from.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=== Hook smoke test ==="
echo ""

# ── 1. Create a throwaway git repo in /tmp ────────────────────────────────────
TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

git init -q "$TMPDIR"
mkdir -p "$TMPDIR/scripts"

# Copy the scripts that setup-hooks.sh and the hook itself depend on.
cp "$SCRIPT_DIR/setup-hooks.sh"  "$TMPDIR/scripts/setup-hooks.sh"
cp "$SCRIPT_DIR/git-askpass.sh"  "$TMPDIR/scripts/git-askpass.sh"
chmod +x "$TMPDIR/scripts/setup-hooks.sh"
chmod +x "$TMPDIR/scripts/git-askpass.sh"

echo "Temp repo: $TMPDIR"
echo ""

# ── 2. Run setup-hooks.sh inside the temp repo ───────────────────────────────
echo "--- Running setup-hooks.sh ---"
(cd "$TMPDIR" && sh scripts/setup-hooks.sh)
echo ""

# ── 3. Hook file exists ───────────────────────────────────────────────────────
echo "--- Checking hook installation ---"
HOOK="$TMPDIR/.git/hooks/post-commit"

if [ -f "$HOOK" ]; then
  ok "post-commit hook file exists"
else
  fail "post-commit hook file is missing"
fi

# ── 4. Hook is executable ─────────────────────────────────────────────────────
if [ -x "$HOOK" ]; then
  ok "post-commit hook is executable"
else
  fail "post-commit hook is NOT executable"
fi

# ── 5. Hook contains GIT_ASKPASS wiring ──────────────────────────────────────
if grep -q 'GIT_ASKPASS' "$HOOK"; then
  ok "GIT_ASKPASS is referenced in the hook"
else
  fail "GIT_ASKPASS is NOT referenced in the hook"
fi

# ── 6. Hook references git-askpass.sh ────────────────────────────────────────
if grep -q 'git-askpass.sh' "$HOOK"; then
  ok "hook references git-askpass.sh"
else
  fail "hook does NOT reference git-askpass.sh"
fi

# ── 7. git-askpass.sh returns the correct Username ───────────────────────────
echo ""
echo "--- Checking git-askpass.sh output ---"
ASKPASS="$TMPDIR/scripts/git-askpass.sh"

USERNAME_OUT="$(sh "$ASKPASS" "Username for 'https://github.com'")"
if [ "$USERNAME_OUT" = "OKHP3" ]; then
  ok "git-askpass.sh returns correct username (OKHP3)"
else
  fail "git-askpass.sh returned unexpected username: '$USERNAME_OUT'"
fi

# ── 8. git-askpass.sh returns the PAT for Password prompts ───────────────────
export GITHUB_PAT="test-token-smoke"
PASSWORD_OUT="$(sh "$ASKPASS" "Password for 'https://OKHP3@github.com'")"
if [ "$PASSWORD_OUT" = "test-token-smoke" ]; then
  ok "git-askpass.sh echoes GITHUB_PAT for password prompt"
else
  fail "git-askpass.sh returned unexpected password: '$PASSWORD_OUT'"
fi
unset GITHUB_PAT

# ── 9. Dry-run: hook skips gracefully when GITHUB_PAT is unset ───────────────
echo ""
echo "--- Dry-running post-commit hook (no GITHUB_PAT) ---"
# Create a commit so HEAD/branch exist.
(
  cd "$TMPDIR"
  git config user.email "smoke@test"
  git config user.name  "Smoke Test"
  touch placeholder
  git add placeholder
  git commit -q -m "smoke-test placeholder"
)

# Run the hook directly from inside the temp repo so git rev-parse resolves correctly.
HOOK_OUTPUT="$(cd "$TMPDIR" && unset GITHUB_PAT; sh ".git/hooks/post-commit" 2>&1 || true)"
if echo "$HOOK_OUTPUT" | grep -q "GITHUB_PAT not set"; then
  ok "hook exits gracefully (prints skip message) when GITHUB_PAT is unset"
else
  fail "hook did not emit expected skip message; output was: $HOOK_OUTPUT"
fi

# ── 10. Dry-run: hook skips when askpass script is missing ───────────────────
echo ""
echo "--- Dry-running post-commit hook (askpass missing) ---"
mv "$ASKPASS" "${ASKPASS}.bak"
# Run from inside the temp repo so git rev-parse resolves to TMPDIR (not the real workspace).
HOOK_OUTPUT2="$(cd "$TMPDIR" && GITHUB_PAT=dummy sh ".git/hooks/post-commit" 2>&1 || true)"
mv "${ASKPASS}.bak" "$ASKPASS"
if echo "$HOOK_OUTPUT2" | grep -q "askpass script missing"; then
  ok "hook exits gracefully when askpass script is absent"
else
  fail "hook did not emit expected askpass-missing message; output was: $HOOK_OUTPUT2"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
