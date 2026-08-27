# Telling Forward: Public Vision vs. Implementation Gap Analysis

## Status

**Analytical review. Read-only against the codebase.** No deployment, security, or legal review was performed as part of this document.

## Session verification addendum

Verified 2026-08-26 against the live public surfaces and the current clone:

- The detail page `https://overkillhill.com/projects/telling-forward/` exists and its mission, open-canon model, frontstage/backstage vocabulary, six-state workflow, steward model, provenance intent, and staged path materially agree with `README.md`, `docs/MISSION.md`, and the governing ADRs.
- The detail page is not linked from the top-level `/projects/` navigation. The index describes itself as a sampling rather than a complete catalogue, so this is a discoverability gap, not proof that the project has no public page.
- The detail page labels the project **Open Source**. That is contradicted by `LICENSE`, which says the platform source is proprietary and all rights reserved, and by `CONTENT-LICENSE.md`, which explicitly says not to assume repository content is open source. This is a confirmed public-copy defect requiring correction before treating the page as authoritative.
- The detail page says GitHub holds the manuscript, review history, and provenance record. That is accurate only for the durable creative/provenance record. The repository separately defines private application-owned records for consent, moderation, identity, legal, and operational audit data. Public wording should preserve that boundary.
- The repository-declared checks were run in this session: `pnpm run typecheck` passed; `pnpm run build` exited 0. The API test command was not fully green in this environment: 20 test files passed, 3 failed during setup because `DATABASE_URL` or `AI_INTEGRATIONS_OPENAI_BASE_URL` was absent, and 3 suites were skipped. This is validation evidence, not deployment evidence.

These findings supersede any inference that the project is absent from the public site. The correct external comparison is: **detail page present and conceptually aligned; index linkage incomplete; license label incorrect; product delivery still short of the page's implied prototype destination.**

## Purpose

Compare what `overkillhill.com/projects/telling-forward/` states publicly about this effort against the vision, purpose, and decision record inside this repository, then identify anything in scope (stated or implied as a public commitment, even loosely) that is not fully implemented or delivered. This document closes with a remediation plan sequenced against the project's own [Attainable Delivery Roadmap](../product/attainable-delivery-roadmap.md).

## Sources reviewed

**Repository vision and purpose:**

- `README.md`, `docs/MISSION.md`
- `docs/platform-requirements.md` (dated 2026-08-24)
- `docs/product/dream-platform-specification.md`, `docs/product/attainable-delivery-roadmap.md`
- `docs/product/prd-build-directive-v1.md`
- `docs/adr/0001` through `0016`
- `docs/decisions/open-questions.md`
- `AGENTS.md`, `CHANGELOG.md`
- Prior internal reviews: `docs/reviews/2026-08-19-full-project-review-summary.md`, `docs/reviews/2026-08-19-dream-platform-equilibrium-review.md`, `docs/reviews/2026-08-20-telling-forward-equilibrium-review.md`, `docs/reviews/2026-08-20-telling-forward-journey-acceptance.md`

**Public source:**

- `https://overkillhill.com/projects/telling-forward/`, fetched 2026-08-26. Note: this page is **not linked** from the top-level `overkillhill.com/projects/` index. The index describes itself as a sampling, so whether this is deliberate or a missing cross-link remains an owner decision.

**Current-state verification (2026-08-26, beyond what the dated reviews above cover):**

- `git log` (repo has ~30 commits since the last equilibrium review on 2026-08-20/21)
- Direct grep for `createStoryworld`/`registerStoryworld`, Concept Board UI, notification and moderation/consent route implementations
- `artifacts/api-server/src/lib/github.ts` and `.replit` for GitHub App and deployment configuration

## Public page content (as fetched)

| Field | Public claim |
|---|---|
| Tagline | "A quiet place for stories to grow." |
| Description | Voice-first, agent-assisted platform for open-canon collaborative fiction; an originating author opens a storyworld, others extend it through distinct attributed paths, readers track lineage without confusing branches with canon |
| Purpose | Authorship accessible without becoming anonymous; collaboration open without leaving ownership unclear; GitHub houses manuscript and provenance, a custom interface hides the mechanics |
| Key features | Frontstage/backstage vocabulary; six-state submission workflow; world steward model; provenance tracking; canon/alternate separation |
| Scope | "Invite a Small Set of Authors" is marked **Active** in the staged path; the copy says this stage is being built, not that an externally verified pilot is live |
| Status | "Early concept & prototype, actively building" |
| Roadmap | 1. Small author invitations (**active**) 2. Reader exploration and contributor extensions (planned) 3. Attribution and permissions infrastructure (planned) 4. Return-user testing (planned) 5. Commercial adaptation only if earned (planned) |

The description, purpose, and feature list track the repo's `MISSION.md` and `docs/adr/0001` almost verbatim. No conceptual drift is confirmed. The differences are mainly delivery qualification, public indexing, and one license label. The page's **Active Build** wording is consistent with an active repository, but it must not be read as evidence that an outside participant can currently complete the full journey.

## Claim-by-claim gap table

| Public claim | Repo evidence | Status | Gap |
|---|---|---|---|
| Frontstage/backstage vocabulary | `docs/adr/0001` accepted; enforced in `CONTRIBUTING.md`, `platform-requirements.md` §4 | **Delivered in docs and API/UI copy layer** | None material |
| Six-state submission workflow | Locked in `open-questions.md` 15.11; schema (`proposals` table) and route logic exist and are tested | **Backend delivered; no confirmed end-to-end fixture with a real user** | Confirm CNT-06 flow works start to finish, not just per-state unit tests |
| World steward model | `stewards` table, `steward-dashboard.tsx` exist | **Steward can edit an existing world; cannot originate one** | No `createStoryworld` or `registerStoryworld` endpoint exists at all (ADR-0014 names this the concrete next build item) |
| Provenance tracking | `provenance_records` table, routes, tests exist | **Supported in checkout; production/live-GitHub exercise unverified** | No fixture-based rebuild-from-GitHub test has been run (equilibrium review gate) |
| Canon/alternate separation | Path states, proposal transitions implemented and tested | **Supported in checkout, production unverified** | Same as above |
| Stage path "Invite a Small Set of Authors" marked **Active** | Deployment lookup on 2026-08-20 and 2026-08-21: `isDeployed: false`, no `primaryUrl`; the current clone now verifies only the static Author App deployment | **Active build is supported; active participant pilot is not evidenced** | Qualify the page so active build work is not mistaken for a live external pilot |
| Hosting and prototype links | The repository confirms the GitHub Pages URL is the static Author App only; the API, authenticated writes, and GitHub-backed operations are not implied by that URL | **Partially delivered** | Add a visible prototype boundary and keep the Reader/API deployment claims separate until externally verified |
| Detail-page tag **Open Source** | `LICENSE` says the platform source is proprietary, all rights reserved, and not an open-source license; `CONTENT-LICENSE.md` repeats the boundary | **Contradiction** | Replace the tag with **Proprietary** or remove it; do not make an open-source claim without a new owner decision |

## Findings: deficiencies requiring action

Ordered by how directly each blocks the public page's own claims.

**1. The repository cannot yet evidence the full outside-participant pilot journey.**
The 2026-08-20 journey-acceptance run recorded `isDeployed: false`, empty `primaryUrl`, and `hasSuccessfulBuild: false`. The current clone later gained a verified static Author App deployment, but that does not host the API, database, authenticated writes, or GitHub-backed operations. The public page's **Active Build** label can remain, but the project needs live service evidence before it is described as an active participant pilot.

**2. Storyworld registration is not yet available in the product.**
ADR-0014 deliberately keeps repository creation and Kit application manual on GitHub. The missing in-scope capability is the explicit steward-invoked "Register storyworld" action that reads `storyworld.json` and the Kit contract into the application index. No `createStoryworld` or `registerStoryworld` mutation, route, or form is present. This is a confirmed build item with an already-decided boundary, not an invitation to automate repository creation.

**3. Only a static client shell is deployed; the product's actual promise (a working reader, a working submission loop) is not.**
`README.md` and `platform-requirements.md` both confirm: `https://okhp3.github.io/telling-forward/` serves the Author App's static assets only. GitHub Pages does not and cannot host the Express API, PostgreSQL, or authenticated GitHub-backed writes. The Reader (`artifacts/reader`) and companion surfaces (Archive, Broadsheet, Signal/Noise, Scriptorium) have no verified deployment at all. Given the mission's own line, "Readers are not an afterthought," this is a direct miss against a stated principle, not just an operational nicety.

**4. GitHub App authentication is implemented in code but not confirmed in a live service.**
`github.ts` imports `createAppAuth`, reads the three required App settings, and fails closed when the configuration is incomplete. The repository still identifies live GitHub App evidence as pending. Confirm the deployed environment and exercise one scoped read/write operation before treating the migration as delivered.

**5. Documentation has fallen behind the actual codebase.**
`CHANGELOG.md` stops at 2026-08-20. Since then, notifications went from "not built" (per the 2026-08-19 full-project review) to implemented (`routes/notifications.ts`, `lib/contributor-notifications.ts`, unread-count tracking). Consent and moderation went from "design only" to having real enforcement code (`routes/consents.ts`, `routes/moderation.ts`, fail-closed consent verification, atomic moderation decisions with audit events). The Concept Board UI, described as "not built, design-brief only" as recently as 2026-08-19, now exists at `artifacts/web/src/pages/concept-board.tsx`. None of this progress is reflected in the changelog, and the last equilibrium review (2026-08-20/21) predates most of it. The roadmap's own first practical backlog item #9, "build the Stage 0/1 traceability matrix and dated capability inventory," is still unstarted, and that gap is exactly why this drift went unnoticed.

**6. Export/portability has never been evidenced.**
`docs/product/attainable-delivery-roadmap.md` Stage 1 lists export as "Not yet evidenced." The dream-platform equilibrium review explicitly blocks any Stage 1 completion claim on a clean-environment restore test. Nobody has proven a worldbuilder can leave with their material.

**7. Mobile scope and timing (open question 15.7) is still open, but the Expo app keeps receiving dependency work.**
Recent commits ("Update mobile package dependencies," "Make Babel traversal available to mobile Metro") show ongoing investment in a surface whose product scope was never decided. This is exactly the kind of drift ADR-driven process is meant to prevent: implementation momentum quietly answering a question that was supposed to stay open until an owner decision.

**8. Consent and moderation are implementation and policy boundaries, not public-launch authorization.**
`docs/decisions/public-reporting-policy-and-launch.md` explicitly declines the public contribution report surface for the current pilot. The code and tests provide useful local evidence, but they do not authorize public contribution, public reporting, untrusted uploads, derivative processing, or monetization. Keep these as launch gates in the plan rather than presenting them as missing features to build immediately.

## Recommendation

Close the delivery gap while correcting the public copy defect immediately. The fastest product path is a real, externally reachable deployment of the API alongside the already-deployed Author App shell, followed by the Reader and live pilot journey. In parallel, correct the **Open Source** label and add the detail page to the project index. Storyworld registration and export remain bounded build and evidence items with their design already decided or documented.

Do not describe the project as open source until the repository license changes by explicit owner decision. The page's mission, vocabulary, feature list, and active-build framing are substantially accurate. The honest delivery boundary is that the Author App is a static prototype deployment; service-backed reading, writing, and pilot operations still need live evidence.

## Remediation plan

| Phase | Work | Exit evidence | Dependency and boundary |
|---|---|---|---|
| 0. Public truth | Correct the license tag, add the detail page to the project index, and qualify the static prototype boundary. | Public page no longer says Open Source; index link resolves; prototype/API boundary is visible. | Website change is outside this repository and requires the site owner or website checkout. No code-license change is implied. |
| 1. Delivery foundation | Confirm GitHub App secrets, deploy the API and database, select and deploy the Reader surface, and record revision and route smoke results. | Health, authentication, read, and protected-write checks pass at a reachable URL; the deployment evidence record names what is and is not live. | Keep the pilot invite-only. GitHub remains the durable creative source and PostgreSQL remains rebuildable index/control-plane storage. |
| 2. One complete pilot journey | Use one governed Storyworld Kit repository to run capsule capture, review, scene maturation, contribution, six-state review, canon or alternate outcome, notifications, attribution, and Reader output. | A dated journey acceptance record passes with a representative participant and real GitHub-backed records. | No public contribution, untrusted uploads, derivative processing, or automatic canon decisions. |
| 3. Close named Stage 1 gaps | Implement steward-invoked `registerStoryworld`; establish the Stage 0/1 traceability matrix; reconcile `CHANGELOG.md`; test export and clean-environment restoration. | Registration round-trips from a validated Kit; every requirement has a status and owner; export is readable or restorable with boundaries recorded. | Follow ADR-0014. Do not automate repository creation. Do not treat synthetic-only restore checks as production recovery proof. |
| 4. Evidence and scale gates | Complete live webhook duplicate-delivery and reconciliation tests, verify GitHub App-only service identity, decide mobile scope, and close any environment-dependent API test failures. | Live evidence covers webhook replay, rebuild, permissions, recovery, and the approved mobile decision; test prerequisites are documented and repeatable. | No next-stage public launch until consent, moderation, rights, retention, backup, and appeals gates are explicitly approved and evidenced. |
| 5. Later vision | Only after the private pilot earns evidence, plan public discovery, additional kit types, deeper reader tools, broader contribution, and commercial/adaptation work as separate gated initiatives. | New stage brief with owner decision, rights posture, safety controls, success measures, and rollback or withdrawal path. | The expansive dream specification remains a target-state vision, not current delivery authorization. |

### Minimum traceability matrix fields

The missing matrix should record, for each promise or requirement: source path and ID, user and job, current implementation path, durable record, evidence tier, deployment status, acceptance test, owner, dependency, and explicit disposition. Use these dispositions consistently: `implemented in checkout`, `provisional`, `deployed`, `not yet evidenced`, `intentionally deferred`, `open decision`, or `not planned`.

The matrix should include both the repository's original purpose statements and the public page's claims. This is how the project can preserve the aligned vision while preventing a public status label, a static shell, or a test-only route from being mistaken for delivered product capability.

## Options

| Option | What it does | Tradeoff |
|---|---|---|
| **A. Correct public metadata and ship the service boundary (recommended)** | Replace the incorrect license tag, link the detail page from `/projects/`, deploy the API and Reader, confirm GitHub App secrets, and re-run the journey acceptance against the real deployment | Fixes the confirmed copy defect immediately and closes the highest-value delivery gap in one evidence-led sequence |
| **B. Build storyworld registration next** | Implement `registerStoryworld` per ADR-0014's manual GitHub creation plus steward-invoked registration decision | Closes a real, named gap, but does not make the pilot operational until the API is reachable |
| **C. Keep the external page at prototype status while delivery proceeds** | Retain **Active Build**, but add a clear static-only prototype boundary and defer any active-participant language | Honest short-term posture if deployment timing is uncertain, without rewriting the aligned mission or feature copy |

Recommended sequencing: **public metadata correction and index linkage immediately; service deployment and live journey next; registration, traceability, export evidence, and documentation cleanup in parallel; mobile scope decision before further mobile investment.**

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Deploying before consent/moderation enforcement has acceptance evidence gets read as "public contribution is live" | Deploy invite-only, gate registration/sign-up behind explicit invitation, and keep the public reporting surface declined exactly as already documented |
| GitHub App secret confirmation gets skipped and the platform silently runs on the PAT fallback indefinitely | Verify `GITHUB_APP_ID`/`GITHUB_APP_INSTALLATION_ID`/`GITHUB_APP_PRIVATE_KEY` are actually present in the deployed environment before calling the migration done; the code already fails closed, so a missing key is loud, not silent, but only if someone checks |
| Mobile dependency work keeps advancing a surface with an undecided product scope | Either decide 15.7 now (even a narrow "voice-capture only, no full mobile UI for Stage 1" answer) or freeze mobile package changes until it is decided |
| Documentation drift continues because nothing forces the traceability matrix to get built | Treat the matrix as a P0 deliverable of this plan, not a someday item; it is the only thing that would have caught findings 5 and 7 automatically |
| Fixing the deployment gap invites scope creep into building every Stage 1 requirement slice before shipping anything | Hold the line at "one deployed, invite-only pilot with one storyworld," exactly as the roadmap's own Stage 0 recommendation already states |

## Next actions

- [ ] Correct the public detail page's **Open Source** tag to **Proprietary** or remove it, and preserve the repository/content license distinction.
- [ ] Add `/projects/telling-forward/` to the `/projects/` index navigation so the effort is discoverable from the public catalogue.
- [ ] Add a static-only prototype boundary to the public page: the GitHub Pages URL is the Author App client, not the API, database, authenticated writes, or live pilot service.
- [ ] Confirm `GITHUB_APP_PRIVATE_KEY` and the other two App settings are actually set in the deployed environment, not just created.
- [ ] Deploy `artifacts/api-server` to a reachable environment and record the revision, URL, and a route-level health check.
- [ ] Deploy at least one reader surface, with `artifacts/reader` as the current recommendation, alongside the API.
- [ ] Re-run `docs/reviews/2026-08-20-telling-forward-journey-acceptance.md` against the live deployment with a real or representative participant, keeping the pilot invite-only.
- [ ] Build `registerStoryworld` per ADR-0014's decided b2 framing: manual GitHub-side creation, steward-invoked registration, `storyworld.json` and Kit contract validation, and no automatic repository creation.
- [ ] Build the Stage 0/1 traceability matrix and dated capability inventory, including every original vision item marked implemented, provisional, deployed, deferred, open, or not planned.
- [ ] Update `CHANGELOG.md` to cover the work after 2026-08-20 and reconcile prior review claims with current code.
- [ ] Decide 15.7, the mobile scope and timing, or freeze further mobile dependency work until it is decided.
- [ ] Run a clean-environment export and restore test to close the Stage 1 portability gap.
- [ ] Do not open public contribution, public reporting, untrusted uploads, rights-sensitive derivatives, or monetization until the existing consent, moderation, rights, recovery, and owner-approval gates are separately evidenced.

## Follow-up questions

1. Do you want me to draft the `registerStoryworld` endpoint now (matching ADR-0014's decided framing), or just leave this as a scoped, ready-to-build item?
2. Should the public `overkillhill.com` page get a same-day edit softening "active" to something accurate, while the deployment work is in flight, or hold the current wording and just move fast?
3. Can you confirm whether the GitHub App private key actually made it into Replit's secrets form? That single fact changes whether "GitHub App migration" should be logged as done or still-open.
4. Want this filed as a new open question / ADR follow-up (e.g. an ADR-0017 closing the deployment-evidence gap), or is this document sufficient as its own record?
