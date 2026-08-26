# Architecture Decision Records

This directory records architecture and product-governance decisions for
Telling Forward. ADR numbers are stable identifiers. Filenames use concise,
portable summaries; the document heading holds the full decision title.

## Index

- [ADR-0001: Product naming and contributor-facing vocabulary](0001-product-naming-and-vocabulary.md)
- [ADR-0002: Contributor notification model](0002-contributor-notification-model.md)
- [ADR-0003: GitHub-native fast path versus custom backend](0003-github-native-fast-path-vs-custom-backend.md)
- [ADR-0004: Manuscript ingestion and bring-your-own AI](0004-manuscript-ingestion-and-bring-your-own-ai.md)
- [ADR-0005: Reader state, provenance, and contributor signals](0005-reader-state-provenance-signals.md)
- [ADR-0006: Canon governance concepts](0006-canon-governance-concepts-from-bac-manuscript.md)
- [ADR-0007: Reader accessibility and clarity](0007-reader-accessibility-and-clarity.md)
- [ADR-0008: Reader consent and contribution](0008-reader-consent-and-contribution.md)
- [ADR-0009: Transformation fidelity and readability assist](0009-transformation-fidelity-and-readability-assist-concepts.md)
- [ADR-0010: Content operations and governance](0010-content-ops-and-governance.md)
- [ADR-0011: Provenance and process artifacts](0011-provenance-and-process-artifacts.md)
- [ADR-0012: Scene-purpose framing](0012-scene-purpose-framing-from-synopsis-discipline.md)
- [ADR-0013: GitHub-native boundary and donor primitives](0013-github-native-boundary-and-donor-primitives.md)
- [ADR-0014: Storyworld creation boundary](0014-storyworld-creation-boundary.md)
- [ADR-0015: Reader interest signal](0015-reader-interest-signal.md)
- [ADR-0016: Structural transposition and classics seed library](0016-structural-transposition-and-classics-seed-library.md)

## Filename transition

On 2026-08-19, the following filenames were shortened to meet the repository
portability profile. Update any external links that target the former paths.

| Former filename | Current filename |
| --- | --- |
| `0005-narrative-statecraft-provenance-and-contributor-economy-concepts.md` | `0005-reader-state-provenance-signals.md` |
| `0007-reader-accessibility-register-and-clarity-pass-from-bac-thread.md` | `0007-reader-accessibility-and-clarity.md` |
| `0008-reader-contribution-consent-ladder-data-stream-separation-and-echo-relay-concept.md` | `0008-reader-consent-and-contribution.md` |
| `0010-content-ops-schema-and-governance-signals-from-mps-council-thread.md` | `0010-content-ops-and-governance.md` |
| `0011-provenance-and-process-artifact-concepts-from-first-mover-claim.md` | `0011-provenance-and-process-artifacts.md` |

## Traceability snapshot

This table was reconciled on **2026-08-21**. “Evidence” means the decision
already has an implementation or policy record; “deferred” means it is
intentionally not authorized by the ADR; “task” identifies the current
delivery work that can produce the missing evidence. An Open ADR may contain
accepted design intent alongside proposals that still need an owner call.

| ADR | Current disposition | Authoritative evidence or deferral | Next traceable action |
|---|---|---|---|
| 0001 | Accepted vocabulary; implementation partial | `docs/platform-requirements.md` §7.3 is authoritative for the six-state submission model; `CONTRIBUTING.md` carries the contributor vocabulary | UI and notification implementation; do not revive the historical four-state sketch |
| 0002 | Accepted design principle; not implemented | Five calm contributor notifications map to the six-state model in `docs/platform-requirements.md` §7.3; maintainer detail remains separate | Notification delivery is deferred until the notification work is scheduled |
| 0003 | Accepted GitHub-canonical hybrid | ADR-0013 clarifies the boundary: GitHub is durable source, PostgreSQL is rebuildable index, Replit is the narrow support layer | GitHub App pilot and rebuild evidence: task 150 and task 145 |
| 0004 | Open; implementation exists, adoption gates remain | Ingestion scripts, workflow, MCP server, and local verification are recorded in “What’s actually built” and “Verification”; six-state discrepancy and private-pilot upload trigger are settled | Real Phi-4 Actions timing: task 156; confirm file placement before treating the ingestion package as adopted |
| 0005 | Open proposals with accepted provenance design intent | Provenance is reserved as a GitHub-Issue-keyed record under open question 15.12; monetization is explicitly deferred by Mission principle 10 | Provenance and reader-signal work remains separately scoped; no build is implied here |
| 0006 | Open proposals; locality wording accepted as policy direction | Mission principle 6 is the governing canon/possibility rule; term ledger shape is constrained by open question 15.12 | Add/verify policy wording and later steward ledger design; no `capsules` table |
| 0007 | Open; item 2 deferred, remaining clarity/accessibility proposals unresolved | Owner reconciliation on 2026-08-21 makes this ADR authoritative for the optional contributor clarity/register concept; Jamie Hill deferred open question 15.13 on 2026-08-26 | Owner decisions for items 1 and 3–5 and any later clarity design; item 2 has no approved field, label, view, or implementation |
| 0008 | Open proposals with design requirements recorded | Per-action consent and moderation design are recorded in open questions 15.14 and 15.15; the Disrupt/Invert policy is recorded under 15.10; enforcement remains deferred | Approve and evidence the consent-ladder enforcement gate before any public Disrupt/Invert contribution flows |
| 0009 | Open; overlapping clarity item retired into ADR-0007 | Owner reconciliation on 2026-08-21 makes item 2 corroborating evidence, not a second proposal; fidelity-report item remains distinct | If pursued, scope fidelity output with the transformation work; do not create a second clarity decision |
| 0010 | Open proposals and guidance | Provenance/ledger fields are a design starting point; GitHub Issues and the 15.12 decision constrain storage; repo split is guidance only | Owner calls or downstream design tasks; no current topology change |
| 0011 | Open proposals; positioning explicitly deferred | Process narrative and compendium depend on provenance/ledger work; public positioning waits for real traction and shipped evidence | Do not publish claims; revisit only after dependencies produce evidence |
| 0012 | Open; scene-purpose proposal only | The GitHub boundary reference is accepted in ADR-0003 and clarified by ADR-0013; it is retained here as historical evidence, not an unresolved architecture question | Decide whether to include purpose notes when Concept Board implementation is scoped |
| 0013 | Accepted boundary and donor-primitives decision | `docs/reviews/2026-08-20-github-native-boundary-research.md`, current GitHub identifiers in schema/code, and migration gates | GitHub App, rebuild, safety, and live-route evidence remain separately gated; see tasks 150, 145, and 138 |
| 0014 | Accepted storyworld creation boundary | `content/pilot-storyworld/README.md` and the 2026-08-21 owner decision: repository creation remains manual and GitHub-native; the app only registers an existing repository | Scope and verify the steward-invoked registration flow; do not automate repository creation without a new ADR |
