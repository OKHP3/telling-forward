# ADR-0006: Canon Governance Concepts from the Biases as Constants Manuscript

## Status

**Open.** This ADR proposes two independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Context

The project owner supplied the actual Biases as Constants manuscript (`vault-codices-biases-as-constants-v10.1.0.docx`, the meta-narrative companion to the Magnus Progenitor Saga) on 2026-08-18. This ADR does not archive or reproduce that manuscript — consistent with how ADR-0005 treats its own Gemini-thread source — only the concepts worth acting on for Telling Forward (TF).

Most of the manuscript is the in-universe "Codex" mechanics behind a single-author recursive-prose system: a rung-based maturity ladder, symbolic-load/cadence scoring, and a four-tier execution-and-fallback hierarchy. That machinery is already accounted for — the PME/PIE/CME/CIE lineage it belongs to is the confirmed source of TF's own Concept Board mechanic (capsules, Promote-to-scene, Disrupt, Invert), per `telling_forward_ui_vision.md`. This ADR does not revisit that. Two narrower governance patterns from the manuscript don't yet have a TF equivalent and are proposed below.

## Reaffirmed, not reopened

The manuscript's "Law of Locality" (a contributor's local scope isn't authoritative outside itself without an explicit, declared override) is the same principle Mission working principle #6 already states: *"Separate canon from possibility. An alternate path can be valuable without being the originating author's canon; the interface and metadata should make that distinction clear."* This ADR treats the manuscript as corroborating evidence for a principle TF already committed to, not a new decision. **No action item in this ADR touches that principle's substance** — the only actionable gap is that no TF document currently names the specific failure mode (a branch's local worldbuilding silently overriding shared canon or another branch) that principle #6 exists to prevent.

## Concepts extended into concrete proposals

### 1. Explicit branch-locality failure mode

**Proposal:** add one or two sentences to `docs/MISSION.md` or `CONTRIBUTING.md` naming the specific thing principle #6 prevents — a story-path's local changes are not canon-wide until the steward explicitly accepts them — so contributors and future design work have a named failure mode ("silent cross-branch canon contamination") to check against, not just an abstract principle. Documentation-only; no schema or code change.

**Status of this item:** proposed wording, not yet drafted or placed.

### 2. Steward-facing term/motif ledger

The manuscript's Traceability Matrix and Terminology Incursion Ledger track, per named entity (character, place, invented term): where it originated, how it changed, and whether it's stable enough to be treated as locked. TF has no equivalent, and its open-canon, multi-contributor model has a real version of the problem the manuscript's ledger was built for: many independent contributors can each extend the same named entity without central editorial oversight, and a steward currently has no structured way to see term drift across accepted branches.

**Proposal:** a lightweight, derived (not separately authored) per-entity record — origin, current canon status, change log — generated from capsule/scene metadata, visible to the storyworld's steward. This is read-only tooling, not a new authoring surface, and it's a much smaller ask than the manuscript's own saturation/cadence-scoring machinery, which solves a single-author prose-rhythm problem TF doesn't have.

**Status of this item:** proposed concept. The blocking dependency on a `capsules` database table is now resolved: decision 15.12 (2026-08-19, Jamie Hill, PRD Build Directive v1) confirms that no `capsules` table will be created — GitHub Issues tagged `capsule:*` are the canonical capsule store. If this ledger is accepted, the entity-reference field it needs should be designed into the capsule Issue label or body convention, not a database table. The owner should give a per-item call on whether to proceed under this constraint.

## Non-goals of this ADR

- Does not reopen ADR-0003, ADR-0004's four-vs-six submission-state discrepancy, or ADR-0005's five open items.
- Does not authorize building anything. Item 1 is a documentation change pending owner sign-off on wording; item 2 remains a proposal pending owner review. The `capsules` table dependency is resolved (decision 15.12, 2026-08-19): the ledger, if accepted, would be derived from capsule Issue labels and body, not a database table.
- Does not adopt the manuscript's execution-hierarchy, fallback-escalation, or symbolic-load-scoring machinery — real patterns for a single-author automated prose system, not a fit for TF's current three-tier ingestion pipeline or two-action Concept Board.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Explicit branch-locality failure mode | Accept; low-cost documentation addition, draft on request |
| 2. Steward-facing term/motif ledger | Log as proposed; needs owner review. `capsules` table dependency resolved (decision 15.12, 2026-08-19) — ledger derived from Issue labels and body, not a database table |

## Consequences

- If item 2 is accepted, the entity-reference field it needs must be expressed in the capsule Issue label or body convention (there is no `capsules` table — decision 15.12, 2026-08-19).
- Item 1 can ship independent of everything else in this ADR or ADR-0004/0005.

## Next action

The project owner should give a per-item call — accept, reject, or defer — for items 1 and 2. Update this ADR's Status once that call is made.
