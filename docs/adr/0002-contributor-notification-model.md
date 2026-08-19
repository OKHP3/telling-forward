# ADR-0002: Contributor Notification Model (Progressive Disclosure)

## Status

Accepted as design principle. Not yet implemented: no notification system exists in the repository yet.

## Context

GitHub generates a lot of operational noise per pull request: CI check results, formatting failures, merge conflicts, bot comments, security alerts, reviewer back-and-forth. A non-developer contributor should not have to parse any of that to know how their story is doing.

The August 16, 2026 planning thread was explicit that this is simplification, not concealment for deception: the contributor still gets every outcome that actually matters to their story, just without the mechanics.

## Decision

Use a two-tier notification model.

**Contributor-facing inbox**: plain language, limited to five states:

1. We received your scene.
2. Your scene is being reviewed.
3. We have one creative question for you.
4. Your scene is now part of the official story.
5. Your scene is published as an alternate path.

**Maintainer/agent-facing stream**: the full operational feed of formatting problems, continuity conflicts, duplicate submissions, security notices, automated check failures, and reviewer discussion.

Agents may triage the maintainer-facing stream and prepare recommendations (routing routine issues, flagging duplicates, drafting a suggested response). Agents do not make the final call on authorship, canon inclusion, or difficult creative feedback; that stays with a human steward. This is the same boundary already stated more generally in `docs/MISSION.md` working principles 3 ("Make the hidden machinery humane") and 9 ("Treat agents as instruments"). This ADR is the operational detail behind those two principles.

`docs/platform-requirements.md` Section 7.3 has since defined the authoritative contributor submission state machine and explicitly maps each of the five states above onto it (Submitted, Under review, Returned with notes, Accepted into canon, Published as an alternate path). That mapping is consistent with this ADR, not a change to it; Section 7.3 governs submission state, this ADR governs what the contributor is told about it.

## Consequences

- Any future notification, email, or in-app messaging feature should be built against the five contributor-facing states above, not by exposing raw GitHub webhook payloads or Action run results to contributors.
- The maintainer/agent stream can be as detailed and technical as needed; it is explicitly not the layer that needs simplifying.
- If a sixth contributor-facing state becomes necessary, treat that as a deliberate change to this ADR, not an ad hoc addition. The value of the model is that the list stays short enough to be calm.
