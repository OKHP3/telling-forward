---
name: GitHub App workflow-file permission boundary
description: The pilot installation can write repository content but cannot update files under .github/workflows without the separate Workflows permission.
---

The private-pilot GitHub App installation has repository contents write access
but not the separate Workflows permission. GitHub rejects both Contents API and
Git Data API writes that modify a workflow file, even on an unprotected branch.

**Why:** GitHub treats workflow-file changes as a privileged operation to stop
an installation from escalating Actions behavior. A successful branch creation
does not prove that the same App can propagate a workflow change.

**How to apply:** Use an explicitly authorized maintainer path for a
workflow-only propagation change, preserve the service identity for synthetic
test branches, and record the permission boundary rather than repeatedly
retrying App-authenticated workflow writes.