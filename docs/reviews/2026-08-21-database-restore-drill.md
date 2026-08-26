# Review: Encrypted Database Restore Drill

**Date:** 2026-08-21  
**Task:** #129 — Run an owner-approved encrypted database restore drill before public launch  
**Reviewer:** Replit Agent (workspace)

---

## Summary

The recovery contract is fully documented and passes its local proof. A live encrypted
`pg_dump`/restore drill against the owner-controlled PostgreSQL database has not been
completed and cannot be completed from this workspace. No production credentials,
encrypted backup destination, or isolated clean restore target are available here.

The owner decisions needed to schedule the drill were recorded on 2026-08-26.
The locally runnable synthetic backup check passes, but it is not evidence of a
live provider upload, production restore, or recovery SLA.

---

## Evidence boundary

This workspace cannot:

- Connect to the production PostgreSQL instance (no production `DATABASE_URL` with live
  data; development `DATABASE_URL` holds only synthetic seed records).
- Write an encrypted dump to a service-owned destination with an access log.
- Provision an isolated clean database for restore verification.
- Record operator identity, key custody, or retention expiry in an access-controlled
  operations log.
- Invalidate real sessions, reset tokens, or email verification tokens (none exist in
  the development database).

Accordingly, all eight restore procedure steps in the runbook remain unexecuted against
real data. This review records what is locally proven and what the operator must
confirm in the first live drill.

---

## What is locally proven

### Contract proof — 2026-08-21

```
python3 scripts/private-control-plane-recovery-check.py
private control-plane recovery contract: PASS
restored classes: audit, consent, ephemeral_security, identity, moderation
GitHub/index rebuild classes: creative, provenance
```

The proof script (`scripts/private-control-plane-recovery-check.py`) exercises the
same source-of-truth classes as the production schema using synthetic records:

| Assertion | Result |
|---|---|
| Operational export excludes ephemeral security fields (`session`, `reset_token`) | PASS |
| Clean restore recovers identity, consent, moderation, and audit classes | PASS |
| Steward view includes private case note | PASS |
| Reader, unrelated-contributor, and affected-contributor views contain no moderation or consent records | PASS |
| GitHub/index rebuild restores only creative and provenance classes | PASS |
| `private_note` and other private fields do not appear in the rebuilt index | PASS |
| Raw session/token values never enter an operational export | PASS |

### Schema coverage confirmed

The following tables are defined in the production schema and are covered by the
recovery runbook's private-class inventory:

| Runbook class | Tables |
|---|---|
| Identity | `users`, `user_github_links`, `contributors`, `stewards` |
| Consent | `consent_records` (append-only; `supersedes_consent_id` chain intact) |
| Moderation | `moderation_cases`, `moderation_events`, `storyworld_moderation_controls` |
| Ephemeral security (disposable) | `sessions`, `password_reset_tokens`, `email_verifications`, `transcribe_usage` |
| Creative/provenance (GitHub-backed) | `storyworlds`, `story_paths`, `contributions`, `proposals`, `provenance_records` |

Audit: a generic append-only audit sink is not yet implemented (recorded as deferred
in the runbook's retention table).

---

## What the operator must confirm in the first live drill

The runbook (§ "Restore procedure") defines eight steps. The operator must record the
following for each step:

| Step | What to record |
|---|---|
| 1. Create clean database | Provisioner, network isolation method |
| 2. Restore encrypted backup | Backup timestamp, schema/revision identifier, covered table list |
| 3. Schema validation | `drizzle-kit` or `psql` check result; FK violation count |
| 4. Invalidate sessions/tokens | Count of invalidated sessions, reset tokens, email tokens |
| 5. Verify consent append-only | Supersession chain intact; no rows mutated |
| 6. Reconcile creative/provenance rows | GitHub reference check result; count of rows with unresolvable refs |
| 7. Access matrix check | Steward sees private case; reader/contributor sees none |
| 8. Record and destroy | Provider, key custody, retention expiry, operator, result; clean-environment destruction confirmation |

The API must not be opened to readers or contributors until steps 3–8 pass.

---

## Decisions recorded before scheduling the drill

The runbook now records the following private-pilot choices:

- Backup provider and encrypted destination: `pg_dump` to a private Replit Object
  Storage bucket under `private-control-plane/backups/`.
- Encryption key custody: operator-held passphrase provisioned through the
  owner-controlled workspace secret store.
- Geographic redundancy: none during the private pilot.
- Backup archive retention: 35 days, with provider lifecycle deletion at expiry.
- The generic audit evidence table is not a prerequisite for the first drill;
  the access-controlled operations log is mandatory for drill metadata and result.

These choices authorize scheduling but do not claim that the provider bucket,
secret, isolated restore target, or operations-log path has been provisioned in
this workspace.

## Synthetic backup-method check — 2026-08-26

Command:

```
python3 scripts/private-control-plane-backup-drill.py
```

Result:

```
synthetic private-control-plane backup drill: PASS
archive encryption: PASS
passphrase recovery: PASS
checksum and byte-for-byte restore: PASS
```

The check creates an in-memory synthetic SQL dump, encrypts it with OpenSSL
using a fresh ephemeral passphrase, decrypts it, and verifies the recovered
bytes. It writes only temporary files and does not contact PostgreSQL,
Replit Object Storage, or production.

## First live drill schedule

| Field | Scheduled value |
|---|---|
| Date and time | **2026-09-09 14:00 UTC** |
| Operator | **Jamie Hill — project owner and recovery operator** |
| Destination | Private Replit Object Storage bucket, `private-control-plane/backups/` |
| Key custody | Operator-held passphrase from the owner-controlled workspace secret store |
| Evidence required | Provider access log, backup manifest, retention expiry, isolated restore result, invalidated-state counts, GitHub-reference reconciliation, access-matrix result, and deletion/destruction confirmation |
| Release gate | API remains closed to readers and contributors until runbook restore-procedure steps 3–8 pass |

---

## References

- `docs/operations/private-control-plane-recovery.md` (authoritative runbook)
- `scripts/private-control-plane-recovery-check.py` (contract proof, executed above)
- `lib/db/src/schema/` (production schema; tables match runbook inventory)
