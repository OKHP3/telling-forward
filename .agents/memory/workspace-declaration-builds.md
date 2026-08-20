---
name: Workspace declaration builds
description: Keeping artifact TypeScript checks aligned with changed workspace schemas.
---

After changing a composite workspace library schema, emit its declarations before running an artifact's standalone TypeScript check.

**Why:** Artifact compilers can resolve the library's generated declaration output rather than its updated source, causing false "property does not exist" failures immediately after a valid schema change.

**How to apply:** Run the repository's library build/typecheck first; if an artifact still sees an old workspace type, emit the affected library's declarations with its TypeScript project before retrying the artifact check.