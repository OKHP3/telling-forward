# Third-party model notice: Phi-4-mini-instruct

This repository's Tier-1 ingestion workflow
(`.github/workflows/manuscript-ingestion.yml`) downloads and runs
**Phi-4-mini-instruct**, published by Microsoft, at workflow run time. The
weight file is never committed to this repository — see the workflow for
the pinned Hugging Face revision it downloads.

- **Publisher:** Microsoft
- **License:** MIT
- **Model card:** https://huggingface.co/microsoft/Phi-4-mini-instruct
- **Parameters:** 3.8B

MIT is a permissive license and imposes no restriction on this use, but
bundling a third-party model into a redistributed platform still warrants
a plain notice. If this model choice changes, update this file, the
`HF_MODEL_REPO` / `HF_MODEL_REVISION` values in the workflow, and the
license line here to match.

Status: **inferred, not confirmed against the live model card at the time
you read this.** License terms for actively maintained models can change
between releases — verify the current license on the model card linked
above before treating this notice as authoritative, especially if you
change `HF_MODEL_REVISION` to point at a newer release.
