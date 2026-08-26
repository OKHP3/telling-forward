# Review: Manuscript Ingestion Timing and Live Pilot Run

**Date:** 2026-08-26
**Task:** Run the first Phi-4 ingestion in the pilot repository and record timing
**Reviewer:** Replit Agent (workspace)

---

## Result

The first successful live Phi-4-mini-instruct CPU ingestion completed on a
GitHub Actions `ubuntu-latest` runner in the owner-controlled private successor
repository
[`OKHP3/telling-forward-pilot-grove-ingestion`](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion).
The source was the synthetic, owned fixture
`intake/manuscripts/phi4-owned-synthetic-fixture.epub`. No real author content
was used.

The workflow uses the pinned model revision
`78eb92a46fc37e6b524df991ed9aca9bc6aa7b80` and the downloaded
`Phi-4-mini-instruct-Q4_K_M.gguf` asset. The live run required
`llama-cpp-python==0.3.35`; the previous 0.3.5 pin failed to load this GGUF.

---

## Evidence boundary and repository choice

The established `OKHP3/telling-forward-pilot-grove` repository has protected
`main` requiring a code-owner review and a required validation check. The
configured GitHub App could read that repository but did not have write
permission, and the steward credential cannot approve its own PR. No branch
protection was weakened. The task's permitted owner-controlled successor
path was used instead.

The successor repository is private, owned by `OKHP3`, and contains only the
pipeline sources, required labels, and the synthetic fixture used for this
measurement.

---

## Live Actions evidence

### Cold run

[Run 32925248225](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32925248225)
**Created:** 2026-08-26 03:07:11 UTC
**Job:** `ingest`, 8m50s from 03:07:15 to 03:16:05 UTC
**Workflow elapsed:** 8m54s

| Step | Start UTC | End UTC | Result |
|---|---:|---:|---|
| Install ingestion dependencies | 03:07:30 | 03:13:46 | success, 6m16s |
| Cache model weights | 03:13:47 | 03:13:47 | cache miss |
| Download model weights | 03:13:47 | 03:14:52 | success, 1m05s |
| Convert manuscript | 03:14:52 | 03:14:55 | success, 3s |
| Segment chapters and scenes | 03:14:55 | 03:14:55 | success |
| Extract draft capsules, Phi-4 CPU | 03:14:55 | 03:15:41 | success, 46s |
| File capsules as draft Issues | 03:15:41 | 03:15:44 | success, 3s |

The saved model cache was 2,457,166,782 bytes.

### Cache-hit run

[Run 32925827919](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32925827919)
**Created:** 2026-08-26 03:16:25 UTC
**Job:** `ingest`, 8m38s from 03:16:29 to 03:25:07 UTC
**Workflow elapsed:** 8m42s

| Step | Start UTC | End UTC | Result |
|---|---:|---:|---|
| Install ingestion dependencies | 03:16:45 | 03:23:35 | success, 6m50s |
| Cache model weights | 03:23:36 | 03:24:09 | cache hit |
| Download model weights | 03:24:09 | 03:24:09 | skipped |
| Convert manuscript | 03:24:09 | 03:24:12 | success, 3s |
| Segment chapters and scenes | 03:24:12 | 03:24:12 | success |
| Extract draft capsules, Phi-4 CPU | 03:24:12 | 03:25:01 | success, 49s |
| File capsules as draft Issues | 03:25:01 | 03:25:04 | success, 3s |

---

## Issue contract evidence

The cold run filed Issues [#1](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/issues/1)
and [#2](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/issues/2).
The cache-hit run filed Issues [#3](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/issues/3)
and [#4](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/issues/4).

All four Issues had exactly these labels:

- `capsule:planned-event`
- `state:draft`

Each Issue body included the model's source excerpt and:

> Filed automatically by the Tier-1 GitHub Actions ingestion pipeline. Review before promoting.

No other capsule type label was present. The duplicate-looking titles across
the two deliberate uploads are expected because the workflow does not
deduplicate separate upload IDs.

---

## Malformed-response atomicity check

[Run 32926407311](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32926407311)
used a short-lived branch with a deliberately malformed model candidate:
`kind: unknown`. The strict parser failed with:

`Model response contained invalid capsule candidate(s) at index 0`

The extraction step failed at 03:34:03 UTC, the Issue-filing step was skipped,
and the repository Issue count remained unchanged at four. This confirms that
no partial Issue batch reaches the repository when the model response is
malformed.

---

## Earlier failed attempts and corrective finding

- [Run 32924661784](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32924661784)
  reached the model download successfully but stopped at conversion because
  the first uploaded EPUB fixture was corrupt. It created no Issues.
- After the fixture was regenerated, [run 32924947439](https://github.com/OKHP3/telling-forward-pilot-grove-ingestion/actions/runs/32924947439)
  converted and segmented successfully, then failed immediately because
  `llama-cpp-python==0.3.5` could not load the valid Phi-4 GGUF. It created no
  Issues.
- Updating the dependency to `llama-cpp-python==0.3.35` produced the successful
  cold and cache-hit runs above.

These failures are retained as evidence of the test path and are not
turnaround measurements.

---

## Interpretation

The measured successful runs establish a real Actions baseline:

- Cold workflow elapsed: **8m54s**
- Cold model download: **1m05s**
- Cold Phi-4 extraction: **46s**
- Cache-hit workflow elapsed: **8m42s**
- Cache-hit Phi-4 extraction: **49s**

These are observations from two runs, not a contributor-facing promise. The
workflow still spent most of both runs installing dependencies, and the
cache-hit path did not remove that cost. No turnaround estimate should appear
in contributor-facing copy until a larger sample supports one.

---

## References

- `.github/workflows/manuscript-ingestion.yml`
- `.github/scripts/ingestion/test_ingestion.py`
- `.github/scripts/ingestion/requirements.txt`
- `docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md`
