---
name: Concurrent Git merges
description: Reconcile GitHub divergence when Replit task integrations are merging concurrently.
---

When task integrations are landing concurrently, a merge may be finalized on a helper ref while the checked-out `main` still reports diverged from `github/main`. Refresh the remote ref, merge it into the checked-out branch, preserve the newer local owner-confirmed decisions when conflicts are stale governance copies, then verify both refs match before handoff.

**Why:** Concurrent task merges can make the visible branch graph look partially reconciled and can leave auto-push rejected until the fetched remote history is explicitly merged into local `main`.

**How to apply:** Never force-push. Check `git status`, fetch `github/main`, inspect conflict stages, resolve only the actual conflicts, and confirm `git rev-parse main` equals `git rev-parse github/main` after the push.