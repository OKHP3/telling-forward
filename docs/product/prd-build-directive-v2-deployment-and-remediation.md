# Telling Forward — PRD Build Directive v2: Deployment and Remediation Phase

*Prepared 2026-08-27 by Jamie Hill (OverKill Hill P3) for the Replit build agent working `github.com/OKHP3/telling-forward`. Supersedes nothing in [PRD Build Directive v1](prd-build-directive-v1.md) or the [Replit Controlled-Pilot Build Directive](replit-controlled-pilot-build-directive.md); extends both with what has shipped since and what is still missing.*

---

## 0. How to use this document

This is a build directive, not a design exploration, exactly like v1. Read in this order:

1. `AGENTS.md` — how to work in this repo.
2. [PRD Build Directive v1](prd-build-directive-v1.md) — still the record of what was decided on 2026-08-19. Its Section 4 decisions remain locked. Do not re-litigate them here.
3. This document — what shipped since v1, what is still missing, and the next twelve build items in priority order.
4. [`docs/reviews/2026-08-27-public-vision-vs-implementation-gap-analysis.md`](../reviews/2026-08-27-public-vision-vs-implementation-gap-analysis.md) — the audit this directive is built from. Every task below traces back to a specific finding there.

If any instruction here conflicts with a "Do Not Build" item in Section 8, Section 8 wins. If you hit a decision point not covered by v1's Section 4 or by an existing ADR, stop and raise it. Don't infer a call that isn't written down.

---

## 1. What shipped since v1 (2026-08-19 to 2026-08-27)

v1 characterized several items as "documented but not built." That is no longer accurate. Direct code inspection on 2026-08-27 confirms all of the following are now implemented, several with real test coverage:

| Capability | v1 status | Confirmed 2026-08-27 status |
|---|---|---|
| Concept Board UI | Not built, design-brief only | Built: `artifacts/web/src/pages/concept-board.tsx` |
| Capsule promote/disrupt/invert | OpenAPI stub only | Built: real route logic with OpenAI calls at `POST /:id/capsules/:capsuleId/{promote,disrupt,invert}` in `artifacts/api-server/src/routes/storyworlds.ts`, covered by `capsule-ai-actions.test.ts` |
| Notification system | Not built | Built: `routes/notifications.ts` (unread count, list, mark-read), `lib/contributor-notifications.ts`, covered by `contributor-notifications.test.ts` |
| Consent ladder | Design only, no enforcement | Built beyond design: `routes/consents.ts` (`hasActiveConsent`, list, grant, revoke), fails closed when verification is unavailable, covered by `consents.test.ts` and `consent-gate.integration.test.ts` |
| Moderation tooling | Design only, no enforcement | Built beyond design: `routes/moderation.ts` (cases, events, actions, controls, batch-dismiss, lift), atomic decisions with audit events, covered by `moderation-atomicity.test.ts` and `moderation-isolation.integration.test.ts` |
| Public reporting | Not addressed | Explicitly declined and documented: `docs/decisions/public-reporting-policy-and-launch.md`, reaffirmed in commit "Keep public reporting closed during private pilot" |

Do not re-build any of the above. The remaining work is verification, deployment, and closing four concrete gaps that this progress did not touch.

---

## 2. Current gaps (from the 2026-08-27 audit)

Full detail lives in the linked gap analysis. Summary for this directive's purposes:

1. **No live, externally reachable deployment exists.** All eight `artifacts/*` packages have a `.replit-artifact/artifact.toml` manifest, but the last deployment-service query (2026-08-21) returned `isDeployed: false` for every one of them. Only `artifacts/web`'s static assets are separately published, via GitHub Pages, as of 2026-08-24 — a different, narrower deployment path than the Replit autoscale target the manifests configure.
2. **No `createStoryworld` or `registerStoryworld` endpoint exists at all.** Confirmed by direct grep on 2026-08-27. ADR-0014 already decided the shape of the fix (framing b2: manual GitHub-side repo creation from the existing Kit, plus a steward-invoked "Register storyworld" action). Nothing has been built against that decision yet.
3. **The Stage 0/1 traceability matrix has never been built**, despite being named as outstanding in three separate places: the attainable roadmap's own first practical backlog (item 9), the 2026-08-20 equilibrium review's required gate 2, and PRD v1's exit criterion 2.
4. **Export/portability has never been evidenced.** Roadmap Stage 1 lists it "Not yet evidenced." PRD v1 exit criterion 4 and the equilibrium review's required gate 6 both still need a clean-environment restore test.
5. **GitHub App migration is code-complete but not confirmed live.** `github.ts` implements `createAppAuth` correctly and fails closed if secrets are missing. Per project memory, the App and installation were created 2026-08-25, but the private key's arrival in Replit's secrets form was never confirmed. PRD v1 exit criterion 6 (PAT removed, not just deprecated) is therefore still open.
6. **Mobile scope (open question 15.7) is still open**, but the Expo app keeps receiving dependency work regardless ("Update mobile package dependencies," "Make Babel traversal available to mobile Metro"). Implementation momentum is quietly answering a question that is supposed to stay with the owner.
7. **No Playwright or equivalent end-to-end coverage exists** for the submission-to-review-to-canon flow, a gap platform-requirements.md has recommended since before v1 and that now has a real flow worth testing.
8. **No fixture-based, single-run proof of the full six-state contributor loop exists.** Per-state unit and integration tests pass, but nobody has walked draft through to a terminal outcome in one recorded run.
9. **The 2026-08-20 worldbuilder-to-reader journey acceptance test was blocked before participant execution**, specifically because of gap 1. It has not been re-attempted since.

---

## 3. Build authorization scope

Unchanged from v1. Restated because it still governs everything below:

| Authorized now | Not authorized — do not build toward this yet |
|---|---|
| Deploying the existing private, invite-only pilot so it is externally reachable | Opening the deployment to public sign-up or unmoderated contribution |
| `registerStoryworld` per ADR-0014's already-decided framing | Automating repository *creation* (ADR-0014 explicitly keeps that manual) |
| Verifying and hardening consent/moderation code that already exists | Building new consent or moderation surface area beyond what v1 and this directive specify |
| Playwright coverage of the existing editorial flow | New product features not already scoped in v1 or here |
| A narrow, owner-approved mobile scope decision for 15.7 | Shipping mobile product surface ahead of that decision |

If a task in Section 4 looks like it needs to cross into the right-hand column to be "done properly," stop and flag it instead of building it partially.

---

## 4. Task list — this phase

Twelve tasks, in priority order. Each names the finding it closes, its acceptance criteria, and its dependencies. Numbered `T-1` through `T-12` to avoid colliding with GitHub issue numbers already in use in this repo.

### T-1: Build the Stage 0/1 traceability matrix and dated capability inventory

**Closes:** gap 3. **Why first:** it is the cheapest task here, it is the thing that would have caught the v1-to-now documentation drift automatically, and every later task in this list needs an accurate baseline to update.

Produce a single matrix (new file, `docs/product/traceability-matrix.md` or a machine-readable companion `.json`/`.csv` alongside it) with one row per Stage 0/1 requirement from `docs/product/attainable-delivery-roadmap.md` and `docs/product/dream-platform-specification.md`. Columns: requirement ID, user-visible behavior, API contract, durable schema or GitHub record, test or manual proof, status (implemented / tested / deployed / pilot-ready / blocked / not started), date last verified.

*Done when:* every Stage 0/1 requirement slice has a row, every status claim cites a real file or test, and the matrix is dated so future drift is visible instead of silent.

### T-2: Catch up `CHANGELOG.md`

**Closes:** gap 3 (documentation half). Cover 2026-08-20 through today: Concept Board UI, promote/disrupt/invert, notifications, consent ladder enforcement, moderation tooling, and the public reporting decision, each dated to its actual merge.

*Done when:* `CHANGELOG.md`'s newest entry is within one day of the actual latest merged work, going forward, not just for this backfill.

### T-3: Confirm and complete the GitHub App migration

**Closes:** gap 5, PRD v1 exit criterion 6.

1. Confirm `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY` are present as Replit secrets in the actual deployment environment, not just created on GitHub's side. If any is missing, that is a Jamie-side task (pasting the `.pem` into Replit's secrets form); flag it and stop rather than working around it.
2. Once confirmed, verify `resolveGitHubAuth` in `artifacts/api-server/src/lib/github.ts` actually selects the App path in that environment (it already fails closed on partial config; prove it succeeds on complete config).
3. Remove the PAT fallback path from the platform's own service identity, per v1's "not just deprecated" instruction. The workspace's own auto-push PAT (`scripts/git-askpass.sh`) is a separate credential and is out of scope for removal.

*Done when:* the API server authenticates to GitHub via the App in every environment it runs in, and grepping the codebase for the platform's own GitHub client construction finds no PAT branch left to fall back to.

### T-4: Build `registerStoryworld`

**Closes:** gap 2, the concrete build item ADR-0014 names directly.

Implement the steward-invoked registration action per ADR-0014's decided framing (b2):

- A steward points the app at an existing GitHub repository (created manually from the Kit, exactly as `content/pilot-storyworld/README.md` already documents).
- The endpoint reads that repository's `storyworld.json` and validates it against the Kit contract (`scripts/validate-storyworld-kit.mjs`'s rules).
- It checks `kitVersion` and rejects (with a clear, steward-facing message) a Kit copy that is out of date, rather than silently indexing it.
- On success, it creates the corresponding `storyworlds` row, satisfying ADR-0013's rebuild gate: the row must be reconstructible from the repository's own GitHub-native identifiers and Kit contract, not authored directly in Postgres.
- Repository *creation* stays manual and out of scope, per ADR-0014's guardrails. Do not build a "New Storyworld" button that creates a repo.

*Done when:* a steward can register a manually created, Kit-compliant repository through the app and get a working `storyworlds` row with no manual database patching, and registering a repository with a stale `kitVersion` fails with a clear message instead of succeeding silently.

### T-5: Deploy the API server and one reader surface

**Closes:** gap 1, the single fact blocking the public page's "actively inviting authors" claim.

1. Deploy `artifacts/api-server` to the Replit autoscale target its `.replit-artifact/artifact.toml` already configures. Record the resulting revision ID, URL, and a passing `/api/healthz` check against that URL specifically (not `127.0.0.1`).
2. Deploy `artifacts/reader` (the decision log already designates it the Editorial Reader candidate) alongside it. Record its revision and URL the same way.
3. Gate registration and sign-in behind explicit invitation, consistent with the still-declined public contribution surface. Deploying does not mean opening the door wider than the pilot already authorizes.
4. Confirm the GitHub App migration (T-3) is complete before or alongside this deployment, since the deployed API server is what actually exercises live GitHub writes.

*Done when:* both URLs resolve from outside the workspace, both pass a route-level health check against the published URL, and a steward can sign in and see the pilot storyworld through the deployed reader.

### T-6: Re-run the worldbuilder-to-reader journey acceptance test

**Closes:** gap 9. Depends on T-5.

Re-run [`docs/reviews/2026-08-20-telling-forward-journey-acceptance.md`](../reviews/2026-08-20-telling-forward-journey-acceptance.md)'s eight-step matrix against the live deployment from T-5, with a real or representative participant standing in for steward, contributor, and reader. Record the same fields the original blocked run specified: route-level evidence, vocabulary comprehension (did "storyworld," "path," "saved moment" land without Git jargon), and whether the steward/contributor/reader could each tell what they were permitted to do.

*Done when:* all eight steps show a result other than "Not run," and any step that still fails is reported as a named, specific defect, not folded into a vague "mostly works."

### T-7: Prove export and portability with a clean-environment restore

**Closes:** gap 4, PRD v1 exit criterion 4, equilibrium review required gate 6.

Pick the export path closest to already built (or build the minimum one that exists), run it against the pilot storyworld's real content, and restore that export into a genuinely clean environment (a fresh clone plus a fresh database, not the existing workspace). Verify the restored world is readable and its provenance records are interpretable without the original PostgreSQL instance.

*Done when:* a named export artifact exists, a named restore procedure exists, and the restore was actually executed once in a clean environment with the result recorded, not asserted.

### T-8: Close the negative-authorization test gap for consent and moderation

**Closes:** the "enforcement remains unapproved" caveat that has followed the consent and moderation work since it was design-only. The code now exists (Section 1); what is missing is proof it holds under adversarial conditions, which the 2026-08-20 equilibrium review specifically asked for.

Add or confirm test coverage for the specific failure modes `consent-ladder-design.md` and `moderation-tooling-design.md` were written to prevent:

- A contributor cannot grant themselves consent for an action scoped to someone else's material.
- Revoking consent actually blocks a subsequent disrupt/invert call on the same source, not just future new consent checks.
- A contributor cannot see or act on another storyworld's moderation cases (extend `moderation-isolation.integration.test.ts` if it does not already cover this).
- Consent verification failing (the database being unreachable, a malformed record) fails closed, per the existing "Fail closed when consent verification is unavailable" commit — write a test that actually forces that failure mode rather than trusting the commit message.

*Done when:* each bullet above has a named, passing test, and the test file is referenced from the traceability matrix (T-1).

### T-9: Add Playwright coverage for the submission-to-canon flow

**Closes:** gap 7, recommended since `docs/platform-requirements.md` Section 13 and never built.

Cover, in one browser-driven test: a contributor creates a capsule, promotes it to a scene, submits it, a steward returns it with a note, the contributor resubmits, and the steward accepts it into canon. Mock the GitHub API boundary with MSW (already reserved in `pnpm-workspace.yaml` per Section 13's own recommendation) so the test does not depend on live GitHub calls or rate limits.

*Done when:* the test passes in CI (or the local equivalent if CI is not yet wired for this repo) and catches a deliberately introduced state-machine regression when one is tried against it as a sanity check.

### T-10: Run one fixture-based, single-session proof of the full six-state loop

**Closes:** gap 8. Distinct from T-6 (external participant acceptance) and T-9 (browser automation): this is a scripted, deterministic run against the API directly, cheap enough to run on every deploy.

Write a fixture script that walks `draft -> submitted -> under-review -> returned-with-notes -> under-review -> accepted-into-canon` (and, separately, the `published-alternate` branch) against a synthetic storyworld, asserting the provenance record exists and is idempotent under a retried finalization call.

*Done when:* the script runs green locally and its output is captured as evidence in the traceability matrix (T-1), for both terminal outcomes.

### T-11: Decide or freeze mobile scope (open question 15.7)

**Closes:** gap 6. This is a decision task with build implications, not a pure build task.

Draft two or three concrete options for Jamie to choose from (for example: "voice-capture-only companion for Stage 1, full mobile UI deferred to Stage 4" versus "freeze all mobile package work until Stage 2 identity decisions land"), with the tradeoffs of each stated plainly. Do not choose on Replit's own authority. Until a decision is recorded in `docs/decisions/open-questions.md`, do not merge further mobile dependency or scope changes beyond what is needed to keep the existing scaffold building.

*Done when:* 15.7 has a recorded decision, or an explicit owner-approved freeze is in effect and enforced (a CI check or a documented review gate, not just a note).

### T-12: Reconcile the public reporting and moderation launch gates against current evidence

**Closes:** verifies gap coverage is still accurate now that real moderation code exists. `docs/decisions/public-reporting-policy-and-launch.md` was written when moderation was design-only; moderation now has real route logic (Section 1). Confirm its stated gates (deployed retention/recovery behavior, primary and backup steward coverage, abuse controls, appeals, route-level isolation evidence) are still an accurate list given what has actually shipped, and update the document's status table if any gate has evidence now that it didn't have when it was written. Do not change the launch decision itself (public contribution stays declined) without a separate explicit owner call.

*Done when:* the decision document's evidence table matches the current codebase, and the launch decision (declined) is either reaffirmed with updated reasoning or explicitly escalated back to Jamie if the evidence has changed enough to warrant revisiting it.

---

## 5. Non-functional requirements for this phase

- **Testing.** Every task above that touches route logic (T-4, T-8) ships with test coverage in the existing Vitest style. T-9 and T-10 add new coverage classes (browser automation, fixture-script) that did not exist before; document the command to run each in `AGENTS.md`'s validation-commands section once they exist.
- **Validation commands.** Run `pnpm run typecheck` and `pnpm run build` before any handoff on every task, per `AGENTS.md`. No exceptions.
- **Change hygiene.** Every commit auto-pushes and is effectively public. Keep commits scoped to one task at a time where practical.
- **Evidence discipline.** Do not mark a task "done" in the traceability matrix (T-1) on the strength of code existing alone. A task is done when its stated acceptance criterion has been executed and its result recorded, matching the discipline the 2026-08-20 equilibrium review already established for this project.

---

## 6. Do not build — hard stops

Unchanged from v1 and the Replit Controlled-Pilot Build Directive. Restated:

- Any surface that accepts contributions, uploads, or content from anyone other than Jamie or the pilot's designated internal testers.
- Real untrusted uploads from the general public.
- CIE/PIE or Disrupt/Invert execution against another contributor's material without the resolved consent model open question 15.10 still asks for. (Owner-controlled synthetic/owned-material demonstration remains fine, per the existing directive.)
- Monetization, payment, royalty, or adaptation-rights promises of any kind.
- A code license decision beyond the existing proprietary placeholder.
- Automated repository *creation* for new storyworlds (T-4 explicitly excludes this; ADR-0014 keeps it manual).
- Any credential, token, or personal machine path committed to a tracked file.
- Shipping mobile product surface ahead of a recorded 15.7 decision (T-11).

---

## 7. Definition of done for this phase (exit criteria)

This phase is complete, and the public page's roadmap-step-1 "active" claim can honestly be called true, when:

1. T-1 through T-4 are complete (matrix exists, changelog is current, GitHub App is confirmed live, `registerStoryworld` works).
2. T-5 and T-6 are complete (a real deployment exists and the journey acceptance test has actually run against it, not just against localhost).
3. T-7 (export/restore) has been executed once in a clean environment.
4. T-8 and T-9 close the two outstanding "enforcement remains unapproved" and "no E2E coverage" caveats that have followed this project since before v1.
5. T-11 has a recorded decision or an enforced freeze; it is not left to drift further.

Until all of the above are true, do not describe this project publicly as having an active pilot, and do not treat T-4's `registerStoryworld` as authorization to build repository creation itself, or T-8/T-9's new test coverage as authorization to open public contribution. Those remain separate, later decisions.

---

## 8. Directive footer — instructions to the build agent

- Follow `AGENTS.md`'s safe change procedure for every task: read the core docs first (Section 0), make the smallest change that addresses the item, typecheck and build before handoff, re-read changed files, check `git diff --check`.
- Work T-1 and T-2 first. They are cheap, they unblock nothing being missed silently in the rest of this list, and they give Jamie an accurate picture before the more expensive tasks (T-5 through T-9) start.
- If a task turns out to require crossing into a Section 6 hard stop to be "properly" done, stop and report back instead of building a partial version of the restricted feature.
- If you hit a decision point not covered by v1's Section 4, an existing ADR, or this directive, don't infer an answer. Log it as a new open question in `docs/decisions/open-questions.md` and keep building around it if possible; otherwise stop and flag it.
- This document is v2. When a task here is completed, update its row in the traceability matrix (T-1) rather than deleting the task from this file, so the directive itself stays an honest record of what was asked for and what happened.
- Return a completion report in the same shape the Replit Controlled-Pilot Build Directive already specifies: what changed, the exact evidence produced per task, commands run and their actual results, and any discrepancy between this directive and observed implementation. Do not say a task is complete merely because code compiles.
