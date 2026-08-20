# ADR-0010: Content-Ops Schema and Governance Signals from the MPS "AI Council" Thread

## Status

**Open.** This ADR proposes five independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

> **Numbering note (updated 2026-08-19, post-lock-clear):** this ADR was first drafted as `0009-capsule-provenance-and-term-ledger-field-schemas.md`, then renumbered to 0010 when another concurrently-active Cowork session independently claimed 0009 for a different ADR at the same time. That earlier draft's content is fully carried forward here (items 1 and 2 below) and the draft itself has since been moved to `docs/adr/_to_delete/`. The competing file that once raced for this same number is now `0011-provenance-and-process-artifacts.md`, and the separate `0009-transformation-fidelity-and-readability-assist-concepts.md` now sits cleanly at 0009. The final 0007 collision was resolved by retaining the reader-accessibility ADR at 0007 and renumbering the separate scene-purpose ADR to `0012-scene-purpose-framing-from-synopsis-discipline.md`.

## Context

On 2026-08-19 the project owner pasted a ChatGPT thread (source: the "Magnus Progenitor Saga" custom GPT project) covering an "AI Council" tool-role-assignment strategy and a Notion/GitHub content-migration architecture for that property's own canon. That material was scavenged per the scope rule already established three times in this repository's memory: extract architecture/process signal only, exclude the source property's own narrative, branding, and business content. The scavenged extract lives at `docs/thread-extracts/mps-bac-content-ops-schema-signals.md`.

This ADR was first drafted narrowly (as 0009) covering only two schema proposals. On request, the source material was mined again for additional unique concepts beyond the two initially pulled — three more survive scope discipline and are added below as items 3 through 5.

## Reaffirmed, not reopened

The source thread's own recommended architecture is Notion-centric. This is the fourth piece of MPS/BAC-sourced material to independently propose that shape (see ADR-0005, ADR-0006, and the thread-extract's own provenance notes). TF's 2026-08-17 confirmed decision — GitHub-only, capsules as GitHub Issues, no Notion dependency — stands and is not touched by any item below.

## Concepts extended into concrete proposals

### 1. Provenance field schema (concretizes ADR-0005 item 2)

ADR-0005 item 2 proposes a side-car provenance record on capsules/scenes without a field list. The source thread's "Revision Runs / Maturity" and "AI Council Outputs" database schemas supply one.

**Proposal — fields to reserve on a linked provenance record per capsule (decision 15.12, 2026-08-19: no `capsules` database table; capsules are GitHub Issues with `capsule:*` labels; these fields belong in a Postgres provenance record keyed on the Issue number):**

| Field | Type / values | Purpose |
|---|---|---|
| `produced_by_tier` | enum: `tier_0_rules`, `tier_1_actions_phi4`, `tier_2_byo_ai`, `human` | Which ingestion tier (ADR-0004) or manual entry produced this capsule |
| `matured_by_engine` | enum: `PME`, `PIE`, `CME`, `CIE`, `none` | Which engine, if any, matured or inverted this capsule |
| `maturity_rung_before` / `maturity_rung_after` | `R0`–`R10` | PME rung progression, if matured |
| `human_edited_after` | boolean | Whether a human modified the output after generation (Mission principle #9) |
| `accepted` | boolean / null | Whether the steward accepted this version into canon |
| `source_reference` | text (GitHub commit SHA, PR number, or Issue reference) | Traceable link back to the concrete change |
| `source_manuscript_ref` | text, optional | For capsules produced by manuscript ingestion (ADR-0004), which uploaded source file this capsule was derived from — see item 4 below, which this field depends on |

The last row is new in this revision: the source thread's separate "Sources / Imports" chain-of-custody schema (Source Type, Origin Project, Date Imported, Canonical Use: Raw Evidence/Active Source/Superseded/Deprecated) tracks provenance at the *uploaded-file* level rather than the per-capsule level items above cover. Rather than proposing a sixth database, this ADR folds it in as one additional field: a reference from a capsule back to whichever raw manuscript upload produced it, which item 4 below makes possible by requiring that upload to persist immutably.

### 2. Term/motif ledger field schema (concretizes ADR-0006 item 2)

ADR-0006 item 2 proposes a derived, read-only per-entity ledger without a field list. The source thread's "Canon Terms / Glossary" schema supplies one, trimmed to what ADR-0006 already scoped (no saturation/cadence-scoring machinery — that solves a single-author prose-rhythm problem TF doesn't have).

**Proposal — fields for the derived, per-entity term/motif ledger:**

| Field | Type / values | Purpose |
|---|---|---|
| `term_or_entity` | text | The named character, place, or invented term |
| `canon_status` | enum: `proposed`, `active`, `locked`, `deprecated` | Matches ADR-0006's "stable enough to be treated as locked" language |
| `first_appearance` | reference (capsule/scene ID) | Origin point, derived from capsule metadata |
| `drift_risk` | enum: `low`, `medium`, `high` | Steward-facing signal for terms extended inconsistently across independent contributors |
| `related_entities` / `related_motifs` | references | Cross-links, derived from capsule tagging |

Stays read-only and derived, per ADR-0006's existing scope — no new authoring surface.

### 3. Name "Canon as Code" as an explicit platform principle (new)

The source thread repeatedly frames its BAC companion volume as making canon "executable" and "traceable" rather than remembered — its own words are "narrative becomes executable, emotion becomes input, memory becomes compression protocol," and its migration plan's entire point is treating canon as structured, typed records rather than prose someone has to recall correctly. TF already builds on this principle in practice — capsules as GitHub Issues with real fields (title, body, labels, state) instead of free text, chosen specifically because the MPS/BAC lineage's flat-file ledger system kept failing on unstructured text edits (per `telling_forward_ui_vision.md`'s "why capsules are GitHub Issues, not prose files" note) — but no TF document names the principle itself.

**Proposal:** add one short, explicit statement to `docs/MISSION.md` or `docs/adr/0001-product-naming-and-vocabulary.md` naming the principle directly — something like: *"Canon is a structured record, not a description of one. Where a canon fact can be a typed field (a GitHub Issue's state, a label, a linked reference) instead of a sentence someone has to parse and remember correctly, it should be."* This gives future schema decisions (including items 1 and 2 above) a named principle to cite instead of re-deriving the same justification each time. Documentation-only; no schema or code change.

**Status of this item:** proposed wording, not yet drafted or placed.

### 4. Immutable raw-source rule for manuscript ingestion (new, extends ADR-0004)

The source thread's migration plan opens with "Phase 0 — freeze the source": raw imports go into an archive folder that "nothing... gets edited," treated explicitly as evidence rather than working material. ADR-0004's three-tier ingestion pipeline (rules-only, Actions+Phi-4-mini, bring-your-own-AI) transforms an uploaded manuscript (DOCX/EPUB/PDF) into markdown, then into segmented scenes, then into extracted capsules — but no TF document currently states whether the original uploaded file is preserved unmodified once ingestion begins, or whether it could be overwritten by a re-upload, a retry, or a later tier's re-processing.

**Proposal:** state explicitly, in ADR-0004 or `docs/local-llm-setup.md`, that an uploaded manuscript file is immutable once ingestion begins — every tier operates on a derived copy, never the original, and the original remains addressable (by the `source_manuscript_ref` field proposed in item 1) for as long as any capsule it produced exists. This is a direct extension of Mission principle #4 ("keep provenance visible") and principle #2 ("assist without taking authorship") into a concrete ingestion-pipeline rule, in the same style ADR-0007 item 1 already named a failure mode for principle #6.

**Status of this item:** proposed rule, not yet written into ADR-0004.

### 5. Repo-splitting heuristic for platform code (new, logged as guidance only)

TF's storyworld *content* topology is already confirmed as one repo per storyworld (`telling_forward_ui_vision.md`). That is a separate question from how TF's *platform code itself* — Author App, Reader App, ingestion scripts, the MCP server — is split across repos, which no TF document currently addresses either way. The source thread's own repo-consolidation reasoning ("keep one canonical repo until a component's lifecycle genuinely diverges from the others, not by content category") is a plain, reusable heuristic independent of its Notion-centric context.

**Proposal:** log this heuristic — split a platform repo only when a component's release cadence, ownership, or deployment target genuinely diverges from the rest, not for organizational tidiness alone — as guidance for whenever repo topology for the Author App / Reader App / MCP server / ingestion scripts becomes a live question. This authorizes no restructuring now; it exists so that decision, when it comes up, has a stated test rather than being made ad hoc.

**Status of this item:** logged as guidance; no current repo-topology question depends on it.

## Non-goals of this ADR

- Does not authorize building a `capsules` database table — decision 15.12 (2026-08-19) confirms no such table will be created. Items 1 and 2's fields belong in a provenance record keyed on the GitHub Issue number, not a separate capsules table.
- Does not adopt the source thread's Notion database structure, saturation/cadence scoring, or execution-hierarchy machinery.
- Does not resolve the pre-existing 0007/0008/0009 ADR numbering collisions from other sessions — flagged, left to the owner.
- Does not propose a frontmatter YAML standard for scene/capsule markdown — still logged only as an open question in the thread-extract, not decided here.
- Item 5 does not restructure any repo. It is guidance for a future decision, not a present one.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Provenance field schema | Accept design intent; adopt as the starting field list for a provenance record keyed on GitHub Issue number (no `capsules` table — decision 15.12, 2026-08-19) |
| 2. Term/motif ledger field schema | Accept design intent; adopt as the starting field list for ADR-0006 item 2's ledger, derived from Issue labels and body |
| 3. Name "Canon as Code" as an explicit principle | Accept; low-cost documentation addition, draft on request |
| 4. Immutable raw-source rule for ingestion | Accept; low-cost documentation addition to ADR-0004, draft on request |
| 5. Repo-splitting heuristic | Log as guidance; no action required until a real repo-topology question arises |

## Consequences

- Items 1 and 2's field lists should be implemented in a Postgres provenance record keyed on the GitHub Issue number (not a `capsules` table — decision 15.12, 2026-08-19), including `source_manuscript_ref`, which depends on item 4's immutability rule being adopted first.
- Items 3 and 4 are independent documentation changes and can ship without waiting on any schema work.
- Item 5 has no immediate consequence; it becomes relevant only if/when repo-splitting is proposed for platform code.

## Next action

The project owner should give a per-item call — accept, adapt, or reject — for items 1 through 5, and confirm that `0009-capsule-provenance-and-term-ledger-field-schemas.md` can be removed now that this ADR carries its content forward.
