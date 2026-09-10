---
name: Proposal review immutability
description: Proposal review decisions must bind to immutable version and fidelity-note references.
---

Proposal review is a separate append-only ledger from the mutable proposal
submission lifecycle. Terminal contributor outcomes need both API-level exact
reference checks and a storage-level uniqueness guard per immutable version.

**Why:** Concurrent requests can otherwise record two conflicting terminal
decisions after both read an apparently unreviewed version.

**How to apply:** Keep revisions as new lineage children with new fidelity
notes and no inherited review events; retain predecessor note/event references
as evidence instead of copying the outcome.