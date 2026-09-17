#!/bin/bash
# Real Git integration tests, with transport restricted to a disposable local bare repo.
set -euo pipefail
source_root="$(cd "$(dirname "$0")/.." && pwd)"
test_root="$(mktemp -d -t telling-forward-sync.XXXXXX)"
trap 'rm -rf -- "$test_root"' EXIT
export REAL_GIT="$(command -v git)"
export TEST_GIT_LOG="$test_root/git-calls"
mkdir -p "$test_root/bin"
# Only identity discovery is stubbed. Fetch/merge/push use real local Git.
cat > "$test_root/bin/git" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >> "$TEST_GIT_LOG"
if [ "${1:-}" = remote ] && [ "${2:-}" = get-url ] && [ "${TEST_WRONG_REMOTE:-0}" != 1 ]; then
  "$REAL_GIT" "$@" >/dev/null || exit $?
  if [ "${3:-}" = --push ] && [ -n "${TEST_PUSH_URLS:-}" ]; then
    printf '%s\n' "$TEST_PUSH_URLS"
    exit 0
  fi
  echo https://github.com/OKHP3/telling-forward.git
  exit 0
fi
exec "$REAL_GIT" "$@"
EOF
chmod +x "$test_root/bin/git"
export PATH="$test_root/bin:$PATH"
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME=SyncTest GIT_AUTHOR_EMAIL=sync@example.invalid
export GIT_COMMITTER_NAME=SyncTest GIT_COMMITTER_EMAIL=sync@example.invalid
unset GITHUB_PAT GIT_ASKPASS GIT_CONFIG_COUNT
git init -q --bare "$test_root/remote.git"
git init -q -b main "$test_root/local space"
cd "$test_root/local space"
mkdir scripts
cp "$source_root/scripts/"{sync-github.sh,git-askpass.sh,git-credential-replit.sh,setup-hooks.sh} scripts/
chmod +x scripts/*.sh
echo base > content
git add scripts content
git commit -qm base
git remote add origin "$test_root/remote.git"
git push -qu origin main
git clone -q --branch main "$test_root/remote.git" "$test_root/peer"
sync_run() { sh scripts/sync-github.sh "$@"; }
reject() { if sync_run "$@" > "$test_root/rejected.log" 2>&1; then echo 'Expected refusal' >&2; exit 1; fi; }

sync_run --check
echo 'PASS aligned preflight and origin fallback'
export TEST_PUSH_URLS=$'https://github.com/OKHP3/telling-forward.git\nhttps://github.com/OKHP3/telling-forward'
sync_run --check
export TEST_PUSH_URLS=$'https://github.com/OKHP3/telling-forward.git\nhttps://other.invalid/repo'
reject --check
unset TEST_PUSH_URLS
echo 'PASS every push URL validated; mixed destinations refused'
echo local >> content
git commit -qam local
before="$(git --git-dir="$test_root/remote.git" rev-parse main)"
sync_run --check
test "$before" = "$(git --git-dir="$test_root/remote.git" rev-parse main)"
sync_run
test "$(git rev-parse HEAD)" = "$(git --git-dir="$test_root/remote.git" rev-parse main)"
echo 'PASS dry-run does not publish; ahead-only sync publishes'

git -C "$test_root/peer" pull -q --ff-only
echo peer > "$test_root/peer/peer-file"
git -C "$test_root/peer" add peer-file
git -C "$test_root/peer" commit -qm peer
git -C "$test_root/peer" push -q
before="$(git rev-parse HEAD)"
reject --push-only
test "$before" = "$(git rev-parse HEAD)"
echo dirty > untracked
reject
test -f untracked
rm untracked
sync_run
test "$(git rev-parse HEAD)" = "$(git --git-dir="$test_root/remote.git" rev-parse main)"
echo 'PASS behind-only hook refuses; dirty work preserved; clean sync fast-forwards'

# An injected askpass and stale helper must not win over the explicit PAT path.
export GITHUB_PAT=test-not-a-real-token GIT_ASKPASS=/missing/injected-helper
sync_run --check
grep -q -- '-c credential.helper= push --dry-run' "$TEST_GIT_LOG"
echo 'PASS PAT path disables credential helper for transport'
expected=$(printf 'username=OKHP3\npassword=test-not-a-real-token')
actual=$(printf 'protocol=https\nhost=github.com\npath=OKHP3/telling-forward.git\n\n' | sh scripts/git-credential-replit.sh get)
test "$actual" = "$expected"
test -z "$(printf 'protocol=https\nhost=github.com\npath=other/repo\n\n' | sh scripts/git-credential-replit.sh get)"
test -z "$(printf 'protocol=https\nhost=other.invalid\npath=OKHP3/telling-forward.git\n\n' | sh scripts/git-credential-replit.sh get)"
test -z "$(printf 'protocol=https\nhost=github.com\n\n' | sh scripts/git-credential-replit.sh get)"
sh scripts/setup-hooks.sh
test "$(git config --get credential.https://github.com/OKHP3/telling-forward.git.useHttpPath)" = true
echo 'PASS credential helper restricted to exact repository; installer persists routing without token'
unset GITHUB_PAT GIT_ASKPASS

git switch -qc review
sync_run
git show-ref --verify --quiet refs/remotes/origin/review
echo 'PASS new branch publishes to the same repository'
git switch -q main
TEST_WRONG_REMOTE=1 reject --check
echo 'PASS non-canonical remote rejected'

# Use a genuinely restricted clone, not just a stubbed fetch response.
git clone -q --single-branch --branch main "$test_root/remote.git" "$test_root/narrow"
(
  cd "$test_root/narrow"
  git switch -qc narrow-review
  sync_run
  test "$(git rev-parse HEAD)" = "$(git rev-parse refs/remotes/origin/narrow-review)"
)
git -C "$test_root/peer" fetch -q origin narrow-review
git -C "$test_root/peer" switch -q -c narrow-review FETCH_HEAD
echo narrow > "$test_root/peer/narrow-file"
git -C "$test_root/peer" add narrow-file
git -C "$test_root/peer" commit -qm narrow-update
git -C "$test_root/peer" push -q origin narrow-review
(cd "$test_root/narrow" && sync_run && test -f narrow-file)
git -C "$test_root/peer" switch -q main
echo 'PASS single-branch clone publishes, verifies and fast-forwards a new branch'

sh scripts/setup-hooks.sh
test "$(git config --get pull.ff)" = only
git config --get alias.sync | grep -q sync-github.sh
git worktree add -q -b linked "$test_root/linked"
(cd "$test_root/linked" && sh scripts/setup-hooks.sh)
echo 'PASS installed alias, safe pull policy and linked-worktree hook path'

echo diverged > local-only
git add local-only
git commit -qm local-diverged
echo remote > "$test_root/peer/remote-only"
git -C "$test_root/peer" add remote-only
git -C "$test_root/peer" commit -qm remote-diverged
git -C "$test_root/peer" push -q
before="$(git rev-parse HEAD)"
reject
test "$before" = "$(git rev-parse HEAD)"
grep -q Diverged "$test_root/rejected.log"
echo 'PASS divergence preserves both histories and refuses to push'
