# Telling Forward Worldbuilder-to-Reader Journey Acceptance

This is the repeatable evidence record for the steward-to-reader journey. Copy
the **Rerun record template** for every production rerun; do not overwrite an
earlier run. A route being reachable locally is control evidence, not
production acceptance evidence.

## Evidence rules

- `Observed` means a participant action or externally reachable production
  response was recorded during this run.
- `Local control` means a workspace checkout, workflow, test, or local request
  was checked. It can establish that a control is present, but not that the
  production journey works.
- `Not run` means the step was intentionally not attempted.
- `Blocked` means the next step could not start because the stated prerequisite
  was absent.
- Every URL, revision, fixture, identity, route result, permission result, and
  timestamp belongs to one run. Never infer a missing value from another run.
- Redact participant contact details and credentials. Use role labels and
  stable fixture IDs instead.

## Rerun record template

Copy this section for a new run and replace every placeholder. Keep unknown
values as `TBD` rather than turning them into a pass.

### Run identity and publication

- **Run ID:** `YYYY-MM-DD-<short-label>`
- **Run start (UTC):** `YYYY-MM-DDThh:mm:ssZ`
- **Run end (UTC):** `YYYY-MM-DDThh:mm:ssZ`
- **Run type:** `external participant acceptance | controlled production smoke | local control`
- **Decision:** `accepted | partial | blocked | failed`
- **Evidence status:** `observed production | local control only | mixed`
- **Published URL:** `<exact externally reachable URL>`
- **Published revision:** `<deployment revision or commit identifier>`
- **Deployment lookup timestamp (UTC):** `...`
- **Deployment evidence reference:** `<provider result, screenshot, or log reference>`

### Fixtures and participants

- **Storyworld fixture ID:** `<stable ID>`
- **Capsule fixture IDs:** `<stable IDs>`
- **Path fixture IDs:** `<stable IDs, including canon/alternate state>`
- **Contribution/proposal fixture IDs:** `<stable IDs>`
- **Resulting reader URL(s):** `<exact URL(s)>`
- **Steward role/fixture:** `<role label and account/fixture ID>`
- **Contributor role/fixture:** `<role label and account/fixture ID>`
- **Reader role/fixture:** `<anonymous or role label>`
- **Other participant roles:** `<role labels or none>`
- **Fixture reset/reuse notes:** `<how this run is isolated from earlier runs>`

### Journey route results

Use one row per route or externally visible action. Record the exact path,
HTTP/UI result, and evidence tier; do not collapse a partial journey into one
overall status.

| Step | Role        | Intended action                     | Exact route/URL | Result                      | Evidence tier            | Timestamp (UTC) | Evidence reference |
| ---- | ----------- | ----------------------------------- | --------------- | --------------------------- | ------------------------ | --------------- | ------------------ |
| 1    | Steward     | Create or import a storyworld       | `<route>`       | `Pass/Fail/Blocked/Not run` | `Observed/Local control` | `...`           | `<ref>`            |
| 2    | Steward     | Create or import a capsule          | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 3    | Contributor | Sign in and discover the storyworld | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 4    | Contributor | Submit attributable narration       | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 5    | Contributor | See editorial status                | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 6    | Steward     | Review without GitHub mechanics     | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 7    | Reader      | Open the resulting path             | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |
| 8    | Reader      | See attribution and provenance      | `<route>`       | `...`                       | `...`                    | `...`           | `...`              |

### Permission outcomes

Record both successful authorization and denied/invalid attempts. The result
must say what the participant could do and why, not just return a status code.

| Role/fixture    | Action attempted | Expected permission | Actual outcome/message       | Evidence tier | Timestamp (UTC) |
| --------------- | ---------------- | ------------------- | ---------------------------- | ------------- | --------------- |
| `<steward>`     | `<action>`       | `<expected>`        | `<allowed/denied + message>` | `...`         | `...`           |
| `<contributor>` | `<action>`       | `<expected>`        | `<allowed/denied + message>` | `...`         | `...`           |
| `<reader>`      | `<action>`       | `<expected>`        | `<allowed/denied + message>` | `...`         | `...`           |

### Vocabulary observations

Record participant language, not an evaluator’s assumption. Note whether each
term communicated the intended action without requiring GitHub terminology.

| Term or concept | Participant understood it? | Observed wording/confusion | Follow-up       |
| --------------- | -------------------------- | -------------------------- | --------------- |
| storyworld      | `Yes/No/Not asked`         | `<quote or note>`          | `<none/action>` |
| path            | `Yes/No/Not asked`         | `<quote or note>`          | `<none/action>` |
| saved moment    | `Yes/No/Not asked`         | `<quote or note>`          | `<none/action>` |
| capsule         | `Yes/No/Not asked`         | `<quote or note>`          | `<none/action>` |
| proposed canon  | `Yes/No/Not asked`         | `<quote or note>`          | `<none/action>` |

### Attribution and provenance

- **Narration attribution shown to contributor:** `<observed result>`
- **Narration attribution shown to reader:** `<observed result>`
- **Agent-assistance disclosure shown:** `<observed result>`
- **Steward/editor attribution shown:** `<observed result>`
- **Durable provenance reference:** `<GitHub path, commit, issue, or API reference>`
- **Provenance recoverable independently of the merge service account:** `Yes/No/TBD`
- **Attribution/provenance evidence references:** `<refs>`

### Boundary, failure, and next prerequisite

- **Journey boundary reached:** `<last completed step or exact route/action>`
- **Failure or partial boundary:** `<exact next step, route, or external dependency>`
- **Failure classification:** `deployment absence | authentication | permission | route | data | attribution/provenance | participant | other`
- **Observed error/message:** `<exact text or none>`
- **Next prerequisite:** `<single concrete prerequisite>`
- **Owner/verification action:** `<who verifies what>`

### Control evidence (kept separate)

List local checks here only. These do not upgrade an unobserved production
route to `Pass`.

| Check                                | Result     | Timestamp (UTC) | Limit                      |
| ------------------------------------ | ---------- | --------------- | -------------------------- |
| `<API health or route check>`        | `<result>` | `...`           | `<what it does not prove>` |
| `<web/reader/mobile workflow check>` | `<result>` | `...`           | `<what it does not prove>` |
| `<test/build/check>`                 | `<result>` | `...`           | `<what it does not prove>` |

## Run: 2026-08-20 external participant acceptance

### Run identity and publication

- **Run ID:** `2026-08-20-initial-journey`
- **Run date:** 2026-08-20
- **Run type:** external participant acceptance
- **Decision:** blocked before participant execution
- **Evidence status:** local control evidence is live; external journey evidence
  is not-run
- **Checkout:** `50c60252b4a25db808634c65c427d40983c88356`
- **Published URL:** none
- **Published revision:** none
- **Deployment lookup:** `success=true`, `isDeployed=false`,
  `primaryUrl=""`, `hasSuccessfulBuild=false`, `visibility=""`
- **Deployment lookup timestamp:** 2026-08-20 (exact timestamp not retained)

There was no published URL or revision to give to a steward, contributor, or
reader outside the workspace. Starting local workflows would not satisfy this
acceptance run, so participant execution was intentionally not simulated.

**Failure classification:** deployment absence, not an application-route
failure.

### Fixtures and participants

- **Storyworld fixture ID:** not created for this run
- **Capsule fixture IDs:** none
- **Path fixture IDs:** none
- **Contribution/proposal fixture IDs:** none
- **Resulting reader URL(s):** none
- **Participant roles:** steward, contributor, and reader were not recruited or
  executed because publication was absent
- **Fixture reset/reuse notes:** no participant fixture was created

### Journey acceptance matrix

| Step | Intended participant action                       | External result | Evidence tier     | Why                                                                       |
| ---- | ------------------------------------------------- | --------------- | ----------------- | ------------------------------------------------------------------------- |
| 1    | Steward creates or imports a storyworld           | **Not run**     | Observed: not-run | No external deployment target                                             |
| 2    | Steward creates or imports a capsule              | **Not run**     | Observed: not-run | Capsule writes require the deployed authenticated API and GitHub boundary |
| 3    | Contributor signs in and discovers the storyworld | **Not run**     | Observed: not-run | No published web or mobile URL                                            |
| 4    | Contributor submits attributable narration        | **Not run**     | Observed: not-run | No deployed contributor/API path or participant                           |
| 5    | Contributor sees editorial status                 | **Not run**     | Observed: not-run | No deployed proposal session                                              |
| 6    | Steward reviews without GitHub mechanics          | **Not run**     | Observed: not-run | No deployed steward session                                               |
| 7    | Reader opens the resulting path                   | **Not run**     | Observed: not-run | No deployed reader route                                                  |
| 8    | Reader sees attribution and provenance            | **Not run**     | Observed: not-run | No externally reachable resulting story                                   |

This matrix is an evidence record, not a claim that the journey works.

### Permission, vocabulary, attribution, and provenance

No external permission outcome, vocabulary observation, attribution result, or
provenance result exists for this run. These fields are **not run**, not
successful by implication. The next run must record:

- whether the steward can tell which actions create or change durable story
  content;
- whether the contributor can tell which identity will be attributed;
- whether the steward can distinguish editorial review from accepting content
  into canon;
- whether the reader can see attribution and agent-assistance disclosure
  without an account;
- whether permission errors identify missing stewardship, contributor
  ownership, authentication, or valid path state;
- whether the terms “storyworld,” “path,” “saved moment,” “capsule,” and
  “proposed canon” communicate the intended action.

### Local control evidence

These checks show that selected workspace processes were responsive on the run
date. They do not substitute for participant acceptance:

| Check                  | Result                         | Evidence tier | Limit                                         |
| ---------------------- | ------------------------------ | ------------- | --------------------------------------------- |
| API `GET /api/healthz` | 200, `{"status":"ok"}`         | Local control | Health only; no authenticated journey         |
| Author App `/`         | 200, Vite document             | Local control | Local development server, not a published URL |
| Mobile `/status`       | 200, `packager-status:running` | Local control | Packager status, not device acceptance        |

### Boundary and next prerequisite

- **Journey boundary reached:** deployment lookup; no participant step started
- **Failure/partial boundary:** external journey could not begin because no
  published URL or revision existed
- **Failure classification:** deployment absence
- **Observed error/message:** `isDeployed=false`, empty `primaryUrl`, and
  `hasSuccessfulBuild=false`
- **Next prerequisite:** publish a successful revision with an externally
  reachable URL, then create isolated fixture IDs and rerun this record with
  real steward, contributor, and reader roles

## Release consequence

The worldbuilder-to-reader journey remains **unverified outside the local
workspace**. Do not describe it as a completed user journey or use it as
production-readiness evidence. A later run may be accepted only when its
published URL, revision, fixture IDs, participant roles, route-level results,
permission outcomes, vocabulary observations, attribution, provenance, and
timestamps are populated with `Observed` evidence, and any failed or partial
boundary has a concrete next prerequisite.
