# Telling Forward: Replit Multi-Task Product Requirements Document

## Document control

- **Status:** Draft for owner-approved implementation planning
- **Prepared:** 2026-08-26
- **Audience:** Replit implementation team, project steward, product owner, reviewers
- **Repository:** `OKHP3/telling-forward`
- **Purpose:** Convert the repository's original vision, current architecture, documented decisions, and verified delivery gaps into an ordered multi-task plan that Replit can execute without silently expanding scope.
- **Authority:** This document is subordinate to the repository's accepted ADRs, `docs/decisions/open-questions.md`, `CONTRIBUTING.md`, `CONTENT-LICENSE.md`, and owner decisions recorded in the repository.

This is a build plan, not authorization to open public contribution, process untrusted uploads, publish derivative material, promise royalties, or monetize the platform. Those boundaries remain explicit below.

## 1. Executive summary

Telling Forward is a voice-first, agent-assisted platform for open-canon collaborative fiction. An originating author opens a storyworld. Invited people contribute characters, memories, possibilities, scenes, and story paths. A steward governs what becomes canon. Readers follow the resulting narrative lineage without confusing a community branch with the originating author's canon.

The product promise is not merely a writing editor. It is a governed collaboration loop with five linked outcomes:

1. A worldbuilder can establish a storyworld and its rules.
2. A contributor can begin with speech, memory, a question, or prose and retain authorship of their intent.
3. A steward can review, return, accept, or publish an alternate path through an explicit six-state model.
4. A reader can encounter a readable work with attribution, canon status, content notes, and lineage.
5. The project can recover its application index from GitHub-native creative records.

The current checkout contains meaningful implementation across the API server, Author App, Reader, database layer, Concept Board, proposals, notifications, consent, moderation, and GitHub integration. The most important remaining delivery gaps are not additional screens. They are end-to-end evidence, storyworld registration, reachable service deployment, export and restoration, GitHub App verification, traceability, and a controlled pilot journey.

The recommended delivery target is a private, invite-only vertical slice for one governed storyworld. Repository creation remains a deliberate manual GitHub-side operation using the Storyworld Kit. Telling Forward supplies the steward-invoked registration and application experience after the repository exists. GitHub remains the durable creative and provenance source. PostgreSQL remains a rebuildable index and control-plane store. Replit executes trusted server-side actions and provides the product language that hides GitHub mechanics from contributors and readers.

## 2. Evidence boundary and current-state labels

Replit must use the following labels in task updates and acceptance notes:

| Label | Meaning |
| --- | --- |
| **Implemented in checkout** | Code or documentation exists in the current clone. This does not prove deployment or production behavior. |
| **Provisional** | The implementation exists, but a dependency, policy decision, fixture, or live exercise remains incomplete. |
| **Deployed** | A reachable environment and revision have been verified for the named surface. |
| **Accepted** | The named journey or requirement passed its agreed acceptance test with recorded evidence. |
| **Not yet evidenced** | A claim may be plausible or partly implemented, but the required test or live proof has not been recorded. |
| **Intentionally deferred** | The item is outside the current pilot by decision. It is not a defect to repair in this plan. |
| **Open decision** | An owner decision is still required. Do not resolve it through implementation momentum. |
| **Unknown** | The repository does not provide enough evidence to classify the item. Ask or investigate. |

Do not use “done” without naming which of implementation, deployment, and acceptance has actually been proved.

## 3. Product identity and problem statement

### 3.1 Mission

Telling Forward makes collaborative fiction legible. It keeps authorship accessible without making it anonymous, and keeps collaboration open without making ownership unclear. The platform must make it easy to see the difference between:

- the originating author's seed and protected canon;
- an invited contributor's personal work;
- a proposed submission under review;
- an accepted canonical continuation;
- a published alternate path; and
- a reader's current route through the storyworld.

### 3.2 User problem

Existing collaborative writing tools tend to force a choice between a private editor and a technically exposed repository. They often flatten contributions, hide lineage, make review state ambiguous, or turn AI transformation into unacknowledged authorship. Telling Forward addresses this by making GitHub the backstage durable record while exposing a frontstage vocabulary designed for writers, stewards, and readers.

### 3.3 Product thesis

The product earns trust when every important action leaves a durable, attributable, inspectable record and when each participant can understand what will happen next. A fluent interface without rights, provenance, recovery, or status clarity is not sufficient.

## 4. Scope of this multi-task plan

### 4.1 In-scope target

Build and evidence one invite-only, author-led pilot loop:

1. A steward selects or creates a Storyworld Kit repository manually on GitHub.
2. The steward registers that existing storyworld in Telling Forward.
3. A worldbuilder configures the world and creates or reviews private capsules.
4. An invited contributor signs in, selects an allowed path, creates a recoverable draft, and submits a scene.
5. A steward reviews the submission using the six-state model.
6. The steward accepts the contribution into canon or publishes it as an alternate path when the rights and policy profile permit.
7. The contributor receives a clear status notification.
8. A reader can open the resulting readable edition and distinguish canon, alternate, attribution, and content notes.
9. The application index can be reconciled from the durable GitHub record.
10. The worldbuilder can export material or the team records an explicit, tested limitation before pilot acceptance.

### 4.2 In-scope supporting work

- traceability matrix for Stage 0 and Stage 1 promises;
- identity, invitation, role, and authorization boundaries;
- Storyworld Kit validation and registration;
- capsule and Concept Board consistency;
- scene maturation and proposal lifecycle;
- steward review and contributor notifications;
- Reader deployment and route-level smoke testing;
- GitHub App service identity verification;
- webhook idempotency and reconciliation;
- export and clean-environment restoration;
- environment-dependent test fixtures;
- pilot journey acceptance and evidence packaging;
- mobile-scope decision or an explicit freeze.

### 4.3 Explicitly out of scope for this plan

The following are target-state or later-stage concepts and must not be smuggled into the pilot as “small additions”:

- public self-service contribution;
- public reporting or open moderation queues;
- arbitrary untrusted file uploads;
- automatic canon decisions;
- CIE or PIE derivative processing without action-specific consent and lineage controls;
- royalties, virtual credits, paid access, platform fees, or adaptation economics;
- broad multi-world discovery and social networking;
- a full mobile product before open question 15.7 is resolved;
- changing the proprietary platform license to an open-source license;
- automatic creation of GitHub repositories when ADR-0014 requires manual creation and steward-invoked registration.

## 5. Product actors and permissions

| Actor | Primary job | Minimum pilot permissions |
| --- | --- | --- |
| **Worldbuilder / originating author** | Establish the world, its canon policy, source material, and allowed contribution profile. | Create and edit the world configuration, review private capsules, invite contributors, make steward decisions, export material. |
| **Steward** | Operate the review and governance boundary. | Register a world, manage invitations, review proposals, return notes, accept canon, publish permitted alternates, moderate pilot activity, inspect audit records. |
| **Invited contributor** | Add an attributable path or scene under the world policy. | Read permitted context, create private drafts, select an allowed path, submit, respond to notes, withdraw where policy allows, view status and attribution. |
| **Reader** | Read an approved edition and understand its lineage. | Access published material, see canon or alternate state, attribution, content notes, and path relationships. No write access. |
| **Service identity** | Perform scoped GitHub and application operations. | Read and write only within configured repositories and actions, with auditable identity and no user impersonation beyond an approved authorization model. |

Every route must enforce the actor's role and the world-specific policy. A hidden button is not an authorization control.

## 6. Architecture and system boundaries

### 6.1 Confirmed architecture direction

- `artifacts/web` is the canonical Author App integration candidate.
- `artifacts/reader` is the Reader surface candidate.
- `artifacts/mockup-sandbox` remains a sandbox and never becomes a production surface.
- `artifacts/api-server` is the Express 5 trusted action layer.
- `lib/db` is PostgreSQL plus Drizzle for rebuildable index and control-plane records.
- `lib/api-spec` is the OpenAPI source for generated client hooks and Zod schemas.
- GitHub is the durable system of record for story content, authorship, review history, and canon decisions.
- PostgreSQL records must identify their durable GitHub source and be recoverable by reconciliation.
- One GitHub repository represents one storyworld.
- New storyworld repositories use the Storyworld Kit, but repository creation and initial Kit application remain manual GitHub-side operations for the current pilot.

### 6.2 Data placement rule

The implementation must classify each record before storing it:

| Record | Durable home | Application role |
| --- | --- | --- |
| Canonical story text and version history | GitHub repository | Read, propose, reconcile, render |
| Alternate path text and lineage | GitHub repository under the world contract | Discover and render with explicit alternate state |
| Pull requests, issues, labels, comments, SHAs | GitHub | Durable review and provenance primitives |
| Storyworld manifest and Kit contract | GitHub repository | Registration and validation source |
| Capsules | GitHub Issues with `capsule:*` labels, per current decision | Indexed and edited through the app |
| Users, invitations, role grants, consent records, moderation records, notification state | Application database, with approved audit references | Authorization, privacy, operations, and user experience |
| Rebuildable indexes and caches | PostgreSQL | Performance and query convenience, never sole source of truth |
| Private raw source material | Approved private storage only, when explicitly authorized | Never copied into public Git or reader output by default |

No new durable story record may be introduced without a source identifier, owner, visibility, retention rule, and reconciliation strategy.

### 6.3 Frontstage vocabulary

Use plain-language terms on contributor and reader surfaces. GitHub terms may appear in steward or maintenance views when useful.

| Backstage | Frontstage |
| --- | --- |
| Repository | Storyworld |
| Branch | Story path |
| Commit | Saved moment |
| Pull request | Submission / submit your scene |
| Merge | Accepted into canon |
| Issue or comment | Story note / editor feedback |

The six proposal states are locked:

`draft → submitted → under-review → returned-with-notes → accepted-into-canon` or `published-alternate`

The UI, API, notifications, and tests must use all six states consistently. Do not reintroduce a four-state model.

## 7. Experience requirements

### 7.1 World setup

The steward must be able to register an existing Storyworld Kit repository by providing or selecting its durable GitHub identity. Registration must:

- validate repository ownership and access;
- read and validate `storyworld.json` and required Kit paths;
- show the steward what was found before activation;
- record a repository URL, default branch, source revision, policy version, and registration actor;
- fail closed when the contract is incomplete or the service lacks access;
- support re-registration or reconciliation after a repository change;
- never create a new GitHub repository implicitly.

### 7.2 Author and capsule workbench

The worldbuilder must be able to create or edit structured capsules for at least the repository-supported types: character, arc, scene, event, setting, motif, question, and vision. The workbench must:

- preserve the source or rationale for the capsule;
- identify whether material is private, shared with invited collaborators, proposed, canon, or alternate;
- make human approval distinct from agent assistance;
- support correction, merge, split, and rejection of candidate capsules;
- retain stable identifiers and source links where available;
- render a Concept Board that does not imply acceptance into canon.

### 7.3 Contribution and scene maturation

An invited contributor must be able to:

- accept an invitation and sign in;
- see only the context and paths permitted by the world policy;
- begin from typed prose, a voice transcript, a memory, a question, or an approved capsule;
- save a private draft and recover it after a reload or session interruption;
- see which assistance was applied and approve the resulting text;
- submit a scene with attribution, path, source references, content notes, and visibility choice;
- understand the next status and next action after submission;
- withdraw or request restriction according to the pilot rights profile.

The maturation flow must never silently turn a capsule into a published scene or submit agent output without human confirmation.

### 7.4 Steward review

The steward must be able to:

- see a queue grouped by the six states;
- inspect source capsule, contributor, path, content notes, consent profile, and prior feedback;
- return a submission with actionable notes;
- accept into canon only when the policy and rights checks pass;
- publish an alternate only when the world policy permits it and the lineage is clear;
- record the decision actor, time, reason, source revision, target revision, and affected records;
- avoid exposing restricted material to users who do not have permission.

### 7.5 Reader

The Reader must present a readable edition rather than repository mechanics. Each published item must show:

- storyworld and work title;
- canon or alternate state;
- contributor and originating-author attribution as applicable;
- content notes;
- path and lineage context;
- publication revision or durable source link where appropriate;
- a clear way to return to the world or choose another permitted path.

If the Reader is not yet deployed, the implementation update must say “implemented in checkout” or “not yet evidenced,” not “live.”

### 7.6 Voice and agent assistance

Voice-first means voice is a supported starting point, not an excuse to make transcription mandatory. Every voice flow requires a typed fallback, transcript correction, explicit approval, and a visible statement of what assistance occurred.

Agents may organize, transform, suggest, flag, or explain. They do not receive authority to publish, accept into canon, change consent, or overwrite a contributor's approved work. Derivative actions that fall under CIE or PIE remain disabled until the action-specific consent decision is closed and tested.

## 8. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| TF-PRD-001 | The product exposes the frontstage vocabulary and the six-state proposal lifecycle consistently. | UI labels, API enums, notifications, and tests all show the same six states; no stale four-state copy remains. |
| TF-PRD-002 | A steward can register an existing Storyworld Kit repository. | A valid fixture registers with manifest revision and policy metadata; invalid and inaccessible fixtures fail with actionable errors; no repository is auto-created. |
| TF-PRD-003 | A registered storyworld has a durable GitHub source identity. | Database readback includes repository, owner, branch, source SHA or equivalent revision, Kit contract version, and registration actor. |
| TF-PRD-004 | World configuration and role grants are protected by authorization. | A non-steward cannot mutate world settings or invite users; unauthorized API tests return the correct safe failure. |
| TF-PRD-005 | The Concept Board stores and displays capsules without confusing them with canon. | A capsule can be created, edited, reviewed, and linked to source metadata; the UI distinguishes draft/proposed/canon state. |
| TF-PRD-006 | Capsules use the decided GitHub Issue representation. | Create, read, update, label, and reconciliation behavior maps to `capsule:*` Issues; no `capsules` database table is introduced. |
| TF-PRD-007 | An invited contributor can create and recover a private draft. | A browser journey saves a draft, reloads, and recovers it; another user cannot read it without permission. |
| TF-PRD-008 | A contributor can mature an approved capsule into a scene draft. | The source capsule remains linked; human edits and agent assistance are distinguishable; no automatic submission occurs. |
| TF-PRD-009 | A contributor can submit a scene without using raw GitHub mechanics. | End-to-end pilot fixture creates a durable submission with attribution, path, source links, notes, and initial state `submitted`. |
| TF-PRD-010 | The steward can return a submission with notes. | Contributor sees `returned-with-notes`, the notes, the actor, and a next action; audit record is durable. |
| TF-PRD-011 | The steward can accept a permitted submission into canon. | Policy and consent checks pass, GitHub durable record changes, provenance is recorded, the proposal becomes `accepted-into-canon`, and the Reader reflects it. |
| TF-PRD-012 | The steward can publish a permitted alternate path. | The alternate is linked to its source and contributor, visibly marked alternate, and does not alter the originating canon. |
| TF-PRD-013 | Contributors receive calm, plain-language notifications. | Submission, returned notes, decision, mention, and invitation events produce the documented notification behavior without exposing private content. |
| TF-PRD-014 | The Reader renders a readable edition. | A deployed or explicitly bounded route shows title, content, attribution, content notes, canon/alternate state, and lineage. |
| TF-PRD-015 | GitHub App authentication is verified in the intended environment. | A live, scoped read and write exercise identifies the App service identity and records the revision and repository scope; PAT fallback is not silently treated as App proof. |
| TF-PRD-016 | Webhook processing is safe to retry. | Duplicate delivery, out-of-order delivery, signature failure, and reconciliation fixtures pass; event IDs or equivalent idempotency keys are recorded. |
| TF-PRD-017 | PostgreSQL can be rebuilt or reconciled from GitHub. | A clean database is populated from a known GitHub fixture; counts, SHAs, proposal state, provenance, and policy references match the source. |
| TF-PRD-018 | Export provides a portable outcome. | A pilot worldbuilder exports a readable edition plus machine-readable metadata or the exact limitation is documented and accepted before pilot launch. |
| TF-PRD-019 | Rights and consent boundaries are enforced. | Negative tests deny restricted reads, unauthorized transformations, unapproved publication, and derivative actions without the required consent. |
| TF-PRD-020 | The pilot is observable and supportable. | Health, structured error reporting, audit lookup, safe logs, rate limits, and an incident route are documented and exercised. |
| TF-PRD-021 | The public status is truthful. | Deployment record names every reachable surface, revision, environment, and limitation; static Author App availability is not presented as API or pilot availability. |
| TF-PRD-022 | Stage 0 and Stage 1 promises are traceable. | Matrix includes source, requirement, implementation path, durable record, evidence tier, owner, dependency, and disposition for every row. |

## 9. Multi-task implementation plan

Tasks are ordered by dependency. Replit may parallelize tasks only when their inputs and durable contracts are already stable. Every task must produce a small, reviewable change set and a task note.

| Task | Work package | Primary outputs | Depends on |
| --- | --- | --- | --- |
| T0 | Baseline and traceability | Stage 0/1 matrix, current route and package inventory, evidence ledger, stale-claim list | None |
| T1 | Decision, rights, and pilot gate | Approved pilot profile, role matrix, consent profile, withdrawal/restriction rules, threat-model checklist | T0, owner decisions |
| T2 | Identity and invitation | Sign-in, invite acceptance, session behavior, role assignment, safe unauthorized responses | T1 |
| T3 | Storyworld Kit and registration | Kit validator, steward-invoked registration, readback, re-registration/reconciliation | T1, T2, GitHub access contract |
| T4 | Capsule and Concept Board contract | Issue-backed capsule adapter, labels, source links, review actions, no-capsule-table invariant | T3 |
| T5 | Capsule-to-scene maturation | Scene plan/editor flow, source linkage, human approval boundary, draft recovery | T4, T2 |
| T6 | Submission lifecycle | Six-state proposal route, contributor submission, durable GitHub change, status display | T5 |
| T7 | Steward review and publication | Review queue, notes, canon/alternate decisions, provenance, notification events | T6, T1 |
| T8 | Reader release | Reader routes, content notes, lineage, canonical and alternate rendering, deployment | T7 |
| T9 | GitHub App, webhook, reconciliation | App-only pilot path, signature checks, idempotency, rebuild command, drift report | T3, T6, T7 |
| T10 | Export and restore | Readable export, machine-readable archive, clean restore exercise, limitations | T3, T7, T9 |
| T11 | Test and environment hardening | Database and AI test fixtures, contract tests, route smoke tests, CI prerequisites | T2 through T10 as applicable |
| T12 | Mobile scope decision | Decision 15.7 recorded, mobile work continued or frozen with rationale | T0, owner decision |
| T13 | Pilot journey acceptance | Dated participant journey, evidence packet, defects and disposition, release recommendation | T1 through T11 |

### 9.1 T0: Baseline and traceability

Create a matrix at `docs/product/stage-0-1-traceability-matrix.md` unless an owner-approved location already exists. Include every original vision statement from `README.md`, `docs/MISSION.md`, `docs/platform-requirements.md`, the attainable roadmap, and the accepted ADRs. Add public-facing claims only as a separate claim source, never as a replacement for repository authority.

Minimum columns:

`source path`, `source ID or section`, `actor`, `user job`, `promise`, `implementation path`, `durable record`, `test`, `deployment`, `evidence tier`, `owner`, `dependency`, `disposition`, `last checked`, `open question`.

Exit criteria:

- no row is marked “done” without evidence;
- intentionally deferred items are visible and not accidentally scheduled;
- stale reviews are identified against current code;
- the matrix itself is reviewed before implementation tasks are closed.

### 9.2 T1: Decision, rights, and pilot gate

Select one low-risk, invite-only storyworld and write the plain-language pilot terms. Define who may see raw source, capsules, drafts, proposals, accepted canon, alternate paths, audit records, and notifications. Define withdrawal and restriction behavior before accepting real material.

The gate must explicitly say what is not authorized: public contribution, untrusted uploads, derivative processing, or monetization. If the owner has not resolved a needed question, mark the affected task blocked on that decision rather than inventing a default.

### 9.3 T2: Identity and invitation

Verify the current auth implementation against the role model. Add or complete invitation lifecycle, expiration, acceptance, and role assignment. Make all protected API routes deny by default. Record minimal identity data and do not leak private story content into logs, notification previews, or error messages.

Acceptance requires at least one owner/steward account, one invited contributor account, one reader context, and negative tests for a non-member and wrong-world member.

### 9.4 T3: Storyworld Kit and registration

Implement the explicitly bounded capability named by ADR-0014:

- repository creation remains manual on GitHub;
- the steward invokes “Register storyworld” in the product;
- the API reads `storyworld.json` and the Kit contract;
- validation reports missing or incompatible paths;
- the application stores source identity and revision;
- re-registration updates the index without duplicating a world;
- all reads and writes identify the configured service identity.

Do not add an unapproved repository-creation wizard or silently fork a private repository.

### 9.5 T4: Capsule and Concept Board contract

Keep GitHub Issues with `capsule:*` labels as the canonical capsule representation. Implement the adapter and tests before extending UI. Show the difference between a candidate capsule, an approved working capsule, a proposed scene, and accepted canon. Ensure source excerpts and private raw material follow the rights profile.

### 9.6 T5 and T6: Scene maturation and submission

Build the smallest reliable writing loop. Typed input is required even if voice is available. A draft has an owner, world, path, visibility, revision history, source capsule links, and last-saved status. Submission creates a durable proposal with the six-state lifecycle and does not bypass review.

Use generated API clients and schemas from the OpenAPI source. If the API shape changes, update the spec and regenerate rather than hand-editing generated artifacts.

### 9.7 T7: Review, publication, provenance, and notifications

Treat canon acceptance and alternate publication as separate, explicit actions. Both require policy checks and a reason. Store provenance records that connect contributor, source material, proposal, decision actor, GitHub revision, and resulting publication. Notifications must identify the plain-language event and next action without exposing material the recipient cannot read.

### 9.8 T8: Reader release

Deploy the Reader only after its content contract is exercised against a known fixture. Do not call the GitHub Pages Author App shell a complete product deployment. Record separate URLs and revisions for Author App, API, Reader, and any companion surface.

### 9.9 T9: GitHub App, webhook, and reconciliation

Verify the configured GitHub App in the deployed environment using a scoped operation. The PAT fallback may remain for the approved single private pilot only if the owner accepts the risk and the deployment record says so. Webhook handling must validate signatures, deduplicate deliveries, tolerate retries, and expose a reconciliation path.

Add a drift report that answers: which GitHub source revision was indexed, which database records are stale, which records have no source, and what action is safe next.

### 9.10 T10: Export and restore

Define the export contract with the owner. At minimum, export a readable edition and a machine-readable manifest of storyworld identity, paths, attribution, canon/alternate state, provenance references, content notes, and source revisions. Run a clean-environment restore using the export and record what cannot be restored, especially secrets and external service state.

### 9.11 T11: Test and environment hardening

Resolve current setup failures caused by missing `DATABASE_URL` and `AI_INTEGRATIONS_OPENAI_BASE_URL` in the test environment. Use safe fixtures and documented test configuration. A skipped or setup-failed suite is not a pass. Separate unit, contract, integration, and live-deployment evidence.

### 9.12 T12: Mobile scope

Record the owner decision for open question 15.7. Possible accepted outcomes include a narrowly scoped voice-capture companion, a later mobile milestone, or a freeze. Do not let dependency updates answer a product question by accident.

### 9.13 T13: Pilot journey acceptance

Run one dated journey with a representative participant and one governed storyworld. Capture route, revision, actor, source SHA, proposal ID, notification, publication result, and Reader result. Record defects with severity, disposition, and whether they block the pilot.

## 10. Security, privacy, and rights requirements

- Default deny for every world, path, draft, source, proposal, audit, and export read.
- Separate platform-code license from story and content rights.
- Repository visibility is never reuse permission.
- Never commit secrets, credentials, private keys, tokens, or personal machine paths.
- Read the `GITHUB_PAT` only through the approved Replit helper when that pilot path is explicitly retained. Prefer the GitHub App direction as it becomes available.
- Do not place private raw sources in GitHub or Reader builds without explicit authorization.
- Do not expose full source excerpts in logs, analytics, public errors, notification previews, or search indexes without permission.
- Keep AI assistance optional, attributable, and human-approved.
- Deny CIE and PIE by default until action-specific consent and derivative lineage are approved.
- Require content notes and visibility state before publication.
- Make restriction and withdrawal actions auditable without making restricted material public.
- Rate-limit authenticated mutations and webhook endpoints.
- Validate GitHub webhook signatures and treat all remote content as untrusted input.
- Bound file size, duration, parsing time, and storage retention for any future upload feature.
- Define backup, restore, retention, incident response, and deletion behavior before public launch.

## 11. API and data implementation rules for Replit

1. Read `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `CONTENT-LICENSE.md`, `docs/MISSION.md`, the platform requirements, relevant ADRs, and open decisions before editing.
2. Inspect the current working tree and preserve unrelated user changes.
3. Keep durable GitHub identifiers in every indexed story record.
4. Update OpenAPI first when an API contract changes, then run code generation.
5. Add route-level authorization and negative tests with every protected mutation.
6. Prefer idempotent operations for registration, webhooks, reconciliation, and publication retries.
7. Use migration-safe database changes. Do not create a `capsules` table.
8. Keep `mockup-sandbox` separate from production surfaces.
9. Do not claim live behavior from a local build or static shell.
10. Keep task changes reviewable. Avoid unrelated formatting, dependency upgrades, or broad rewrites.
11. Before handoff, run the relevant package tests, `pnpm run typecheck`, `pnpm run build`, and `git diff --check`.
12. Report warnings, missing environment prerequisites, skipped tests, and deployment limitations plainly.

## 12. Definition of Done

A task is complete only when all applicable conditions are met:

- source, decision, implementation, test, and deployment status are recorded;
- acceptance criteria pass in the appropriate environment;
- negative and permission tests exist for protected behavior;
- durable GitHub source identity and reconciliation behavior are documented;
- user-facing copy uses the frontstage vocabulary;
- content and privacy boundaries are visible;
- generated artifacts are regenerated from their source;
- no secrets or private paths are introduced;
- changed files have been re-read;
- `git diff --check` passes;
- the task note names any unrun validation and why;
- a reviewer can reproduce the evidence from the repository or deployment record.

The overall pilot is not done until the journey acceptance passes. A green typecheck is useful evidence, but it is not proof of a working outside-participant experience.

## 13. Release gates and stop conditions

Stop and request owner input when:

- a rights or consent decision is required but unresolved;
- a proposed feature would change the repository-per-world or GitHub durable-source boundary;
- a task would expose private material or enable public contribution;
- a derivative action would use CIE or PIE without approved consent;
- a license or commercial promise is implicated;
- mobile implementation would proceed without a 15.7 decision;
- a deployment lacks required secrets or uses an unapproved fallback;
- the API and Reader cannot be tested with stable fixtures;
- export or restore results are being described more strongly than the evidence supports.

The private pilot may proceed only when:

- the pilot storyworld and rights profile are approved;
- identities and invitations are enforced;
- registration and reconciliation have passed;
- a contributor can create, recover, and submit a draft;
- the steward can return, accept, or publish an allowed alternate;
- attribution, provenance, notifications, and Reader output are verified;
- the deployment record names the actual reachable surfaces;
- unresolved issues are explicitly accepted by the owner.

## 14. Handoff packet to the owner

Replit should return one concise packet containing:

- implementation summary by task ID;
- changed files and commits;
- environment and deployment URLs, revisions, and service identity;
- traceability matrix link;
- test commands and results, including setup failures and skips;
- pilot journey transcript or structured evidence record with sensitive content redacted;
- GitHub source repository and revision used;
- database reconciliation result;
- export and restore result;
- known gaps and recommended next decision;
- explicit statement of what remains intentionally deferred.

The final recommendation must be one of `READY FOR PRIVATE PILOT`, `READY WITH OWNER ACCEPTANCE`, `NOT READY`, or `BLOCKED ON OWNER DECISION`, with evidence for that status.

## 15. Suggested task order for a Replit plan

Use the following list as the default multi-task sequence:

1. T0, baseline and traceability matrix.
2. T1, pilot rights, consent, withdrawal, and moderation gate.
3. T2, identity and invitations.
4. T3, Storyworld Kit validation and steward-invoked registration.
5. T4, Issue-backed capsules and Concept Board consistency.
6. T5, capsule-to-scene maturation and draft recovery.
7. T6, contributor submission and six-state lifecycle.
8. T7, steward review, provenance, canon/alternate publication, and notifications.
9. T8, Reader deployment and readable edition.
10. T9, GitHub App verification, webhook safety, and reconciliation.
11. T10, export and clean restore.
12. T11, environment-dependent tests and release hardening.
13. T12, mobile-scope decision or freeze.
14. T13, one complete private pilot journey and release recommendation.

Parallel work is permitted for documentation, fixture construction, and test harnesses after their contracts are agreed. Product behavior should move through the dependency spine in order.

## 16. Open decisions to preserve

The implementation team must keep these visible rather than resolving them by assumption:

- GitHub App migration evidence and timing for the private pilot;
- action-specific consent for CIE and PIE derivatives;
- consent ladder and moderation tooling for later public stages;
- mobile scope and timing, question 15.7;
- Reader accessibility and density metadata, question 15.13;
- final rights, retention, backup, deletion, and appeals policy;
- whether any later stage will introduce monetization or adaptation programs.

Until the owner closes a decision in the repository, affected work remains provisional or deferred.

