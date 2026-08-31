# Withdrawal and Preservation Policy

## Status

**Private-pilot operational disposition rules approved; enforcement not
approved.**

This policy defines the preservation choices that must not be collapsed into the
single `withdrawn` proposal state. It does not add a database table, change the
proposal state machine, authorize public contribution, or approve deletion,
orphaning, moderation, or derivative enforcement outside the approved
disposition path. It does not authorize automatic deletion or Git history
rewriting. The source-specific consent
decision for Disrupt and Invert is recorded in
`consent-ladder-design.md`; this document defines what happens after a permitted
derivative exists or a request is withdrawn or revoked.

### Approval record

The following approval applies to the private-pilot operating rules in this
document, not to jurisdiction-specific legal advice or enforcement:

| Review authority | Decision | Recorded |
|---|---|---|
| Project owner | Approved the operational window, retention classes, legal-hold override, and appeal/correction authority below | 2026-08-31 |
| Legal reviewer | Approved the private-pilot disposition rules, with any stricter jurisdictional or legal requirement taking precedence | 2026-08-31 |
| Privacy reviewer | Approved the private-pilot preservation, minimisation, access, and correction rules below | 2026-08-31 |

The owner is the final operational decision authority. Legal and privacy
reviewers may require a stricter outcome, extend or place a legal hold, or
reject a proposed deletion or anonymisation. These approvals do not authorize
an endpoint, toggle, background job, export, or public derivative feature; the
enforcement gate in `consent-ladder-design.md` still applies.

## Decision

Telling Forward separates four different questions:

1. **Should editorial processing stop?**
2. **Should the work remain available to readers?**
3. **Should the contributor's public attribution change?**
4. **What records must remain recoverable?**

The existing proposal state answers only the first question for an eligible
submission. A withdrawal is not automatically an erasure request, a rights
revocation, an admission of wrongdoing, or permission to remove provenance.

## Approved operational disposition rules

These rules apply to Telling Forward-managed reader surfaces, managed
derivative records, and private control-plane records in the private pilot.
They do not create control over a copy held by a contributor, reader, third
party, hosting provider, or export recipient.

### Removal and correction window

1. A verified request creates a private disposition case and immediately stops
   new source-dependent publication. A released item may be placed on a
   temporary reader hold while the case is reviewed; the hold is not a finding
   against the contributor.
2. After an owner-approved removal, redaction, anonymisation, or correction
   decision, the managed reader-facing surface must apply that decision within
   **7 calendar days**. The service should act sooner where practicable.
3. A steward may impose an immediate managed-surface hold for an urgent safety,
   privacy, or legal concern. The owner and legal/privacy reviewer must be
   notified, and the final disposition should be decided within **24 hours**
   where practicable. A hold may remain while a legal hold or appeal is active.
4. The 7-day window is a service operating target for controlled surfaces, not
   a guarantee about GitHub history, third-party publications, independent
   copies, exports, or retention-bound backups.

### Retention classes

| Record class | Approved retention and disposition |
|---|---|
| Managed released derivative and reader-facing copy | Preserve while its independent display permission remains valid and no approved removal, safety, privacy, rights, or legal-hold decision requires otherwise. After an approved removal, purge the managed serving copy and prevent it from being restored to a reader surface or used by a new source-dependent job within the 7-day window. |
| Unreleased derivative, partial output, and transformation inputs | Keep private while the disposition case, appeal, correction, safety review, or legal hold is open. After final disposition, delete or minimise them within 7 calendar days unless they are required audit, provenance, safety, consent, or legal-hold records. |
| Disposition, appeal, correction, consent, lineage, attribution, release, and removal audit records | Keep for **24 months after final disposition**. At expiry, delete or minimise them unless a legal hold, active safety investigation, unresolved rights matter, or another approved retention duty requires longer. |
| GitHub creative and provenance history | Follow the separate GitHub preservation decision. This policy does not authorize automatic branch, commit, pull-request, review, or history rewriting. |
| Encrypted private control-plane backups | Follow the approved recovery rule: **35 days per archive**, with provider lifecycle deletion at expiry. A legal hold or active safety investigation suspends deletion and must be recorded; held archives are not restored to reader surfaces or new derivative jobs. |

The 24-month period is an operational pilot retention period for the private
decision record, not a determination of a statutory retention period. When a
stricter legal, safety, contractual, or jurisdictional rule applies, the
stricter rule controls. Once a hold is released, a backup that is already past
its 35-day age may be deleted on the next daily lifecycle sweep; a younger
archive remains until its ordinary expiry.

### Legal holds

A legal/privacy reviewer or the owner may place a legal hold; a steward may
request one when a safety or rights matter may require preservation. The hold
record must identify its scope, reason category, placing authority, affected
source and derivative lineage, start time, review date, and release authority.
While active:

- ordinary deletion, anonymisation, retention expiry, and backup lifecycle
  deletion are suspended only for the scoped records;
- the service may still restrict a reader surface or stop new source-dependent
  use when safety, privacy, or law requires it;
- the held material must not be restored to a reader surface, exported, or
  supplied to a new derivative job under revoked consent; and
- release requires the owner and legal/privacy reviewer, after which the
  ordinary retention rule resumes.

A legal hold preserves records; it does not grant publication permission,
revive consent, reopen a proposal, or require an independent copy to be
removed.

### Appeal and correction authority

The verified source contributor or affected rightsholder may appeal a
disposition or request a factual attribution/content correction within **30
calendar days** of the decision notice. A late request may still be accepted
when it presents new facts or a safety, privacy, rights, or legal concern.

- The steward who handled the original case provides the record and a
  recommendation but cannot decide their own appeal.
- The owner makes the final operational decision with a legal/privacy reviewer
  who did not make the initial decision. A stricter legal or privacy outcome
  controls. The review target is **14 calendar days** after the request is
  complete; the requester receives a status notice if a complex case needs
  longer.
- The possible outcomes are: affirm the disposition; preserve the derivative;
  remove, restrict, or redact the managed surface; correct reader-facing
  attribution or content; or return the case for a new owner-approved
  disposition. An appeal never automatically restores removed material,
  reopens a proposal, or grants consent.
- An approved correction is applied to managed reader surfaces within the
  7-calendar-day operational window. It must append an auditable correction
  event and preserve the challenged source, lineage, decision, and appeal
  record. It must not silently rewrite GitHub history.
- The safe current reader-facing result remains in place while an appeal is
  pending. A temporary hold may be used where continued display creates a
  safety, privacy, or legal risk.

The service must tell the requester what changed on managed surfaces and what
remains outside service control. It must not promise removal from independent
copies, third-party publications, exports, or backups retained under the
approved recovery or legal-hold rules.

## Preservation outcome table

| Outcome | Who may request | Who approves / timing | Reader view | Can the same proposal re-enter review? | Required recoverability |
|---|---|---|---|---|---|
| **Withdrawn and preserved** | The verified proposal contributor, while the proposal is `draft`, `submitted`, `under-review`, or `returned-with-notes` | The current service authorization is sufficient for the eligible withdrawal; the steward is notified. Withdrawal is prospective and stops editorial processing. | Do not present the withdrawn submission as active or available for ordinary reading. Use plain language such as “This submission is no longer in review.” | **No.** A new submission would require a new proposal and whatever consent is then applicable. | The GitHub PR, source branch/commits, contributor identity, withdrawal time, and proposal history remain recoverable. Private consent and audit records remain in the application control plane. |
| **Attribution removed / orphaned** | The contributor may request a change to displayed attribution; a steward may identify an attribution-safety issue | Owner makes the operational decision with legal/privacy review; an appeal follows the authority path below. The request is evaluated separately from editorial state and rights. | If approved, show only an owner-approved neutral label such as “Attribution unavailable” or “Anonymous contributor.” Never imply that anonymity changes authorship or canon status. Apply the approved change within 7 calendar days. | The original proposal state and its review eligibility do not change. A new review request needs an explicit owner-approved process. | Preserve the original identity and attribution evidence in access-controlled application records and the durable provenance trail where legally required. Any public redaction must itself be auditable; do not silently rewrite history. |
| **Restricted** | A steward, usually after an editorial, safety, rights, or policy concern | Steward decision under the existing lifecycle; a private moderation case may be linked when safety or conduct is involved | Do not expose the restricted work or private reason. Show a safe message such as “This submission is unavailable.” | **No.** Restriction is terminal in the proposal model. Any later remediation needs an owner-approved process and must not silently reopen the proposal. | Preserve the proposal, GitHub source/history, steward decision, safe reason, and any private moderation evidence under separate access controls. Restriction is not proof of misconduct or consent revocation. |
| **Archived** | A steward after a terminal outcome | Steward housekeeping after `accepted-into-canon`, `published-alternate`, `restricted`, or `withdrawn` | Remove from active work queues. Reader visibility follows the underlying outcome and any separately approved publication decision. | **No.** Archival is filing, not reopening or deletion. | Preserve the underlying terminal outcome, GitHub history, provenance, decision time, and linked private records. |
| **Deleted / erased where allowed** | The contributor, an affected person, or an authorized legal/privacy process may request it | Owner makes the operational decision with legal/privacy review. Determine scope, jurisdiction, retention duties, downstream reuse, backups, and technical feasibility. No automatic deletion follows from withdrawal. | Remove the affected material from approved reader surfaces within 7 calendar days after approval, subject to an immediate safety/legal hold. Do not promise removal from independent copies, required records, or Git history. | **No.** Deletion is not a state transition and cannot silently recreate or reopen the proposal. A future submission is a new record. | Retain only the minimum private audit, legal hold, safety, consent, and provenance evidence required by the approved retention classes. GitHub history, backups, exports, and downstream derivatives require a separate disposition decision. |

## Boundaries between outcomes

### Withdrawal is not attribution removal

Withdrawal stops the contributor's active proposal. It does not by itself remove
the contributor's name from a durable creative record, revoke authorship, or
erase a GitHub branch, commit, PR, review, or audit event.

### Attribution removal is not content deletion

An approved display-name change may leave the work and its provenance intact.
The product must not describe an orphaned or anonymized work as ownerless in a
legal sense. The original attribution may remain in a restricted provenance
record even when a reader-facing surface no longer displays it.

### Restriction is not withdrawal or misconduct

Restriction is a steward-owned terminal editorial outcome. If safety or conduct
evidence exists, it belongs in the private moderation case. A contributor may
withdraw an eligible proposal, but that does not close or conceal an existing
moderation case.

### Deletion is not archival

Archive removes a terminal outcome from active work. Deletion is a separately
approved disposition of particular material and records. No archive action may
be presented as erasure.

### Accepted derivatives require a separate disposition

An accepted scene, capsule, or alternate path may already have been quoted,
displayed, transformed, or copied before a contributor asks for withdrawal,
attribution change, or removal. The product must treat the source and each
known downstream use as separate records:

1. **Stop new source-dependent use.** Once a withdrawal or derivative-consent
   revocation is recorded, do not begin a new derivative, expand an existing
   derivative, or newly publish a source-dependent excerpt under the old
   permission.
2. **Hold unreleased use.** Pause a pending publication or transformation while
   the owner-approved review determines its disposition, unless safety or law
   requires an immediate hold.
3. **Preserve released derivatives by default.** An existing derivative is not
   automatically deleted or orphaned. Preserve it when it is sufficiently
   separable, its independent consent or license remains valid, and no safety,
   privacy, rights, or legal-hold decision requires removal.
4. **Remove or correct source-dependent material only when approved.** A
   derivative that substantially reproduces the source, depends on revoked
   permission, contains protected material, or cannot be separated without
   misleading attribution may require reader-facing removal, redaction,
   attribution correction, or withdrawal. This does not authorize Git history
   rewriting.
5. **Keep copies and backups distinct.** The service controls its reader
   surfaces and managed derivative records, but must not promise removal from
   independent copies, third-party publications, external exports, or backups
   retained under recovery or legal-hold policy.
6. **Record decisions and allow appeal.** Identify the source, derivative,
   consent version and revocation time, attribution, copies reviewed,
   decision-maker, scope, effective window, and appeal or correction route.

This is a private-pilot product boundary, not a legal conclusion. Legal and
privacy review is required before enforcement, public derivative features, or
jurisdiction-specific removal promises.

### Disrupt and Invert disposition rule

The approved Disrupt and Invert consent is narrow and source-specific. It does
not change the preservation result merely because the derivative was generated
by a product action rather than written directly by a contributor.

| Point in the derivative lifecycle | Required result after withdrawal or revocation |
|---|---|
| Consent granted, transformation not started | Fail closed. Do not start the action. An unused grant expires after its stated window and is never a standing reuse license. |
| Request queued or transformation in flight | Stop or hold the work where technically possible. Do not publish it. Record the interruption and review any partial output under the same source lineage. |
| Derivative created but not released | Hold it from readers and external export pending owner-approved disposition. Preserve the source, derivative, consent version, attribution, and decision audit. |
| Derivative released on a managed reader surface | Preserve by default only when it is separable, its independent permission remains valid, and no safety, privacy, rights, or legal-hold decision requires removal. Remove, redact, or correct only through the approved disposition path. |
| Independent copy, third-party publication, or export | Do not promise service control. Record the known copy and any requested notice or correction, but treat its disposition as a separate decision. |
| Recovery or retention-bound backup | Keep it when required by the approved recovery, retention, or legal-hold policy. Do not restore it to a reader surface or new derivative job under revoked consent. |
| Appeal or correction request | Keep the current reader-facing result safe while the appeal is reviewed. Preserve the challenged source and derivative lineage, record the decision-maker and effective window, and apply an approved attribution or content correction without silently rewriting Git history. |

Disrupt and Invert must never be treated as a single reusable permission. A
revocation of one action does not revoke the other, but it does stop that
action's future source-dependent use. A later request for either action requires
a new, matching consent record.

## Durable and private records

### GitHub-recoverable creative record

Where the record remains subject to preservation, GitHub remains the durable
source for the creative content, PR/review history, commit ancestry, and
accepted-canon provenance. A withdrawal or display-attribution request must not
silently make the PostgreSQL index the only copy.

If an owner-approved process changes a public display, it must create an
auditable record of what changed and why. The exact mechanism for public
redaction, branch deletion, or history rewriting is not approved by this
design.

### Private application control plane

The following remain private application records and are not to be placed in
public Issues, pull requests, commit messages, or labels:

- consent grants, revocations, and policy versions;
- identity-verification details and private attribution mapping;
- moderation reports, evidence, reporter identity, and appeals;
- legal requests, legal holds, retention decisions, and deletion approvals;
- access logs and operational audit details.

These records require their own access control, backup, export, retention,
deletion, and recovery design. PostgreSQL remains a rebuildable index for
creative records, but private control-plane records are an explicit exception.

## Contributor-facing wording

The interface should use plain language:

- “Withdraw this submission” — “This stops review. It does not erase the
  story's history or automatically remove your name from records that must be
  kept.”
- “Ask to change how your name appears” — “This is separate from withdrawing
  the submission. We will review what can change on reader-facing pages.”
- “This submission is restricted” — “A steward has made this submission
  unavailable. This is not a public finding about you.”
- “Request removal” — “We will review which copies and records can be removed.
  Some safety, legal, provenance, or backup records may need to remain.”

Do not expose GitHub, branch, pull-request, commit, CODEOWNER, or Project
terminology on contributor or reader surfaces.

## Acceptance fixtures

Representative cases are recorded in
`docs/decisions/withdrawal-preservation-cases.yaml`. They are policy fixtures,
not executable authorization rules. Each fixture preserves unresolved owner,
legal, privacy, safety, or operational questions rather than turning them into
defaults.

## Remaining legal and enforcement questions

The following decisions remain open:

- What jurisdictions, age rules, guardian approvals, and legal bases govern
  removal or anonymization requests?
- Must a contributor's identity remain visible to stewards after public
  attribution is removed?
- Which jurisdiction-specific rules require a stricter result than the approved
  pilot rules?
- May any content be deleted from Git history, or is only reader-facing
  removal allowed?
- Which jurisdictions, contractual terms, and legal-hold rules require a
  stricter disposition than this pilot default?

These open questions do not reopen the approved pilot operating rules. They
block enforcement and any jurisdiction-specific promise. No API, webhook,
reconciliation job, consent toggle, moderation action, or public workflow may
infer deletion, orphaning, or derivative permission from `withdrawn`.

## Compatibility with existing governance

- The nine-value proposal enum remains unchanged; this policy does not add
  states for attribution or deletion.
- The consent ladder remains per-action, revocable, and enforcement-gated.
  Disrupt and Invert are approved as narrow private-pilot policy actions, not as
  enabled endpoints or toggles. Withdrawal stops future eligible use subject to
  preservation limits; it does not erase historical records automatically.
- The legacy `cie-pie-derivative` umbrella action remains unavailable. This
  policy does not authorize implementation until the enforcement gate in
  `consent-ladder-design.md` is approved.
- Moderation remains private and case-based. A withdrawal does not resolve a
  moderation case, and a restriction does not publish its private reason.
- ADR-0013 remains authoritative: GitHub is canonical for recoverable creative
  history, while consent, moderation, identity, legal, and audit records stay
  application-owned.
- Public contribution, public reporting, derivatives, monetization, and
  automatic canon or publication decisions remain out of scope.

## References

- `docs/adr/0013-github-native-boundary-and-donor-primitives.md`
- `docs/decisions/consent-ladder-design.md`
- `docs/decisions/moderation-tooling-design.md`
- `docs/decisions/open-questions.md`
- `docs/decisions/provenance-fidelity-contract.md` (reader visibility boundary, open question 15.18)
- `artifacts/api-server/src/routes/proposals.ts`
- `lib/db/src/schema/telling-forward.ts`