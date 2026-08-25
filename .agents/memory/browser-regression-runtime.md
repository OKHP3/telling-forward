---
name: Browser regression runtime
description: Chromium browser checks need both the Playwright binary and native Nix libraries in this workspace.
---

Browser-level checks are reproducible only when Playwright Chromium and its native runtime libraries are provisioned in the workspace.

**Why:** The default Node dependencies and downloaded browser binary do not guarantee that Chromium can start on the minimal Nix environment.

**How to apply:** When adding or running Playwright checks, verify the browser binary and required Nix libraries before diagnosing test failures as application issues.