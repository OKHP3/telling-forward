# ADR-0012: Authoring and Architecture Concepts from the Vault Codices Synopsis-Methodology Thread

## Status

**Open.** This ADR proposes two independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Numbering note

Originally drafted and written to disk as `0007-scene-purpose-framing-from-synopsis-discipline.md`. At draft time, `docs/adr/` briefly held three different files numbered 0007 from concurrent Cowork sessions each independently scavenging different imported threads about the same sibling property. Renumbered to 0012 after the project owner cleared the concurrent-session lock and the directory settled at 0001–0011 with no free slot below 0012. The file this ADR was colliding with, `0007-reader-accessibility-and-clarity.md`, is a different session's work on a different source thread and is untouched by this renumbering — only this file moved.

## Context

The project owner supplied a ChatGPT thread (`vault-codices-biases-as-constants` GPT, 2026-06-06 exchange) about writing structured book-level synopses for the Magnus Progenitor Saga and Biases as Constants, plus a Notion sync log showing which pages of that property's own Canon Hub the thread's concepts were routed into. Consistent with how ADR-0005 and ADR-0006 treat their own source material, this ADR does not archive or reproduce that thread — the saga's plot content, its naming decisions (`vault-codices-biases-as-constants`), and most of the Notion page list are specific to that other property and have no Telling Forward (TF) equivalent worth adopting.

**Coverage note:** the two source PDFs and three "Pasted markdown" synopsis files referenced in the source thread were not delivered into this session — only the surrounding meta-conversation (methodology, naming, Notion log) was visible. This ADR is drafted from that meta-conversation alone. If the actual synopsis files surface anything TF-relevant beyond the two items below, it would need a follow-up pass.

## Reaffirmed, not reopened

The Notion log shows that property's platform split expanding from two surfaces to three (Vault Reader, "Enter the Vault" / Playable Codex, Canon Collaboration). This is not evidence TF needs a third product surface. TF's own two-app split (Author App, Reader App) was a deliberate, confirmed decision (`telling_forward_ui_vision.md`, 2026-08-17) made independently of that property's structure. Noted for completeness only; no item below touches it. Likewise, the log's "Council of AIs" framing (Claude / Perplexity / Notion / Jamie-as-orchestrator) is the project owner's own personal workflow, not a TF product concept, and is out of scope here.

## Concepts extended into concrete proposals

### 1. Scene-purpose framing at Promote-to-scene

One piece of the thread is a reusable authoring pattern, independent of the saga's own content: a fixed set of questions proposed for framing *why a given book exists* before writing its synopsis — why this unit exists, what dramatic problem it solves, what character/system/moral contradiction it advances, what the reader should understand by the end, how it hands off to the next unit, and how it supports the larger storyworld architecture. This is a purpose-framing discipline, not a synopsis-writing discipline — it forces a reason for existing before the content gets written.

Per `telling_forward_ui_vision.md`, Concept Board's **Promote to scene** action is a deliberate, non-automatic hand-off: an author decides a capsule (character, arc beat, planned event) is ready to become a scene in the Scene Writer. Right now that decision is a bare state transition — the interface doesn't ask the author to say anything about *why* this capsule earned promotion. The six-question frame above is a ready-made prompt for that moment, and connects to Mission working principle #1 ("Start with the person, not the prose") and principle #3 ("Make the hidden machinery humane").

**Proposal:** at Promote-to-scene, offer (not require) a short structured purpose note, stored as metadata on the resulting scene rather than as new prose content. Candidate minimal set, given TF's six-state model (decided 2026-08-19) and Concept Board's two-action scope:

- Why this scene exists (one line)
- What it advances (character, plot, or thematic — author's own words)
- How it hands off (what the next scene or branch point needs from this one)

The other three questions (dramatic problem solved, reader takeaway, larger-architecture fit) read as more useful at a *world/steward* level than a per-scene level, and risk turning a lightweight promotion action into a form. They are noted but not part of the minimal proposal.

**Status of this item:** proposed shape only, not drafted copy, not a schema field. If accepted, the field(s) should land in whatever table backs promoted scenes, following the same "reserve now" pattern ADR-0005 and ADR-0006 already use for their own metadata proposals.

### 2. "GitHub holds / Replit executes" as historical evidence for ADR-0003

The Notion log records that the other property's Canon-as-Code Architecture page was updated with a named principle: **"GitHub holds / Replit executes."** GitHub is the durable source of truth (canon, history, structure); Replit is a runtime surface that acts on it but doesn't own it.

This is evidence for a question that was open when this ADR was drafted.
ADR-0003 now accepts the GitHub-canonical hybrid, and ADR-0013 clarifies the
boundary: GitHub holds durable creative and editorial records while Replit
executes the narrow product layer. The former alternatives about intentional
supersession and infrastructure momentum are historical context, not current
open choices. Open questions 15.1, 15.2, and 15.6 separately govern topology,
identity, and service authentication.

This item does not touch 15.1/15.2/15.6. Those remain separate operational
questions, not blockers to the accepted source-of-truth boundary. First-party
schema comments and ADR-0013 provide the evidence trail for the now-accepted
framing: **GitHub holds, Replit executes** — Postgres/Express is a query and
runtime layer over GitHub's canonical data, not a competing source of truth.

**Disposition:** The framing is accepted and already recorded in ADR-0003 and
ADR-0013. This ADR preserves the source and cross-reference as historical
traceability; it does not create a separate architecture decision.

**Status of this item:** accepted boundary reference, evidence-only. No schema
or code change is authorized by this ADR.

## Non-goals of this ADR

- Does not require the item 1 purpose note; Concept Board's "epiphany, not default detail" ethos (per `telling_forward_ui_vision.md`) argues against making it mandatory.
- Does not reopen ADR-0003 or open-questions 15.1/15.2/15.6; item 2 records
  an accepted boundary already decided in ADR-0003 and clarified by ADR-0013.
- Does not adopt the saga's own book order, naming, Notion architecture, or three-surface platform split — none of it is TF-relevant.
- Does not touch the historical four-state submission sketch superseded by the
  six-state model (ADR-0004) or reopen ADR-0005/0006's open items.
- Does not authorize building anything; Concept Board has no implementation footprint yet per `telling_forward_ui_vision.md`, so item 1 is a design note for whenever that work starts, not a standalone build task.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Scene-purpose framing at Promote-to-scene | Log as proposed; low cost if adopted alongside Concept Board's first implementation, easy to skip if it doesn't earn its place |
| 2. "GitHub holds / Replit executes" | **Accepted in ADR-0003 and clarified by ADR-0013; retained here as evidence** |

## Consequences

- If item 1 is accepted, the purpose-note fields should be designed into the capsule/scene data model's first version rather than retrofitted later.
- Item 2 is already recorded by ADR-0003 and ADR-0013. The remaining
  15.1/15.2/15.6 decisions are operational details and do not reopen the
  source-of-truth boundary.
- If neither is implemented, no cost — this ADR just records both ideas and their source so they aren't rediscovered from scratch.

## Next action

The project owner should confirm whether item 1 is worth carrying into Concept
Board's eventual implementation. Item 2 is closed as a proposal here because
the boundary is already recorded in ADR-0003 and ADR-0013. Update this ADR's
Status once item 1 is decided.
