# ADR-0005: Reader-State, Provenance, and Contributor-Signal Concepts for Telling Forward

## Status

**Open.** This ADR proposes five independent, separately-decidable items, not
one accept/reject decision. See "Recommendation" for the per-item call and
"Next action" for what closes it.

## Context

On 2026-08-18 the project owner pasted a Gemini ideation thread into a
Cowork session and asked for it to be scavenged for anything that benefits
this repository. That source thread was about a different property (a
prior sci-fi saga and its meta-narrative companion) and is **not** archived
here — most of it does not concern Telling Forward and doesn't belong in
this repository. This ADR is the scavenged result: only the concepts judged
useful to Telling Forward's own architecture, restated as
Telling-Forward-specific proposals and checked against `docs/MISSION.md`'s
working principles, not adopted as-is.

One piece of that source thread is worth a single sentence of grounding: it
independently corroborated something project memory already records — that
Telling Forward's Concept Board mechanic (capsules, Promote-to-scene,
Disrupt, Invert) descends from a hand-built capsule-ledger / canon-lock /
maturity-ladder system built for that earlier property, later generalized
into this platform's PME/PIE/CME/CIE engine family (see
`telling_forward_ui_vision.md`). Nothing else about that property's plot,
characters, or branding is repeated here.

## Reaffirmed, not reopened

The source thread's own proposed architecture for the other property
centered a Notion database layer synced to GitHub. That is the opposite of
this repository's confirmed 2026-08-17 decision: GitHub-only, no Notion
dependency, capsules as GitHub Issues. Nothing in that source material is a
reason to revisit that call, and no item below touches it.

## Concepts extended into concrete proposals

Each item below started as a generic idea in the source thread and is
restated here as a Telling-Forward-specific proposal, not a description of
anyone else's property.

### 1. Reader path state ("generative statecraft")

The source thread ranked branching fiction on a ladder: a CYOA book is a
static, fully pre-written map; a step up is a pass/fail cinematic trigger;
above that is an engine that carries reader state — variables that persist
and shape what's offered next. Telling Forward already has the middle of
that ladder (branch / alternate-path structure) but nothing at the
"carried state" layer.

**Proposal:** an optional, per-reader "path memory" — lightweight flags a
storyworld's steward defines (for example, "has read the Vault chapters")
that influence which alternate paths a reader is *offered or ordered
toward* next. This must not become hidden logic that silently rewrites
content or fragments canon — Mission principle #8 ("keep the reader's path
legible") and principle #6 ("separate canon from possibility") both bound
this tightly. Any implementation must show the reader *why* a path was
surfaced, not just surface it. Scope: a Reader App feature, opt-in per
storyworld, never required of the Author App or of a steward who wants a
simple linear canon.

**Status of this item:** proposed concept, no schema or design work exists
yet.

### 2. Side-car provenance layer ("Behind the Prompt")

The source thread raised a per-scene toggle exposing the AI/human
provenance trail behind it. This is not a new idea for this repository so
much as an unfinished one: it's the natural surface for the ingestion tiers
already built in ADR-0004 (Tier 0 rules-only, Tier 1 Actions + Phi-4-mini,
Tier 2 bring-your-own-AI) and for the PME rung concept already confirmed as
part of this platform's inherited engine family. Mission principle #4
("keep provenance visible") and principle #9 ("agents ... do not silently
claim authorship") already imply something like this is owed; it has just
never been named as a concrete data/UI concept here.

**Proposal:** reserve a lightweight, optional provenance record on every
capsule/scene once a capsule schema exists — which tier or engine produced
or matured it (Tier 0/1/2, PME rung if matured, human-edited-after flag) —
surfaced in the Reader App only if a steward opts a storyworld into a
"working laboratory" presentation (the source thread raised this
polished-product vs. working-laboratory distinction directly, and it maps
cleanly onto the theme-per-storyworld model already in
`telling_forward_ui_vision.md`). Recommend accepting the **design intent**
now — reserve the field — while deferring the actual Reader App UI build.

### 3. Informational trending signal on alternate paths

Stripped of the source thread's monetization framing ("readers as unwitting
co-authors"), the useful part is smaller: Telling Forward already has a
terminal "Published as alternate path" state, but no way for a steward to
notice which alternate paths are actually being read or followed, to
*inform* — never automate — canon consideration.

**Proposal:** a simple read/follow counter per published alternate path,
visible to the storyworld's steward only. No public leaderboard, no
gamification, no automatic promotion. This keeps agent/metric involvement
to "instrument," per Mission principle #9, rather than letting a count make
or imply a canon decision.

**Explicitly not proposed:** a pay-to-canonize mechanic (readers pay to
promote a branch to canon). That is a monetization mechanic and is
addressed separately in item 4.

### 4. Monetization vocabulary — logged, explicitly deferred

The source thread named several monetization mechanics generically
applicable to an AI-assisted collaborative-fiction platform: a
subscription/season-pass access tier, a pay-to-canonize credit system, a
contributor-reward ledger, and a licensable "engine" product for other
creators. Mission principle #10 ("earn the right to monetize") and the
README's staged model (step 5: monetization only "after a real storyworld
earns attention") are explicit that none of this should be designed or
built now.

**Proposal:** log the *shape* of these mechanics only, as candidates for
the "support credits" concept README already lists among terms "under
consideration, not features or promises currently implemented" — so a
future monetization ADR, written after real traction, doesn't have to
reinvent this from scratch. No schema, UI, or payment work is authorized by
this ADR.

### 5. Optional outside-reader legibility check

The source thread proposed using a second, less-briefed AI as a cheap
"outside observer" — a naive first-time reader detecting bias or missing
context a fully-briefed model would gloss over. Reframed for Telling
Forward: an optional, agent-run legibility check a steward can request
before accepting a submission into canon, reporting readability or
missing-context concerns. It never blocks or auto-decides — consistent with
principle #9. It would reuse the existing Tier 1/2 ingestion infrastructure
from ADR-0004 with a different prompt, not a new tier.

**Status of this item:** proposed concept, no design work exists yet.

## Non-goals of this ADR

- Does not reopen ADR-0003. The historical four-state submission sketch was
  superseded; the six-state model is locked
  (decision 15.11, 2026-08-19, Jamie Hill, PRD Build Directive v1).
- Does not authorize building anything. Item 2 recommends reserving a
  provenance field; items 1, 3, and 5 remain proposals pending owner
  review; item 4 authorizes vocabulary logging only.
- Does not describe, evaluate, or make any decision about the source
  thread's own property — plot, characters, branding, or domains. That
  material was scavenged for architecture ideas only and is otherwise out
  of scope for this repository.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Reader path state | Log as proposed; needs explicit owner review against Mission principles #6 and #8 before any design work |
| 2. Side-car provenance layer | Accept design intent now (reserve the field in a provenance record keyed on the GitHub Issue number — no `capsules` table, decision 15.12, 2026-08-19); defer the Reader App UI |
| 3. Trending signal on alternate paths | Log as proposed; low-risk if kept steward-only and non-gamified |
| 4. Monetization vocabulary | Log shape only; explicitly deferred per Mission principle #10 and the staged model |
| 5. Outside-reader legibility check | Log as proposed; natural extension of ADR-0004's existing tiers if accepted |

## Consequences

- If item 2 is accepted, the provenance field belongs in a Postgres record
  keyed on the GitHub Issue number (decision 15.12, 2026-08-19: no
  `capsules` database table; capsules are GitHub Issues with `capsule:*`
  labels). Reserve this field from the first version of that record rather
  than retrofitting it later.
- Any future design work on items 1 or 3 should explicitly test against
  Mission principles #6 and #8 before implementation, not after.
- Item 4's logged shape is a reference only; it does not reduce the amount
  of design work a real future monetization ADR will need once the staged
  model reaches that point.

## Next action

The project owner should give a per-item call — accept, reject, or defer —
for items 1 through 5. Update this ADR's Status once that call is made,
rather than leaving the decision in conversation only.

The consolidated design contract for item 2 and its related reader/release
boundaries is `docs/decisions/provenance-fidelity-contract.md`.
