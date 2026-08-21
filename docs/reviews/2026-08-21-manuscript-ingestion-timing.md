# Review: Manuscript Ingestion Timing and Live Pilot Run

**Date:** 2026-08-21  
**Task:** #128 — Measure real manuscript processing time before promising turnaround  
**Reviewer:** Replit Agent (workspace)

---

## Summary

The Tier-1 ingestion pipeline is fully coded and its contract fixtures pass locally.
A live GitHub Actions run against an owner-controlled private Storyworld Kit repository
has not been completed and cannot be completed from this workspace. No wall-clock
duration exists for the Phi-4-mini-instruct CPU path on real Actions hardware.

---

## Evidence boundary

This workspace cannot:

- Authenticate to an owner-controlled private Storyworld Kit repository.
- Dispatch `workflow_dispatch` events against a governed repository's Actions.
- Download the ~2–4 GB Phi-4-mini-instruct GGUF weights (no Hugging Face auth
  configured; model is never committed to the repository).
- Produce an authoritative wall-clock number from a real `ubuntu-latest` runner.

Accordingly, items 1–4 in the "Done looks like" criteria remain unmet. This review
records what is locally proven so the first live Actions run has an accurate baseline
to compare against.

---

## What is locally proven

### Local test run — 2026-08-21

```
4 passed in 2.76s
```

| Test | Result | What it confirms |
|---|---|---|
| `test_docx_and_epub_fixtures_convert_and_segment` | PASS | DOCX and EPUB convert via pandoc and segment into the expected scene count; scene-break normalization is correct |
| `test_text_pdf_converts_and_scanned_pdf_is_rejected` | PASS | Text PDF extracts cleanly; scanned/image-only PDF raises `ScannedPdfError` rather than silently emitting empty output |
| `test_malformed_model_output_fails_closed` | PASS | Empty array, non-JSON, and invalid-shape model outputs all raise `MalformedModelOutputError`; no partial/misleading capsule batch can reach GitHub |
| `test_issue_filing_contract_is_draft_and_typed` | PASS | Issue body includes source excerpt and "Review before promoting" notice; `state:draft` appears only as a label, not misleading body prose |

### Structural and safety properties confirmed

- The workflow uses a pinned model revision (`HF_MODEL_REVISION: 78eb92a…`),
  not `main` or `latest`. Cache keying on revision + filename ensures the weights
  are downloaded only on a revision change.
- `file_capsules_as_issues.py` uses the workflow's own `GITHUB_TOKEN` (scoped to
  the repository it runs in), not the platform `GITHUB_PAT`.
- The `concurrency` block prevents duplicate ingestion runs for the same upload id.
- The workflow `timeout-minutes: 45` is set; no indefinitely-running job is possible.
- Human promotion is the only capsule-to-scene path; no ingestion tier touches the
  proposal state machine.

---

## What requires a live Actions run

| Item | Why it cannot be established locally |
|---|---|
| Wall-clock duration (cold start + Phi-4 inference) | Requires real `ubuntu-latest` CPU; `llama-cpp-python` has not loaded actual GGUF weights in this workspace |
| Model cache hit/miss timing | Requires a first-run cold download followed by a cached second run on real Actions infrastructure |
| Issues created with correct labels | Requires `GITHUB_TOKEN` scoped to an owner-controlled private repo and `issues: write` permission |
| Source provenance in filed Issues | Same — requires an end-to-end run that reaches the `file_capsules_as_issues.py` step |
| Malformed-model retry behaviour on a live repo | Requires a real workflow dispatch with a deliberately broken model output; confirms no partial Issue batch |

---

## Implications for user-facing copy

Until a live wall-clock number exists:

- No turnaround time estimate (e.g. "ready in ~30 minutes") may appear in any
  contributor-facing surface, onboarding copy, or documentation.
- The ADR (§ "Next action", item 4) records this constraint explicitly and remains
  Open until satisfied.

---

## Prerequisites for the live run

1. An owner-controlled private repository using the Storyworld Kit baseline
   (`content/pilot-storyworld/`), with the `validate-storyworld` Action configured.
2. A synthetic or demonstrably owned manuscript committed to `intake/manuscripts/`
   on a branch the workflow can check out.
3. A steward with write access to the repository to dispatch the workflow manually
   via the Actions UI or via the API server's upload route.
4. The `GITHUB_WEBHOOK_SECRET` and production API URL are not prerequisites for
   this specific run — only `GITHUB_TOKEN` (the default Actions token) and the
   repository's own Actions minutes are needed.

The pilot repository `OKHP3/telling-forward-pilot-grove` (created in Task #123)
is the intended target for this first run. Dispatch can be confirmed by a steward
with write access to that repository at any time after this workspace's
authentication constraints are resolved.

---

## References

- `.github/workflows/manuscript-ingestion.yml`
- `.github/scripts/ingestion/test_ingestion.py`
- `docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md` (§ "Next action", item 4)
- `docs/reviews/2026-08-21-pilot-storyworld-kit-setup.md` (target repository established)
