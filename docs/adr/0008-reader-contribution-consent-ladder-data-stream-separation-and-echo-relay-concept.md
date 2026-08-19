# ADR-0008: Reader Contribution Consent Ladder, Data-Stream Separation, and Structured Contribution Concepts for Telling Forward

## Status

**Open.** This ADR proposes seven independent, separately-decidable items, not one accept/reject decision. See "Recommendation" for the per-item call and "Next action" for what closes it. Revised twice on 2026-08-19: first to extend from 3 to 7 items at the project owner's request, then to tighten scope discipline — this repository is dedicated to Telling Forward (TF), not to the sibling property the source thread was about, and every remaining reference to that property's own naming has been reduced to the minimum needed for provenance.

> **Numbering note:** as of this revision, `docs/adr/` still shows signs of concurrent multi-session writes (files renumbering between sessions on the same day). This ADR keeps its original number, 0008, which remains unique as of this write. Filename unchanged from the original version to avoid orphaning the cross-references already recorded in `docs/decisions/open-questions.md` (15.14, 15.15) — the working title of item 4 below has changed, but the file itself has not been renamed.

## Context

On 2026-08-19 the project owner pasted a ChatGPT thread into a Cowork session and asked for it to be considered against Telling Forward. The source thread concerned a different, sibling property's reader-engagement and community-contribution strategy. Per this repository's standing rule — restated directly by the project owner this same day — this thread is dedicated to TF's own development, not to that sibling property, so only the parts of the source material that generalize into TF architecture are kept here. The property's own name, its fictional entities, its specific tier and role names, and its narrative content are not reproduced in this document beyond the minimum needed to say where an idea came from.

A long second pass of the pasted material was a detailed reconstruction of that property's own purpose, themes, characters, and story arcs. It carried no TF architecture or process signal and remains excluded from this repository entirely.

Seven concepts from the source material's business-strategy pass generalize past that property and are logged below, each restated in TF's own vocabulary. Everything else in the thread either restates work already logged and deferred elsewhere (see "Corroborating evidence, not new items") or is out of scope for TF's GitHub-only, steward-governed model.

## Concepts extended into concrete proposals

### 1. Three-stream data separation: behavioral telemetry vs explicit feedback vs creative contribution

Reader-generated signal is not one thing. Passive behavior (which path a reader chose, where they stopped, replay count) carries different consent and retention expectations than explicit feedback (ratings, "I want more of this"), which in turn differs from creative contribution (submitted scenes, branches, alternate endings) — the last of which is authored content someone owns, not analytics.

TF's Mission already implies this distinction without naming it: principle #4 ("keep provenance visible") and principle #5 ("protect unfinished work... public visibility does not automatically mean permission to reuse") apply squarely to creative contribution, not to passive behavioral analytics, which has no equivalent TF principle today.

**Proposal:** treat behavioral telemetry, explicit feedback, and creative contribution as three data classes with distinct handling from the start of any reader-engagement or analytics design — different retention rules, different consent language, different who-can-see-it defaults (steward-only vs contributor-visible vs public). Concrete mechanisms worth carrying forward: an anonymous-participation mode for behavioral telemetry, a plain-language (not legalese) data-use notice, a contributor/reader data-export path, a data-deletion path, no covert psychological or behavioral inference claims, aggregate-only reporting by default rather than individual-level dashboards, and additional consent controls (or exclusion) if TF ever has readers under the age of majority. None of this requires new schema today; it is a naming/design constraint for whenever TF designs its first reader-analytics or feedback surface.

**Status:** proposed design principle, no schema or UI work authorized.

### 2. Per-action contribution consent ladder

Each distinct level of reader participation (read only, react, submit a theory, write a branch, license a branch for platform display, submit a branch for canon review) should carry its own explicit consent step, rather than one Terms-of-Service checkbox covering everything a reader might ever do.

This directly extends open question 15.10 (consent boundary for Disrupt/Invert derivatives), which already asks whether an original contributor gets a say when their accepted material is used to generate derivative output. The ladder pattern generalizes 15.10 from "one mechanic's consent gap" to "does TF need a general per-action consent model."

**Proposal:** log a new open question (15.14) asking whether TF should define a general, per-action consent ladder covering read/react/submit-theory/submit-branch/license-for-display/submit-for-canon-review, with 15.10 named as a specific instance of the same underlying gap.

**Status:** proposed open question only, added to `docs/decisions/open-questions.md` as 15.14.

### 3. Constrained-choice contribution mode

A middle rung between passive reading and full branch-writing: structured, closed-ended prompts ("what should this character do next: A/B/C/D" or "write a 100-word fragment from a named minor character's perspective") that give readers real creative agency without opening an unbounded, hard-to-moderate submission surface.

This is a new rung on item 2's consent ladder, and it connects to already-confirmed TF architecture rather than inventing new machinery: `telling_forward_ui_vision.md` confirms the CME ("MotifExtractor") engine already matures raw, loose "riff sessions" into structured concept capsules — a constrained-prompt response is a smaller, more structured input than a riff session, and could feed the same capsule pipeline. It also gives Concept Board a reader-facing, not just author-facing, capsule-creation entry point, which does not exist today.

**Proposal:** log as a candidate low-friction contribution type — closed-ended prompts (multiple choice or a short fixed-length fragment) that a steward or world creator authors per storyworld, with responses captured as candidate capsules through the existing CME-derived pipeline rather than a new content pathway. Distinct from full branch submission (item 2's higher rung) and from item 4 below in that there is no chaining or multi-contributor hand-off involved.

**Status:** proposed feature concept, no design or schema work authorized. Needs its own scoping if pursued.

### 4. Sequential contributor relay (working name)

A chained, partial-visibility, multi-contributor continuation mechanic: one contributor writes a fragment, the next contributor sees only a partial or altered view of it and continues, the full chain is revealed at the end, and the community reacts. Structurally this is closer to a Reader App engagement feature than anything currently scoped for TF (Concept Board and Scene Writer are both Author App / single-contributor tools).

This is a pattern, not a name to adopt — it must be designed against TF's own governance model, not imported as-is: TF's steward model (Mission principle #7, "give every world a steward") and principle #9 ("agents... do not... make irreversible canon decisions") both mean community reaction to a relay chain can only ever be a signal a steward reviews, never an automatic promotion into any canon or alternate-path status.

**Proposal:** log as a candidate Reader App feature concept — a chained, partial-visibility, multi-contributor continuation feature, named and designed on its own terms if pursued — with the explicit constraint that community reaction feeds steward review only, never automatic canon or alternate-path promotion. No design work is authorized; this is likely a materially larger feature than anything else currently open (it needs real-time or async multi-contributor coordination not otherwise required by TF's model today) and should be scoped as its own future ADR if the owner wants to pursue it, not folded into existing Concept Board work. This item is explicitly a prerequisite-dependent of item 5 below — it should not open to the public before baseline moderation tooling exists.

**Status:** proposed feature concept only, flagged as likely high complexity relative to current scope.

### 5. Baseline moderation tooling for stewards

Any open community-contribution system needs community norms and moderation apparatus as a precondition, not an afterthought bolted on after launch. TF's Mission already assigns this responsibility to a steward (principle #7: "each shared world needs an identified person or organization responsible for its permissions, canon policy, moderation, and commercial-rights decisions") but no TF document currently specifies what tooling a steward actually has to do that job — no spam handling, no NSFW/harassment flagging, no plagiarism check, no bulk-review or blocklist primitive.

This is a real gap: items 3 and 4 above (constrained-choice contributions, sequential relay) both assume a steward can handle a stream of incoming public content, and neither should ship without it.

**Proposal:** log a new open question (15.15) — what moderation primitives does a TF steward need (GitHub-native candidates: labels, issue templates, a blocklist/mute mechanism, batch actions) before any open, public contribution surface (item 3, item 4, or any future equivalent) goes live? No specific mechanism is proposed or assumed.

**Status:** proposed open question only, added to `docs/decisions/open-questions.md` as 15.15. Treated as a blocking prerequisite for items 3 and 4, not an independent nice-to-have.

### 6. Parallel-construction / independent-creation protection

A specific contributor-trust risk distinct from provenance-for-its-own-sake: if a steward or world creator later publishes official content that resembles a previously submitted, pending, or rejected community contribution, the contributor may reasonably believe their idea was taken, whether or not that is true. The mitigation is a timestamped-submission record plus an explicit distinction between "inspired by aggregate reader signal" and "adapted from a specific submission" — a documentation-and-trust pattern, not just a data-schema one.

This item does not need new schema of its own. `docs/adr/0009-transformation-fidelity-and-readability-assist-concepts.md`'s sibling provenance-schema work (and ADR-0005 item 2) already proposes a `source_reference` field tied to a GitHub commit SHA, PR, or Issue — which is inherently timestamped by git history. That satisfies the "timestamped record" half of this concept already, once the `capsules` table exists. (Note: ADR numbering in this area has shifted between sessions on 2026-08-19 — confirm the current filename for the provenance field-schema ADR before citing it elsewhere.)

**Proposal:** when canon or steward-authored decisions are documented (see item 7 below), the record should be able to distinguish "informed by aggregate/anonymous reader signal" from "derived from a specific named contributor's submission" as a matter of documentation practice, not new infrastructure. This rides on the existing provenance-field proposal rather than adding a second mechanism.

**Status:** proposed documentation practice, no schema change requested.

### 7. Scheduled canon-review cadence with non-monetary recognition

A recurring, scheduled cadence for a steward to review queued community contributions in batches, rather than only ad hoc, plus giving contributors credit or recognition regardless of whether any payment is ever involved. This is deliberately separated from any monetization framing (see below).

**Proposal:** log as a candidate process pattern — a steward-defined, recurring review cadence (e.g., monthly) for queued item-3/item-4-style contributions, with credit/attribution to the contributor as a baseline outcome, independent of and not blocked by any future monetization decision. This does not require schema work; it is a steward workflow convention that could be documented in `CONTRIBUTING.md` or steward-facing guidance once items 3-5 have real content flowing through them.

**Status:** proposed process pattern, no immediate action.

## Corroborating evidence, not new items

- The source material's AI-role concepts (an agent role for flagging canon contradictions, and a separate one for mapping branches to entities/timelines) restate the same gap already logged as ADR-0005 item 5 (optional legibility check before canon acceptance) and ADR-0006 item 2 (steward-facing term/motif ledger, open question 15.12). No new item added.
- An idea for aggregating reader-choice patterns into a roadmap signal restates ADR-0005 items 1 and 3 (reader path state / steward-only trending signal). No new item added.
- A phased monetization model (free/paid/premium tiers, contributor revenue share, a periodic "assimilation event" as a paid mechanic) restates ADR-0005 item 4, already logged and explicitly deferred under Mission principle #10 ("earn the right to monetize" before introducing paid access, credits, or adaptation economics). No new item added; still deferred. Item 7 above deliberately splits out only the non-monetary scheduling/recognition half of this idea, which does not depend on the monetization decision.
- A multi-tier canon/visibility model in the source material is structurally the same shape as a richer state model the project owner explicitly declined to port into TF's submission-state model on 2026-08-17 ("stay simple" — see project memory `telling_forward_ui_vision.md`). This ADR does not propose reopening that decision or open question 15.11. If the owner wants a richer canon-visibility tiering independent of the submission-review-state question, that would need to be raised as its own explicit ask, not inferred from this thread.

## Sourcing caution

The source thread makes several external factual/legal claims (a fan-fiction archive's licensing model, a content-hosting platform's creator-license language, GDPR and FTC data-use framing, U.S. Copyright Office guidance on AI-assisted authorship, a media report on interactive-fiction privacy research) as an AI assistant's stated summary, not verified citations. None of these are treated as settled fact here. If TF's own contributor terms or privacy language are ever drafted using this material as a starting point, each claim needs independent verification against a primary source first.

## Non-goals of this ADR

- Does not adopt the sibling property's own naming, canon-tier vocabulary, or any of its fictional entities, plot, characters, or theme content.
- Does not archive or reproduce the source thread, including its long reconstruction of the sibling property's own purpose and themes — reviewed for TF relevance and excluded as out of scope.
- Does not reopen ADR-0003, ADR-0004's four-vs-six discrepancy (15.11), or ADR-0005/0006's existing items.
- Does not duplicate the existing provenance field-schema proposal; item 6 above explicitly rides on it rather than proposing a second mechanism.
- Does not authorize building anything. All seven items are proposals pending owner review.

## Recommendation

| Item | Recommendation |
|---|---|
| 1. Three-stream data separation | Log as a design principle for the first reader-analytics/feedback surface, with concrete mechanisms; no immediate action |
| 2. Per-action consent ladder | Log as open question 15.14, cross-referenced to 15.10 |
| 3. Constrained-choice contribution mode | Log as a candidate feature; needs its own scoping if pursued |
| 4. Sequential contributor relay | Log as a candidate Reader App feature; flag as high complexity, needs its own future ADR; blocked on item 5 |
| 5. Baseline moderation tooling | Log as open question 15.15; treat as a blocking prerequisite for items 3 and 4 |
| 6. Parallel-construction protection | Log as a documentation practice; rides on the existing provenance-field proposal, no new schema |
| 7. Scheduled review cadence with recognition | Log as a candidate process pattern; independent of the deferred monetization decision |

## Consequences

- If item 1 is accepted, any future reader-analytics or feedback-capture design should partition data classes and retention/visibility rules from the outset rather than retrofitting them later.
- If item 2 is accepted, 15.10's eventual resolution should consider whether it answers the general case (a consent ladder) or only the Disrupt/Invert-specific case.
- If item 3 is pursued, it gives Concept Board its first reader-facing (not just author-facing) capsule-creation path, feeding the existing CME pipeline.
- If item 4 is pursued, it would be TF's first genuinely multi-contributor, sequenced Reader App mechanic and likely needs its own requirements pass before any design work — it does not fit inside the existing Concept Board/Scene Writer scope. It should not launch before item 5 exists.
- If item 5 is accepted, whatever moderation primitives are chosen should be scoped before items 3 or 4 reach implementation, not after.
- Item 6 has no independent consequence unless the provenance-field proposal it rides on is accepted; it is a documentation-practice rider, not a standalone build.
- Item 7 has no schema consequence; it is a steward-workflow convention to document once items 3-5 have real usage.

## Next action

The project owner should give a per-item call — accept, reject, or defer — for items 1 through 7. Update this ADR's Status once that call is made.

## Housekeeping note (unrelated to this thread's content)

`docs/adr/` has shown ADR numbers shifting between files over the course of 2026-08-19, consistent with multiple concurrent sessions each scavenging different imported threads about the same sibling property and writing to this directory at the same time. This ADR was not renumbered and remains 0008. The underlying coordination problem — no lock or single source of truth for the next ADR number when more than one session writes at once — is a process issue for the project owner to resolve (a single session at a time, a shared ledger, or a different numbering scheme), not something fixed in this document.
