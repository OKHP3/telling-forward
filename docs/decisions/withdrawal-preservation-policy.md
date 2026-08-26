# Withdrawal and Preservation Policy

## Status

**Private-pilot policy approved; enforcement not approved.**

This policy defines the preservation choices that must not be collapsed into the
single `withdrawn` proposal state. It does not add a database table, change the
proposal state machine, authorize public contribution, or approve deletion,
orphaning, moderation, or derivative enforcement. The source-specific consent
decision for Disrupt and Invert is recorded in
`consent-ladder-design.md`; this document defines what happens after a permitted
derivative exists or a request is withdrawn or revoked.

## Decision

Telling Forward separates four different questions:

1. **Should editorial processing stop?**
2. **Should the work remain available to readers?**
3. **Should the contributor's public attribution change?**
4. **What records must remain recoverable?**

The existing proposal state answers only the first question for an eligible
submission. A withdrawal is not automatically an erasure request, a rights
revocation, an admission of wrongdoing, or permission to remove provenance.

## Preservation outcome table

| Outcome | Who may request | Who approves / timing | Reader view | Can the same proposal re-enter review? | Required recoverability |
|---|---|---|---|---|---|
| **Withdrawn and preserved** | The verified proposal contributor, while the proposal is `draft`, `submitted`, `under-review`, or `returned-with-notes` | The current service authorization is sufficient for the eligible withdrawal; the steward is notified. Withdrawal is prospective and stops editorial processing. | Do not present the withdrawn submission as active or available for ordinary reading. Use plain language such as “This submission is no longer in review.” | **No.** A new submission would require a new proposal and whatever consent is then applicable. | The GitHub PR, source branch/commits, contributor identity, withdrawal time, and proposal history remain recoverable. Private consent and audit records remain in the application control plane. |
| **Attribution removed / orphaned** | The contributor may request a change to displayed attribution; a steward may identify an attribution-safety issue | **Owner and legal/privacy approval required before enforcement.** The request must be evaluated separately from editorial state and rights. | If approved, show only an owner-approved neutral label such as “Attribution unavailable” or “Anonymous contributor.” Never imply that anonymity changes authorship or canon status. | The original proposal state and its review eligibility do not change. A new review request needs an explicit owner-approved process. | Preserve the original identity and attribution evidence in access-controlled application records and the durable provenance trail where legally required. Any public redaction must itself be auditable; do not silently rewrite history. |
| **Restricted** | A steward, usually after an editorial, safety, rights, or policy concern | Steward decision under the existing lifecycle; a private moderation case may be linked when safety or conduct is involved | Do not expose the restricted work or private reason. Show a safe message such as “This submission is unavailable.” | **No.** Restriction is terminal in the proposal model. Any later remediation needs an owner-approved process and must not silently reopen the proposal. | Preserve the proposal, GitHub source/history, steward decision, safe reason, and any private moderation evidence under separate access controls. Restriction is not proof of misconduct or consent revocation. |
| **Archived** | A steward after a terminal outcome | Steward housekeeping after `accepted-into-canon`, `published-alternate`, `restricted`, or `withdrawn` | Remove from active work queues. Reader visibility follows the underlying outcome and any separately approved publication decision. | **No.** Archival is filing, not reopening or deletion. | Preserve the underlying terminal outcome, GitHub history, provenance, decision time, and linked private records. |
| **Deleted / erased where allowed** | The contributor, an affected person, or an authorized legal/privacy process may request it | **Owner and legal/privacy approval required.** Determine scope, jurisdiction, retention duties, downstream reuse, backups, and whether deletion is technically and legally possible. No automatic deletion follows from withdrawal. | Remove the affected material from the approved reader surfaces within the decided operational window. Do not promise removal from independent copies, required records, or Git history until those boundaries are decided. | **No.** Deletion is not a state transition and cannot silently recreate or reopen the proposal. A future submission is a new record. | Retain only the minimum private audit, legal hold, safety, consent, and provenance evidence required by the approved policy. GitHub history, backups, exports, and downstream derivatives require a separate disposition decision. |

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

## Owner and legal questions before enforcement

The following decisions remain open:

- What jurisdictions, age rules, guardian approvals, and legal bases govern
  removal or anonymization requests?
- When may a public display be taken down, and what operational window applies?
- Must a contributor's identity remain visible to stewards after public
  attribution is removed?
- Which GitHub history, backups, exports, moderation evidence, or legal holds
  must be retained, and for how long?
- What appeal, correction, and audit process applies when attribution is
  disputed?
- May any content be deleted from Git history, or is only reader-facing
  removal allowed?
- Which jurisdictions, contractual terms, and legal-hold rules require a
  stricter disposition than this pilot default?

Until these are answered, no API, webhook, reconciliation job, consent toggle,
moderation action, or public workflow may infer deletion, orphaning, or
derivative permission from `withdrawn`.

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