# ADR-0001: Product Naming and Contributor-Facing Vocabulary

## Status

Accepted (naming). Partially implemented (vocabulary: see Gaps below).

## Context

Before this repository had a name, an August 16, 2026 voice thread worked through the naming problem directly. The word **Forge** was ruled out early for two reasons: it echoes "forgery," and it had already been used across other OverKill Hill P3 concepts, so it no longer functioned as a distinguishing brand.

The thread then explored word families the founder was already drawn to: Narrative, Authors, Communal, Momentum, Inertia, Continuum, Flywheel, Sharing, Improvisational. Candidates were risk-ranked against existing usage before any commitment:

- **Most crowded** (already established phrases elsewhere): Narrative Momentum, Narrative Continuum, Story Flywheel.
- **Usable but conceptually broad**: Communal Narrative, Narrative Commons, The Living Canon.
- **Most promising starting points**: The Author Commons, Continuum Authors.

The working conceptual label that survived this process was **open-canon collaborative fiction**: an originating author opens a storyworld, other people extend it through authorized branches, and the result has multiple continuities rather than one fixed canon. The product name that was ultimately adopted is **Telling Forward**.

Separately, the same thread worked out how to keep Git and GitHub mechanics from becoming a barrier to a non-developer audience. The founder explicitly noted only recently understanding what a PR or commit is, and expected the target contributor to know even less. The proposed solution was a plain-language vocabulary layer over GitHub's real machinery: GitHub stays backstage, contributors never see developer terms.

| Backstage (GitHub) | Contributor-facing term |
| --- | --- |
| Repository | The storyworld |
| Branch | Your story path |
| Commit | Saved moment |
| Pull request | Submit your scene |
| Merge | Accepted into official story / canon |
| Issue or comment | Story note or editor feedback |

The thread also sketched a contributor flow: choose a world or story path, speak or type character and plot intent, review the agent-shaped scene, press "Submit your scene," then track a simple status: **Draft, Under review, Accepted into canon, or Published as an alternate path.**

## Decision

1. Product name: **Telling Forward**. Concept descriptor: **open-canon collaborative fiction**. Both are already reflected in `README.md`, `docs/MISSION.md`, and `AGENTS.md`.
2. The frontstage/backstage vocabulary table above is the reference standard for any contributor-facing copy, UI labels, or notification text. GitHub terminology may remain in code, commit history, and maintainer tooling, but should not surface in the contributor experience.
3. The submission status is a distinct axis from the four ownership/permission outcomes already documented in `CONTRIBUTING.md` (Personal work, Open path, Proposed canon, Published alternate path). The sketch in this ADR's Context (Draft, Under review, Accepted into canon, Published as an alternate path) was later refined into the authoritative state machine in `docs/platform-requirements.md` Section 7.3, which adds **Submitted** and **Returned with notes** and makes the two terminal outcomes mutually exclusive results of the same review, not a sequence. Section 7.3 is the single normative model; this ADR defers to it. The ownership outcome describes *what kind of thing* a contribution is; the status describes *where a specific submission is* in review. Both should be tracked and surfaced independently once a submission UI exists.

## Gaps this ADR closes

`CONTRIBUTING.md` already used **story path**, **story submission**, **editor question**, **accepted into canon**, and **published alternate path**, but had no term for a commit (**saved moment**) and did not state the status progression as a distinct, trackable field. Both are added by the companion edit to `CONTRIBUTING.md` in this change.

## Consequences

- Any future submission UI should render status using the state machine in `docs/platform-requirements.md` Section 7.3, not raw GitHub PR/check state.
- "Submit your scene" is the recommended call-to-action verb-phrase for a UI button; "story submission" remains the correct noun when describing the object of that action. Keep both, don't collapse them.
- Naming and vocabulary decisions made in ad hoc conversations before this ADR existed are easy to lose. Future naming or vocabulary changes should be recorded as a new ADR (or an amendment here) rather than left in a chat transcript only.
