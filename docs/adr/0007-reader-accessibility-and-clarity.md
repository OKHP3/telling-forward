# ADR-0007: Reader Accessibility Register and Author-Facing Clarity Pass — Concepts from a ChatGPT Thread on Vault Codices/Biases as Constants

## Status

**Open.** This ADR proposes five independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Context

The project owner supplied a ChatGPT thread ("Vault Codices: Biases as Constants - Writing Assistance for Sci-Fi," Jan–Jun 2026) about the Magnus Progenitor Saga (MPS) and its meta-narrative companion, Vault Codices / Biases as Constants (BAC) — the same sibling property already scoped out of this repository once for the Gemini thread (see project memory `telling_forward_gemini_thread_context.md`) and once for the BAC manuscript itself (`telling_forward_bac_manuscript_adr.md`). Consistent with both of those corrections, and with how ADR-0005 and ADR-0006 treat their own sibling-property sources, this ADR does not archive the thread and does not reproduce its manuscript-specific content in this repository.

Most of the thread is out of scope for Telling Forward (TF) outright:

- A per-book Flesch/Fog/SMOG/Coleman-Liau readability audit of the MPS manuscript itself — that's editorial work on the other property's actual prose, not a TF architecture signal.
- An assessment of whether the author's early-2025 friction with ChatGPT was model capability, free-tier limits, or workflow immaturity, and whether GPT-5.2 Pro resolves it — this is about the project owner's personal ChatGPT workflow for authoring MPS/BAC, not about TF's own multi-provider, bring-your-own-AI ingestion design (ADR-0004), which already abstracts model/provider choice away from any single vendor's tier.
- The thread's proposed Notion canon-hub additions (`dataLedger_translation_v3.md`, an "Editorial Translation Engine" module, `dataLedger_synthesis_v3.md`) — TF's GitHub-only interoperability constraint (project memory, Jamie, 2026-08-17: "must not depend on Notion or any other third-party system, only GitHub") rules out adopting these as designed, regardless of their merit for BAC.

Five narrower concepts in the thread don't map onto anything already decided for TF and have a real, generalizable equivalent worth logging. Items 1 and 2 were captured in this ADR's first pass; items 3–5 extend that pass with additional concepts the same thread surfaces once its editorial-workflow detail (not just its headline proposals) is mined for TF-relevant architecture rather than BAC-specific mechanics.

## Concepts extended into concrete proposals

### 1. Author-facing clarity/register pass

The thread describes a repeatable editorial workflow for reducing linguistic density in dense prose while preserving voice and conceptual weight: a short audience/voice spec, a "canon lock" list of terms that must not drift, and a three-pass edit (clarity rewrite, voice restoration, meaning audit) rather than a single one-shot rewrite that risks flattening the author's voice.

That pattern isn't specific to BAC's mythic register — it's a generic answer to a problem any TF author with dense or high-abstraction prose could have: "make this more accessible to readers without losing what makes it mine." TF already has agent-assisted transforms in the Concept Board vocabulary (Disrupt, Invert) and a tiered AI-ingestion pipeline (ADR-0004). A clarity pass would be a different kind of transform than either of those — Disrupt/Invert generate divergent or inverted new material from accepted work; a clarity pass would preserve meaning while changing only register — but the same "agent proposes, author approves" boundary applies (Mission working principle #2, "Assist without taking authorship," and #9, "Treat agents as instruments").

**Proposal:** log an optional, author-invoked "clarity pass" as a candidate Author App capability: given a scene and a short audience/voice spec, produce one or more register-adjusted rewrites for the author to accept, reject, or blend, never auto-applied. Given the voice-preservation risk the thread itself flags (single-pass rewrites tend to flatten voice), this is a poor fit for TF's free, always-on tiers — Tier 0 (rules-only) can't do it at all, and Tier 1's small CPU-inference model (Phi-4-mini, per ADR-0004) is sized for capsule extraction, not multi-pass rewrite-with-voice-preservation. Tier 2 (bring-your-own MCP-connected AI) or the local-LLM path are the more plausible homes, consistent with ADR-0004's existing tier boundaries.

**Status of this item:** proposed concept only. No schema, UI, or tier work is authorized by this ADR.

### 2. Reader accessibility/complexity register as content metadata

The thread proposes a four-level "reader cognitive banding" system (L1 story-only through L4 recursive/meta-system cognition) for BAC's own Notion canon hub, gating how much system/meta vocabulary a given passage assumes. TF should not adopt that vocabulary or its Notion implementation — it's built for BAC's specific narrative/system dual-layer structure, which TF doesn't share, and it would violate the GitHub-only constraint regardless.

The underlying need generalizes past that, though: a storyworld with a wide range of scene density (a simple framing scene next to a lore-dense one) has no way, today, for a reader-facing signal to say "this scene assumes more prior context than that one." This is a different axis from two things TF has already decided and should not be confused with either: it is not the reader theme catalog (`telling_forward_ui_vision.md` — Editorial, Terminal, Archive, Dispatch, Transmission are aesthetic skins, not content-density signals), and it is not the four-vs-six submission-state model (open question 15.11 — that tracks a capsule's canon-review status, not how demanding it is to read).

The thread's separate "Lexical Ladder" idea (declaring a section's allowed vocabulary/complexity tier — Core Narrative, Science Exposition, Meta/Codex — up front, so a rewrite tool respects it rather than guessing) is a candidate *mechanism* for this open question, not a reason to expand its scope: if TF ever adds accessibility metadata, a small closed set of author-declared tiers is one reasonable shape for it, worth naming as an option when 15.13 gets designed, without committing to it here.

**Proposal:** log a new open question — should capsules/scenes carry an optional, author-set "reader accessibility" or "density" tag, and if so, is it steward-visible only or reader-facing? — without prejudging the answer or importing BAC's specific band count or labels.

**Status of this item:** proposed open question only, added to `docs/decisions/open-questions.md` as 15.13.

### 3. Canon-lock enforcement for agent-assisted transforms

The thread's "Canon Lock sheet" is a list of proper nouns and invented terms an editorial AI pass must never rephrase. ADR-0006 item 2 already proposes a steward-facing term/motif ledger for TF, but that ledger is diagnostic — it reports drift after the fact. The Canon Lock idea is a different, complementary mechanism: a proactive, author- or steward-maintained allow-list that agent transforms are constrained to respect *before* generating output, not just measured against afterward.

TF's agent-transform surface is growing (capsule extraction in Tiers 1/2, Disrupt, Invert, and the clarity pass proposed in item 1 above), and every one of them can independently mangle a locked proper noun or invented term with no shared guardrail today. A single, small, per-storyworld locked-term list that any TF agent transform is instructed to treat as immutable is a much narrower ask than BAC's own saturation/cadence-scoring machinery, and it would give the term/motif ledger (ADR-0006 item 2) something to enforce against, not just report on.

**Proposal:** log a candidate per-storyworld "locked terms" list (character names, place names, invented vocabulary) that every agent-assisted transform — present or future — is instructed to preserve verbatim. Complementary to, not a replacement for, ADR-0006 item 2's ledger: the lock list is the constraint, the ledger is the audit trail.

**Status of this item:** proposed concept only. The `capsules` table dependency is resolved (decision 15.12, 2026-08-19): if this item is accepted, the locked-terms list must be expressed in capsule Issue labels or body, not a database table. Needs owner review before any design work.

### 4. Staged, human-checked passes as a standing design rule for agent transforms

The thread's stated reason for its three-pass structure — "asking for 'do it all at once' tends to flatten voice" — names two distinct failure modes worth carrying into TF as explicit design vocabulary, not just a fact about one feature: **style drift** (the agent's output stops sounding like the author) and **meaning drift** (the agent's output changes what a passage actually claims or implies). Both are real risks for a clarity pass, and both are equally real risks for Disrupt, Invert, and Tier 1/2 capsule extraction — TF doesn't currently name either failure mode anywhere, which makes it hard to design a transform's approval step around them on purpose.

**Proposal:** adopt "avoid single-shot generation for any transform that both rewrites existing accepted prose and must preserve the author's voice" as a standing design rule for the Author App's agent-assisted features, and name style drift and meaning drift explicitly wherever a transform's output goes to the author for accept/reject/blend. This doesn't mandate a specific number of passes for any given feature — it mandates that whoever designs a transform's UI/prompt chain states which drift risks apply and how the review step catches them, the same discipline the thread's own three-pass structure was built to satisfy for BAC.

**Status of this item:** proposed as a documentation/process addition (a short section in `AGENTS.md` or a design-principles doc), not a schema or code change. No specific feature is authorized by this item.

### 5. Progressive disclosure for hidden-machinery explanations

The thread's suggestion for BAC's own codex material — lead with a plain-language summary, put the formal/technical framing behind it as an optional deeper layer — isn't really about BAC's meta-fiction. It's a general answer to a problem Mission working principle #3 already names directly: *"Make the hidden machinery humane. Version control, review, and automation should support the story without requiring contributors to learn developer terminology."* TF's Author App will eventually need to explain GitHub-native concepts (branches, pull requests, review states, provenance) to contributors who've never used git. Progressive disclosure — a one- or two-sentence plain-language explanation first, with the technical detail available on demand rather than shown by default — is a concrete writing pattern for doing that, not a new one this ADR invents, but one worth naming so onboarding/help copy has a stated convention instead of an ad hoc one.

**Proposal:** adopt progressive disclosure (plain-language first, technical detail as an optional expansion) as the house style for any Author App copy that explains GitHub-native mechanics to non-technical contributors.

**Status of this item:** proposed writing/UX convention. No schema or code change; applies whenever onboarding or help copy is next written.

## Corroborating evidence, not a new item

The thread's "External Cognition Import Ledger" idea (tracking which AI tool or human pass produced a given piece of canon) is a second, independent source pointing at the same gap ADR-0005 item 2 (side-car provenance layer) and ADR-0006 item 2 (steward-facing term/motif ledger) already log as open. This ADR does not add a third provenance proposal — it notes the thread as corroborating evidence that the gap is real, for whoever eventually resolves those two existing items.

Separately, the thread's own tool-selection pattern for its author ("primary drafting: ChatGPT or Claude; quick alternate phrasing: Gemini; inline document rewrite: Copilot in Word; fact sourcing: Perplexity") is evidence for, not a proposal against, ADR-0004's existing Tier 2 design: different transform types are genuinely best served by different providers, so Tier 2's MCP connector design should expect an author to bring different tools to different transform types (capsule extraction vs. a future clarity pass vs. fact-checking a science claim in a scene) rather than assuming one connector serves every transform equally well. This is a note for ADR-0004's implementers, not a change this ADR makes to ADR-0004 itself.

## Non-goals of this ADR

- Does not adopt Notion, the thread's proposed ledger file names, or an "Editorial Translation Engine" as a named module — GitHub-only stands (project memory, 2026-08-17).
- Does not import the MPS manuscript's own readability scores or any BAC/MPS lore, terminology, or branding.
- Does not treat the author's personal GPT-5.2 Pro tier experience as evidence for or against any TF ingestion-tier design; ADR-0004's tier structure already doesn't depend on any single vendor's consumer tier.
- Does not reopen ADR-0003, ADR-0004's four-vs-six discrepancy, or ADR-0005's or ADR-0006's existing items.
- Does not authorize building anything. All five items are proposals pending owner review.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Author-facing clarity/register pass | Log as proposed; candidate Tier 2 / local-LLM capability, needs owner review before any design work |
| 2. Reader accessibility/density metadata | Log as open question (15.13); no default answer proposed, Lexical Ladder noted as one candidate mechanism |
| 3. Canon-lock enforcement for agent transforms | Log as proposed; complementary to ADR-0006 item 2; `capsules`-table dependency resolved (decision 15.12, 2026-08-19) — implementation via Issue labels/body |
| 4. Staged-pass / named-drift design rule | Log as proposed process convention; low cost, no schema impact |
| 5. Progressive disclosure for onboarding copy | Log as proposed writing convention; low cost, no schema impact |

## Consequences

- If item 1 is accepted, it adds a new transform type to the Concept Board / Author App vocabulary alongside Disrupt and Invert, distinct from both, and would need its own UI and prompt-template design.
- If item 2 is accepted, it adds a metadata field to the scene schema. Note: there is no `capsules` database table (decision 15.12, 2026-08-19); metadata lives in capsule Issue labels and body or on the scene record itself.
- If item 3 is accepted, the locked-terms mechanism must be expressed in capsule Issue conventions, not a database table column (decision 15.12, 2026-08-19).
- Items 4 and 5 are process/documentation conventions and can be adopted independently of everything else in this ADR, at any time, with no schema dependency.

## Next action

The project owner should give a per-item call — accept, reject, or defer — for items 1 through 5. Update this ADR's Status once that call is made.

The consolidated fidelity, progressive-disclosure, outside-reader, and
accessibility deferral boundaries are in
`docs/decisions/provenance-fidelity-contract.md`.
