# ADR-0007: Authoring and Architecture Concepts from the Vault Codices Synopsis-Methodology Thread

## Status

**Open.** This ADR proposes two independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it.

## Context

The project owner supplied a ChatGPT thread (`vault-codices-biases-as-constants` GPT, 2026-06-06 exchange, captured via `okhp3-thread-context-extraction-chatgpt` on 2026-08-19) about writing structured book-level synopses for the Magnus Progenitor Saga and Biases as Constants, plus a Notion sync log showing which pages of that property's own Canon Hub the thread's concepts were routed into. Consistent with how ADR-0005 and ADR-0006 treat their own source material, this ADR does not archive or reproduce that thread — the saga's plot content, its naming decisions (`vault-codices-biases-as-constants`), and most of the Notion page list are specific to that other property and have no Telling Forward (TF) equivalent worth adopting.

**Coverage note:** the two source PDFs and three "Pasted markdown" synopsis files referenced in the source thread were not delivered into this session — only the surrounding meta-conversation (methodology, naming, Notion log) was visible. This ADR is drafted from that meta-conversation alone. If the actual synopsis files surface anything TF-relevant beyond the two items below, it would need a follow-up pass.

## Reaffirmed, not reopened

The Notion log shows that property's platform split expanding from two surfaces to three (Vault Reader, "Enter the Vault" / Playable Codex, Canon Collaboration). This is not evidence TF needs a third product surface. TF's own two-app split (Author App, Reader App) was a deliberate, confirmed decision (`telling_forward_ui_vision.md`, 2026-08-17) made independently of that property's structure. Noted for completeness only; no item below touches it. Likewise, the log's "Council of AIs" framing (Claude / Perplexity / Notion / Jamie-as-orchestrator) is the project owner's own personal workflow, not a TF product concept, and is out of scope here.

## Concepts extended into concrete proposals

### 1. Scene-purpose framing at Promote-to-scene

One piece of the thread is a reusable authoring pattern, independent of the saga's own content: a fixed set of questions proposed for framing *why a given book exists* before writing its synopsis — why this unit exists, what dramatic problem it solves, what character/system/moral contradiction it advances, what the reader should understand by the end, how it hands off to the next unit, and how it supports the larger storyworld architecture. This is a purpose-framing discipline, not a synopsis-writing discipline — it forces a reason for existing before the content gets written.

Per `telling_forward_ui_vision.md`, Concept Board's **Promote to scene** action is a deliberate, non-automatic hand-off: an author decides a capsule (character, arc beat, planned event) is ready to become a scene in the Scene Writer. Right now that decision is a bare state transition — the interface doesn't ask the author to say anything about *why* this capsule earned promotion. The six-question frame above is a ready-made prompt for that moment, and connects to Mission working principle #1 ("Start with the person, not the prose") and principle #3 ("Make the hidden machinery humane").

**Proposal:** at Promote-to-scene, offer (not require) a short structured purpose note, stored as metadata on the resulting scene rather than as new prose content. Candidate minimal set, given TF's existing four-state model and Concept Board's two-action scope:

- Why this scene exists (one line)
- What it advances (character, plot, or thematic — author's own words)
- How it hands off (what the next scene or branch point needs from this one)

The other three questions (dramatic problem solved, reader takeaway, larger-architecture fit) read as more useful at a *world/steward* level than a per-scene level, and risk turning a lightweight promotion action into a form. They are noted but not part of the minimal proposal.

**Status of this item:** proposed shape only, not drafted copy, not a schema field. If accepted, the field(s) should land in whatever table backs promoted scenes, following the same "reserve now" pattern ADR-0005 and ADR-0006 already use for their own metadata proposals.

### 2. "GitHub holds / Replit executes" as a candidate third framing for ADR-0003

The Notion log records that the other property's Canon-as-Code Architecture page was updated with a named principle: **"GitHub holds / Replit executes."** GitHub is the durable source of truth (canon, history, structure); Replit is a runtime surface that acts on it but doesn't own it.

This lands directly on an already-open question in this repository. `AGENTS.md` (line 118) and **ADR-0003** both flag an unresolved tension: the original concept scoped a GitHub-native fast path (GitHub Pages, PRs and Actions as the backend), but the repository instead runs a custom Express/Postgres API on Replit, auto-pushing every commit to GitHub — and "nothing in the repository currently records why the project moved from one to the other." ADR-0003 offers two framings — (a) intentional supersession, (b) unexamined infrastructure momentum — and explicitly withholds a recommendation pending the project owner's call.

There is already first-party evidence pointing toward a third framing: per `telling_forward_ingestion_and_mcp.md`, every table in `lib/db/src/schema/telling-forward.ts` is commented as a derived cache over GitHub-native objects (SHA, PR number, branch ref) — which reads as consistent with Postgres being an index over GitHub, not a replacement store. The imported thread's named principle gives that existing evidence a label: **(c) GitHub holds, Replit executes** — Postgres/Express is a query and runtime layer over GitHub's canonical data, not a competing source of truth.

**Proposal:** add framing (c) to ADR-0003 as a third option, cross-referenced to this ADR, and let the project owner decide among (a), (b), and (c) — this ADR does not resolve ADR-0003 on its own, and does not change ADR-0003's Status.

**Status of this item:** proposed framing, evidence-only. No schema, code, or documentation change beyond the cross-reference is authorized by this ADR.

## Non-goals of this ADR

- Does not require the item 1 purpose note; Concept Board's "epiphany, not default detail" ethos (per `telling_forward_ui_vision.md`) argues against making it mandatory.
- Does not resolve ADR-0003; item 2 adds a candidate framing for the project owner to weigh, not a decision.
- Does not adopt the saga's own book order, naming, Notion architecture, or three-surface platform split — none of it is TF-relevant.
- Does not touch the four-vs-six submission-state discrepancy (ADR-0004) or reopen ADR-0005/0006's open items.
- Does not authorize building anything; Concept Board has no implementation footprint yet per `telling_forward_ui_vision.md`, so item 1 is a design note for whenever that work starts, not a standalone build task.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Scene-purpose framing at Promote-to-scene | Log as proposed; low cost if adopted alongside Concept Board's first implementation, easy to skip if it doesn't earn its place |
| 2. "GitHub holds / Replit executes" as ADR-0003 framing (c) | Accept as a documented option; forward to ADR-0003 for the project owner's actual call |

## Consequences

- If item 1 is accepted, the purpose-note fields should be designed into the capsule/scene data model's first version rather than retrofitted later.
- If item 2 is accepted as ADR-0003's resolution, that ADR's Status should move from Open to Accepted with framing (c) as the recorded rationale, and this repository would have a named principle to check future Replit/Postgres additions against (does this table hold canon, or index it?).
- If neither is implemented, no cost — this ADR just records both ideas and their source so they aren't rediscovered from scratch.

## Next action

The project owner should confirm whether item 1 is worth carrying into Concept Board's eventual implementation, and separately, review item 2 against ADR-0003 and decide whether framing (c) resolves that ADR. Update this ADR's Status and ADR-0003's Status once those calls are made.
