# ADR-0016: Structural Transposition and a Public-Domain Classics Seed Library

## Status

**Open.** Proposal from a 2026-08-22 design conversation, not yet reviewed
against the current schema, Storyworld Kit, or capsule-label conventions.
Three items proposed, two open questions logged. This ADR authorizes
scoping and design discussion only; it does not authorize building anything.

## Context

The project owner drew an analogy to casual-game reskinning: one game engine
and core loop, developed once, reskinned and sold multiple times to
different audiences. Applied to prose, the same character ensemble and plot
structure could be transposed into different settings, Ancient Rome, the
Wild West, a future space setting, as separate, independently sellable
storyworlds. The pattern has real precedent (West Side Story from Romeo and
Juliet, The Lion King from Hamlet, Firefly pitched as "Stagecoach in
space"); it is not speculative craft, it is an established adaptation
technique.

The open problem with applying it inside Telling Forward (TF) is consent and
rights. A structural transform pointed at a living author's active
storyworld raises the same question open question 15.10 already logs for
Disrupt and Invert derivatives, at much higher stakes: a Disrupt or Invert
derivative stays inside one storyworld, a structural transposition spins up
an entire second sellable product off someone else's structural work.

The project owner's follow-up resolved that risk for a first implementation:
seed the platform with public-domain classics, work with no living
rights-holder, so the consent question does not have to be solved before the
transposition mechanic can be built and proven.

### Copyright framework, for planning purposes, not legal advice

Confirmed as of 2026-08-22, US law: works published before 1928 are fully
public domain. Works published 1928 through 1977 clear on a rolling 95-year
wall from publication; as of January 1, 2026, works published in 1930
cleared (the first Nancy Drew novel, early Betty Boop material, Dashiell
Hammett's The Maltese Falcon). Works created 1978 or later by an individually
named author run life of the author plus 70 years. The EU and UK use life+70
broadly; Canada moved to life+70 in December 2022; exact public-domain entry
dates still vary by country. A public-domain *work* does not make every
*edition* of it public domain, a specific modern translation, annotated
edition, or illustration set can carry its own separate copyright. This
framework should be confirmed by counsel before any classics library ships
as a real product feature; it is stated here only to scope the design work
that follows.

## Proposal

### 1. Transpose: a new Concept Board action

A structural domain-transfer transform, distinct from the existing Invert
action. Invert generates a capsule's symbolic opposite (protagonist becomes
antagonist); Transpose preserves a capsule's relational function and moves
its setting (a senator's rivalry becomes a gunslinger's rivalry becomes a
fleet captain's rivalry, same shape, different costume). Whether this ships
as a genuinely new fifth engine alongside PME/PIE/CME/CIE, or as an extended
mode of CIE, is an open design fork this ADR does not resolve; it should be
decided deliberately, not by default, given the project owner's own stated
instinct against unnecessary machinery growth.

Capsule-type labeling should follow the existing `capsule:*` convention
(`capsule:character`, `capsule:arc`, `capsule:event`, per 15.12's decision
that GitHub Issues and labels remain the canonical capsule store, no
`capsules` table). A transposed capsule should carry a label or field back
to its source capsule and source repository; GitHub's native fork-lineage
metadata is the natural mechanism for this, consistent with the repository's
GitHub-canonical hybrid architecture (ADR-0013).

**Status: proposed concept, no schema or UI design yet.**

### 2. Graft: a separate, larger mechanic for hybridization

The project owner's own word, "hybridization," describes something Transpose
does not cover: merging capsules from two or more distinct storyworld
repositories into a new one (for example, combining one classic's atmosphere
with another's investigative structure). This is a different operation from
single-source Transpose and needs its own design pass; it is named here to
keep it from being silently folded into Transpose's scope, not to authorize
building it.

**Status: named, not scoped. No design work is authorized by this ADR.**

### 3. A public-domain classics seed library

TF-curated storyworlds, sourced from public-domain texts, with TF itself
(not an individual author) as the originating steward. This does not require
new creation machinery: ADR-0014 already decided that storyworld creation
stays a manual, GitHub-side act built on the Storyworld Kit
(`content/pilot-storyworld/`), with an application-side `registerStoryworld`
step reading `storyworld.json`. A classics storyworld is created and
registered through that same path; TF's own team performs the steward role
the Kit already requires, including its existing rights-confirmation step
(ADR-0014, citing the Kit README's "what does not belong here" boundary).
Ingestion reuses ADR-0004's existing Tier 0/1/2 manuscript pipeline, pointed
at a public-domain text instead of a user's own manuscript.

Two sourcing tiers, start with the narrower one:

| Tier | Scope | Recommendation |
|---|---|---|
| A. Hand-picked, unambiguous list | Austen, pre-1928 Doyle, Shakespeare, Greek/Roman epic, Grimm, Dracula, Frankenstein, Moby-Dick; a dozen titles, decades clear of any rolling-wall question | Start here |
| B. Broad automated pull from a public-domain text catalog (e.g. Project Gutenberg) | Thousands of titles | Phase two only, after a real review gate covering jurisdiction variance and edition-specific copyright |

Sourcing must come from a vetted plain-text public-domain edition (Project
Gutenberg is the working standard named in this ADR), not an arbitrary
scraped or annotated edition, per the edition-specific-copyright caveat
above.

**Status: proposed concept. No title list, ingestion run, or registration
is authorized by this ADR.**

## Sequencing recommendation

Pilot Transpose against the classics library, not against a living author's
storyworld, as the first real test of the mechanic. This is a sequencing
choice, not a permanent restriction: it defers the harder consent/rights
design (item below) until after the mechanic itself is proven on material
that carries no rights risk at all.

## Non-goals

- Does not authorize any in-app repository auto-creation. ADR-0014's
  decision (framing b2, storyworld creation stays manual and GitHub-side)
  applies to classics storyworlds exactly as it applies to any other. A
  future ADR would be required to change that boundary for classics or
  anything else.
- Does not authorize building Transpose, Graft, or the classics library.
  All three are logged proposals pending owner review.
- Does not design or authorize any monetization or licensing-engine business
  model around this capability. ADR-0005 item 4 already logged "a
  licensable engine product for other creators" as monetization vocabulary,
  explicitly deferred under Mission principle #10 until real traction
  exists. A classics-sourced Transpose pilot is a lower-risk future on-ramp
  to that idea, not a reason to design it now.
- Does not resolve open question 15.10 (Disrupt/Invert consent). The new
  open question below is related but distinct, and categorically higher
  stakes, and should not be assumed answered by whatever 15.10 eventually
  decides.
- Is not a legal opinion. The copyright framework above is stated for
  planning purposes; counsel review is required before this ships as a
  product feature, not before design conversation continues.

## Open questions logged

**Cross-storyworld structural reuse consent, for a living author's
storyworld.** If Transpose is ever pointed at an actively-authored
storyworld rather than a public-domain one, what consent, attribution, or
license model governs it? This is 15.10's question at a different scale, an
entire second sellable product instead of one derivative capsule, and
deserves its own decision rather than inheriting 15.10's eventual answer by
default. See `docs/decisions/open-questions.md` 15.20.

**Public-domain sourcing verification process.** Before any classics
storyworld is registered, what concrete verification step confirms a given
text's public-domain status (publication year, author death year,
jurisdiction, specific-edition copyright) and records that verification
against the storyworld's provenance record? This is a process/diligence
question, not a consent question, logging it separately from 15.20. See
`docs/decisions/open-questions.md` 15.21.

## Related decisions

- [ADR-0003: GitHub-native fast path versus custom backend](0003-github-native-fast-path-vs-custom-backend.md)
- [ADR-0004: Manuscript ingestion and bring-your-own AI](0004-manuscript-ingestion-and-bring-your-own-ai.md)
- [ADR-0005: Reader state, provenance, and contributor signals](0005-reader-state-provenance-signals.md), item 4
- [ADR-0013: GitHub-native boundary and donor primitives](0013-github-native-boundary-and-donor-primitives.md)
- [ADR-0014: Storyworld creation boundary](0014-storyworld-creation-boundary.md)
- [Open questions log](../decisions/open-questions.md), 15.10, 15.20, 15.21
