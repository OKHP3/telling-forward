---
name: Offline story cache
description: Guardrails for persisted React Query story-reading data in the mobile app.
---

Persist only successful story-reading queries, and rotate the persistence buster whenever the cached-query filter or stored shape changes.

**Why:** Dehydrating a pending request can restore a partial cache entry that later rejects, producing warnings and no usable offline story content.

**How to apply:** Keep the story-query prefix filter paired with a successful-query-state check. When changing either the filter or the serialised response shape, change the buster so devices discard incompatible cached entries.