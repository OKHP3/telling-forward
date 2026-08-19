---
name: Post-merge Drizzle setup
description: Database schema sync in the post-merge hook must use the workspace's forced push command and a buffered timeout.
---

The post-merge database step must run Drizzle's forced push command because the schema can contain existing rows that trigger a data-loss confirmation prompt. The command may still render prompt text, but it exits successfully without interactive input when forced.

**Why:** The post-merge runner closes stdin, and the default schema push can stall or fail at a confirmation prompt. Dependency installation plus schema inspection also needs more than the original short timeout.

**How to apply:** Keep the hook non-interactive and retain a timeout buffer large enough for frozen dependency installation and database schema synchronization.