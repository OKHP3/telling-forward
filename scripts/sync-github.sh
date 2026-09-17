#!/bin/sh
# Explicit GitHub transport for Replit and ordinary clones. Never rewrites history.
set -eu

mode="${1:-sync}"
case "$mode" in sync|--push-only|--check) ;; *) echo 'Usage: sh scripts/sync-github.sh [--check|--push-only]' >&2; exit 2 ;; esac
root="$(git rev-parse --show-toplevel)"
cd "$root"
branch="$(git symbolic-ref --quiet --short HEAD)" || { echo '[sync] Detached HEAD; choose a branch first.' >&2; exit 1; }
remote="$(git config --get "branch.$branch.remote" || true)"
if [ -z "$remote" ]; then
  if git remote get-url github >/dev/null 2>&1; then remote=github; else remote=origin; fi
fi
# Never send the Replit credential to an internal task remote or another project.
validate_url() {
case "$1" in
  https://github.com/OKHP3/telling-forward|https://github.com/OKHP3/telling-forward.git|git@github.com:OKHP3/telling-forward.git) ;;
  *) echo '[sync] Refusing a remote outside OKHP3/telling-forward.' >&2; exit 1 ;;
esac
}
validate_url "$(git remote get-url "$remote")"
validate_url "$(git remote get-url --push --all "$remote")"
if [ -n "${GITHUB_PAT:-}" ]; then
  GIT_ASKPASS="$root/scripts/git-askpass.sh"
  export GIT_ASKPASS
  [ -x "$GIT_ASKPASS" ] || { echo '[sync] Askpass helper is missing or not executable.' >&2; exit 1; }
  # An injected credential helper can return a stale OAuth token before askpass.
  transport() { git -c credential.helper= "$@"; }
else
  transport() { git "$@"; }
fi
GIT_TERMINAL_PROMPT=0
export GIT_TERMINAL_PROMPT
for operation in MERGE_HEAD rebase-merge rebase-apply CHERRY_PICK_HEAD; do
  [ ! -e "$(git rev-parse --git-path "$operation")" ] || { echo '[sync] Finish the current Git operation first.' >&2; exit 1; }
done
transport fetch --no-prune "$remote"
target="refs/remotes/$remote/$branch"
if git show-ref --verify --quiet "$target"; then
  counts="$(git rev-list --left-right --count "HEAD...$target")"
  set -- $counts
  ahead=$1 behind=$2
  echo "[sync] $branch versus $remote/$branch: ahead=$ahead behind=$behind"
  if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
    echo '[sync] Diverged. Local commits are preserved. Review and merge the remote, or publish a review branch and open a PR; no force-push.' >&2
    exit 1
  fi
  if [ "$behind" -gt 0 ]; then
    [ "$mode" = sync ] || { echo '[sync] Remote has newer commits. Run sh scripts/sync-github.sh from a clean checkout.' >&2; exit 1; }
    [ -z "$(git status --porcelain)" ] || { echo '[sync] Preserve and review uncommitted changes before updating.' >&2; exit 1; }
    git merge --ff-only "$target"
  fi
fi
if [ "$mode" = --check ]; then
  transport push --dry-run "$remote" "HEAD:refs/heads/$branch"
  echo '[sync] Authentication and push preflight passed; no commits were published.'
  exit 0
fi
transport push --set-upstream "$remote" "HEAD:refs/heads/$branch" || {
  echo '[sync] Push failed; commits are still local. Read the Git error above. Workflow permission or protected-main failures need the appropriate credential or PR, not a force-push.' >&2
  exit 1
}
transport fetch --no-prune "$remote"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$target")" ] || { echo '[sync] Remote moved during verification; inspect before retrying.' >&2; exit 1; }
echo "[sync] Verified $branch = $remote/$branch at $(git rev-parse HEAD)"
git status --short --branch
[ -z "$(git status --porcelain)" ] || echo '[sync] Uncommitted changes remain; they were not staged or published.' >&2
