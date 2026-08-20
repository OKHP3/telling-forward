---
name: Reader 404 recovery
description: Keep broken Reader links visibly recoverable without weakening retries for temporary API failures.
---

Reader route queries must not retry a confirmed API 404. Treat it as a terminal absence and render the editorial recovery state immediately; keep the usual bounded retry behavior for other failures.

**Why:** React Query's default retries briefly left a missing storyworld styled as an empty world because the paths query could complete while the missing-world request remained in retry state.

**How to apply:** Any Reader route whose identity comes from a URL should use the 404-aware retry rule for the record and its required route data. Cover invalid identifiers, confirmed 404s, and a missing child record in the recovery test suite.