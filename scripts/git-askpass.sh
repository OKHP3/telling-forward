#!/bin/sh
# Git askpass helper for automated pushes.
# Git calls this script with a prompt string and expects the credential on stdout.
# The GITHUB_PAT environment variable must be set by the caller (e.g. post-commit hook).
# This script never stores or logs the token — it only echoes it to git's stdin pipe.
case "$1" in
  *Username*) echo "OKHP3" ;;
  *Password*) echo "${GITHUB_PAT}" ;;
esac
