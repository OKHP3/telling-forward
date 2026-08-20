# ADR-0011: Provenance-and-Process-Artifact Concepts from a First-Mover Market-Claim Note

## Status

**Open.** This ADR proposes four independent, separately-decidable items plus one logged-only positioning idea, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Context

On 2026-08-19 the project owner supplied a Notion research-finding note, "First-Mover Claim — Multi-AI Council + Sci-Fi Meta-Narrative" (captured 2026-06-15, sourced from a June 2026 thread import titled "MPS + BAC Platform Origin, Replit Role, Business Model + Generative Story Network"), asked for it to be considered against Telling Forward (TF), and then asked for a second pass extending every unique element in the note into TF concepts, not just the first one pulled out. This is the reverse direction of `okhp3-notion-capture-router` — pulling a Notion artifact into this repository's context rather than routing repository content out to Notion — and the same scope-discipline lesson already recorded in project memory (`telling_forward_gemini_thread_context.md`, `telling_forward_bac_manuscript_adr.md`, `telling_forward_vault_codices_thread_adr0007.md`) applies here without waiting for a correction.

The Notion note's actual subject is **not** Telling Forward. It's a market-positioning claim for a sibling property: Magnus Progenitor Saga (MPS) paired with its meta-narrative companion, Vault Codices / Biases as Constants (BAC). The claim names a specific "trifecta" as unclaimed territory:

1. A named, methodologically explicit multi-AI council (the note's own stack: "Claude + ChatGPT + Replit + Notion + GitHub")
2. Applied to a multi-book speculative fiction arc **with a full saga bible**
3. Paired with a live, simultaneously published nonfiction meta-narrative **documenting the process as a co-equal artifact**

None of the note's own branding, stack naming, "Biases as Constants" framework, "Phases 1-3" community-trust claim, 18-24 month competitive window, or its next action (draft a public positioning statement for overkillhill.com and LinkedIn) is adopted here. That is MPS/BAC's own IP and go-to-market claim. The note's own proposed stack also names Notion, which would contradict this repository's confirmed GitHub-only interoperability constraint (project memory, Jamie, 2026-08-17) if read as a TF proposal instead of what it actually is: a description of a different project's own toolchain.

What generalizes is the shape of the trifecta itself, not its content. Each of the three numbered elements above maps onto something TF either already has partially designed or has a natural, TF-native equivalent for — treated below as three separate proposals plus a fourth on how they interact, rather than one large feature.

## Concepts extended into concrete proposals

### 1. Provenance-as-artifact is a validated market gap, not just an internal nice-to-have

ADR-0005 item 2 already proposed a side-car provenance layer ("Behind the Prompt": which ingestion tier or PME rung produced or matured a capsule, human-edited-after flag) surfaced in the Reader App only when a steward opts a storyworld into a "working laboratory" presentation. It was logged as "accept the design intent, defer the UI" — a low-urgency, single-storyworld cosmetic option.

The Notion note's own "protection mechanism" for MPS/BAC's claim is explicitly "the version-controlled GitHub history" — the same kind of provenance trail ADR-0005 item 2 already scoped, except MPS/BAC has to hand-build and hand-publish it as a separate nonfiction companion effort. Telling Forward's architecture already produces the raw material for that pattern as a structural byproduct of being GitHub-native (Mission principle #4, "keep provenance visible"; the GitHub-only decision itself), not something each storyworld's author has to manually author as a second book.

**Proposal:** re-prioritize ADR-0005 item 2's design work upward — not its content, which stays as already scoped (reserve the field when the capsule schema is built, defer the actual Reader App UI) — on the strength of this external signal that the underlying capability has standalone positioning value, not only a per-storyworld aesthetic one.

**Status of this item:** re-prioritization proposal only. The `capsules` table dependency is resolved (decision 15.12, 2026-08-19): provenance fields belong in a Postgres record keyed on the GitHub Issue number. The re-prioritization signal itself still stands.

### 2. The meta-narrative element, made concrete: an assembled "process narrative" view, not just a data field

Item 1 covers the raw provenance *data*. The Notion note's trifecta element 3 is about a *published artifact* — a reader-facing nonfiction account of the process, not a buried field. TF already has, or has proposed, the raw ingredients to assemble one without any author manually writing it: ADR-0005 item 2's provenance record, ADR-0004's ingestion tiers, the PME rung concept, and ADR-0007's proposed transformation-fidelity report (what changed, what was preserved, what ambiguity was flagged, per capsule transform). No TF document currently proposes actually compiling those into something a reader can read as a narrative, the way BAC exists as MPS's separate companion book.

**Proposal:** log a candidate Reader App artifact, gated behind the same "working laboratory" opt-in ADR-0005 item 2 already scoped: an auto-assembled, chronologically ordered "how this world was made" view per storyworld, compiled from capsule provenance records and transformation-fidelity reports as they accumulate. Not hand-authored, not a second manuscript a steward has to write and maintain — assembled by the platform from data TF is already proposing to capture. This is what makes the meta-narrative a **structural byproduct** for any TF storyworld instead of a bespoke, labor-intensive companion project.

**Status of this item:** proposed concept, no schema or UI design yet. Depends on item 1 and on ADR-0007 item 1 (transformation fidelity report) both being built first; this item does not authorize either.

### 3. The "full saga bible" element, made concrete: an auto-compiled canon compendium

The Notion note's trifecta element 2 assumes a maintained, comprehensive reference document (a "saga bible") behind the fiction. TF already has the pieces of this distributed across separate proposals that have never been named as one artifact: the capsule/canon-state model itself, ADR-0006 item 2's steward-facing term/motif ledger (origin, canon status, change log per named entity), and the accepted-canon subset of a storyworld's capsules. Nothing currently proposes presenting that as a single, always-current reference view.

**Proposal:** log a candidate steward- and reader-facing "canon compendium" view per storyworld: an auto-generated, always-current compilation of accepted-canon capsules plus the ADR-0006 term/motif ledger, organized by entity (character, place, term) rather than by submission order. Distinct from the Reader App's linear story presentation — this is a reference surface, not a narrative one — and distinct from the process-narrative view in item 2, which documents *how* the world was made rather than *what* is currently canon. Because it is generated from existing canon data rather than separately authored and maintained, it stays accurate by construction instead of drifting the way a manually maintained bible does.

**Status of this item:** proposed concept, no schema or UI design yet. Depends on ADR-0006 item 2's term/motif ledger existing. The `capsules` table dependency is resolved (decision 15.12, 2026-08-19): the ledger is derived from capsule Issue labels and body, not a database table.

### 4. Naming the existing methodology, not inventing one

The Notion note's trifecta element 1 is about the multi-AI methodology being *named and explicit*, not just present. TF already has a real multi-engine methodology, just never assembled into one named, documented artifact: the PME/PIE/CME/CIE engine family (`telling_forward_ui_vision.md`), the three-tier ingestion architecture (ADR-0004: rules-only, Actions plus Phi-4-mini, bring-your-own-AI), and the proposed transformation-fidelity and clarity-pass transforms (ADR-0007). Unlike items 1 through 3, this item requires no new data model or feature — it is a documentation task against capability that already exists or is already proposed elsewhere in `docs/adr/`.

**Proposal:** log a candidate platform-level (not per-storyworld) methodology document — a single page naming and explaining TF's existing multi-engine architecture end to end, written for readers and prospective contributors rather than as internal ADR material. This is the lowest-cost item in this ADR: it is writing, not building, and every fact it would draw on is already decided or already proposed elsewhere. It is also the item most directly analogous to what the Notion note's own claim leans on (a named, explicit methodology), made TF-native rather than borrowed.

**Status of this item:** proposed concept. Does not depend on the `capsules` table or on any other item in this ADR — could be written today against what already exists in ADR-0004 and `telling_forward_ui_vision.md`, if accepted.

### 5. A Telling-Forward-native positioning idea, logged only

Distinct from items 1 through 4's architecture and documentation points, there is a positioning idea worth naming without acting on it: Telling Forward itself, as a platform, could eventually claim something adjacent to MPS/BAC's claim but structurally different from it — not "first documented multi-AI council production of one series," but "first platform where a provenance-visible process, an assembled process narrative, and an always-current canon compendium are structural defaults for any storyworld, not a bespoke companion project." That claim would belong to Telling Forward the product, not to any one storyworld built on it, and does not depend on or borrow MPS/BAC's own claim, stack naming, or "Council of AIs" framing. Items 2 through 4 above give this claim something concrete to point at, rather than leaving it abstract.

Mission principle #10 ("earn the right to monetize") and the README's staged model both counsel against getting ahead of proven traction. A positioning claim isn't a monetization mechanic, but it is the same category of "don't build the pitch before the thing exists to point at."

**Proposal:** log this as a candidate future-positioning idea only. No design, marketing copy, or public claim is authorized by this ADR. Revisit once items 2 through 4 actually ship and at least one real storyworld can serve as the demonstrated example — consistent with how open questions 15.8 and 15.9 were correctly withdrawn earlier for being inferred from a sibling property rather than a demonstrated TF need.

**Status of this item:** logged idea only, not a proposal to design or publish anything now.

## Non-goals of this ADR

- Does not adopt the Notion note's named stack, "Council of AIs" framing, "Biases as Constants" name, "Phases 1-3" community-trust claim, the 18-24 month competitive window, or the next action to draft an MPS/BAC positioning statement. All of that belongs to the sibling property, not this repository.
- Does not reopen the GitHub-only decision. The note's own proposed stack includes Notion; that is evidence for the sibling property's toolchain, not a reason to revisit TF's confirmed GitHub-only constraint.
- Does not reopen ADR-0005, ADR-0006, or ADR-0007 themselves — their content is unchanged. Items 1 through 3 here only address priority and composition (assembling their outputs into new views), not redesign.
- Does not authorize any marketing, positioning statement, or public claim for Telling Forward. Item 5 is a logged idea pending real traction, not a decision.
- Does not touch `docs/decisions/open-questions.md`. None of the five items here are schema-blocking the way ADR-0006 item 2 (15.12) or ADR-0007's reader-accessibility item (15.13) were — items 2 and 3 are compositions of already-proposed schema, not new fields.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Re-prioritize ADR-0005 item 2 | Accept; `capsules` table dependency resolved (decision 15.12, 2026-08-19) — provenance fields go in a record keyed on GitHub Issue number |
| 2. Assembled "process narrative" view | Log as proposed; depends on item 1 and ADR-0007 item 1 shipping first |
| 3. Auto-compiled canon compendium | Log as proposed; depends on ADR-0006 item 2's term/motif ledger (now unblocked from `capsules` table dependency — decision 15.12, 2026-08-19) |
| 4. Named platform methodology document | Lowest-cost item; could be written now if accepted, no schema dependency |
| 5. TF-native positioning idea | Log only; revisit after items 2-4 ship and a real storyworld exists to point at |

## Consequences

- If item 1 is accepted, the provenance fields should be implemented in a Postgres record keyed on the GitHub Issue number (no `capsules` table — decision 15.12, 2026-08-19), treated as a higher-priority build than ADR-0005 originally implied.
- If items 2 or 3 are accepted, they should be scoped as *composition* work (assembling already-proposed data into a new view) once their dependencies ship, not as new data-model proposals in their own right.
- If item 4 is accepted, it can proceed independently of the `capsules` table and of the rest of this ADR, since it only documents capability already decided or already proposed elsewhere.
- Item 5 has no consequence until real traction exists. It does not block, and is not blocked by, items 1 through 4.

## Also flagged, out of scope for this ADR: a multi-session numbering collision resolved later

This ADR's number changed four times while this repository had multiple concurrent Cowork sessions writing to it at once: drafted as 0008, renumbered to 0009 after finding three files already numbered 0007 and two already numbered 0008 on disk, renumbered to 0010 after a second concurrent session also claimed 0009 for a different file, and renumbered again to **0011** after discovering that a batch commit (`a485309`) resolved most of the 0007-0009 collisions but left this file and `docs/adr/0010-content-ops-and-governance.md` with the number 0010. A subsequent correction retained `0010` for the content-ops ADR and this ADR at 0011.

As of this ADR's final number, the resolved history in `docs/adr/` is:

- `0007-reader-accessibility-and-clarity.md` (kept, referenced by open question 15.13)
- `0012-scene-purpose-framing-from-synopsis-discipline.md` (renumbered from the former 0007)
- `0008-reader-consent-and-contribution.md` (kept)
- `0009-transformation-fidelity-and-readability-assist-concepts.md` (renumbered from a former 0007 by another session, now committed)
- `0010-content-ops-and-governance.md` (not written by this session, kept at 0010)
- Three files moved to `docs/adr/_to_delete/` as `.superseded` by another session's reconciliation pass, not deleted (device-side delete restriction), pending Jamie's final cleanup

This session's own file is the one renumbered here, from a committed-and-pushed 0010 to 0011, specifically because it collided with the file above — this session did not touch, rename, or evaluate `0010-content-ops-and-governance.md` itself, consistent with scope staying inside this thread's own material only. The commit that pushed the collision to `origin/main` also bundled a large amount of unrelated work (new skill directories, `docs/decisions/open-questions.md` edits, thread-extract cleanup) from other concurrent sessions — none of that is this ADR's concern or this session's to evaluate.

Separately, this session observed a `.git/index.lock` reappearing multiple times during this task, including after the project owner manually cleared it once, which is consistent with more than one process actively running git operations against this same working directory concurrently. That contention, and the `docs/adr/_to_delete/*.superseded` files still awaiting real deletion, remain open.

## Next action

The project owner should give a per-item call — accept, reject, or defer — for items 1 through 5. Separately: confirm this ADR's renumbering to 0011 is acceptable (it was pushed to `origin/main` at 0010 before the collision with `0010-content-ops-and-governance.md` was discovered), decide whether the `_to_delete/*.superseded` files should be committed as deletions or gitignored, and consider whether concurrent Cowork sessions against this repository should continue running at the same time given the repeated lock contention.

The process narrative, canon compendium, methodology, and release-boundary
crosswalk is consolidated in
`docs/decisions/provenance-fidelity-contract.md`.
