# Telling Forward: Replit Controlled-Pilot Build Directive

## Use of this directive

Paste this directive into the Replit Agent for the Telling Forward workspace. It is a build brief, not permission to replace the existing application, invent product decisions, or enable public creative intake.

The result sought is a coherent, testable **controlled private pilot** for one author-owned storyworld. The pilot must make the existing platform's central promise real: a person can turn a private story possibility into an attributable draft, submit it for a humane human review, and see the result as either canon or an alternate path without needing Git vocabulary. A reader can then read the approved work as a story and understand its relationship to the storyworld.

This is not a request to make every part of the dream platform at once. The source documents deliberately distinguish the product dream from a safe delivery sequence. Build the smallest complete, trustworthy slice. Leave clear seams for later work.

## Product north star

Telling Forward is a voice-first, agent-assisted collaborative storytelling platform for open-canon collaborative fiction. It must feel like a welcoming creative room to someone who does not identify as a writer, while preserving human intent, consent, attribution, stewardship, and durable lineage.

The reader is the front door. The writer's private workbench comes before public community scale. Agents assist with mechanical work, but do not become authors, make canon decisions, or silently publish anything.

The pilot must make these promises observable:

1. Human intent stays in charge. A human reviews and approves any work represented as theirs.
2. Canon and possibility remain legible. An alternate path is valuable but never mistaken for official canon.
3. Credit and lineage survive beyond the interface. Important source, approval, and decision records are durable and inspectable by authorized people.
4. GitHub remains backstage. Frontstage copy uses plain storytelling language.
5. Safety is a product condition. Nothing in this pilot implies that untrusted uploads, public contribution, commercial rights, or derivative processing are ready.

## Source hierarchy and non-negotiable constraints

Before changing code, inspect the current repository, preserve any unrelated work, and read these files:

- `AGENTS.md`
- `README.md`
- `CONTRIBUTING.md`
- `CONTENT-LICENSE.md`
- `docs/MISSION.md`
- `docs/platform-requirements.md`
- `docs/decisions/open-questions.md`
- `docs/adr/0001-product-naming-and-vocabulary.md`
- `docs/adr/0002-contributor-notification-model.md`
- `docs/adr/0003-github-native-fast-path-vs-custom-backend.md`
- `docs/product/dream-platform-specification.md`
- `docs/product/attainable-delivery-roadmap.md`
- `docs/reviews/2026-08-19-dream-platform-equilibrium-review.md`

The following are hard constraints, not suggestions:

- Creative content is all rights reserved unless an explicit contribution record says otherwise. Repository visibility is not reuse permission.
- Never commit credentials, private URLs, personally identifying test material, or a database dump. Replit secrets remain secrets.
- Every Replit commit auto-pushes to GitHub. Treat each commit as public immediately.
- Do not use a generic "AI processing allowed" switch as consent for Disrupt, Invert, translation, training, display, canon review, or commercial evaluation.
- Do not accept real untrusted uploads or represent an upload pipeline as safe. Manual typed capture and synthetic or demonstrably owned test fixtures are the only permitted ingestion inputs for this work.
- Do not add public contribution, open registration for an unmoderated community, payments, virtual credits, royalties, adaptation rights, or mobile scope.
- Do not resolve open owner decisions in code. In particular, open questions 15.1, 15.2, 15.3, 15.6, 15.14, and 15.15 remain open. The 15.10 Disrupt/Invert policy is decided for the private pilot, but its enforcement gate remains unapproved.

If an existing surface conflicts with a constraint, keep it available only to the project owner as clearly labeled synthetic/demo behavior or safely remove it from ordinary contributor flows. Do not quietly leave a rights-sensitive action looking production-ready.

## Confirmed starting point

The repository is a pnpm TypeScript monorepo running Node 24. It already includes:

- a React 19, Vite, Tailwind v4, Wouter, React Query web app in `artifacts/web`;
- an Express 5 API in `artifacts/api-server`;
- PostgreSQL with Drizzle in `lib/db`;
- an OpenAPI-first contract pipeline in `lib/api-spec`, with generated Zod and React client packages;
- authentication infrastructure, storyworld routes, private Concept Board, Scene Writer, proposal views, a steward dashboard, and reader-path surfaces;
- a six-state submission enum: Draft, Submitted, Under review, Returned with notes, Accepted into canon, and Published as an alternate path.

This is a meaningful prototype, not a blank scaffold. Start with an evidence-backed capability inventory. Mark each relevant capability as **implemented**, **tested**, **deployed**, **pilot-ready**, **blocked**, or **not started**. Do not claim a capability is real because a screen, database table, or endpoint exists alone.

The current direction should be described honestly as a candidate hybrid: GitHub holds durable versioned records and Replit executes the humane application layer. The exact repository topology, contributor identity model, and service authentication model remain owner decisions. Do not expand GitHub write automation or redesign identity until those decisions are made.

## Pilot definition

### Pilot actors

- **Worldbuilder/steward:** the authorized owner of a single pilot storyworld. This role creates or approves the seed, owns canon decisions, and is the only person who can accept or publish a review result.
- **Contributor:** an invited, authenticated pilot participant. They can create private work, inspect the permission and attribution context, submit a scene, and receive calm status updates.
- **Reader:** an invited or public-to-the-pilot viewer who can read approved content and understand whether it is canon or an alternate path.
- **Agent:** an assistive instrument. It may shape, summarize, flag continuity questions, and explain material changes. It has no authority to submit, publish, merge, or decide canon.

### Pilot journey

The end-to-end demonstration must use a synthetic or demonstrably owned seeded world and complete this journey:

1. The steward opens a world with a title, one-sentence story seed, visible steward identity, canon policy summary, content notice, and a clear statement of what a contributor may submit.
2. An invited contributor creates a private typed capsule from a character, event, or arc idea. The capsule has a stable ID, creator, timestamps, type, privacy state, and provenance that distinguishes manual capture from agent assistance.
3. The contributor promotes a capsule into a scene draft, reviews the resulting text, sees a concise description of material changes and assistance used, edits it, and explicitly chooses to submit it. Promotion never submits automatically.
4. The contributor sees a calm submission state and a single understandable next step. They never need to see a pull request, check run, merge conflict, commit SHA, or raw webhook payload.
5. The steward sees a separate operational review view with the proposed scene, its intent, contribution context, source lineage, and an explicit decision control. A steward can move it to review, return it with one focused creative question, accept it into canon, or publish it as an alternate path when the stated pilot permission permits that result.
6. The reader can read the accepted work as coherent prose, see its author credit, see whether agent assistance was used, and understand whether the path is canon or an alternate continuation. They can return to the storyworld without navigating a graph of raw technical records.
7. An authorized steward can inspect the durable lineage for that outcome: source capsule, draft, contributor, assistance disclosure, proposal state changes, steward decision, resulting path, and GitHub reference when one exists. Restricted content must not leak through the reader surface or ordinary logs.

## Delivery plan

Work in the following order. At each stage, update a concise implementation note that names changed files, decisions respected, tests run, and remaining limitations. Do not start a later stage while a safety or state-machine failure from an earlier stage remains unresolved.

### Phase 0: establish a trustworthy baseline

1. Inspect `git status`, current routes, schema, generated client code, UI routes, environment requirements, and existing tests.
2. Run the established validation commands that the environment supports. Diagnose actual failures before changing unrelated code.
3. Create a dated capability inventory and a small bidirectional traceability matrix for this pilot:
   - pilot requirement;
   - user-visible behavior;
   - API contract;
   - durable schema or GitHub record;
   - test or manual proof;
   - status and known limitation.
4. Reconcile stale documentation with observed code only when the correction is supported by repository evidence. Never upgrade a proposed capability to confirmed simply because code is present.
5. Establish one synthetic or demonstrably owned seeded storyworld that supports automated and manual pilot testing. Do not add personal fiction, third-party material, or sensitive voice samples.

**Exit condition:** Replit can state what exists, what runs, what is unverified, and exactly which pilot loop will be completed without masking known gaps.

### Phase 1: make private creation coherent

Build or repair the private worldbuilder and contributor workflow around the current Concept Board and Scene Writer rather than creating a parallel app.

Required behavior:

- A capsule is a private, reviewable unit of possibility. It is not a public scene, proposal, or canon record.
- Support the current pilot types only: character, arc, and event. Keep the model extensible but do not expose a misleading taxonomy of unfinished capabilities.
- Manual typed capture must be reliable: meaningful validation, autosave or an explicit save affordance, clear unsaved/error states, safe deletion/archival behavior, and an empty state that teaches a first-time storyteller how to begin.
- Preserve source and transformation provenance in a way the user can understand. At minimum record manual capture versus agent-assisted action, actor, timestamps, input/output relationship, and human approval state.
- Promotion creates a private draft or scene plan with a visible purpose prompt. It must never create a public story, a proposal, a GitHub write, or a canon change without the contributor's later explicit action.
- If AI shaping is enabled for the pilot, it must be optional, explainable, cancellable, and limited to synthetic or owned material. Show what changed, what remained uncertain, and whether the contributor edited it afterward. Preserve a typed-only manual path if the model is unavailable.
- Disrupt and Invert are rights-sensitive experimental transformations. Do not present them as normal collaboration actions. Gate them to an owner-controlled synthetic/owned-material demonstration, label them experimental, record their inputs and outputs, and prevent automatic sharing or submission. Do not enable them for invited contributors until action-specific consent and descendant-lineage decisions are approved.

**Exit condition:** an invited participant can create, revise, and deliberately prepare a private scene draft without losing authorship, privacy, or control.

### Phase 2: complete the submission and stewardship loop

Make the contributor-facing state machine authoritative throughout the web app, API, database, and tests:

`Draft -> Submitted -> Under review -> Returned with notes -> Under review -> Accepted into canon OR Published as an alternate path`

The two terminal outcomes are mutually exclusive. A returned item is not rejected, silently published, or left in a technical error state. A restriction, withdrawal, or safety intervention is a separate lifecycle to be designed and tested before it is offered as a user-facing result.

Required behavior:

- Use frontstage wording: **storyworld**, **your story path**, **saved moment**, **Submit your scene**, **story note**, **editor feedback**, **accepted into canon**, and **published as an alternate path**. Do not surface Git vocabulary to a contributor.
- Keep the existing five calm contributor notifications aligned to the state machine: received, being reviewed, one creative question, official story, alternate path. Technical problems remain steward/maintainer-only.
- Enforce steward authorization server-side for every state-changing action. Hiding a button is not authorization.
- Validate allowed state transitions server-side. A terminal proposal cannot be accepted again, switched to the other terminal result, or modified as if it were still pending.
- When returning with notes, require one focused human-authored creative question that the contributor can see. Do not replace feedback with generic system errors.
- Before canon acceptance or alternate publication, record the actor, time, source proposal, source capsule/draft, result, and any available durable GitHub reference. The record must be idempotent and must not duplicate under retries.
- Treat GitHub synchronization as an integration boundary. Use stable identifiers such as repository, path, pull request number, and commit SHA where they exist. Reconciliation must be safe to rerun. Do not make the happy path depend on live GitHub access if the application can surface a clearly marked pending state instead.

**Exit condition:** a controlled contributor can submit a scene, receive a humane return-with-notes response, resubmit, and receive exactly one terminal outcome. An authorized steward can demonstrate the lineage and decision record for each transition.

### Phase 3: deliver a reader-first edition

The reader experience must make approved content feel like reading, not inspecting a project tracker.

Required behavior:

- A storyworld landing view contains a premise or seed, a concise reader orientation, steward identity, content notice, and clear distinction between canon and alternate paths.
- A path reader renders full approved scene text in a calm, accessible, responsive reading layout. Do not use raw commit messages, branch names, database IDs, or terse summaries as the primary reader content.
- Each reader-visible scene shows durable contributor credit and a visible, plain-language agent-assistance disclosure when applicable. This disclosure must not imply that the agent is the author.
- Path relationships remain simple. A reader can continue a path, return to the world, and tell whether a path is official or alternate. Do not require an interactive graph to understand the pilot.
- Loading, empty, unauthorized, and failure states are intentional and accessible. Avoid dead-end generic errors.
- Meet a practical baseline for keyboard access, semantic headings, focus order, color contrast, visible focus, labels, and mobile layouts. Voice-first does not excuse a text-hostile interface.

**Exit condition:** a reader unfamiliar with Git can read a seeded canonical scene and alternate path, correctly describe their difference, and find their way back to the storyworld.

### Phase 4: prove the slice and harden what it exposes

Add focused tests before expanding features.

Minimum automated coverage:

- schema and API tests for valid and invalid proposal transitions;
- authorization tests proving a contributor cannot perform steward actions;
- idempotency tests for finalization and provenance writes;
- tests that normal contributor output never exposes GitHub operational vocabulary or internal IDs;
- tests that restricted/private capsule content cannot be read through public or reader routes;
- tests that experimental Disrupt/Invert behavior is unavailable outside its permitted owner-controlled condition;
- a realistic end-to-end journey using only synthetic or owned fixture material: create capsule, promote, edit, submit, return with one note, resubmit, accept or publish alternate, then read the outcome.

Use the repository's contract-first model: update OpenAPI first for API changes, regenerate Orval/Zod client artifacts, validate inputs at the route boundary, and keep Drizzle schema, API contract, generated client, and UI behavior aligned. Do not introduce hand-written client fetch calls as a shortcut around generated hooks unless the existing streaming use case demonstrably cannot be expressed by them, and document that exception.

Run `pnpm run typecheck`, `pnpm run build`, relevant package tests, and `git diff --check`. Inspect the actual final diff. If a command cannot run in Replit, state why and provide the next reproducible command instead of implying success.

**Exit condition:** the pilot journey has automated evidence, a manual Replit verification record, no known authorization or state-machine bypass, and a clear list of unverified external integrations.

## Architecture rules

- Treat `artifacts/web` as the candidate production web application and `artifacts/mockup-sandbox` as a design sandbox unless the project owner resolves open question 15.3 differently. Do not merge mockup-specific plumbing into the production path.
- Keep React UI, Express routes, OpenAPI, generated Zod/Orval artifacts, and Drizzle data model in their existing workspace boundaries.
- Prefer small, named domain services for proposal transitions, provenance recording, and integration reconciliation instead of duplicating state-transition logic across route handlers.
- Store durable relationships and explicit state, not only inferred UI state. Client cache is not a source of truth.
- Build for a world to be portable: structure story and provenance data so an authorized export could later be interpreted without this UI. Do not claim export/restore is complete until it has passed a clean-environment restoration test.
- Keep secrets server-side and use environment variables or Replit Secrets. Never expose a GitHub token, GitHub App private key, database URL, Clerk secret, OpenAI key, or webhook secret to the Vite bundle, logs, commits, or test fixtures.

## Explicitly deferred work

Do not spend this build cycle on these items:

- real file, audio, manuscript, or third-party-content uploads;
- real public contribution, community discovery, unconstrained reader interaction, relay features, or moderation-at-scale;
- per-action consent ladder, CIE/PIE production transformation, translation, or training permissions;
- commercial terms, royalties, virtual credits, adaptation markets, or payment flows;
- mobile product delivery;
- multiple worldbuilder kit types, broad GitHub repository provisioning, or a multi-repository topology;
- a new identity architecture, GitHub App migration, or broad GitHub write automation;
- analytics beyond minimal operational diagnostics that do not collect creative content or covert behavioral telemetry;
- claiming a legal, rights, safety, portability, or AI governance decision is settled when the corresponding ADR/open question says otherwise.

Record a short rationale when a requested enhancement belongs on this list. A clear deferral is better than a half-built unsafe feature.

## Completion report required from Replit

At the end of the work, return a concise evidence-based report with:

1. What changed, grouped by user-visible behavior, API/schema, tests, and documentation.
2. The exact pilot journey completed and the fixture used, confirming that no untrusted or third-party creative material was introduced.
3. The commands run and their actual results.
4. Replit deployment/manual verification evidence, including URLs only if they are safe to share.
5. The remaining open questions and deferred work.
6. Any discrepancy between this directive, the repository's documented requirements, and observed implementation.

Do not say "complete" merely because a screen compiles. The pilot is complete only when the controlled end-to-end journey works, the human authority and attribution boundaries hold, the reader can understand the result, and the evidence above is available.

## Acceptance checklist

- [ ] Baseline inventory and Stage 0/1 traceability matrix exist and are current.
- [ ] One controlled synthetic or owned pilot storyworld is seeded and usable.
- [ ] Private manual capsule capture, revision, and explicit promotion work reliably.
- [ ] Agent assistance is optional, disclosed, reviewable, and never auto-submits or claims authorship.
- [ ] Rights-sensitive transforms are restricted to a clearly labeled owner-controlled demonstration or removed from normal contributor flows.
- [ ] The six-state submission machine is enforced server-side, with mutually exclusive terminal outcomes.
- [ ] Only authorized stewards can make editorial decisions.
- [ ] Contributor notifications use the five calm, plain-language states.
- [ ] Reader pages render coherent approved scenes, credit, lineage signal, and canon/alternate distinction without Git jargon.
- [ ] Provenance for a completed editorial decision is durable, inspectable by authorized users, and idempotent.
- [ ] Relevant automated tests pass, including authorization, state-transition, privacy, and end-to-end pilot coverage.
- [ ] Typecheck, build, diff hygiene, and a manual Replit verification have been performed and reported honestly.
- [ ] The final report separates implemented, tested, deployed, pilot-ready, deferred, blocked, and unknown claims.

## Final instruction to the Replit Agent

Work deliberately. Preserve existing useful implementation. Make the current application tell the truth about what it can safely do. Deliver the smallest complete controlled pilot that earns the next decision, rather than a polished façade for an ungoverned platform.
