# Telling Forward Equilibrium Review

## Review identity

- **Review date:** 2026-08-20
- **Frozen checkout:** `50c60252b4a25db808634c65c427d40983c88356`
- **Review protocol:** `equilibrium-v1`
- **Review mode:** conditional five-role review, executed analytically in one agent context
- **Decision question:** Does the documented Telling Forward vision accurately describe the implemented and demonstrably deployed product, and are the current project tasks sufficient to close the material gaps without overstating readiness?
- **Audience:** project owner, stewards, contributors, maintainers, and future implementation agents
- **Release decision:** `approve-with-limits`
- **Overall evidence status:** `analytical`; selected workflow observations are `live` for this workspace session, while production behavior is `not-run`

## Scope and acceptance criteria

The review covers `docs/MISSION.md`, `README.md`, `docs/platform-requirements.md`,
`docs/product/attainable-delivery-roadmap.md`, the ADR and open-question set,
consent and moderation designs, the current checkout, configured artifact
services, recent workflow observations, and the current project-task queue.

The review passes only if:

1. Material claims have an evidence ID, claim type, status, consequence, and
   smallest decisive next test.
2. Checkout evidence, workflow evidence, and production evidence are kept
   separate.
3. The review distinguishes implemented capability from intended capability.
4. Consent, attribution, moderation, provenance, and human-steward boundaries
   are not weakened to make the product appear more complete.
5. Merged, active, pending, and proposed tasks are mapped to the capability
   gaps they actually cover.
6. The conclusion names what is approved, limited, deferred, or rejected.

## Evidence register

| ID | Evidence | Status | Limits |
|---|---|---|---|
| E-01 | `docs/MISSION.md` working principles and mission | historical/analytical | Authoritative intent, not proof of implementation |
| E-02 | `README.md` product concept and staged model | historical/analytical | Contains known stale architecture wording |
| E-03 | `docs/platform-requirements.md` requirements, architecture, roadmap, and gaps | historical/analytical | Written before most implementation; several claims are stale |
| E-04 | `docs/product/attainable-delivery-roadmap.md` stage gates and capability map | historical/analytical | Target sequencing, not completion evidence |
| E-05 | `docs/decisions/open-questions.md` and consent/moderation designs | analytical | Owner decisions and explicit non-enforcement boundaries |
| E-06 | API routes, Drizzle schema, OpenAPI, generated clients, web/mobile source | analytical | Checkout evidence; no production assertion |
| E-07 | API integration tests and route tests under `artifacts/api-server/src/**/__tests__` | analytical | Test evidence is not a live deployment test |
| E-08 | Artifact manifests under `artifacts/*/.replit-artifact/artifact.toml` and `.replit` | analytical | Configured services, not proof that every service is deployed |
| E-09 | Current workspace logs: API, web, and mobile were serving; reader, archive, signal-noise, broadsheet, and scriptorium failed to start because their ports were already in use | live | Workspace process observation only; not production evidence |
| E-10 | Project task snapshot on 2026-08-20: merged #28/#29, active #33/#89, pending security/performance/product tests, proposed #87 | live/analytical | Task state is coordination evidence, not runtime evidence |
| E-11 | `git status` and revision inspection | live | Local checkout only; at freeze local `main` was one commit ahead of fetched GitHub ref |
| E-12 | Deployment service query on 2026-08-20 returned `success=true`, `isDeployed=false`, empty `primaryUrl`, empty `deploymentType`, `hasSuccessfulBuild=false`, and empty `visibility` | live | No published revision or production URL exists to smoke-test |
| E-13 | Local-only smoke checks on 2026-08-20: `GET /api/healthz` → 200 `{"status":"ok"}`, Author App `/` → 200, Expo `/status` → 200 `packager-status:running` | live | Workspace evidence only; local success does not establish production availability |

## Capability matrix

| Capability or promise | Vision / requirement | Checkout evidence | Workflow or deployment evidence | Status |
|---|---|---|---|---|
| Readable storyworld and path discovery | Reader is the front door; paths must be legible | Web, reader, archive, broadsheet, and mobile surfaces plus storyworld/path API routes | Web, API, and mobile were live in this workspace; other reader surfaces had port-start failures | **Provisional** |
| Full story reading and recovery from broken links | Readers should read coherent stories and receive a helpful recovery path | Reader components, story content routes, and web recovery component | API/web live; production and all reader surfaces not verified | **Provisional** |
| Contributor sign-in and attributable submissions | Authorship accessible without anonymity; contributor status visible | Auth routes, sessions, contributor tables, proposal routes, web auth, mobile auth and narration | API/web/mobile live in workspace; end-to-end production flow not-run | **Provisional** |
| Steward editorial review | Human judgment and stewardship remain central | Proposal state machine, dashboard previews, editor-question display, state tests | API live in workspace; GitHub write path not exercised against a real repository | **Supported in checkout, limited operationally** |
| Canon versus alternate continuity | Canon and possibility must remain distinct | Path states, proposal transitions, provenance routes/tests, published-canon handling | No live canon acceptance or reconciliation holdout | **Supported in checkout, production unverified** |
| GitHub durable source and PostgreSQL rebuildable index | GitHub holds, Replit executes | GitHub client, webhook/admin reconciliation, GitHub identifiers in schema, provenance code | No live GitHub repository exercise in this review | **Design and code supported, live sync deferred** |
| Voice-first contribution | Voice capture should lower the blank-page barrier | Expo app, `VoiceRecorder`, narration route, transcription route | Mobile workflow was live in workspace; device acceptance and deployed API path not-run | **Provisional** |
| Capsule-based writer workbench | Stage 1 private workbench and GitHub Issue capsules | Capsule API, MCP and ingestion label contract, Concept Board UI | No Storyworld Kit or private pilot acceptance evidence | **Partial** |
| Per-action consent | Consent must be versioned, specific, and revocable | Design only in `consent-ladder-design.md` | No consent ledger, UI, or gate by explicit decision | **Intentionally deferred** |
| Moderation baseline | Safety should precede public contribution | Design only in `moderation-tooling-design.md` | No private case/event system or queue | **Intentionally deferred** |
| GitHub App service identity | Stage 1 decision, PAT is temporary pilot debt | Current code still uses the existing PAT-backed workspace pattern; no verified GitHub App implementation | No deployment evidence | **Open implementation gap** |
| Durable reader/offline recovery | Readers should return and preserve readable work | Mobile cache and recovery code, related pending #83 | No restart/reconnect acceptance run in this review | **Pending evidence** |

## Deployment identity and route smoke-test record

### Deployment lookup

The Replit deployment service was queried on **2026-08-20** rather than deriving
a URL from workspace environment variables:

| Field | Recorded value |
|---|---|
| `success` | `true` |
| `isDeployed` | `false` |
| `primaryUrl` | empty — no production URL |
| `additionalUrls` | empty |
| `deploymentType` | empty |
| `hasSuccessfulBuild` | `false` |
| `visibility` | empty |

Therefore there is no published revision, public route, production log, or
external URL to record for any configured artifact. This is classified as a
**deployment failure/absence**, not an application-route failure: the
deployment service answered authoritatively, but no deployment exists.

### Configured artifact inventory

The checkout contains nine registered artifacts with deployment manifests:

| Artifact | Intended production route | Published revision | Production smoke result | Classification |
|---|---|---|---|---|
| API Server | `/api` | none | not run — no deployment URL | deployment absent |
| Telling Forward | `/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Reader | `/reader/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Archive | `/archive/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Broadsheet | `/broadsheet/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Signal/Noise | `/signal-noise/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Scriptorium | `/scriptorium/` | none | not run — no deployment URL | deployment absent |
| Telling Forward Mobile | `/mobile/` | none | not run — no deployment URL | deployment absent |
| Canvas / mockup sandbox | `/__mockup` | none | not run — design-only service | deployment absent / design-only |

### Local control checks

These checks are retained only as workspace controls and are not promoted to
production evidence:

| Check | Result | Classification |
|---|---|---|
| `http://127.0.0.1:8080/api/healthz` | 200, `{"status":"ok"}` | local workflow healthy |
| `http://127.0.0.1:22333/` | 200, Vite document | local workflow healthy |
| `http://127.0.0.1:18115/status` | 200, `packager-status:running` | local workflow healthy |

Representative contributor, steward, reader, and protected API route smoke
tests remain **not-run in production** because no published URL exists. They
must not be inferred from the local checks above.

## Claim and evidence ledger

| Claim ID | Claim and type | Evidence | Status | Consequence if false | Smallest next test |
|---|---|---|---|---|---|
| CLM-01 | The mission is open-canon, attributed, permissioned collaboration. **Design choice** | E-01, E-02, E-05 | Supported as intent | Features could silently turn contribution into anonymous or ungoverned reuse | Owner review of the capability matrix at each public-surface release |
| CLM-02 | The current product is a working prototype, not a finished platform. **Fact/interpretation** | E-02, E-06, E-09, E-12 | Supported with limits | Stakeholders may infer production readiness from prototype functionality | Record a deployment revision and external smoke test for each public surface |
| CLM-03 | GitHub is the durable creative/provenance source and PostgreSQL is a rebuildable index. **Design choice** | E-05, E-06, E-07 | Provisional | Cache-only records could lose authorship or canon history | Run a fixture-based rebuild from GitHub objects and compare the indexed result |
| CLM-04 | The API and web app are no longer bare scaffolds. **Fact** | E-06, E-07, E-09 | Supported in checkout and workspace | Requirements and task planning will understate delivered capability | Update stale requirements claims, then rerun typecheck/build |
| CLM-05 | Contributor sign-in, narration, submission, and editorial review form a coherent loop. **Outcome claim** | E-06, E-07, E-09, E-10 | Provisional | A broken boundary could hide work or permit an unsafe decision | Run a clean end-to-end fixture from sign-in through steward decision and reader display |
| CLM-06 | Canon acceptance cannot be duplicated or applied from an invalid state. **Safety claim** | Task #28, proposal tests, E-07 | Supported analytically | Duplicate merges or corrupted provenance could occur | Run the merged test suite against a fresh database and mocked GitHub boundary |
| CLM-07 | Current workflow observations prove deployed reader-surface availability. **Deployment claim** | E-09 | Disputed / blocked | Users may be directed to surfaces that are not serving | Capture production URL, revision, health checks, and route smoke tests |
| CLM-08 | Mobile is still only planned. **Documentation fact claim** | `docs/platform-requirements.md` line 288 versus E-06, E-08, E-09 | Disputed; documentation is stale | Roadmap and task prioritization will duplicate completed mobile work | Correct the requirements status to scaffolded/provisional and preserve open product scope |
| CLM-09 | Production web package and architecture remain open decisions. **Documentation fact claim** | `README.md` line 21, requirements line 297 versus E-05 and artifact config | Disputed; decisions are recorded elsewhere | Agents may choose the wrong package or re-open settled architecture | Align README and requirements wording with the decisions log |
| CLM-10 | Consent and moderation are implemented safeguards. **Safety claim** | E-05 explicitly says design complete, enforcement unapproved | Rejected as a current capability claim | Public contribution could launch without the required rights and safety controls | Keep public-contribution enforcement blocked until #81/#82 or equivalent acceptance |
| CLM-11 | The roadmap’s first practical backlog accurately represents unfinished work. **Planning claim** | E-04 versus merged #70, #71, #72, #73 and current queue | Disputed; backlog is stale | Completed work remains queued while real gaps are hidden | Replace checklist items with dated status and link current tasks |
| CLM-12 | Current pending tasks cover the highest-risk gaps. **Planning claim** | E-10, capability matrix | Provisional | Review and deployment evidence gaps could remain unowned | Add explicit tasks only for uncovered material gaps after owner review |
| CLM-13 | The deployed system is production-ready for public contribution. **Release claim** | E-12 absent; E-05 defers consent/moderation; E-09 partial | Blocked | Premature public launch could expose rights, safety, and reliability failures | Obtain external deployment evidence and complete consent/moderation gates |
| CLM-14 | The current checkout is synchronized with GitHub main. **Operational fact** | E-11 | Provisional at freeze | Review references may not match the canonical remote revision | Push/fetch and record equal revisions before publishing the review |

## Independent role reviews

The three initial reviews were performed as separate analytical passes over the
same frozen source set. They are not independent model-family evidence. No
external agent, protected holdout, production environment, or specialist legal
review was available.

### Evidence reviewer

- **Finding:** The checkout contains substantive API, schema, OpenAPI, web,
  mobile, sync, proposal, provenance, and test implementation. The requirements
  document still contains multiple pre-implementation assertions.
- **Convergence:** CLM-04, CLM-08, CLM-09, and CLM-11 are material documentation
  disparities.
- **Evidence status:** analytical.
- **Limitation:** No external repository fixture or production deployment was
  inspected.

### Outcome reviewer

- **Finding:** The implemented surfaces plausibly support a Stage 0–1 private
  pilot and a governed editorial loop, but the evidence does not establish a
  complete, user-tested worldbuilder-to-reader or contributor-to-canon promise.
- **Convergence:** The product is useful as a prototype with limits, not as a
  public community platform.
- **Evidence status:** analytical, with workspace service observations live.
- **Limitation:** No representative participant, device acceptance run, or
  production smoke test.

### Safety and portability reviewer

- **Finding:** Proposal-state guards, provenance, content boundaries, and the
  consent/moderation design are aligned with the mission. Consent and moderation
  enforcement are absent by explicit scope, and GitHub App migration, recovery,
  deployment, and multi-instance auth evidence remain incomplete.
- **Convergence:** CLM-03, CLM-06, CLM-10, and CLM-13 are the highest-consequence
  findings.
- **Evidence status:** analytical.
- **Limitation:** No security, legal, privacy, or production specialist review.

## Concordance and conditional disruption

The initial passes materially agree on the narrow conclusion that the project is
an implemented Stage 0–1 prototype with a meaningful editorial core, but not a
verified production-ready public contribution platform. Because the agreement
could be false through over-reliance on source inspection, the disruptor was
triggered with these falsifiable objections:

1. **Deployment illusion:** local workflow success may conceal unavailable
   production routes or stale deployment revisions.
2. **State-machine illusion:** tests may prove local transition logic while the
   GitHub merge and provenance side effects remain non-atomic or untested.
3. **Vision illusion:** documentation corrections may make the project sound
   aligned without evidence that a real worldbuilder or contributor can finish
   the promised job.
4. **Safety illusion:** design documents may be mistaken for consent and
   moderation controls.

### Disruptor results

| Hypothesis | Test or evidence | Result |
|---|---|---|
| Local services prove production availability | Compare E-09 with E-12 | Survives; production evidence is missing |
| Proposal tests prove GitHub side-effect safety | Review E-07 and the stated no-live-GitHub testing boundary | Survives in part; state logic is covered, external side effects remain deferred |
| Updating stale docs proves user usefulness | Compare E-04 acceptance tests with E-09/E-12 | Survives; no participant or external acceptance evidence |
| Consent/moderation design equals enforcement | Read E-05 status statements and inspect absence of ledger/case implementation | Survives; enforcement must remain blocked |

## Negotiation and adjudication

### Decision

`approve-with-limits`

### Decisive evidence

1. The mission and safety boundaries are coherent with the implemented
   proposal/provenance controls and explicit consent/moderation deferrals.
2. The codebase has moved materially beyond the scaffold described by several
   requirements paragraphs.
3. Workspace services provide live evidence for API, web, mobile, and mockup
   processes, but several configured reader surfaces failed to start because
   their ports were already occupied.
4. The deployment service currently reports no published deployment, so no
   production URL, revision, or external route smoke test exists; local API,
   web, and mobile control checks do not close that gap.
5. The current task queue contains useful implementation and regression work,
   but does not itself close documentation drift or establish production
   readiness.

### Approved within limits

- Continue Stage 0–1 prototype work.
- Continue private or invite-only editorial-loop work behind the existing
  steward, provenance, and proposal-state controls.
- Correct clearly stale documentation to reflect implemented checkout capability,
  while preserving explicit `provisional`, `open`, and `not-run` labels.
- Keep GitHub as the creative/provenance source and PostgreSQL as a rebuildable
  index.

### Deferred

- Public contribution launch until consent and moderation enforcement, policy
  ownership, and negative authorization tests are complete.
- Production-readiness claims until deployment identity, route availability,
  data recovery, and external user acceptance are evidenced.
- CIE/PIE or derivative transformation until open question 15.10 is resolved.
- GitHub App migration until its scoped credentials, installation behavior,
  reconciliation, and deployment are verified.

### Rejected

- Treating the requirements document’s “bare scaffold,” “mobile planned,” or
  “production package open” wording as current fact.
- Treating a merged task, local workflow, or design document as proof of deployed
  behavior.
- Replacing unresolved owner, legal, consent, moderation, or deployment
  decisions with implementation assumptions.

## Remediation sequence

### Priority 0: truthfulness and release boundary

1. Update `docs/platform-requirements.md`, `README.md`, and the attainable
   roadmap to separate current checkout capability, configured service,
   deployed evidence, and future intent.
2. Mark the reader/archive/broadsheet/signal-noise/scriptorium deployment status
   as not verified until route-level deployment evidence exists.
3. Preserve the public-contribution block until the consent and moderation
   controls are implemented and reviewed.

### Priority 1: evidence and reliability

1. Finish #33 and then run #34, #37, and #84 as separate security/recovery
   acceptance evidence.
2. Run #83 for offline restart/reconnect behavior.
3. Add a fixture-based GitHub-to-index rebuild and a mocked GitHub side-effect
   acceptance path for canon decisions.
4. Publish a real revision, record its URL and build identity, and run protected
   route smoke tests against the published surfaces.

### Priority 2: capability completion

1. Use the existing queue for capsule performance, contributor capsule
   browsing, scene readiness, discovery seed text, attribution, path-state
   boundaries, imported capsule categories, and withdrawn/restricted sync.
2. Keep #81 and #82 as prerequisites for any public contribution surface.
3. Resolve or explicitly defer mobile scope 15.7 and derivative consent 15.10
   rather than allowing implementation momentum to decide them.

## Task-queue reconciliation

The snapshot showed:

- **Merged evidence:** #28 invalid editorial decisions and #29 steward content
  previews are merged and close real Stage 3 gaps.
- **Active work:** #33 addresses restart and multi-instance sign-in lockout;
  #89 is this review.
- **Pending regression and capability work:** #34, #37, #40, #41, #42, #44,
  #45, #46, #47, #74, #75, #76, #77, #78, #79, #80, #81, #82, #83, #84,
  #85, and #86. These are not duplicates of this review; they are execution
  tasks that need the review's evidence boundaries.
- **Proposed contract follow-up:** #87 addresses generated API contract drift
  after #28. It is relevant to implementation reliability but does not replace
  this review.
- **Missing coverage found:** documentation truth maintenance, production
  deployment evidence, GitHub rebuild verification, and a complete
  worldbuilder/contributor acceptance fixture are material gaps not represented
  by one existing implementation task. They are follow-up candidates, not
  silently added implementation scope here.

The review does not cancel or duplicate existing tasks. Owners should update
task descriptions when their acceptance criteria rely on production or external
evidence that is currently absent.

## Limitations and review expiry

- This is an analytical review performed by one agent context. The three
  initial roles share source context and are correlated evidence.
- No protected or unseen holdout was available.
- The deployment service reported no active production deployment on
  2026-08-20, so no production URL, revision, external reader, device
  participant, legal review, privacy review, or security specialist review was
  available.
- Workspace workflow failures caused by occupied ports are a live operational
  observation, not a conclusion that the corresponding production artifacts
  are broken.
- The review should be reopened after a major architecture change, deployment
  change, public-contribution launch decision, GitHub App migration, consent or
  moderation enforcement, or owner resolution of open questions 15.7, 15.10,
  and 15.13.

## Validation performed

- `python -m json.tool docs/reviews/2026-08-20-telling-forward-equilibrium-review.json`
- `git diff --check`
- `pnpm run typecheck`
- `pnpm run build`
- Referenced governance files and artifact manifests checked for existence
- Stale scaffold, planned-mobile, undecided-architecture, and completed-backlog
  searches re-run after remediation

## Final conclusion

Telling Forward is directionally aligned with its mission and has a substantive
Stage 0–1 implementation, especially around storyworld discovery, attribution,
proposal review, canon safeguards, and reader/contributor surfaces. The local
API, web, and mobile control checks are healthy, but the deployment service
currently reports no published deployment. The project is therefore not
evidenced as a production-ready public contribution platform, and no public
route claim should be made until a revision is published and externally tested.

The strongest surviving objection is not a single broken feature. It is the
combination of stale requirements, incomplete deployment evidence, and explicit
non-enforcement of consent and moderation controls. The safe decision is
`approve-with-limits`: continue bounded prototype and invite-only work, correct
the documentation, and require the listed evidence and safety gates before
making broader product or deployment claims.