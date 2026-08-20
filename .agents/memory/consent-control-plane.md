---
name: Consent control plane
description: Contributor permissions are private, append-only, storyworld-scoped records separate from GitHub creative history.
---

Consent records are a private control-plane exception: the latest record for a user, storyworld, action, and scope determines whether a future product action may begin. Revocation is prospective and must never be represented as deletion of Git history or completed canon decisions.

**Why:** Identity-linked policy choices and withdrawal timing must not be published in the creative repository, while the product still needs auditable server-side gates.

**How to apply:** Derive the required action from the endpoint, verify ownership/scope/status/version server-side, and keep CIE/PIE derivative consent disabled until its separate decision is resolved.