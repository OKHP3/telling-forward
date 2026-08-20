---
name: GitHub write-path contract
description: Rules any endpoint that writes commits to a storyworld repo must follow (identity, topology, recoverability).
---

# GitHub write-path contract

Any API endpoint that writes to a storyworld's GitHub repo must follow three rules:

1. **Platform service identity in Git metadata.** Never use a user's login email:
   commit metadata is durable and repo-visible, so that would be a PII leak. User
   attribution belongs in the contributor record and a recoverable commit trailer.

2. **Commit where the index says the content is.** A contribution must be committed to
   the same path/branch it is indexed against. A separate branch needs its own persisted
   path and proposal relationship, not silent membership of another path.

3. **No local-only pseudo-records.** Indexed records must be re-derivable from GitHub.
   If the GitHub write fails, fail the request instead of indexing unrecoverable data.

**Why:** GitHub is the canonical source of truth; Postgres is a rebuildable index.

**How to apply:** Check all three whenever adding or changing a write endpoint that
touches GitHub and indexes contribution records. Identity records must remain unique
under concurrent retries.
