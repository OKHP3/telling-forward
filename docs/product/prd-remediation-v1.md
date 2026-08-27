# Telling Forward — Remediation PRD & Replit Multi-Task Plan (v1)

**Date:** 2026-08-27
**Author:** Prepared for Jamie Hill, for hand-off to Replit's build agent
**Supersedes nothing** — this is additive to `docs/product/prd-build-directive-v1.md` and `docs/product/attainable-delivery-roadmap.md`. It exists because the 2026-08-27 gap analysis (`docs/reviews/2026-08-27-overkillhill-projects-vs-vision-gap-analysis.md`) found real distance between what those two docs already authorize and what's actually built. This PRD turns that distance into a task list an agent can execute against without re-litigating scope.

**How to use this doc:** Each task below is scoped to be handed to Replit's agent as a standalone unit of work. Each has a Why, a Scope, explicit Non-goals, a Done-when acceptance list, and file/area pointers grounded in the actual repo layout. Tasks are grouped into two tracks that run in parallel, not in sequence. Do not reorder tasks between tracks — Track A has zero design dependencies and should never wait on Track B.

---

## Ground rules (apply to every task in this document)

1. **Do not touch anything on the "Do not build" list** from `prd-build-directive-v1.md` §10 or the "Explicitly deferred work" list in `replit-controlled-pilot-build-directive.md`. Specifically: no public contribution surfaces, no untrusted uploads, no CIE/PIE execution against another person's material, no monetization/payment code, no license changes, ADR-0015, ADR-0016.
2. **Every task that touches the `proposalStateEnum` or any Open ADR must not silently resolve the ADR.** Build against the *current, live* schema (nine states, not six) and flag the doc-vs-schema drift in the PR description; don't "fix" it by changing the schema to match the stale doc.
3. **Every task in Track A (Evidence Sprint) produces a dated artifact in `docs/reviews/`** in the same style as the existing 2026-08-20/21 review docs — a real run, a real timestamp, a real result, including negative results. No task in Track A is "done" on code existing; it's done on a recorded live outcome.
4. **No task may claim a capability is "production-ready" or "publicly launchable."** Per the public-reporting-policy doc and the equilibrium review, that determination is Jamie's, gated on the full launch checklist, not a side effect of closing a ticket.

---

## Track A — Evidence Sprint (no design risk, run what already exists)

### A1. Run manuscript ingestion Tier 1 live, once, for real
**Why:** ADR-0004 and `docs/reviews/2026-08-21-manuscript-ingestion-timing.md` both flag that the Phi-4-mini-instruct CPU inference path has never executed on real GitHub Actions hardware. No wall-clock number exists. Nothing contributor-facing can state a turnaround time until this runs.
**Scope:** Trigger `.github/workflows/manuscript-ingestion.yml` against a real (synthetic/owned) manuscript fixture on actual Actions runners. Pin `HF_MODEL_REVISION` to a specific commit hash before running (currently unpinned — pin it as part of this task, not after).
**Non-goals:** Do not tune model parameters or attempt to optimize latency in this task. Just run it and record what happens, including failure.
**Done when:**
- A pinned model revision hash is committed to the workflow file.
- One real Actions run completes (or fails) end to end.
- A new `docs/reviews/2026-08-2X-manuscript-ingestion-live-run.md` records: wall-clock duration, Actions minutes consumed, pass/fail, and the actual extracted capsule output compared against the fixture's expected output.
- If it fails, the failure mode is documented, not silently retried into passing.

### A2. Exercise one real GitHub webhook delivery end-to-end
**Why:** `docs/reviews/2026-08-21-live-webhook-duplicate-delivery.md` confirms the handler correctly fails closed because no production webhook secret is configured. Correct behavior, but untested against a real delivery.
**Scope:** Configure a production webhook secret for one pilot storyworld repo (the `content/pilot-storyworld/` instantiation, e.g. `OKHP3/telling-forward-pilot-grove` per the 2026-08-21 kit-setup review). Trigger one real GitHub event (issue comment or push) and confirm signature verification, idempotency, and correct DB write.
**Non-goals:** Do not build new webhook handling logic. This is a configuration + live-test task against existing code.
**Done when:** A new review doc records the delivery ID, signature verification result, and confirms no duplicate-processing occurred on a re-delivered event (GitHub redelivers on failure; confirm the handler is idempotent against that).

### A3. Run a real encrypted pg_dump / restore drill
**Why:** `docs/reviews/2026-08-21-database-restore-drill.md` states this has never been completed and cannot be completed from a Cowork session — it needs to run somewhere with direct DB access, i.e., Replit.
**Scope:** Full backup-and-restore cycle against the owner-controlled Postgres instance: encrypted dump, restore to a clean environment, verify row counts and referential integrity match pre-dump state.
**Done when:** Restore succeeds against a clean environment with verified row-count parity; a review doc records the encryption method, dump size, restore duration, and any data loss (there should be none — if there is, that's the finding, not a reason to suppress the report).

### A4. Run the full worldbuilder-to-reader journey against a real deployed instance
**Why:** `docs/reviews/2026-08-20-telling-forward-journey-acceptance.md` marks all 8 journey steps "Not run" and states there's no published URL to hand anyone outside the workspace.
**Scope:** Deploy the current Stage 0-1 build to a real, reachable environment (Replit deployment, not local workspace). Walk all 8 journey steps as an actual test pass: storyworld creation → capsule capture → promote to scene → submit → steward review → canon acceptance → reader view → provenance display.
**Non-goals:** Do not fix bugs discovered mid-journey inside this task — record them as findings and file them as new tasks. The point of A4 is an honest pass/fail record, not a green checkmark by construction.
**Done when:** A review doc records pass/fail per step with evidence (screenshot, response payload, or log line) for each, and a reachable URL exists that a steward could actually be pointed at.

### A5. Actually test export/portability
**Why:** PRD §7.7 calls this "Blocked — never tested," an explicit exit gate that's still open.
**Scope:** Export a real pilot storyworld, tear down or spin up a clean environment, re-import, and confirm the reconstructed state matches the original (capsules, canon, proposal history, provenance records).
**Done when:** Documented round-trip with before/after diff showing parity (or documented gaps if parity fails).

---

## Track B — Core Loop Build (the next link in the roadmap's own dependency spine)

### B1. Build the Concept Board UI
**Why:** This is PRD §7.2, the single most-cited "not built" item across every review doc since 2026-08-19. It's also the literal entry point to the private contribution loop that Stage 2 depends on.
**Scope:** Build against `docs/design/ui-vision-brief-v4.md` (the current, corrected vision brief) and PRD §7.2's acceptance line. Non-linear capsule capture surface in the Author App (`artifacts/web`). Corkboard/index-card visual metaphor, explicitly not a Kanban/sprint board. Capsule types: character, arc-beat, event (per the confirmed vision — do not add capsule types beyond what's already designed). Two first-class actions: **Promote to scene** (hands to Scene Writer, deliberate, never automatic) and the Inversion pair, **Disrupt** (prose-level) and **Invert** (concept-level).
**Non-goals:** Do not implement Disrupt/Invert's actual generative backend logic in this task if ADR consent work (item B2 below) isn't done yet — the UI can exist with the actions visibly gated/disabled pending B2, consistent with the pilot directive's explicit instruction that Disrupt/Invert stay "owner-controlled synthetic demonstration only" until consent decisions are approved. Do not build a Transpose action (ADR-0016, not authorized).
**Done when:** A world owner can create, edit, and organize capsules on the board; Promote to Scene correctly hands off to the Scene Writer; Disrupt/Invert are visible but gated behind the existing owner-only/synthetic-demo restriction; capsules persist as GitHub Issues via the already-built `github.ts` client, not a new capsules table.

### B2. Implement real promote/disrupt/invert backend logic
**Why:** PRD §7.3 — the OpenAPI endpoints for these three actions are stubbed, not implemented.
**Scope:** `/promote`: real logic to hand a capsule to the Scene Writer as a draft scene. `/disrupt` and `/invert`: real logic, but gated exactly as B1 describes — functional only in the owner-controlled synthetic-demonstration mode until ADR-0008's consent-ladder items 15.10 (consent boundary for Disrupt/Invert derivatives) are resolved. Do not open these to invited contributors in this task.
**Done when:** All three endpoints do real work against real data (not stubs) and the gating condition is enforced server-side, not just hidden in the UI.

### B3. Build the contributor-facing notification subset
**Why:** ADR-0002 (design, accepted) has zero implementation. PRD §7.11 scopes this down to the 5-state contributor-facing subset only (not the full internal ops-alerting system).
**Scope:** Plain-language notifications for the five contributor-visible states: submitted, under review, returned with notes, accepted into canon, published as alternate path. In-app inbox is sufficient for this phase; email/push is out of scope unless already trivial given existing infra.
**Non-goals:** Do not build steward-facing internal alerting in this task — that's a different, unscoped surface.
**Done when:** A contributor whose proposal changes state sees a calm, correctly-worded notification matching ADR-0002's two-tier model, sourced from real proposal-state transitions, not mocked data.

### B4. Build GitHub webhook sync/reconciliation
**Why:** Flagged as not built in `platform-requirements.md` and required for the app's Postgres cache to stay honest against GitHub as the source of truth (ADR-0003/0013's whole architectural premise depends on this actually running).
**Scope:** Handle push/issue/PR webhook events for a registered storyworld repo, reconcile against the Postgres projection, and correctly resolve drift (e.g., an Issue edited directly on GitHub outside the app).
**Done when:** A change made directly on GitHub (not through the app) is correctly reflected in the app's projection within a defined SLA, verified against a real repo (this can reuse A2's test setup).

### B5. Basic reader edition — ship the UI, not just the schema
**Why:** The `readerTheme` enum (five themes) already exists at the schema/type level, but per the 2026-08-19 review, actual reader-surface UI realization was unconfirmed.
**Scope:** A read-only view of one pilot storyworld's accepted canon, rendering in the `editorial` theme (the default), reading real accepted-canon data, not fixtures.
**Non-goals:** Do not build all five themes in this task — ship one working theme end-to-end first. Theme-switching infrastructure can follow once one theme actually renders real data correctly.
**Done when:** A reader can open the pilot storyworld's reader edition and see real accepted scenes, contributor credit, and path structure, matching the accessibility floor already specified (WCAG-adjacent: keyboard, headings, focus, contrast, mobile).

### B6. Migrate PAT auth to a GitHub App
**Why:** Decided (open question 15.6) but not built. Equilibrium review calls this an open implementation gap. Security debt: PAT-based auth doesn't scale past the single-owner pilot and is a real risk if this checkout is ever shared.
**Scope:** Replace the existing PAT-backed GitHub client auth with a GitHub App installation flow. Remove the PAT dependency entirely once the App path is verified working, per PRD §7.9's explicit language ("replace PAT auth entirely," not run both in parallel indefinitely).
**Done when:** All GitHub API calls (capsule CRUD, webhook verification, repo operations) go through the App identity; PAT is removed from the codebase and from any stored secrets; verified against a real repo operation, not just a successful token exchange.

---

## Housekeeping (fold into either track's spare cycles — not a separate phase)

### H1. Correct the stale six-state documentation
**Scope:** Update `docs/decisions/open-questions.md` item 15.11 to state the live nine-state model (`draft, submitted, under-review, returned-with-notes, accepted-into-canon, published-alternate, restricted, withdrawn, archived`) as current. Do not touch the schema — it's correct; the doc is stale.
**Done when:** The doc matches the schema, and a one-line note explains when/why `restricted`/`withdrawn`/`archived` were added (cross-reference the withdrawal-preservation-policy.md and consent-ladder-design.md work that likely drove the addition).

### H2. Reconcile consent/moderation code against its own design authorization
**Why:** Both `consent-ladder-design.md` and `moderation-tooling-design.md` explicitly state they do not authorize a database migration or API gate, yet `consents.ts`, `moderation.ts`, their tables, and their tests already exist in the checkout. This is a governance integrity issue, not a build task — resolve it by decision, not by code change.
**Scope:** This is a task for Jamie, not Replit's agent: either (a) formally review the existing code against the design docs and issue an explicit ADR/decision entry approving it retroactively, or (b) instruct the agent to revert the enforcement-adjacent code to a stub until approval exists. Replit's agent should not decide this unilaterally.
**Done when:** One of the two paths above is chosen and recorded in `docs/decisions/`.

### H3. Add ADR-0015 and ADR-0016 to the ADR index
**Scope:** `docs/adr/README.md`'s traceability table was reconciled 2026-08-21 but omits both. Add them with status "Open, pre-scoping" and "Open, pre-scoping" respectively.
**Done when:** The index table row count matches the actual ADR file count (16, not 14).

### H4. Execute the repo-organizer's already-approved-pending migration table
**Scope:** Not new analysis — `docs/reviews` (repo-organizer assessment, referenced in project memory) already has a concrete migration table (ADR-0007 duplicate, `_to_delete/` pens, root `skills/` duplicate, etc.) awaiting Jamie's go-ahead. If Jamie approves it, this is a mechanical `git mv`/`git rm` pass, not a design task.
**Done when:** Migration table executed per its own rows, verification step (git status/diff, link check) run per the organizer skill's own process.

---

## Explicit non-scope reminder (do not let this PRD's momentum pull these forward)

- ADR-0015 (reader interest signal) and ADR-0016 (structural transposition / classics seed library): both are pre-scoping by their own text. Nothing in this PRD authorizes design or build work on either.
- Consent/moderation **enforcement** for public use, public contribution reporting, monetization, and mobile scope: all remain deliberately gated per Mission principle #10 and the public-reporting-policy doc. Track A and Track B tasks above operate entirely within the private-pilot, owner/invited-tester boundary already authorized.
- Nothing in this PRD authorizes real untrusted uploads, derivative processing of another person's material outside the synthetic-demo gate, or any public-facing launch claim.

---

## Suggested sequencing for Replit's agent

Both tracks can start immediately and run concurrently — there's no dependency between them. Within Track B, B1 → B2 → B3 → B4 → B5 is the natural build order (each roughly depends on the previous existing, per the roadmap's own dependency spine), while B6 (GitHub App migration) can happen any time since it's orthogonal to the UI work. Within Track A, all five tasks are independent of each other and of Track B — run them in whatever order fits available environments/credentials first.

*Prepared from: `docs/reviews/2026-08-27-overkillhill-projects-vs-vision-gap-analysis.md`, `docs/product/prd-build-directive-v1.md`, `docs/product/attainable-delivery-roadmap.md`, `docs/product/replit-controlled-pilot-build-directive.md`, `docs/platform-requirements.md`, and the full ADR/open-questions set.*
