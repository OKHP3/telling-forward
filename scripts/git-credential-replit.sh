#!/bin/sh
# Git credential protocol: only the named repository can receive the existing PAT.
# Git consumes stdout. Never run this helper directly in a terminal with real secrets.
[ "${1:-}" = get ] || exit 0
[ -n "${GITHUB_PAT:-}" ] || exit 0
protocol= host= path=
while IFS= read -r field && [ -n "$field" ]; do
  case "$field" in
    protocol=*) protocol=${field#protocol=} ;;
    host=*) host=${field#host=} ;;
    path=*) path=${field#path=} ;;
  esac
done
[ "$protocol" = https ] && [ "$host" = github.com ] || exit 0
case "$path" in OKHP3/telling-forward|OKHP3/telling-forward.git) ;; *) exit 0 ;; esac
helper="$(dirname "$0")/git-askpass.sh"
printf 'username=%s\n' "$(sh "$helper" 'Username for GitHub')"
printf 'password=%s\n\n' "$(sh "$helper" 'Password for GitHub')"
