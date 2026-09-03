# Provenance, Fidelity, and Reader-Clarity Contract

## Status

**Reader visibility boundary decided for the private pilot (2026-08-21);
contributor review boundary recorded (2026-08-26); contributor review approval
register updated 2026-09-03 with named owner authority and explicit deferred
owner, legal, and privacy decisions; revised-proposal lineage boundary recorded
(2026-08-31);
implementation and enforcement not approved. No reader or contributor feature
added.**

This document consolidates the overlapping proposals in ADR-0005, ADR-0006,
ADR-0007, ADR-0009, ADR-0010, and ADR-0011. It defines the records and release
boundaries that future implementation must satisfy. It does not add a
database table, authorize Disrupt, Invert, translation, training,
monetization, public contribution, or a public reader feature.

## Decision boundary

Telling Forward keeps two records conceptually separate:

1. **Editorial provenance** explains where creative material came from, what
   process touched it, what changed, and which human editorial outcome was
   recorded.
2. **Private control-plane records** govern consent, identity details,
   moderation, legal holds, and access decisions.

Editorial provenance may point to a consent or moderation record by an opaque
reference when necessary, but it never proves that permission exists and never
authorizes a transformation or canon decision. GitHub remains the durable
source for recoverable creative content, review history, and accepted outcomes.
PostgreSQL may index this information for product queries. There is no
`capsules` table; capsule records remain GitHub Issues with the canonical
`capsule:*` labels.

## Authoritative artifact contracts

### A. Provenance record

One provenance record is associated with a concrete creative artifact or
version. For a capsule, the durable external key is the GitHub Issue number;
for a scene or accepted contribution, it is the GitHub path/commit/PR
combination. The record must be append-only by version rather than silently
rewritten.

| Field group | Required fields | Contract |
|---|---|---|
| Identity | `artifact_id`, `artifact_kind`, `storyworld_id`, `version_ref` | Identifies a capsule, scene, manuscript-derived segment, transformation output, or accepted version without making the local serial ID canonical. |
| Durable source | `source_references[]` with kind, repository/path or Issue/PR/commit reference, and captured revision | Every source points to a recoverable GitHub object where one exists. A missing or unreachable source is recorded as a condition, not silently replaced. |
| Manuscript chain | `source_manuscript_ref`, `source_filename`, `source_digest`, `source_captured_at`, `source_status` | The original uploaded manuscript is immutable once ingestion begins. Derived conversions and retries point back to the original digest. `source_status` distinguishes `raw`, `derived`, `superseded`, and `unavailable`; it is not a license decision. |
| Ingestion | `produced_by_tier`, `ingestion_run_ref`, `engine_ref`, `model_or_provider_ref` | Values are `tier_0_rules`, `tier_1_actions_phi4`, `tier_2_byo_ai`, or `human`. Provider/model details are descriptive evidence, not an approval signal. |
| Engine and rung | `matured_by_engine`, `maturity_rung_before`, `maturity_rung_after` | Engine is one of `PME`, `PIE`, `CME`, `CIE`, or `none`; rung values are `R0`–`R10` when a rung model is actually used. No engine or rung implies acceptance. |
| Human authorship | `human_edited_after`, `human_editor_refs[]`, `edited_at` | Records that a human changed or approved a version. It must not claim a person authored text they did not write. |
| Editorial outcome | `proposal_ref`, `outcome`, `steward_ref`, `decided_at`, `canon_commit_ref` | Outcome is `draft`, `submitted`, `under-review`, `returned-with-notes`, `accepted-into-canon`, `published-alternate`, `restricted`, `withdrawn`, or `archived`. `canon_commit_ref` is required for accepted canon and absent for non-canon outcomes. |
| Visibility | `reader_visibility`, `contributor_visibility`, `steward_visibility`, `github_visibility` | Describes the intended surface, not an access grant. Private consent and moderation decisions remain outside this record. |

The minimum durable source references for an accepted scene are the source
path, contributor attribution, proposal/PR number, reviewing steward,
decision time, and resulting canon commit SHA. A record that cannot establish
these references is incomplete and must not be presented as fully proven
provenance.

### B. Fidelity note

Every future transformation that changes contributor material must return a
fidelity note alongside the proposed output. The note is an explanation
artifact, not a quality score or approval.

| Field | Required meaning |
|---|---|
| `source_version_ref` / `output_version_ref` | Exact source and proposed-output references. |
| `transform_kind` | The named operation, such as ingestion extraction, clarity assist, Disrupt, or Invert. |
| `changed_material[]` | Concrete claims, structure, wording, named entities, or omissions that changed. “No changes” is valid only for a checked output. |
| `preserved_intent[]` | Intended meaning, constraints, voice markers, plot facts, or author instructions deliberately retained. |
| `ambiguities_flagged[]` | Unresolved ambiguity, uncertainty, or interpretation the process surfaced instead of silently choosing. |
| `semantic_preservation` | Human-readable finding: `preserved`, `partially-preserved`, or `uncertain`, with explanation. |
| `structural_simplification` | What complexity or structure changed, if any; never a promise that shorter is better. |
| `audience_calibration` | Intended audience/register and the observed readability or density signal, if one exists. This is feedback, never an acceptance threshold. |
| `human_review_status` | `not-reviewed`, `reviewed`, `accepted-as-new-version`, or `rejected`; only a human can move this status. |

Fidelity notes must not claim that an output is faithful merely because an
agent generated the note. If the source is missing, the note says so. A
fidelity note does not authorize use of the output, grant derivative consent,
change canon, or transfer authorship.

### Contributor fidelity note and review boundary — private pilot decision

**Recorded 2026-08-26. This is a design contract only; it does not approve an
endpoint, worker, schema, or contributor-facing UI.** A contributor may review
only a proposed transformation of their own material. The note must be
generated alongside the proposal, remain attached to that proposal version, and
never silently replace the source or an earlier proposal.

The contributor-facing note is a deliberately smaller, plain-language view of
the internal fidelity note. These are the only fields it may contain:

| Contributor-facing label | Internal source | Allowed presentation |
|---|---|---|
| **This note is for** | `source_version_ref`, `output_version_ref` | App-local names such as “Original scene” and “Proposed version.” Show enough surrounding story context for the contributor to identify the material, but never expose raw repository, branch, commit, pull-request, issue, or internal IDs. |
| **Change type** | `transform_kind` | A maintained plain-language label such as “Clarity pass” or “Alternative structure.” Do not expose engine, pipeline, job, or provider terminology. |
| **What changed** | `changed_material[]` | Concrete, scoped changes to claims, structure, wording, named entities, or omissions. Describe the change; do not imply that it is better or approved. |
| **What was kept** | `preserved_intent[]` | The meaning, constraints, voice markers, plot facts, and author instructions the proposal attempted to retain. |
| **Questions to check** | `ambiguities_flagged[]` | Unresolved choices the contributor should inspect. Only include questions relevant to the contributor’s material, with protected third-party or safety details redacted. |
| **Meaning check** | `semantic_preservation` | One qualitative finding: “Meaning appears kept,” “Some meaning may have shifted,” or “Meaning could not be confirmed,” with a short explanation. No numeric score, confidence value, or automated pass/fail claim. |
| **Structure and length** | `structural_simplification` | What became shorter, longer, reordered, split, combined, or otherwise structurally different. Never describe shorter as inherently better. |
| **Intended audience** | `audience_calibration` | The requested audience or register and any observed reading consideration, if one exists. This is feedback for the contributor, not a reader-facing density band or acceptance threshold. |
| **Review status** | `human_review_status` plus the review event | “Waiting for your review,” “You accepted this version,” “You said this needs changes,” or “You declined this version,” with the safe reason and date when available. |

If a field was not checked, the note must say “Not checked” or omit it; it must
not invent certainty. Any ambiguity that cannot be explained without exposing a
private record is reported as a generic question or withheld from this view.

#### Review actions and proposal state

Contributor review is an editorial checkpoint, not a rights grant. The
proposal state is separate from the provenance `outcome` field and from the
consent ladder. In particular, `accepted-by-contributor` never means
`accepted-into-canon`, and `rejected-by-contributor` never means that consent
was revoked or that the source should be deleted.

| Contributor action | Resulting version-level review state | Effect |
|---|---|---|
| **Use this version** (accept) | `accepted-by-contributor` | Freezes the reviewed output and its note as the contributor-approved proposal version. It may proceed to a separate steward/editorial decision, but it is not canon, public, licensed for display, or approved for another transformation. |
| **Don’t use this version** (reject) | `rejected-by-contributor` | Makes this proposed output ineligible for further editorial use. The source remains unchanged; the proposal and review event remain auditable. A later attempt requires a new proposal version and must not overwrite the rejected one. |
| **Ask for changes** (request revision) | `changes-requested` | Returns the proposal with the contributor’s request attached. A revised output must receive a new output reference and a new fidelity note; the earlier output and note remain immutable and are not silently replaced. |
| **Ask for another review** (appeal) | `appeal-pending` | Opens a separate review of a steward decision that rejects, restricts, or otherwise closes the proposal against the contributor’s submission. Release and further transformation are paused while pending. The appeal records the issue in contributor language and resolves to `under-review`, `changes-requested`, or the applicable terminal steward outcome; it cannot auto-publish or make the work canon. |

The contributor may still withdraw an eligible proposal through the separate
withdrawal path. A review action must not be represented as a consent grant,
revocation, display license, canon decision, or deletion request. A steward’s
reason may be shown only after removing identity, moderation, legal, safety,
and other protected details that are not necessary for the contributor to
understand what they can do next.

#### Immutable proposal-version lineage

The reviewable unit is a **proposal version**, not a mutable proposal row or
the latest text attached to a submission. A proposal lineage groups the
original proposed version and every later version created from it. Lineage is
an editorial relationship and does not replace the GitHub source, consent
record, or provenance record.

Every proposal version must carry the following durable relationships in the
future implementation:

| Relationship | Required rule |
|---|---|
| `proposal_lineage_ref` | Stable reference shared by the original proposal and all of its revisions. It is not a contributor-facing identifier. |
| `version_ref` | Unique reference for this exact proposed output. It must never be reused for different text, a different source, or a different review outcome. |
| `predecessor_version_ref` | Null only for the first proposed version; every revision has exactly one direct predecessor in the same lineage. A revision may not point only to the latest version by convention or to a mutable proposal ID. |
| `fidelity_note_ref` | Identifies the fidelity note generated for this exact output. A revision receives a new note; the predecessor’s note remains attached to the predecessor. |
| `review_event_refs[]` | Append-only events that name the version reviewed, the action taken, the safe reason, and the resulting review state. A later event is added rather than editing the earlier event. |
| `superseding_version_ref` | Optional link from an earlier version to the new version created by an allowed revision path. This is a relationship record, not a replacement of the earlier version. |

The first proposal version captures the source/output pair and its initial
fidelity note. A request for changes creates a new child version with a new
output reference and new fidelity note. The child points to the version that
was actually reviewed, while the earlier output, note, and request-for-change
event remain recoverable. The earlier version may be marked as no longer the
active review target in a separate lineage projection, but its content and
history are never rewritten.

The following invariants apply to every review action:

1. **Review the snapshot named by the event.** Accept, reject, request
   revision, and appeal events bind to one `version_ref` and cannot silently
   apply to a predecessor, successor, or mutable “current proposal.”
2. **Append, do not overwrite.** A state or reason change creates a new review
   event with the prior state and event still readable. Replays use an
   idempotency key and must return the existing event rather than replacing
   its reason, actor, date, or version reference.
3. **Request revision creates a child.** The request event remains on the
   reviewed version. The revised output starts its own review history and
   points back to the reviewed version; it does not inherit an acceptance,
   rejection, appeal, or steward decision as though that outcome applied to
   the new text.
4. **Acceptance and rejection freeze the reviewed version.** “Use this
   version” and “Don’t use this version” record an outcome for that exact
   output. A later attempt is a new version or new proposal according to the
   applicable policy, never an edit that changes the accepted or rejected
   record.
5. **Appeal is a separate review.** An appeal references the steward decision
   and the contributor’s affected version, retains the original decision and
   appeal request, and records its resolution as another event. An appeal
   cannot auto-publish, reopen a proposal, or make a different version appear
   accepted. If the resolution allows changes, it creates a new child version
   with a new note.
6. **Consent remains separate.** A lineage link, review event, or appeal does
   not grant, revoke, or supersede consent, display permission, authorship,
   canon status, or deletion rights.

These rules do not add a new value to the nine-state proposal enum. The
version-level review state (`accepted-by-contributor`, `rejected-by-contributor`,
`changes-requested`, and `appeal-pending`) is a separate review projection.
The existing proposal lifecycle remains authoritative for submission,
steward, canon, restriction, withdrawal, and archival outcomes. A future
implementation must define the transaction and reconciliation behavior before
it exposes this design through an endpoint or UI.

##### Audience projections for a lineage

The same append-only lineage is projected differently by audience. The
projection must be selected at the data boundary, not produced by sending the
full record to a client and hiding fields during rendering.

| Audience | May show | Must not show |
|---|---|---|
| **Contributor** | Their own version labels, the current proposed text they are entitled to review, the attached contributor-safe fidelity note, prior safe review events affecting their material, the current plain-language review status, and the next available action. | Raw version/lineage IDs; repository, branch, issue, PR, commit, source digest, model/provider, operational metadata; another contributor’s material or identity; private steward, moderation, legal, consent, or appeal evidence. |
| **Steward** | The complete lineage for the storyworld, every predecessor/successor relationship, internal fidelity notes, all review events, safe and protected decision references according to steward authorization, and the distinction between contributor review and steward outcome. | Unrelated storyworld records or control-plane data outside the steward’s authorization. |
| **Maintainer** | The operational and recovery references needed to reconcile the lineage with GitHub, including immutable source/output references and event idempotency evidence, subject to private control-plane authorization. | A contributor-facing surface assembled from the unrestricted maintainer record. |
| **Reader** | No proposal lineage or fidelity history by default. A future, separately approved working-laboratory view may expose only the safe reader fields already listed in this contract. | Proposal versions, revision requests, contributor review actions, fidelity-note content, appeal history, unresolved provenance, and all permanently private fields. |

When a contributor opens an older version from the lineage, the view must say
that it is an earlier proposed version in plain language and show only the
safe note and review event for that version. It must not silently substitute
the newest child. When a contributor opens the current version, the view may
link to an earlier safe version as context, but the current version’s note and
review status remain the ones being acted on.

#### Contributor review approval register — private pilot gate

**Recorded 2026-09-03. Decision: deferred by all three review authorities.**
The named owner authority is **Jamie Hill, project owner**. No independent legal
reviewer or independent privacy reviewer has been appointed in the repository,
so those review authorities are recorded as **Legal reviewer: not appointed**
and **Privacy reviewer: not appointed**, not as implied approvals. The
contributor review rules remain the proposed design baseline. “Deferred” means
the rule is retained for review and is not authorized for implementation. It is
not an approval by silence, and it does not authorize a transform endpoint,
worker, schema, consent toggle, export, or contributor-facing UI.

| Review item | Owner decision | Legal decision | Privacy decision | Resulting rule and reason |
|---|---|---|---|---|
| Contributor-facing field list | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain the limited field list as a proposal only. The owner must confirm necessity for the contributor’s own review; legal and privacy review must confirm that presentation and redactions do not expose protected details. No field-list revision is authorized. |
| Review states and actions | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain “Use this version,” “Don’t use this version,” “Ask for changes,” and “Ask for another review” as provisional actions only. No action may be treated as a rights grant, revocation, deletion request, or disclosure. No state or action revision is authorized. |
| Appeal path | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain `appeal-pending` and its safe contributor-language outcome as a proposal only. The resolver, next step, and protected-evidence boundary still require review. No appeal-path revision is authorized. |
| Plain-language copy | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain the wording guide and four action labels as provisional copy. Copy must not imply quality, approval, canon, authorship, permission, or protected disclosure. No copy revision is authorized. |
| Protected-field redactions | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain the exclusion list as the minimum proposed boundary, including model/provider and operational metadata, repository references, private annotations, identity, moderation, safety, legal holds, consent, retention/deletion, and unrelated contributor material. No redaction-boundary revision is authorized. |
| Separation from consent | **Deferred: Jamie Hill, 2026-09-03** | **Deferred: legal reviewer not appointed, 2026-09-03** | **Deferred: privacy reviewer not appointed, 2026-09-03** | Retain the separation between proposal review and the consent ladder. Review actions and withdrawal cannot grant, revoke, or alter consent, display permission, canon status, authorship, or deletion rights. No separation-rule revision is authorized. |

The register now records the named owner authority, the legal and privacy
review-authority status, the review date, and an explicit approved, revised, or
deferred result for every item. Because all six items are deferred and the
independent legal and privacy reviewers are not appointed, the overall status
remains **deferred** and the implementation gate remains **closed**. If any
review is later revised, the changed field, state, path, or copy and the reason
must be recorded here before later approval is considered.

#### Fields that must not appear in a contributor fidelity note

The contributor view must exclude the following, even when the internal
fidelity or provenance records contain them:

- model name, provider identity, API version, engine name, maturity rung,
  ingestion run, prompt, system instruction, tool trace, raw model output, or
  generation metadata;
- raw GitHub or repository references, including repository name/path, Issue,
  pull request, branch, commit SHA, labels, webhook/request IDs, signatures,
  or internal database identifiers;
- source digests, hidden comparison material, machine-readable diffs, numeric
  fidelity/readability scores, confidence values, classifier output, or
  automated pass/fail decisions;
- another contributor’s private material or identity, steward/maintainer
  identity references, private reviewer annotations, or unrelated editorial
  notes;
- consent records, policy versions, license terms, revocations, attribution
  controls, moderation cases, safety evidence, legal holds, retention or
  deletion decisions, and private appeal evidence; and
- any unreleased proposed output or source excerpt outside the contributor’s
  own proposal and the minimum context needed to review it.

The contributor can be told that a proposal is restricted, unavailable, or
awaiting a protected review, but the note must not disclose the protected
reason or record. The contributor’s own review choices and the safe outcome
that affects their submission are visible; unrelated control-plane history is
not.

#### Plain-language wording guide

The contributor UI must explain the decision in everyday writing. GitHub
vocabulary, engine vocabulary, and internal field names must not be required
or displayed in the default flow.

| Internal concept | Use in contributor copy | Avoid |
|---|---|---|
| Source/output version refs | “Original scene” / “Proposed version” | “Source ref,” “output artifact,” “commit,” “branch,” or “pull request” |
| `transform_kind` | “Change type” and a human label such as “Clarity pass” | “Engine,” “pipeline,” “job,” “run,” or provider/model names |
| `changed_material[]` | “What changed” | “Delta,” “diff,” or “mutation” |
| `preserved_intent[]` | “What was kept” | “Invariant,” “preservation vector,” or “semantic payload” |
| `ambiguities_flagged[]` | “Questions to check” | “Ambiguity flags,” “unresolved tokens,” or “model uncertainty” |
| `semantic_preservation` | “Meaning check” with the three qualitative phrases above | “Fidelity score,” “confidence,” “pass,” or “fail” |
| `structural_simplification` | “Structure and length” | “Compression,” “optimization,” or “complexity score” |
| `audience_calibration` | “Intended audience” and “Reading focus” | “Calibration,” “density band,” or a hidden reading grade |
| Review actions | “Use this version,” “Don’t use this version,” “Ask for changes,” and “Ask for another review” | “Merge,” “rebase,” “close,” “deploy,” or other repository/workflow commands |

Detailed technical references may be available in a separately protected
maintainer or steward audit view, but they are never a prerequisite for the
contributor to make a review choice.

### C. Derived ledger

The term/motif ledger is a steward-facing, read-only projection derived from
GitHub capsule Issue labels/body and accepted scene metadata. Its starting
fields are:

`term_or_entity`, `canon_status` (`proposed`, `active`, `locked`,
`deprecated`), `first_appearance_ref`, `drift_risk` (`low`, `medium`, `high`),
`related_entities[]`, `related_motifs[]`, and `observed_change_refs[]`.

The ledger cannot become a second source of truth or an authoring surface.
`locked` is a steward-facing constraint proposal; it does not authorize an
agent transform until a future, owner-approved transform contract explicitly
consumes it.

## Artifact ownership and release rules

| Artifact | Owner | Readers / visibility | Release rule |
|---|---|---|---|
| Provenance record | Maintainer, with steward attribution | Steward and maintainer by default; contributor sees the portion about their material; reader sees only storyworld-approved safe signals | Release a reader-facing side-car only when the steward opts the storyworld into a working-laboratory presentation and private fields are removed. |
| Fidelity note | Transform owner and steward; contributor reviews their own output | Contributor and steward; maintainer for audit; not public by default | A proposed output cannot become an accepted version until the contributor/steward review path records a human outcome. |
| Term/motif ledger | Storyworld steward | Steward only by default | Release only as a steward tool after derived inputs and entity-reference vocabulary are agreed. No public compendium exposure follows automatically. |
| Process narrative (“how this world was made”) | Steward and maintainer | Steward/maintainer by default; optional reader view | Assemble only from safe, released provenance and fidelity fields after a storyworld opts into working-laboratory mode. Never include private consent, moderation, identity, or legal records. |
| Canon compendium | Steward, with maintainer release responsibility | Steward by default; reader only for an intentionally public edition | Compose from accepted canon capsules and the derived ledger. It is not a new canon source, and it must not publish proposed, restricted, or private material. |
| Locked terms | Steward | Steward and approved transform tooling | A future transform may consult it only after an owner-approved contract defines scope, overrides, and audit behavior. No current transform is authorized by this document. |
| Progressive-disclosure copy | Product/content owner | Contributor first; technical detail on demand | Plain-language explanation is the default for GitHub mechanics. Technical references are optional detail and must not be required to participate. |
| Outside-reader legibility check | Steward | Steward and contributor when the steward chooses to share it | Advisory only. It may flag missing context or readability concerns but cannot block, accept, restrict, or publish a proposal automatically. |
| Reader accessibility/density signal | **Deferred owner decision** | Unknown until open question 15.13 is decided | Do not add a field, band, default, or reader-facing label. A future decision must define whether the signal is author-set, steward-visible, reader-facing, or rejected. |

## Visibility boundaries

- **Contributor:** sees plain-language provenance for their own material, the
  fidelity note for a proposed transformation, and human review outcomes that
  affect their submission. Do not require GitHub literacy.
- **Steward:** sees the full editorial record for their storyworld, the
  derived term/motif ledger, unresolved provenance, and advisory legibility
  findings.
- **Maintainer:** sees operational provenance needed for recovery and
  reconciliation. Private moderation and consent details remain restricted to
  their authorized control-plane roles.
- **Reader:** sees only story content and steward-released, safe provenance or
  clarity signals. No private source file, identity record, moderation case,
  consent record, prompt, model credential, or unresolved internal note.
- **GitHub:** stores durable creative content, source references, review
  history, and accepted provenance markers. It must not store private consent,
  moderation, legal, or identity-control details in public metadata.

## Explicit decisions and deferrals

Accepted as design rules:

- reserve the provenance field set and immutable raw-manuscript reference;
- require a fidelity note for future transformations;
- keep the term/motif ledger derived and steward-facing;
- use progressive disclosure for GitHub-native explanations;
- keep all human review and canon decisions outside automated signals.

Deferred or not authorized:

- implementation of any provenance or fidelity schema;
- Disrupt, Invert, translation, training, monetization, or derivatives;
- reader-facing process narrative, compendium, or side-car UI;
- reader accessibility/density metadata, open question 15.13;
- source-specific Disrupt/Invert consent policy is defined in open question
  15.10, with enforcement still unapproved;
- public contribution or public reporting;
- automated acceptance, moderation, rights, or publication decisions;
- contributor-facing transform review implementation until this contract has
  owner, legal, and privacy approval.

## Acceptance fixtures

The policy fixtures in
`docs/decisions/provenance-fidelity-cases.yaml` cover source, capsule,
transformation, edit, acceptance, alternate, and missing-provenance cases.
They are owner-review fixtures, not executable schema or permission rules.

## Reader provenance boundary — private pilot decisions

**Recorded 2026-08-21. No runtime enforcement or reader feature is added by this section.**

### Working-laboratory opt-in

The per-storyworld "working laboratory" presentation remains the only approved mechanism
for a reader-facing provenance side-car. It is **not enabled for the private pilot**. A
steward may not configure it until all of the following are separately approved and
implemented:

- the storyworld-level opt-in mechanism and who may set or revoke it;
- the exact wording and form of each safe signal as it appears to a reader;
- an API boundary that excludes private fields at query time, not only at render time; and
- a steward review confirming that no consent, moderation, identity, or legal-hold record
  can reach a reader through any storyworld's provenance configuration.

Until those gates are passed, all provenance records remain steward-and-maintainer-only.

### Safe fields approved for a future working-laboratory reader view

When the opt-in is eventually enabled, the following are the **only** fields approved for
reader presentation:

| Field | Approved reader-facing form | What must not appear |
|---|---|---|
| Editorial outcome | "Accepted into canon" or "Published as alternate path" in plain language | Raw enum value; restricted, withdrawn, or archived outcomes |
| Ingestion tier | One of: "Created by the author," "Created with AI assistance," or "Created with author-provided AI tools" | Model name, provider identity, prompt, engine version, or ingestion run reference |
| Human-edited-after flag | "Reviewed and edited by the author" when true; omitted when false | Authorship claims the contributor did not approve; editor identity |
| Storyworld acceptance date | Approximate date in plain language | Commit SHA, PR number, branch name, or review reference |

No other provenance field is approved for reader presentation.

### Permanently private fields

The following must never appear on any reader-facing surface, including in
working-laboratory mode:

- contributor or steward identity beyond what the contributor separately approved for
  display;
- pull request, branch, commit, or repository references;
- model name, provider identity, API version, or prompt content;
- fidelity note content — changed material, ambiguities flagged, semantic preservation
  rating, or audience calibration finding;
- any consent record, revocation record, or policy version;
- any moderation report, case reference, restriction reason, or safety evidence;
- any legal hold, retention decision, or deletion approval;
- ingestion run references or engine-specific identifiers;
- internally unresolved provenance conditions or missing-source notes.

### Reader accessibility/density signal (open question 15.13) — explicitly deferred

No field, band, label, or reader-facing density signal is approved. This is an explicit
**deferral**, not a rejection. The question of whether the signal should be author-set,
steward-visible only, reader-facing, or unnecessary remains open (15.13). No band count,
labeling vocabulary, or reader-facing implementation may proceed without a separate
owner decision closing 15.13. The Lexical Ladder from the source thread is noted as one
candidate mechanism but is not adopted by this deferral.

### Outside-reader legibility check — steward-only advisory

The outside-reader legibility check (ADR-0007 item 5, ADR-0005 item 5 context) is
**steward-only advisory**. No reader-facing output, score, or label is approved. The
advisory finding must not block, accept, restrict, archive, or auto-publish a proposal.

### Process narrative and canon compendium — deferred

The assembled "process narrative" view (ADR-0011 item 2) and the auto-compiled canon
compendium (ADR-0011 item 3) are **deferred** pending:

- the working-laboratory provenance feature being designed, implemented, and reviewed;
- the term/motif ledger (ADR-0006 item 2) being separately implemented; and
- a separate owner approval for each assembled reader-facing view.

Neither artifact may include permanently private fields, material from restricted or
withdrawn outcomes, or attribution not approved for display.

## References and crosswalk

- ADR-0005: reader-state and side-car provenance concepts
- ADR-0006: term/motif ledger
- ADR-0007: accessibility, locked terms, progressive disclosure, and outside-reader check
- ADR-0009: transformation fidelity and readability assistance
- ADR-0010: provenance and ledger field proposals
- ADR-0011: process narrative, compendium, and methodology concepts
- `docs/decisions/consent-ladder-design.md`
- `docs/decisions/moderation-tooling-design.md`
- `docs/adr/0013-github-native-boundary-and-donor-primitives.md`
