# ADR-0009: Transformation Fidelity, Readability Calibration, and Deferred Concepts from a Vault Codices Thread

## Status

**Open.** This ADR proposes two independent, separately-decidable items and logs several considered-but-deferred concepts for the record, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Numbering note

`docs/adr/` is under an active, live multi-session numbering race, discovered in two stages while preparing this ADR. This ADR was first drafted and delivered as `0007-transformation-fidelity-and-readability-assist-concepts.md`. Before it was committed, a check of `docs/adr/` found the number already collided three ways at 0007, once at 0008, and twice at 0009, so this ADR was renumbered to 0010 and the file was moved to `docs/adr/_to_delete/`. By the time that renumbered file was about to be written to disk, two more files had already landed at 0010 from a separate concurrent session (apparent renames of the same two 0009 files just observed), so this ADR is renumbered a second time to **0009**, which is vacant again now that those files moved to 0010. Given the pace of concurrent renumbering, this slot may not stay vacant either; the project owner should treat the number in this filename as provisional until the wider pileup is resolved and this ADR is committed to git, at which point its content, not its number, is what should survive any later renumbering pass.

One file in the pileup, `0007-reader-accessibility-register-and-clarity-pass-from-bac-thread.md`, proposes an "author-facing clarity/register pass" and a "reader accessibility/complexity register" that substantially overlap items 1 and 2 below, apparently drafted from the same or a near-identical pasted ChatGPT thread by a separate concurrent session. This ADR does not re-litigate that overlap; it flags it in "Corroborating and overlapping work" below so the project owner can merge rather than reconcile two independent proposals for the same capability.

## Context

On 2026-08-19 the project owner pasted a ChatGPT thread ("Vault Codices: Biases as Constants - Translation for Target Audience," two turns dated Jan 13 and Jun 6) into a Cowork session and asked for it to be considered against Telling Forward (TF). That source thread is about a different property, Vault Codices / Biases as Constants, the meta-narrative companion volume to the Magnus Progenitor Saga, and is **not** archived here, consistent with how ADR-0005 and ADR-0006 treat their own imported-thread sources. This ADR is the scavenged result: only concepts judged useful to Telling Forward's own architecture, restated as Telling-Forward-specific proposals and checked against `docs/MISSION.md`'s working principles.

The source thread's core subject is orthogonal to Telling Forward's model. It is about a single author using AI to translate dense authorial voice into audience-appropriate prose for a specific book, built around a companion-volume audience-tiering ladder (T0 through T4), a named "Interpretive Translation Layer" (ITL), a "Lexical Translation Engine" (LTE), and a validation entity called SH'ELAH. None of that naming, tiering scheme, or property-specific architecture is adopted here.

This version extends the original two-item ADR with additional unique elements mined from the same source material on a second, closer pass, some carried into the proposals below and some explicitly considered and set aside (see "Considered and not carried forward").

## Concepts extended into concrete proposals

### 1. Transformation fidelity report

The source thread's practical guardrail against "simplification becoming scope creep" is a two-pass workflow: extract the claims and meaning first, then rewrite, then report what changed versus what was intentionally preserved (a "fidelity report": what changed, what was preserved, what ambiguity was flagged rather than silently resolved).

Telling Forward already has multiple points where an agent transforms contributor text without a full rewrite from scratch: ADR-0004's Tier 1 (Actions plus Phi-4-mini) and Tier 2 (bring-your-own-AI) ingestion, and the Concept Board's Disrupt and Invert actions. Mission principle #2 ("Assist without taking authorship") and principle #4 ("Keep provenance visible") already imply a contributor should be able to see what an agent changed before approving it, but no TF document currently specifies how that visibility gets delivered.

**Proposal:** any agent transformation of contributor text (ingestion Tier 1/2 rewrite, Disrupt, Invert) should emit a structured fidelity note alongside its output, naming what changed, what was intentionally preserved, and any ambiguity the agent flagged. This is an output-contract pattern, not a new pipeline stage. It does not require the source thread's separate "meaning extractor" agent role, only a change to what the existing transformation step returns.

**Extension a, evaluation axes.** The source thread's Jun 6 pass frames any such transformation against three axes: semantic preservation (no loss of meaning), structural simplification (reduced complexity), and audience calibration (fit to the intended reader). Stripped of that thread's own tiering vocabulary, these three axes are a reusable checklist for what a fidelity report should actually test, not just narrate. Adopting the axis names as the fidelity report's internal structure costs nothing extra and gives a contributor (and a future reviewer of this feature) a consistent frame across every transformation type, rather than each agent transform inventing its own ad hoc report shape.

**Extension b, internal role separation as an implementation pattern.** The source thread's advanced-tier architecture splits a single-shot rewrite into separate roles: a meaning extractor, a tier/register translator, and a scope guard that checks the rewrite against the original for overgeneralization or claim drift. This is not authorized as new agent infrastructure by this ADR, and Tier 0/1 stay single-pass. It is logged as the internal shape a Tier 2 (bring-your-own-AI) implementation of item 1 should consider if and when it moves past a single prompt: extract, transform, then validate as three distinguishable steps rather than one compound instruction, so the fidelity report in the proposal above has something concrete checking its own claims rather than the same call that produced the rewrite also asserting its own fidelity.

**Status of this item:** proposed pattern, no schema or UI design yet.

### 2. Optional contributor-facing readability and register assist

Separately from item 1, the source thread's actual use case, stripped of its book-specific tiering, is generic: a contributor wants AI help making their prose land with an intended readership without losing their voice or altering their facts and claims. Telling Forward's Mission already promises agent help with "revision" as part of reducing the mechanical burden of authorship, but no document names what revision assistance actually consists of beyond ingestion and ordering.

**Proposal:** an optional, contributor-initiated pass, not a Reader App feature, not a new content type, not a platform surface, that adjusts lexical and syntactic complexity in a contributor's own draft while holding claims, named entities, and voice markers fixed. Pair it with item 1's fidelity report so the contributor sees exactly what shifted before accepting it. This stays bounded to the Author App and Concept Board side, is opt-in per use, and never touches canon status or reader-facing presentation.

**Extension a, objective delta as feedback, not a gate.** The source thread's own guardrail against this becoming "childlike voice by ideology" is to treat a readability metric (it names Flesch Reading Ease and Flesch-Kincaid Grade Level) as a feedback number shown to the contributor after a pass, never as a target the system tries to hit or a gate that blocks acceptance. If item 2 is built, any readability score shown alongside a rewrite should be descriptive only, a delta the contributor can see and ignore, not a threshold the agent optimizes toward.

**Extension b, explicit scope fence.** Two things the source thread's own architecture does that this proposal deliberately does not adopt: it does not vary by declared content type (see "Considered and not carried forward" below, this is the same ground already covered by withdrawn open questions 15.8 and 15.9), and it does not auto-select a target complexity level for a contributor. Any complexity target stays a value the contributor sets or accepts per use, not one the platform infers or defaults from scene metadata.

**Status of this item:** proposed concept; needs owner review on whether this belongs inside TF's "revision" scope at all before any design work starts.

## Considered and not carried forward

A closer second pass over the source thread surfaced additional unique elements. These were weighed against Telling Forward's existing scope and mission and deliberately not turned into proposals, recorded here so a future session does not have to rediscover and re-reject them from scratch.

- **Parallel "fork" renderings of one passage.** The source thread's "LTB forks" concept generates five simultaneous treatments of the same passage (consolation, diagnostic, critical-challenge, mirror, archival-original) for a reader to choose among. This edges into a reader-facing platform surface question the same way withdrawn open questions 15.8 and 15.9 did, inferred from the sibling property's own design rather than a demonstrated TF need, and it risks confusion with Concept Board's existing Disrupt/Invert vocabulary, which already generates divergent material at the canon level. Not proposed.
- **Controlled-language rules for explanatory or nonfiction passages.** The thread borrows ASD-STE100-style tactics (one action per sentence, unambiguous pronouns, consistent terminology) for its companion volume's expository sections. Telling Forward has no distinct nonfiction or companion content type, per withdrawn open question 15.9, so this has no surface to attach to today. The one durable piece, consistent terminology, is already covered by ADR-0006 item 2's term/motif ledger and is not duplicated here.
- **The thread's own named architecture.** Interpretive Translation Layer, Lexical Translation Engine, the T0-T4 compression ladder, the SH'ELAH validation entity, and the "editorial spirit avatar" tone-selection concept are the source property's own system, not Telling Forward's. Item 1's fidelity-report proposal already generalizes the one substantive pattern underneath SH'ELAH, a named check before an output is accepted, without borrowing its name or its property-specific validation rules.
- **The thread's tooling-maturity ladder** (in-chat prompting, then a custom GPT with a glossary and exemplar pages, then a RAG-backed multi-agent system). This describes how deep an individual author should invest in AI tooling for a personal writing project, not a Telling Forward product capability. TF's own ingestion tiers (ADR-0004) already serve an analogous "levels of AI involvement" role for a different problem, source-fidelity during ingestion, not authorial tooling maturity, and are not extended or reinterpreted by this thread's ladder.

## Corroborating and overlapping work, not duplicated

`docs/adr/0007-reader-accessibility-register-and-clarity-pass-from-bac-thread.md`, drafted concurrently by a separate session from an apparently related or identical thread paste, proposes an "author-facing clarity/register pass" (its item 1) and a "reader accessibility/complexity register" open question (its item 2, logged as open question 15.13). These overlap items 1 and 2 above closely enough that they read as two independent extractions of the same underlying capability rather than two different ideas. This ADR does not restate or duplicate that file's specific field or open-question proposal. When the project owner resolves the numbering pileup noted above, these two ADRs' overlapping items are the most likely candidates for merging into one.

## Non-goals of this ADR

- Does not adopt the source thread's own tiering ladder (T0 through T4), "Interpretive Translation Layer," "Lexical Translation Engine," SH'ELAH validation entity, or "editorial spirit avatar" tone-selection concept. Those belong to the source property's own architecture, not Telling Forward's.
- Does not reopen withdrawn open questions 15.8 (third platform surface) or 15.9 (in-world companion/codex content type). Item 2 above is a contributor-side editing assist, not a reader-facing surface or content type, and is a different proposal from both withdrawn items.
- Does not authorize building anything. Both items are proposals pending owner review.
- Does not describe, evaluate, or archive the source thread's own property (plot, characters, branding, or the companion volume's content). That material was scavenged for pattern ideas only.
- Does not resolve the wider ADR numbering pileup beyond this ADR's own two renumberings (0007 to 0010 to 0009) and moving its own superseded 0007 draft aside. The other colliding files are unrelated sessions' work product and are left for the project owner to review, merge, and renumber.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Transformation fidelity report | Log as proposed; low-cost output-contract change to fold in once any transformation step (ADR-0004 Tier 1/2, or Disrupt/Invert) gets designed |
| 2. Contributor-facing readability/register assist | Log as proposed; needs an explicit owner scope decision, is this inside TF's "revision" promise, before any design work; likely candidate for merging with the overlapping proposal in `0007-reader-accessibility-register-and-clarity-pass-from-bac-thread.md` |

## Consequences

- If item 1 is accepted, ADR-0004's Tier 1/2 ingestion design and any future Disrupt/Invert implementation should include a fidelity-report output field, structured around the semantic-preservation / structural-simplification / audience-calibration axes, from the start rather than retrofitting it later.
- Item 2 has no consequence until the owner scopes it. It does not block or depend on item 1's acceptance, though it would consume item 1's fidelity-report pattern if both are accepted.
- The project owner still needs to resolve the wider 0007-0009 numbering pileup independent of this ADR's content.

## Next action

The project owner should give a per-item call, accept, reject, or defer, for items 1 and 2, decide whether to merge item 2 with the overlapping proposal in the `0007-reader-accessibility-register-and-clarity-pass-from-bac-thread.md` file, and separately resolve the broader ADR numbering pileup across all affected files. Update this ADR's Status once that call is made.
