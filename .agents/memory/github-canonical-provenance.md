---
name: GitHub canonical provenance
description: Durable attribution constraints for accepted Telling Forward contributions.
---

Accepted story contributions must retain a GitHub-recoverable record of the
contributor set, steward identity, canon commit, and acceptance time. When a
service account performs a merge, use the acting steward's linked GitHub
identity rather than the service account as the credited steward. Treat the
database as an index that can be rebuilt from GitHub, not as the durable
attribution source.

**Why:** A merge actor can be an automation identity, and an unsigned note can
be forged by a repository collaborator. Either case makes a database rebuild
lose or misstate the people who shaped a path.

**How to apply:** Persist a signed, canonical acceptance record in the
repository's review history; verify its signature and the actual merged commit
before using it during webhook replay or reconciliation. Preserve shared saved
moments' membership in every path rather than assuming one commit belongs to
only one path. Record the immutable base/source range from the actual merge
commit's parents (not mutable pull-request refs), and guard an acceptance merge
against a changed submitted head. Require the acting steward to link their
GitHub identity before a server-mediated canon acceptance, so the merge service
account can never become the credited decision-maker.

**Failure recovery:** Write a signed acceptance intent before merging. Bind it
to a unique identifier embedded in the actual merge commit and to the merge's
source parent; replay may use an intent only when both bindings match.