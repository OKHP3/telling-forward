# Telling Forward — Site vs. Vision Gap Analysis & Remediation Plan

**Date:** 2026-08-27
**Scope:** Compare Telling Forward's vision/purpose docs and in-scope roadmap (as recorded in the repo) against its live public footprint at overkillhill.com/projects/, then lay out what to do about anything in-scope that isn't fully delivered.

---

## Executive summary

- **Telling Forward has zero presence on overkillhill.com/projects/.** The live page lists seven "Built at the Hill" projects (Skillz Forge, Found-Rᵧ, Mermaid Theme Builder, BPMN for Mermaid, Mac Studio Local AI Workbench, Glee-fully Chai Chasers, Abrahamic Reference Engine) plus Prompt Forge and three external tools. TF isn't among them, not even as a "coming soon" placeholder.
- **That absence is actually consistent with the repo's own rules, not a bug.** `docs/decisions/public-reporting-policy-and-launch.md`, the 2026-08-20 equilibrium review, and the 2026-08-20 journey-acceptance review all independently conclude the same thing: no public route, revision, or URL should be claimed until specific evidence gates clear. Nobody's asleep at the wheel here. The site correctly says nothing because the project has correctly said nothing publicly yet.
- **The real gap isn't the website. It's the distance between "Stage 0-1 committed roadmap" and "what's actually built and verified."** Of 16 ADRs, 12 are still Open. The PRD Build Directive's own Stage 1 feature list (Concept Board UI, promote/disrupt/invert logic, notifications, reader edition) is mostly undelivered.
- **Five items are pure verification debt**, not build debt: code exists, but nobody's run it against anything real. No live Phi-4 Actions run, no live webhook delivery test, no DB restore drill, no external end-to-end journey, no verified GitHub App auth. These are cheap to close and currently block any confident public claim.
- **Two governance drifts need a paper fix, not a build fix**: the "six-state" submission model that `open-questions.md` calls locked is actually a nine-state enum in the live schema (restricted/withdrawn/archived got added later, undocumented). And consent/moderation code (routes, tables, tests) already exists in the checkout even though both design docs explicitly say they don't authorize a migration or API gate yet. Someone built ahead of sign-off.
- **A handful of items are correctly paused, not neglected**: ADR-0015 (reader interest signal) and ADR-0016 (structural transposition / classics seed library) are pre-scoping by design. Consent enforcement, moderation enforcement, public reporting, monetization, and mobile are deliberately gated per Mission principle #10 and the Stage 8 "not a feature toggle" language. Don't let a gap-closing sprint accidentally pull these forward.
- **Housekeeping is already identified and just waiting on your go-ahead**: the ADR-0007 duplicate, the `_to_delete/` holding pens, the root `skills/` duplicate, and the stale ADR index (missing 0015/0016) were all flagged by the 2026-08-19 repo-organizer pass. Nothing's been executed pending your approval of the migration table.
- **Recommendation, ahead of the detail below:** run a two-track close-out (Evidence Sprint + Stage 1 Core Loop) before spending any more effort on new design docs. You have plenty of paper. What you're short on is a working demo you can point a steward at.

---

## Finding 0: what's actually on overkillhill.com/projects/

Fetched 2026-08-27. Full listing:

| Project | Category |
|---|---|
| Skillz Forge | Built at the Hill |
| Found-Rᵧ | Built at the Hill |
| Mermaid Theme Builder | Built at the Hill |
| BPMN for Mermaid | Built at the Hill |
| Mac Studio Local AI Workbench | Built at the Hill |
| Glee-fully Chai Chasers | Built at the Hill |
| Abrahamic Reference Engine | Built at the Hill |
| Prompt Forge | Built at the Hill |
| Glee-fully Personalizable Tools, AskJamie, Protocol Libraries | External Tools & Platforms |

No Telling Forward entry, no narrative/storytelling platform of any kind. Given the launch-gate findings below, that's the correct current state, not an oversight to fix by adding a listing. Flagging it as "Finding 0" mainly so you don't independently wonder why it's missing.

---

## What "in scope" means here

The repo itself draws a hard line between three tiers, and the gap analysis below respects it rather than flattening everything into one backlog:

1. **Committed near-term** — `attainable-delivery-roadmap.md`, `prd-build-directive-v1.md`, `replit-controlled-pilot-build-directive.md`. This is the actual build authorization. Stage 0-1, bounded.
2. **Aspirational long-term** — `dream-platform-specification.md`. Explicitly labeled "not a promise," gated by the 2026-08-19 equilibrium review to "discovery and design baseline" only.
3. **Settled, not in dispute** — the visual identity system (palette, typography, imagery rules) and the GitHub-native architecture (ADR-0003/0013). These are decided; nothing to remediate.

The gap matrix below only scores tier 1. Tier 2 items appear in the appendix for completeness but aren't treated as deficiencies — they were never authorized to be built yet.

---

## Gap matrix — committed near-term scope vs. delivered state

| # | In-scope item | Source | Status | Category |
|---|---|---|---|---|
| 1 | Concept Board UI (capsule capture, Disrupt/Invert actions) | PRD §7.2 | Not built — design-brief only (v1-v4), no implementation footprint | **Build gap** |
| 2 | Capsule promote/disrupt/invert backend logic | PRD §7.3 | Stub only; OpenAPI endpoints exist, no real logic behind them | **Build gap** |
| 3 | Contributor-facing notification system (5-state subset) | ADR-0002, PRD §7.11 | Not built — "no notification system exists in the repository" | **Build gap** |
| 4 | GitHub webhook sync/reconciliation | platform-requirements.md | Not built | **Build gap** |
| 5 | Basic reader edition (read-only canon view, 1 of 5 themes) | PRD §7.6 | Theme enum exists at schema/type level (5 named themes); reader-surface UI realization unconfirmed | **Build gap (partial)** |
| 6 | GitHub App migration (replace PAT auth) | PRD §7.9, open Q 15.6 | Decided, not built — still PAT-based | **Build gap** |
| 7 | Export/portability — actually tested | PRD §7.7 | Never tested; explicit "Blocked" gate in the directive | **Verification debt** |
| 8 | Phi-4-mini ingestion (Tier 1) real Actions run | ADR-0004 | Code-complete, fixture-tested only; zero live wall-clock runs | **Verification debt** |
| 9 | Live GitHub webhook delivery test | 2026-08-21 review | Blocked — no production secret configured, handler fails closed (correctly), never exercised live | **Verification debt** |
| 10 | Database restore drill | 2026-08-21 review | Never completed, "cannot be completed from this workspace" | **Verification debt** |
| 11 | End-to-end worldbuilder-to-reader journey | 2026-08-20 review | All 8 journey steps marked "Not run"; no published URL exists for anyone outside the workspace | **Verification debt** |
| 12 | Submission-state model documentation | open-questions.md 15.11 | Doc says six states locked; live schema has nine (`restricted`/`withdrawn`/`archived` added, undocumented) | **Governance drift** |
| 13 | Consent ladder code vs. design authorization | ADR-0008, consent-ladder-design.md | Design doc says "does not authorize a database migration or API gate"; `consents.ts` route + `consent_records` table + tests already exist | **Governance drift** |
| 14 | Moderation tooling code vs. design authorization | ADR-0008, moderation-tooling-design.md | Same pattern — design says enforcement not approved, but routes/tables/tests already exist | **Governance drift** |
| 15 | ADR index completeness | docs/adr/README.md | Traceability table reconciled 2026-08-21 but omits ADR-0015 and ADR-0016 entirely | **Governance drift** |
| 16 | ADR-0007 duplicate, `_to_delete/` pens, root `skills/` dup | repo-organizer assessment (2026-08-19, already in project memory) | Confirmed, migration table delivered, awaiting your approval — nothing executed | **Housekeeping (already queued)** |
| 17 | Reader interest signal (ADR-0015) | ADR-0015 | Pre-scoping proposal, correctly not designed further yet | **Paused by design — not a gap** |
| 18 | Structural transposition / classics seed library (ADR-0016) | ADR-0016 | "Authorizes scoping discussion only... does not authorize building anything" | **Paused by design — not a gap** |
| 19 | Consent/moderation *enforcement*, public reporting, monetization, mobile scope | Mission principle #10, Stage 8, launch-policy doc | Deliberately deferred pending traction/legal review | **Paused by design — not a gap** |

Items 1-6 are the real backlog: things the committed roadmap says should exist for Stage 1 and don't. Items 7-11 are cheap wins relative to their blocking power: nothing here requires new design, just running what's already built against something real. Items 12-15 are an afternoon of doc hygiene. Item 16 is already-approved-pending work sitting in your inbox. Items 17-19 should stay parked.

---

## Options for sequencing the close-out

| Option | What it does | Tradeoff |
|---|---|---|
| **A. Follow the roadmap doc order** | Work Stage 0 → Stage 1 items in the sequence `attainable-delivery-roadmap.md` already lays out | Safe, no re-litigating priority, but buries the cheap verification wins under harder UI work, so "no public claim can be made" stays true for longer than necessary |
| **B. Evidence-first** | Close items 7-11 (verification debt) before touching any new UI, since these are pure "run it and record the result" tasks with no design risk | Fast credibility win, gives you a real capability inventory to plan the rest against, but doesn't move the actual product forward — a steward still can't do anything new when it's done |
| **C. Two-track: Evidence Sprint + Core Loop, in parallel** | Track 1 closes items 7-11 (a few days, no design decisions needed). Track 2 builds items 1-4 (Concept Board UI → promote/disrupt/invert → notifications → webhook sync), which is the actual Stage 1 "private contribution loop" the roadmap defines as the next dependency-spine link | Needs you to context-switch between a testing/ops mindset and a build mindset, but gets you both a defensible capability claim and real forward progress in the same window |
| **D. Documentation reconciliation only, first** | Fix items 12-15 (state model doc, ADR index, consent/moderation authorization gap) before any new code, on the theory that governance drift compounds | Correct instinct in principle, but low-value as a standalone sprint — none of these block building; better folded into Track 1's spare cycles than run as its own phase |

---

## Recommendation

**Option C.** The evidence-debt items (7-11) are not sequencing-dependent on anything else and cost almost nothing to close, they just haven't been prioritized because they're unglamorous. Running them in parallel with the Concept Board build (items 1-4, the actual next link in your own dependency spine) means you close the "can I say anything happened" gap and the "does anything new exist" gap in the same window instead of picking one.

Fold the doc-hygiene items (12-15) into Track 1's slack time; none of them are blocking, they're just cheap to knock out once you're already in the review files. Leave the paused items (17-19) alone. Execute the already-approved housekeeping (16) whenever convenient. It's just waiting on your sign-off on the migration table, not new analysis.

Do not use this close-out as a reason to open ADR-0015 or ADR-0016. Nothing in this review changes the case for either; they're still pre-scoping by design.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Concept Board UI turns into another open-ended design cycle instead of a build task | It already has four vision-brief drafts (v1-v4) and a PRD acceptance criterion ("Done when..."). Build against v4 and the PRD line, don't re-derive from scratch. |
| Closing the consent/moderation authorization gap (item 13/14) tempts someone to just retroactively "approve" the code that's already there | Don't. The design docs' own language is a deliberate safety rail (Mission principle #10). Either formally review and approve the existing code against the design, or roll it back to a stub until it's actually authorized. Silently blessing it defeats the point of having the gate. |
| The nine-vs-six state discrepancy gets "fixed" by reverting the schema instead of updating the doc | The schema is almost certainly right (it's exercised by a live review and covers real cases — restricted/withdrawn/archived). Update `open-questions.md` 15.11 to match reality, don't regress the code. |
| Verification-debt items get skipped because they feel low-status compared to feature work | They're explicitly named as blocking every public-claim gate you have (equilibrium review, journey-acceptance review, public-reporting-policy doc all say some version of "no claim until evidenced"). Treat them as release-blocking, not optional polish. |
| Running the Phi-4 Tier 1 pipeline live for the first time surfaces a real performance or cost problem | It's cheap to find out now on a synthetic fixture-adjacent run inside your own CI, versus finding out after a contributor is waiting on it. Budget for the possibility that Tier 1 needs tuning before it's real. |

---

## Next actions

- [ ] Run the manuscript-ingestion Tier 1 pipeline once against real Actions hardware; record the wall-clock number (closes item 8, unblocks any contributor-facing turnaround-time language)
- [ ] Configure a production webhook secret and exercise one real GitHub delivery end-to-end (item 9)
- [ ] Run the encrypted `pg_dump`/restore drill against the owner-controlled database (item 10)
- [ ] Run the full worldbuilder-to-reader journey against a real deployed instance, not the local workspace, and record which of the 8 steps pass (item 11)
- [ ] Actually test export/portability end-to-end and close the PRD's "Blocked — never tested" gate (item 7)
- [ ] Build Concept Board UI against the v4 vision brief and PRD §7.2 acceptance criteria (item 1)
- [ ] Implement real promote/disrupt/invert logic behind the existing stub endpoints (item 2)
- [ ] Build the contributor-facing notification subset per ADR-0002's 5-state model (item 3)
- [ ] Build GitHub webhook sync/reconciliation (item 4)
- [ ] Migrate PAT auth to a GitHub App and verify it live (item 6)
- [ ] Update `open-questions.md` 15.11 to reflect the live nine-state schema (item 12)
- [ ] Either formally approve the existing consent/moderation code against its design docs, or stub it back out until approval exists (items 13-14)
- [ ] Add ADR-0015 and ADR-0016 to `docs/adr/README.md`'s traceability table so the index stops undercounting (item 15)
- [ ] Approve or reject the repo-organizer's pending migration table so the ADR-0007 duplicate and other housekeeping can actually execute (item 16, already queued, just needs your yes/no)

---

## Appendix: full ADR and open-question status (as of this review)

### ADR status

| ADR | Title | Status | Code-backed? |
|---|---|---|---|
| 0001 | Product naming and vocabulary | Accepted (naming); partial (vocabulary) | Partial |
| 0002 | Contributor notification model | Accepted (design); not implemented | No |
| 0003 | GitHub-native fast path vs. custom backend | Accepted | Yes |
| 0004 | Manuscript ingestion / bring-your-own-AI | Open | Partial (Tier 0/1/2 coded, Tier 1 unverified live) |
| 0005 | Reader state, provenance, contributor signals | Open | Partial |
| 0006 | Canon governance concepts | Open | No (blocked on no capsules table, which is itself correct per 15.12) |
| 0007 | Reader accessibility and clarity | Open | No |
| 0008 | Reader consent and contribution | Open | Partial, ahead of authorization (see governance drift above) |
| 0009 | Transformation fidelity and readability assist | Open | No |
| 0010 | Content ops and governance | Open | Partial |
| 0011 | Provenance and process artifacts | Open | No |
| 0012 | Scene-purpose framing | Open | No |
| 0013 | GitHub-native boundary and donor primitives | Accepted | Yes |
| 0014 | Storyworld creation boundary | Accepted | Yes |
| 0015 | Reader interest signal | Open, pre-review, missing from index | No — correctly paused |
| 0016 | Structural transposition / classics seed library | Open, pre-scoping, missing from index | No — correctly paused |

**4 of 16 Accepted, 12 Open.** That ratio is fine for a Stage 0-1 project; flagging it only because "11 of 12 ADRs are Open" was already called out in the 2026-08-19 review and hasn't moved much since.

### Open questions worth tracking (non-exhaustive, see `docs/decisions/open-questions.md` for all 21)

| # | Topic | Status |
|---|---|---|
| 15.6 | GitHub App vs. PAT | Decided, not built |
| 15.7 | Mobile scope and timing | Open |
| 15.10 | Consent boundary for Disrupt/Invert derivatives | Open — blocks any real use of those actions beyond synthetic demo |
| 15.11 | Four-vs-six-vs-nine submission states | Decided-but-stale (doc says six, schema has nine) |
| 15.13 | Reader accessibility/density metadata | Explicitly deferred |
| 15.19-15.21 | Reader interest signal granularity, cross-storyworld reuse consent, public-domain sourcing verification | All Open, all tied to the correctly-paused ADR-0015/0016 |

---

*Prepared from: README.md, AGENTS.md, docs/MISSION.md, docs/platform-requirements.md, docs/product/*.md, docs/decisions/*.md, docs/design/*.md, docs/adr/0001-0016, docs/reviews/2026-08-19 through 2026-08-21, and a live fetch of overkillhill.com/projects/ on 2026-08-27.*
