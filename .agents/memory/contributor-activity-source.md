---
name: Contributor activity source
description: The mobile contributor activity feed is sourced from durable narration records and platform identity.
---

The current mobile narration flow creates a durable contribution immediately, so its contributor-facing status is accepted. The older proposal workflow has no contributor foreign key and must not be joined to a mobile contributor by path alone.

**Why:** Joining proposals by storyworld or path would expose other contributors' editorial records and invent ownership.

**How to apply:** If pending or returned states are added to mobile activity, first add a durable contributor identity to the proposal model or another explicit submission-to-contributor link.