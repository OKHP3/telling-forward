# Private control-plane recovery runbook

## Status

**Pilot control and recovery contract defined; first live encrypted backup/restore
drill scheduled for owner/operator execution.**

This runbook is deliberately separate from the GitHub creative record. It
does not authorize public moderation, public contribution, consent
enforcement, or deletion of creative history.

## Source-of-truth boundary

| Record class | Current records | Source of truth | Recovery rule | Reader/contributor access |
|---|---|---|---|---|
| Creative content | story paths, contributions, capsules, manuscript intake, branches | Private Storyworld Kit GitHub repository | Rebuild/index from GitHub; never restore from a PostgreSQL-only export | Only through product routes and story visibility rules |
| Editorial provenance | proposals, reviews/questions, accepted commit and attribution records | GitHub commits, PRs, reviews, webhooks, and signed provenance metadata | Reconcile from GitHub-native identifiers; local rows are projections | Product-safe status and attribution only |
| Identity | users, contributor links, stewards, contributors | PostgreSQL control plane, with GitHub IDs as external references | Restore from an encrypted PostgreSQL backup/export; do not synthesize identities from GitHub login names | Authenticated account or steward boundary only |
| Consent | consent records and revocation/supersession history | PostgreSQL append-only control plane | Restore with identity and policy references intact; never infer consent from Git history | Subject user and authorized steward/support paths only |
| Moderation | cases, private events, controls, evidence references | PostgreSQL private control plane | Restore case/event/control history before reopening operational access | Authorized stewards only; safe contributor message only |
| Audit evidence | consent history, moderation events, request IDs, provenance decision fields, auth timestamps | PostgreSQL plus GitHub-native event history by class | Preserve append-only records and source references; do not merge into public GitHub metadata | No direct reader access; restricted operational access |
| Ephemeral security state | sessions, password reset tokens, email verification tokens, transcribe counters | PostgreSQL, but disposable by policy | Restore only if the incident plan requires it; otherwise invalidate and reissue | Never export to users or support staff in raw form |

`storyworlds`, `story_paths`, `contributions`, `proposals`, and
`provenance_records` may contain local IDs and cached display data, but each
creative/provenance row must remain explainable from GitHub-native keys.
Restoring them does not restore consent, moderation, identity, or audit history.

## Backup and export contract

### Backup

For an authorized private backup, the operator must:

1. Use an encrypted PostgreSQL backup facility with a service-owned destination
   and access log. Do not write a database dump into a GitHub repository,
   issue, pull request, artifact, or application upload.
2. Include the private control-plane classes: `users`,
   `user_github_links`, `contributors`, `stewards`, `consent_records`,
   `moderation_cases`, `moderation_events`,
   `storyworld_moderation_controls`, and any approved audit table when one
   exists.
3. Treat `email_verifications`, `password_reset_tokens`, `sessions`, and
   `transcribe_usage` as disposable security/runtime state. They may be
   excluded from routine recovery backups; if included for forensic reasons,
   they remain encrypted and are invalidated before service resumes.
4. Record backup timestamp, schema/revision identifier, covered table list,
   operator identity, destination key, retention expiry, and verification
   result in an access-controlled operations log.
5. Verify the backup without exposing row contents: decryptability, archive
   integrity, table manifest, and a test restore into an isolated clean
   environment.

#### Owner decisions for the private pilot — 2026-08-26

The following decisions close the previously open provider, custody, and
retention choices. They authorize scheduling the drill; they do not represent
completion of a live backup or restore.

| Decision | Approved choice | Operating constraint |
|---|---|---|
| Backup provider and destination | **`pg_dump` written to a private Replit Object Storage bucket**, under the `private-control-plane/backups/` prefix | The bucket is service-owned and access-controlled. Only the recovery operator and API service may access it. Do not use Replit Deployments' application backup as the control-plane archive, and never copy dumps to GitHub, an issue, a PR, an artifact, or an application upload. |
| Encryption key custody | **Operator-held passphrase**, provisioned through the owner-controlled workspace secret store and supplied only at backup/restore time | The passphrase is not stored in the repository, dump, object metadata, or an operator log. The live drill must verify that the named operator can retrieve the secret through the approved secret-store path and decrypt the archive without exposing its value. |
| Geographic redundancy | **No second-region replica during the private pilot** | The encrypted archive remains in the selected Replit Object Storage destination. A second-region copy requires a separate owner decision; the absence of that copy must be visible in the drill record. |
| Backup retention and deletion | **35 days per encrypted archive**, with provider lifecycle deletion at expiry (daily lifecycle sweep, based on the archive creation timestamp) | A legal hold or active safety investigation suspends deletion and must be recorded by the owner. Expired archives are deleted; deletion evidence is retained in the access-controlled operations log without retaining dump contents. |
| Audit evidence before the first drill | **Not required as a new database table before the first drill** | The generic append-only audit sink remains deferred. The first drill must still write its backup/restore metadata and result to the access-controlled operations log, and the existing consent, moderation, and provenance evidence must remain covered by the backup contract. |

The selected method is tested locally with a synthetic dump by
`scripts/private-control-plane-backup-drill.py`. That check exercises archive
creation, OpenSSL encryption with a fresh test passphrase, checksum
verification, passphrase-based decryption, and byte-for-byte recovery. It does
not connect to PostgreSQL, Replit Object Storage, or production data.

### Export

There are two distinct exports:

- **Operational recovery export:** encrypted, structured, service-only data
  used to restore the private control plane. It includes immutable IDs and
  references, not a reader-facing narrative.
- **Subject access export:** a future support/privacy workflow that must
  select records by authenticated subject and redact other users, private
  reporter notes, credentials, tokens, evidence locations, and unrelated
  storyworld data. It is not implemented or approved by this runbook.

No export may turn a private consent or moderation record into public GitHub
metadata.

## Restore procedure

1. Create a clean database and restrict network access to the recovery
   operator and API service.
2. Restore the approved encrypted backup into the clean database.
3. Run schema validation and verify foreign-key relationships before allowing
   requests.
4. Invalidate all restored sessions, password-reset tokens, and email
   verification tokens unless an owner-approved forensic exception applies.
   Reset disposable rate-limit counters.
5. Verify that consent records remain append-only and that moderation event
   history remains linked to its case.
6. Verify storyworld/proposal/provenance rows by reconciling their GitHub
   references. Do not treat the PostgreSQL restore as proof that creative
   content or provenance is canonical.
7. Run access checks as an anonymous reader, a different contributor, the
   affected contributor, and an authorized steward. Only the steward may see
   private case data; no reader or contributor may see private notes,
   evidence references, identity secrets, or another user's consent history.
8. Record the restore result, row counts by class, invalidated-state counts,
   reconciliation result, operator, and timestamp. Destroy the temporary
   clean environment according to the approved retention policy.

The API must not be opened to readers or contributors until steps 3–8 pass.

## Retention, deletion, and audit decisions

| Record class | Retention | Deletion behavior | Audit requirement | Decision |
|---|---|---|---|---|
| Creative/provenance | Governed by the separate withdrawal/preservation policy and GitHub ownership | Never delete from PostgreSQL as a substitute for a GitHub preservation decision | GitHub SHA/PR/review and signed attribution remain recoverable | Existing policy applies |
| Identity | Owner/legal schedule required | Subject/account deletion must preserve only what is legally or operationally required; unlink external identity where approved | Record actor, request, scope, and result without logging credentials | Deferred |
| Consent | Append-only history; policy version and revocation timing must remain auditable | Do not mutate historical grants; future subject-deletion handling needs legal approval and may require redaction/pseudonymization | `recorded_via`, request ID, policy hash, and supersession chain | Design only; deferred |
| Moderation | Restricted notes and evidence require owner/legal schedule | Case deletion is not a default; preserve safety/accountability evidence where required and redact only by approved process | Case timeline, actor, reason, evidence reference, and reversal/appeal marker | Design only; deferred |
| Audit | Append-only for the applicable policy period | No ad hoc deletion; expiry requires an approved schedule and evidence of execution | Access to private records must itself be logged by the operations system | Generic audit sink not yet implemented; deferred |
| Sessions/tokens/counters | Short-lived operational TTL | Invalidate on restore and delete/expire naturally | Log invalidation counts, never token values | Operational rule defined |

Legal basis, jurisdiction, age/guardian rules, subject export format,
retention periods, deletion SLAs, appeals, and evidence-preservation
exceptions are unresolved owner/legal decisions. The application must not
invent them.

## Recovery proof

`scripts/private-control-plane-recovery-check.py` creates representative
synthetic records for every private class, performs a clean restore into a
temporary environment, applies the access matrix, and separately simulates a
GitHub/index rebuild. It asserts:

- the private restore brings back identity, consent, moderation, and audit
  evidence;
- reader and unrelated-contributor views contain no private records;
- the authorized steward can access the private case and consent history;
- the GitHub/index rebuild restores only creative/provenance projections and
  explicitly does not restore private history; and
- raw password/reset/session/token fields never enter an export.

This is a contract proof, not a production backup claim. A live encrypted
`pg_dump`/restore drill against the owner-controlled database remains required
before public launch. The live drill is scheduled as follows:

| Field | Scheduled value |
|---|---|
| Drill | First live encrypted `pg_dump`/restore against the owner-controlled database |
| Date and time | **2026-09-09 14:00 UTC** |
| Operator | **Jamie Hill — project owner and recovery operator** |
| Destination | Private Replit Object Storage bucket, `private-control-plane/backups/` |
| Key custody | Operator-held passphrase from the owner-controlled workspace secret store |
| Retention to verify | 35 days; lifecycle deletion at expiry |
| Pre-drill gate | Confirm destination access log, secret-store retrieval, isolated clean restore target, and operations-log write path |
| Launch gate | Do not open the API to readers or contributors until restore-procedure steps 3–8 pass |