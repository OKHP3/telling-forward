# ADR-0004: Manuscript Ingestion and Bring-Your-Own-AI

## Status

**Open.** The tier design below was reasoned through and partially
prototyped (see "What's actually built" and "Verification"). The six-state
model and GitHub-canonical boundary are settled elsewhere; this ADR remains
Open because its ingestion trigger, model pin, live timing evidence, and file
placement still need decisions or verification. It should be marked Accepted
only after the remaining ingestion decisions and verification are complete.

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
invalid capsule shape; all four cases behave as intended, and the
garbage/invalid cases fail closed rather than silently producing
malformed capsules. The production path now refuses the entire scene/run when
any model candidate is malformed, so no misleading partial batch can reach
GitHub. The prompt template and llama-cpp-python integration have **not** been
run against the real Phi-4-mini-instruct weights in this workspace — no
wall-clock number exists yet for how long Tier 1 takes on real Actions
hardware.

The four owned-input fixture checks now pass locally (DOCX, EPUB, text PDF,
and scanned/image-only PDF rejection), alongside malformed-model and draft
Issue contract checks. The Author App API path is steward-only, bounds uploads
to 15 MiB decoded, commits binary content with the platform identity, and
dispatches the pinned workflow; its response is explicitly `queued`, and
capsules remain retrievable through the existing GitHub-backed Concept Board
after the workflow completes. Human promotion remains the only capsule-to-
scene path.

`artifacts/mcp-server` was smoke-tested end to end with a real MCP client
(the SDK's own `Client` + `StdioClientTransport`, not a mock): the server
starts, all three tools register and list correctly, `get_capsule_schema`
returns valid output, and `create_draft_capsule` without a `GITHUB_TOKEN`
set fails with the intended clear error message rather than a stack
trace. `read_canon` and `create_draft_capsule`'s success paths have not
been exercised against a real GitHub repository.

## Next action

This ADR should not move to Accepted until:

1. ~~Submission-state model confirmed~~ — **Resolved.** Six-state model
   decided 2026-08-19 (see Discrepancy 1 above).
2. ~~ADR-0003 boundary call recorded~~ — **Resolved.** ADR-0003 accepted the
   GitHub-canonical hybrid on 2026-08-19 and ADR-0013 clarified it on
   2026-08-20.
3. ~~The actual upload trigger is decided~~ — **Resolved for the private
   pilot.** A steward-only Author App route commits to
   `intake/manuscripts/` and dispatches the workflow with the same branch and
   upload id.
4. `HF_MODEL_REVISION` is now a real pinned commit hash. One real Actions run
   against an owner-controlled Storyworld Kit repository is still required to
   produce an actual wall-clock number before that number appears in any
   user-facing copy.
5. File placement is confirmed: this pass put the Python ingestion
   scripts under `.github/scripts/ingestion/` on the reasoning that
   they're CI-only and not part of the pnpm/TypeScript workspace, and put
   the MCP server under `artifacts/mcp-server/` to match the existing
   "deployable/buildable packages" convention in `AGENTS.md`. Neither
   placement is an established repository convention; confirm or move
   before treating either as settled, and update `AGENTS.md`'s repository
   structure section once confirmed, per that file's own maintenance
   instruction.
