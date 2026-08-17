# Contributing to Telling Forward

Thank you for helping explore a more accessible way to share stories.

This project is currently an experiment. Contributions may include product ideas, interface sketches, documentation, agent-skill proposals, code, or carefully scoped story experiments.

## A contribution is an invitation, not an entitlement

Please describe what you are proposing and what kind of permission you are requesting. A maintainer may accept, revise, defer, or decline a contribution. Acceptance into this repository does not automatically make a story part of canon or grant permission to reuse someone else's work.

The project distinguishes four common outcomes:

- **Personal work:** a contributor-controlled story that is not open for continuation.
- **Open path:** a work whose author has granted defined permission for others to continue or fork it.
- **Proposed canon:** a contribution submitted for review by the world steward or an agreed editorial group.
- **Published alternate path:** a permitted branch that remains visible as its own continuity rather than replacing canon.

The public product should make these states understandable without requiring contributors to know Git terminology.

This is the *kind* of contribution, decided at submission time. It is separate from the submission's *review status*: see "Tracking a submission" below.

## Tracking a submission

Once a story submission exists, it should carry a simple, independently visible status. The authoritative state machine is defined in `docs/platform-requirements.md` Section 7.3: **Draft**, **Submitted**, **Under review**, **Returned with notes** (loops back to Under review), then exactly one of two mutually exclusive terminal outcomes, **Accepted into canon** or **Published as an alternate path**. A contributor should be able to see this without understanding what a pull request, check run, or merge is. See [docs/adr/0001-product-naming-and-vocabulary.md](docs/adr/0001-product-naming-and-vocabulary.md) for the full backstage-to-frontstage vocabulary table, including the contributor flow (choose a story path, share character or plot intent, review the agent-shaped scene, submit).

## Good first contributions

- Explain a barrier that makes storytelling difficult.
- Propose a plain-language alternative to a developer workflow term.
- Describe an agent skill that reduces mechanical work while preserving contributor control.
- Improve accessibility, provenance, or contribution guidance.
- Add a small prototype with clear setup and testing notes.

## Story submissions

Do not submit unpublished fiction, personal material, or material owned by someone else unless you have the right to share it and understand the visibility of the destination. Use a private discussion or a private branch when appropriate.

Every story submission should identify:

- the contributor and any co-creators;
- whether the material is original, adapted, or quoted;
- the intended visibility;
- whether it is a draft, alternate path, or proposed canon;
- any restrictions or attribution requirements.

For an open path or shared world, also identify the governing steward, the applicable content license or contribution agreement, whether commercial adaptation is permitted, and whether contributors may reuse their own additions elsewhere. These choices must be visible before someone contributes.

Do not promise that a contribution will receive royalties, become canon, or be selected for adaptation unless a separate written agreement says so. If a future commercial model is tested, it should use a documented eligibility rule, a traceable contribution record, and a defined process for resolving disputes.

## Review language

The public interface may use terms such as **story submission**, **story path**, **saved moment**, **editor question**, **accepted into canon**, and **published alternate path**. GitHub's technical terms remain useful backstage, but contributors should not need to understand them to participate.

What a contributor never has to see, and how a maintainer or agent should route it instead, is defined in [docs/adr/0002-contributor-notification-model.md](docs/adr/0002-contributor-notification-model.md).
