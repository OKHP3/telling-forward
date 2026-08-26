---
name: Phi-4 Actions runtime
description: Live compatibility constraint for the pinned Phi-4 GGUF on GitHub Actions CPU runners
---

The pinned `unsloth/Phi-4-mini-instruct-GGUF` asset uses the `phi3` GGUF
architecture metadata, but the older `llama-cpp-python` dependency pin used
by the first pilot attempt could not load it. A current compatible pin is
required for the CPU Actions path.

**Why:** The model download can succeed while initialization fails immediately,
so download success alone is not evidence that the ingestion runtime works.

**How to apply:** When changing the Phi-4 revision or runner dependency, run
the actual Actions loader before publishing timing or turnaround claims, and
record model download and inference timings separately.