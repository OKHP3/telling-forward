#!/bin/sh
# Git credential helper for automated pushes.
# Invoked by git with "get", "store", or "erase" as the first argument.
# Only "get" needs a response; the others are no-ops.
# GITHUB_PAT must be in the environment.
case "$1" in
  get)
    echo "username=OKHP3"
    echo "password=${GITHUB_PAT}"
    ;;
esac
