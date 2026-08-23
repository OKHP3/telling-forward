# ADR-0015: Reader Interest Signal

## Status

**Open.** Proposal from a 2026-08-22 design conversation, not yet reviewed
against the current schema and consent-ladder implementation. One item
proposed, one open question logged.

## Context

The project owner raised a gamification question: could readers apply
incentive to authors to extend or deepen a specific storyline, using the
Twilight fandom's "Team Edward" versus "Team Jacob" dynamic as the reference
case, and asked whether a real-time voting or feedback-engine mechanism could
formalize that.

That reference case is a caution, not a blueprint. Team Edward/Team Jacob was
organic fan pressure the author absorbed without any platform tooling. A
public, head-to-head vote tally between two paths would not soften that
pressure, it would industrialize it: it invites brigading, puts whichever
author is "losing" under visible strain, and blurs Mission principle #6
(separate canon from possibility) the moment a live tally starts to feel
binding on what an author writes next.

ADR-0005 item 3 already logged an adjacent, narrower idea: a steward-only,
non-gamified trending signal on alternate paths, explicitly ruling out a
public leaderboard or anything that lets a metric promote a branch to canon.
This ADR proposes widening that signal's visibility, not its power.

## Proposal

A **non-binding, per-path or per-capsule interest signal**, visible to that
path's own author (opt-in, their choice to check), never displayed as a
public tally, and never shown head-to-head against a competing path. The
author sees that readers are engaged with a specific branch and decides,
with full discretion, whether to extend it, exactly the same discretion they
already hold over Promote-to-scene, Disrupt, and Invert.

This does not require new consent surface. `docs/decisions/consent-ladder-design.md`
(open question 15.14) already defines `react` as its own consented action:
"saving or publishing an explicit reaction such as a rating, response, or
response choice," and explicitly scopes out "use of reaction data as a proxy
for creative-rights permission." That exclusion already forbids treating a
reaction count as a decision-maker, exactly the guardrail this ADR would
otherwise have to argue for from scratch. This ADR only proposes what a
captured `react` action rolls up into (a per-path or per-capsule count) and
who can see the rollup (that path's own author, opt-in), not a new consent
category.

## Non-goals

- No public leaderboard, vote tally, or head-to-head display between paths.
  This is the specific mechanism this ADR argues against.
- No automatic canon promotion or automatic anything. Per Mission principle
  #9, a reaction count remains evidence for a human, never a decision-maker.
  ADR-0005 item 3 already established this discipline for the steward-facing
  version; this ADR does not weaken it for the author-facing version.
- No economic incentive layer (tips, pledges, pay-to-extend). That is
  ADR-0005 item 4's already-logged, explicitly-deferred monetization
  vocabulary, gated on Mission principle #10 ("earn the right to monetize")
  and real traction. This ADR stays informational only.
- Does not reopen ADR-0005 item 3's steward-only default. It adds a second,
  narrower visibility (that path's own author) alongside it, not a
  replacement.

## Open question logged

**Granularity: per-path or per-capsule?** A per-path signal rolls up
engagement across an entire branch; a per-capsule signal is finer-grained
(a specific character beat or arc capsule within a path) and may better
match how the Concept Board already treats capsules as the atomic unit.
This needs an explicit decision before design work starts, logging it rather
than assuming either answer. See `docs/decisions/open-questions.md` 15.16.

## Related decisions

- [ADR-0005: Reader state, provenance, and contributor signals](0005-reader-state-provenance-signals.md), item 3
- [ADR-0008: Reader consent and contribution](0008-reader-consent-and-contribution.md)
- `docs/decisions/consent-ladder-design.md` (open question 15.14)
- [Open questions log](../decisions/open-questions.md), 15.16
