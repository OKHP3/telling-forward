# ADR-0004: Manuscript Ingestion and Bring-Your-Own-AI

## Status

**Accepted (2026-08-26).** The tier design below was reasoned through,
implemented, and verified in the owner-controlled private successor pilot
`OKHP3/telling-forward-pilot-grove-ingestion`. The six-state model,
GitHub-canonical boundary, ingestion trigger, pinned model revision, live
timing evidence, and file placement are now settled.

## Context

The problem: someone arriving at Telling Forward with a partial
manuscript (a Word doc, EPUB, or PDF, potentially 100+ pages) should be
able to get it broken into markdown, segmented into scenes, and proposed
as draft capsules, without Telling Forward's owner paying for or being
liable for anyone's AI usage, and without requiring every contributor to
already have AI infrastructure of their own.

That constraint rules out a shared API key billed to the platform. It
also rules out treating "I have a local LLM" as the baseline capability,
since that only helps the person who already has one, not the many people
this platform is meant to serve, including people working from a phone.

**Confirmed (project memory, 2026-08-17 planning thread):** capsules are
the atomic units of Concept Board — character personas, arc beats, planned
events, captured before promotion to a scene. The confirmed reasoning for
storing them as GitHub Issues rather than flat prose files is in that
memory's record of the original `dataLedger_*.txt` failures.

**Inferred, not yet confirmed in this repository:** no `capsules` table
exists in `lib/db/src/schema/telling-forward.ts`, no `capsules.ts` route
exists in `artifacts/api-server/src/routes/`, and
`artifacts/api-server/src/lib/github.ts`'s `GitHubClientInterface` has no
Issues API methods at all (branches, commits, PRs, and PR reviews only).
The capsule-as-Issue design recorded in memory has no implementation
footprint anywhere else in the codebase as of this ADR. The tooling this
ADR proposes (`artifacts/mcp-server/`, the Tier-1 Actions workflow) would
be the first code in this repository to create a GitHub Issue at all.

## Discrepancy 1: the submission-state model — RESOLVED

**Decided (2026-08-19, Jamie Hill, PRD Build Directive v1 §4, open question 15.11):** The six-state model is locked. The earlier project-memory record of "stays at four states" was stale. The live schema and `CONTRIBUTING.md` are both correct:

`draft → submitted → under-review → returned-with-notes → accepted-into-canon` or `published-alternate`

Any documentation still referencing four states is stale and should be updated. The capsule state model proposed in this ADR (see "Capsule state, kept separate") sits *before* the proposal state machine and is unaffected by this resolution.

## Historical discrepancy 2: ADR-0003's former open tension

The former version of ADR-0003 asked whether the Express/Postgres/Replit
backend was intentional supersession of the original GitHub-native fast path,
or unexamined infrastructure momentum. That question is historical: ADR-0003
now accepts the GitHub-canonical hybrid, and ADR-0013 clarifies the boundary as
“GitHub holds / Replit executes.”

Evidence found while researching this ADR, offered to that decision, not
as a resolution of it: every table comment in
`lib/db/src/schema/telling-forward.ts` describes Postgres as a derived
cache over GitHub-native objects, not a replacement data store.
`storyworldsTable` is "one row per GitHub repository," `storyPathsTable`
"maps to a GitHub branch," `contributionsTable` "maps to a commit,"
`proposalsTable` "maps to a pull request," and the file's own header
comment states the general rule: "Every table that references a GitHub
object stores the GitHub-native key... so the cache is always
re-derivable and auditable against GitHub directly." That reads as
consistent with framing (a) in ADR-0003, a queryable index over GitHub's
real objects, not a replacement store. ADR-0003 and ADR-0013 now provide the
owner decision; this paragraph is retained as the evidence trail, not as an
unresolved blocker.

## Options considered

Full option analysis and the model/provider comparison happened in
conversation on 2026-08-18 and is not reproduced in full here. Summary of
the tier structure that resulted:

| Tier | Where it runs | Serves | Cost to platform owner |
|---|---|---|---|
| 0: Rules-only | Anywhere | Everyone, the floor | None |
| 1: Actions + small model | GitHub Actions runners | Default, including phone/on-the-go authors, async | None (public repo Actions minutes are free) |
| 1.5: In-browser model (optional) | Visitor's device, WebGPU | Capable desktop browsers, live preview | None |
| 2: MCP connector | User's own AI subscription or local host | Power users already set up with Claude/ChatGPT/local LLM | None |
| Local-LLM how-to | User's own hardware | Power users with real compute who want more than Tier 1 | None |

Rejected: a shared platform API key (reintroduces exactly the liability
the platform owner is trying to avoid), committing the model weight file
into the repository (git hard-blocks files over 100 MB without LFS; the
free LFS tier is 1 GB storage plus 1 GB bandwidth a month, nowhere near
enough for a model pulled on every ingestion run), and Perplexity as a
supported MCP provider for now (no official MCP host tied to a Pro
subscription was found; only community bridges scraping the web session).

## Recommendation

Tier 0 and Tier 1 together form the default path every contributor gets
with zero setup, including someone on a phone: upload, wait, get draft
capsules back as Issues. Tier 2 (MCP) and the local-LLM how-to are
additive for people who already have AI infrastructure and want better
extraction quality than a 3.8B CPU-inference model gives them. None of the
tiers require the others; Tier 0 keeps working even if every AI-backed
tier is disabled.

Model choice for Tier 1: Phi-4-mini-instruct (Microsoft, MIT license,
3.8B parameters). Chosen over Qwen (excluded on origin), Llama 3.2
(Western but a non-OSI-approved redistribution license), and Gemma
(Western, strong browser tooling, but Google's custom terms rather than a
pure permissive license). See `.github/scripts/ingestion/NOTICE-phi-4-mini.md`.

Capsule state, kept separate: every capsule Tier 1 or Tier 2 creates carries
one required `capsule:<type>` label plus `state:draft`. Optional `role:*` and
`rung:*` labels record capsule metadata. Neither tier promotes a capsule to a
scene or touches the proposal state machine (six-state model — decided
2026-08-19, see Discrepancy 1 above). Promotion stays the deliberate human
"Promote to scene" action already established for Concept Board. The complete
contract and legacy-label handling are in
[`docs/decisions/capsule-issue-label-contract.md`](../decisions/capsule-issue-label-contract.md).

## What's actually built (this pass)

- `.github/scripts/ingestion/convert_manuscript.py` — DOCX/EPUB/PDF to
  markdown. DOCX and EPUB go through pandoc. PDF is extracted page by page
  via pdfplumber and explicitly rejects scanned/image-only PDFs rather
  than silently emitting empty output.
- `.github/scripts/ingestion/segment_scenes.py` — chapter/scene
  segmentation by formatting heuristics only, no AI.
- `.github/scripts/ingestion/extract_capsules.py` — Tier-1 capsule
  extraction via Phi-4-mini-instruct, CPU inference (llama-cpp-python).
- `.github/scripts/ingestion/requirements.txt` pins
  `llama-cpp-python==0.3.35`, the first version that loaded the pinned Phi-4
  GGUF successfully on the Actions runner.
- `.github/scripts/ingestion/file_capsules_as_issues.py` — files
  extracted capsules as draft GitHub Issues using the workflow's own
  default token.
- `.github/workflows/manuscript-ingestion.yml` — wires the above together,
  triggered by an authenticated steward-owned API upload that commits to the
  private intake path and dispatches `workflow_dispatch` on the same branch.
  Caches the pinned model revision via `actions/cache` rather than committing
  it, and carries the upload id for retry/concurrency control.
- `artifacts/mcp-server/` — the Tier-2 MCP server. Three tools:
  `get_capsule_schema`, `read_canon`, `create_draft_capsule`. Uses a
  user-supplied `GITHUB_TOKEN`, never the platform's `GITHUB_PAT`.
- `docs/local-llm-setup.md` — Ollama/LM Studio how-to for the power-user
  local path.

## Verification

Confirmed by an actual local test run, not asserted: `convert_manuscript.py`
and `segment_scenes.py` were run end to end against a synthetic DOCX
fixture (two chapters, one explicit `***` scene break). First run
undercounted scenes because pandoc's GFM writer backslash-escapes a bare
`***` line (`\*\*\*`) to keep it from parsing as `<hr>`; the segmenter's
scene-break regex didn't account for that escaping and silently missed
every pandoc-converted scene break. Fixed by normalizing escaped
break-characters before matching; re-run confirmed 3 scenes detected
across 2 chapters as expected. The scanned-PDF detection threshold was
unit-tested directly (scanned-page case and real-text case both classify
correctly).

`extract_capsules.py`'s JSON-extraction and capsule-validation logic was
unit-tested against a messy simulated model response (chatty preamble
before a JSON array), an empty-array response, non-JSON garbage, and an
invalid capsule shape. The production path refuses the entire scene/run when
any model candidate is malformed, so no misleading partial batch can reach
GitHub. The first live run initially exposed that llama-cpp-python 0.3.5
could not load the pinned Phi-4 GGUF; the dependency was updated to 0.3.35
and the live run then loaded and executed the model successfully.

The four owned-input fixture checks now pass locally (DOCX, EPUB, text PDF,
and scanned/image-only PDF rejection), alongside malformed-model and draft
Issue contract checks. The Author App API path is steward-only, bounds uploads
to 15 MiB decoded, commits binary content with the platform identity, and
dispatches the pinned workflow; its response is explicitly `queued`, and
capsules remain retrievable through the existing GitHub-backed Concept Board
after the workflow completes. Human promotion remains the only capsule-to-
scene path.

### Live private-pilot verification - 2026-08-26

Runs were dispatched by a steward against the owner-controlled private
successor repository
[`OKHP3/telling-forward-pilot-grove-ingestion`](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion)
using the synthetic EPUB at
`intake/manuscripts/phi4-owned-synthetic-fixture.epub`. No real author content
was used.

- [Cold run 32925248225](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32925248225)
  completed successfully in 8m54s from workflow creation to completion
  (8m50s job runtime). Dependency installation took 6m16s, model download
  took 1m05s, CPU Phi-4 extraction took 46s, and Issue filing took 3s.
  The cache miss was confirmed in the log, and the saved model cache is
  2,457,166,782 bytes.
- [Cache-hit run 32925827919](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32925827919)
  completed successfully in 8m42s (8m38s job runtime). The model download
  step was skipped on the cache hit. Dependency installation took 6m50s,
  CPU Phi-4 extraction took 49s, and Issue filing took 3s.
- The two successful runs created four Issues total. Each Issue has exactly
  one `capsule:planned-event` label and `state:draft`, and each body includes
  the source excerpt plus the `Review before promoting` notice.
- [Malformed-response run 32926407311](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32926407311)
  failed closed in the extraction step with
  `Model response contained invalid capsule candidate(s) at index 0`.
  Issue filing was skipped, and the repository remained at four Issues,
  proving that no partial Issue batch reached GitHub.

`artifacts/mcp-server` was smoke-tested end to end with a real MCP client
(the SDK's own `Client` + `StdioClientTransport`, not a mock): the server
starts, all three tools register and list correctly, `get_capsule_schema`
returns valid output, and `create_draft_capsule` without a `GITHUB_TOKEN`
set fails with the intended clear error message rather than a stack
trace. `read_canon` and `create_draft_capsule`'s success paths have not
been exercised against a real GitHub repository.

## Next action

The following prerequisites are resolved:

1. ~~Submission-state model confirmed~~ — **Resolved.** Six-state model
   decided 2026-08-19 (see Discrepancy 1 above).
2. ~~ADR-0003 boundary call recorded~~ — **Resolved.** ADR-0003 accepted the
   GitHub-canonical hybrid on 2026-08-19 and ADR-0013 clarified it on
   2026-08-20.
3. ~~The actual upload trigger is decided~~ — **Resolved for the private
   pilot.** A steward-only Author App route commits to
   `intake/manuscripts/` and dispatches the workflow with the same branch and
   upload id.
4. ~~Live model timing recorded~~ - **Resolved.** Cold and cache-hit
   timings, including the model download step, are recorded in
   `docs/reviews/2026-08-21-manuscript-ingestion-timing.md`.
5. ~~File placement confirmed~~ - **Resolved.** CI-only ingestion code lives
   under `.github/scripts/ingestion/`; the deployable MCP server lives under
   `artifacts/mcp-server/`; and both locations are recorded in `AGENTS.md`.

The live evidence does not justify a contributor-facing turnaround promise:
the measured runs spent most of their time installing dependencies and
loading the model, and the cache-hit path still varied with runner setup.
Any future estimate must be based on a larger measured sample.
