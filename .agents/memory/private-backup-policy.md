---
name: Private pilot backup policy
description: Owner-approved backup destination, custody, retention, and drill scheduling boundary for the private control plane.
---

Use the private Replit Object Storage destination and operator-held passphrase
policy recorded in the recovery runbook for the private pilot. Daily encrypted
archives are retained for 35 days with lifecycle deletion; no second-region
replica is approved for the pilot. The first live drill may proceed without a
new generic audit table, but it must write its metadata and result to the
access-controlled operations log.

**Why:** The provider, key custody, and retention choices were previously open,
which prevented scheduling a live restore drill and risked treating a
development-only proof as production recovery evidence.

**How to apply:** Consult the runbook before provisioning backup storage,
implementing retention/deletion automation, or recording the scheduled drill.
Do not expose dump contents, passphrases, or private control-plane history.