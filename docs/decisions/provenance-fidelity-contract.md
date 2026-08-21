# Provenance, Fidelity, and Reader-Clarity Contract

## Status

**Reader visibility boundary decided for the private pilot (2026-08-21); implementation and enforcement not approved. No reader feature added.**

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
- source-specific CIE/PIE consent, open question 15.10;
- public contribution or public reporting;
- automated acceptance, moderation, rights, or publication decisions.

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