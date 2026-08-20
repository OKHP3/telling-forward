# Telling Forward Attainable Delivery Roadmap

## Status

**Draft sequencing plan derived from the dream platform specification and reconciled with the 2026-08-20 equilibrium review.**

This roadmap does not assume every dream requirement will be funded or desired. A stage earns the next one only when it delivers standalone value, has evidence of use, and has resolved the decisions it depends on.

## 1. Sequencing rule

Build complete promises, not disconnected screens.

Each stage must answer three questions:

1. Who can do something valuable at the end of this stage?
2. What durable record exists after they do it?
3. What evidence tells us whether to build the next stage?

## 2. Dependency spine

```text
Decision and safety rails
        |
Private Writer's Workbench, ingestion, and deployable worldbuilder kit
        |
Capsule-to-scene maturation and private contributor draft-to-submission loop
        |
Steward review, provenance, and alternate publication
        |
Selective AI assistance and contributor collaboration
        |
Discovery, community, multi-world network, and publishing services
        |
Only then: commercial or adaptation programmes
```

## 3. Delivery stages

### Stage 0: Make the rules buildable

**Promise:** a project owner can make the few decisions that prevent incompatible work from accumulating.

| Requirement slice | Why now | Evidence of completion |
| --- | --- | --- |
| Resolve repository-per-world, contributor identity, service identity, and six-state workflow decisions. | These affect every durable identifier, permission check, and GitHub write. | Decisions are recorded in the open-questions log and reflected in architecture and requirements. ADR-0013 defines the boundary between GitHub-native primitives and the product layer. |
| Define the first rights and consent profile for one low-risk pilot world. | A contribution system cannot safely launch on implied permissions. | Plain-language pilot terms, an explicit consent record, and withdrawal/escalation procedure exist. |
| Define restriction and withdrawal lifecycle. | Canon and alternate publication are not safe outcomes for every submission. | Authority, visibility effect, non-public archive/tombstone, export, restoration, and contributor-notice rules are tested with a rights-sensitive fixture. |
| Define the untrusted-upload boundary. | A private upload is still an attack and confidentiality surface. | Threat model, data lifecycle, isolation and resource limits, cleanup, incident behavior, and malicious-fixture test plan are approved. |
| Create a traceability and capability baseline. | Existing local code and target-state requirements must not be confused. | Every Stage 0/1 requirement maps to its durable records, owner, acceptance evidence, and current status: implemented-in-checkout, tested, deployed, accepted, deferred, or not started. |
| Define the minimum steward moderation model for an invite-only pilot. | Safety should precede growth. | Roles, reporting route, escalation owner, and response expectations are documented and tested. |
| Select one pilot kit and one customer. | The dream has many users; an initial release should have one clear job. | A named pilot scenario with owner, intended participants, and success measures exists. |

**Recommended first pilot:** an author-led, invite-only storyworld. It exercises contribution and canon governance without the risks of a public open community.

**Do not build yet:** public marketplace features, credits, monetization, broad social discussion, or legal claims beyond the pilot’s documented terms.

### Stage 1: Ship the Writer's Workbench and Worldbuilder Kit

**Promise:** a worldbuilder can turn their own raw material into reviewable capsules, create a structured storyworld from a kit, and publish a basic reader edition without hand-configuring GitHub.

| Requirement slice | Includes | Durable outcome |
| --- | --- | --- |
| One template repository | The checked-in `content/pilot-storyworld/` Storyworld Kit baseline: manifest, README, canon policy, contribution policy, provenance convention, issue/PR templates, canonical labels, CODEOWNERS template, branch-protection prerequisites, and structural-only Actions validation. | A reusable repository blueprint that can be checked before a private pilot is opened. |
| World initialization | Guided configuration or documented setup that creates a world from the template. | A repository with world-specific settings committed to it. |
| Private Writer's Workbench | Direct creation and editing of character, arc, scene, event, setting, motif, question, and vision capsules. | A private, versioned Concept Board. |
| Safe ingestion design baseline | Manual capture plus synthetic or demonstrably owned fixtures; rules-only extraction/segmentation design, source hash/provenance, draft candidate capsules, and failure handling. Real untrusted uploads remain gated by Stage 0. | An inspectable ingestion record that never auto-promotes work or places a private raw source in Git or a reader build. |
| CME review | Compare candidate capsules to source excerpts, correct/merge/split/reject them, and add approved capsules to the board. | Human-approved draft capsules tied to their sources. |
| Basic reader edition | Render selected scenes as readable full text, with title, attribution, canon state, and content notes. | A deployable static or service-hosted edition. |
| Steward setup | Assign initial owner/steward roles and configure canonical branch protection. | A governed review boundary. |
| Export | Produce a portable archive and a readable edition export. | A worldbuilder can leave with their material. |

**Success test:** one real worldbuilder manually captures or uses demonstrably owned, non-sensitive fixtures, approves at least five capsules on a private Concept Board, opens a repository, publishes an initial story seed, changes a scene, and publishes a new reader edition without direct developer assistance. The acceptance card records the agreed format/size limits, provenance fields, approval audit fields, performance budget, recovery expectation, and every intentionally deferred requirement.

**Why it is useful alone:** it is an actual writer's workbench and a deployable Storyworld Kit, even before social contribution exists.

### Stage 2: Complete the private contribution loop

**Promise:** an invited contributor can make a protected draft and submit a scene without using GitHub.

| Requirement slice | Includes | Durable outcome |
| --- | --- | --- |
| Identity and invitations | The Stage 0 identity decision, verified sign-in, invite acceptance, contributor profile, and role-scoped access. | A contributor identity linked to their submissions. |
| Draft workspace | Typed composition first, private autosave, path selection, basic revision history, and explicit visibility/permission selection. | A recoverable draft record. |
| PME scene maturation | Deliberately turn an approved capsule into a scene plan or editable draft, retaining the source capsule and human approval boundary. | A writer-shaped scene draft, not an auto-submission. |
| Submit a scene | Create a path or contribution record, durable GitHub change, structured metadata, and a reviewable submission. | A submission tied to source content and contributor intent. |
| Contributor status | The six-state plain-language status model and clear next action. | A trustworthy review experience. |
| Full reader view | Display accepted scene content, not just commit summaries. | Readers see the new work as story. |

**Success test:** an invited non-technical participant submits a typed scene; a steward can see it with correct attribution and permission; the participant can understand its status without help.

**Why it is useful alone:** the core author-led collaboration promise works for a small, trusted group.

### Stage 3: Make stewardship trustworthy

**Promise:** a steward can conduct a fair editorial loop and readers can distinguish canon from alternate paths.

| Requirement slice | Includes | Durable outcome |
| --- | --- | --- |
| Editorial queue | Submitted, under-review, and returned-with-notes actions; focused editor questions; audit entries. | A managed review process. |
| Canon acceptance | Human authorization, GitHub merge or canonical update, provenance ledger, publication update. | An attributable canonical revision. |
| Alternate publication | Close without canon merge, publish as separate path when permitted, preserve attribution and linkage. | A legible alternate continuity. |
| Steward dashboard | Submission state, unresolved feedback, recent decisions, errors, and basic moderation signals. | Operational clarity. |
| Notifications | The existing five calm contributor-facing notification events, separate from maintainer noise. | Contributors stay informed without GitHub jargon. |

**Success test:** five invited contributors complete the review loop. Every result is canon or alternate, each is discoverable, and each has a traceable decision record.

**Why it is useful alone:** this turns a writing intake tool into an actual governed storyworld.

### Stage 4: Add voice and carefully bounded AI assistance

**Promise:** contributors can begin in the medium most natural to them, while retaining control over what represents them.

| Requirement slice | Includes | Guardrail |
| --- | --- | --- |
| Voice capture and transcription | Recording, manual correction, language choice, private storage expectations, and typed fallback. | Voice never becomes published text without contributor approval. |
| Agent-shaped draft assistance | Optional organization, scene shaping, alternatives, and explanations of material changes. | No silent agent authorship or auto-submission. |
| Continuity assistance | Steward-visible questions, not automatic rejections. | Human steward remains accountable. |
| AI provenance | Disclosure of assistance and source/context permissions. | AI policy and consent are enforced per world. |
| Cost and failure controls | Usage budgets, rate limits, cancellation, retries, and manual fallback. | Model unavailability never blocks basic writing. |

**Success test:** a contributor records a voice note, corrects the transcript, approves a draft, and submits it. They can describe which words were theirs, what assistance was used, and what permission they granted.

**Why it is useful alone:** the platform begins to honor its voice-first mission without making AI the product’s author.

### Stage 5: Govern derivative xME

**Promise:** a writer can deliberately use CIE and PIE only where the source's versioned consent permits it, and can understand or revoke the consequences.

Prerequisites: owner resolution of action-specific consent and derivative questions; a legally reviewed pilot rights profile; default-deny action authorization; a descendant-lineage and restriction model; and negative authorization tests.

| Requirement slice | Includes | Evidence of completion |
| --- | --- | --- |
| CIE and PIE authorization | Source/action/scope/purpose checks before any transformation context is sent or output is created. | Extraction-only consent denies CIE and PIE by default. |
| Attributed divergence | Separate output identity, source lineage, agent disclosure, and human approval. | A steward and contributor can trace an output without exposing restricted source text. |
| Revocation handling | Descendant discovery, future-use block, restriction/unpublish behavior, and minimal audit record. | A multi-step lineage fixture passes after upstream permission is revoked. |

**Do not build this as a shortcut:** CIE and PIE are not an extension of generic “AI processing allowed.” They are separate, rights-sensitive capabilities.

### Stage 6: Expand kit types and reader depth

**Promise:** worldbuilders can choose a collaboration model suited to their actual community, and readers can navigate richer worlds.

| Requirement slice | Includes |
| --- | --- |
| Additional kits | Shared writers’ room, classroom/workshop, oral-history archive, and public experiment, each with a risk review and explicit exclusions. |
| Reader tools | Continue reading, bookmarks, path maps, divergence comparison, companion entries, search, accessibility metadata, and editions. |
| World knowledge | A steward-managed world bible, entity references, continuity ledger, and change history. |
| Collaboration | Co-creation roles, prompts, bounded events, and approved discussion/reactive surfaces. |
| Preservation | EPUB/PDF/Markdown exports, archival packages, versioned public editions, and documented metadata schemas. |

**Success test:** two unlike world types operate from kits without custom code, and readers can understand a non-linear world without a steward explaining it to them.

### Stage 7: Build the network deliberately

**Promise:** people can discover and return to storyworlds without turning every world into a public free-for-all.

| Requirement slice | Includes |
| --- | --- |
| Discovery | Curated catalogue, search, accessibility/content filters, invitations, and steward-curated collections. |
| Trust and safety at scale | Reporting queues, block/mute, spam prevention, policy enforcement, moderator tooling, and response metrics. |
| Multi-world identity | Contributor portfolio, permissions dashboard, private contribution history, and portable attribution. |
| Platform operations | Support tooling, reliability monitoring, data-retention controls, cost controls, and incident response. |
| Insight | Consent-respecting analytics that reveal reading and contribution value without treating private creativity as telemetry. |

**Success test:** people discover three suitable worlds, receive no confusing technical notifications, and operations can resolve an abuse report and a synchronization failure through documented playbooks.

### Stage 8: Consider commercial and adaptation services

**Promise:** only if earlier stages have earned trust, the platform can support clearly governed opportunities around successful worlds.

Prerequisites are non-negotiable: an explicit legal model, per-contribution rights chain, contributor eligibility rules, owner approval, tax/payment treatment, dispute resolution, transparent reporting, and an opt-in rather than implied-participation model.

This stage is intentionally not scoped into a build backlog. It is a later business and legal programme, not a feature toggle.

## 4. Capability map

| Capability | First stage | Depends on |
| --- | --- | --- |
| Deployable repository templates | 1 | Stage 0 pilot and rights profile |
| Full reader edition | 1 | Content structure and publication configuration |
| Non-technical typed submission | 2 | Identity, permissions, GitHub write model |
| Canon/alternate editorial loop | 3 | Submission loop, steward role, provenance model |
| Voice transcription | 4 | Private draft handling, user identity, cost controls |
| Capsule workbench and rules-only ingestion | 1 | Stage 0 pilot and source-rights profile |
| CME review and source provenance | 1 | Capsule model and ingestible source contract |
| PME capsule-to-scene maturation | 2 | Approved capsule, private draft workspace |
| AI shaping/continuity | 4 | Consent policy, human approval, safe context model |
| CIE/PIE derivative xME | 5 | Versioned action-specific consent, descendant lineage, restriction lifecycle, negative authorization tests |
| Multiple kit types | 6 | Proven pilot pattern and risk review |
| Public discovery/community | 7 | Scalable moderation and operations |
| Commercial/adaptation programmes | 8 | Explicit legal and economic design |

## 5. Backlog format for implementation work

Every future feature should state:

1. The user and their job to be done.
2. The promise it completes in a current stage.
3. The durable GitHub and service records it creates or changes.
4. The consent, attribution, and moderation impacts.
5. The non-technical interface language it uses.
6. The failure, withdrawal, and recovery path.
7. The acceptance test with a real or representative user.
8. Requirement IDs, durable-record schema, current capability status, owning stage, and explicit deferrals.

If a proposed feature cannot answer these, it belongs in discovery, not implementation.

## 6. First practical backlog

These are intentionally small enough to plan next, while still building Stage 1 rather than another disconnected prototype.

1. Decide the Stage 0 pilot and resolve its blocking open questions.
2. Define the versioned `world-manifest`, capsule, source-asset, ingestion-job, and transformation-record schemas.
3. Start from `content/pilot-storyworld/` and run `scripts/validate-storyworld-kit.mjs`; customize the world manifest, contribution policy, canon policy, CODEOWNERS, issue forms, labels, and branch-protection settings without changing the structural-only Action into an editorial or rights decision.
4. Define the untrusted-upload threat model, source lifecycle, retention/deletion/restriction behavior, and malicious-fixture acceptance contract. Do not accept real uploads until this gate passes.
5. Build the private Concept Board, manual capsule creation, candidate-capsule review, and source-provenance links. GitHub Issues and labels remain the canonical capsule store; native Project fields or Actions are optional derived controls.
6. Define the scene file format and metadata required to render full story text.
7. Build a static reader edition for one seeded or pilot world.
8. Add a documented, repeatable way to create a new world from the template.
9. Build the Stage 0/1 traceability matrix and dated capability inventory; resolve every unmapped requirement as implemented, deferred, or not planned. The equilibrium review identified this as still outstanding.
10. Test the entire workbench-to-reader flow with one worldbuilder before adding contributor submission UI.

This produces a deployable product in its own right: a worldbuilder can spawn and publish a governed storyworld. The next work then completes one careful contributor loop on top of it.
