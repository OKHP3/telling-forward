---
name: Workspace build environment
description: Policy for artifact runtime configuration in root validation.
---

Root validation must supply non-production configuration for any artifact that validates managed-runtime variables while loading or building.

**Why:** Managed artifact workflows provide runtime values that a normal root shell does not. Both static web configuration and mobile bundle generation can validate or embed those values during a build.

**How to apply:** Keep portable, non-production values in the root validation command and preserve the artifact-level validation used by previews and deployments. Use a reserved host name for any build-only domain.