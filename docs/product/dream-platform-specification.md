# Telling Forward Dream Platform Specification

## Status

**Draft product vision and requirements.**

This is a deliberately expansive target state, not a promise that the current prototype provides these capabilities or that every requirement will be built. It exists to make the desired whole visible before work is sliced into useful, testable releases.

**Equilibrium review limit, 2026-08-19:** approved only as a controlled discovery and design baseline. It does not authorize real untrusted uploads, public contribution, derivative processing of others' material, commercial use, or rights-sensitive publication. See `docs/reviews/2026-08-19-dream-platform-equilibrium-review.md`.

Evidence labels:

- **Confirmed** means the capability or constraint exists in the repository today.
- **Proposed** means this specification recommends it for the target state.
- **Open** means an owner decision is required before implementation can rely on it.

## 1. The dream in one sentence

Telling Forward is the place where a person can open a world, invite others into it safely, turn spoken or written possibility into attributable story, govern what becomes canon, let readers travel its living paths, and preserve the whole lineage in forms that outlast the platform.

It should feel like a welcoming creative room to a first-time storyteller, a trustworthy studio to an author, a legible library to a reader, and a durable publishing system to a steward.

## 2. What the product is

**Proposed:** Telling Forward is a product family, not one undifferentiated app.

1. **Worldbuilder Studio** lets a creator start and govern a storyworld.
2. **Storyworld Kit** is a deployable GitHub repository template containing the world’s durable structure, governance, content, and publication configuration.
3. **Writer's Workbench** lets a worldbuilder or writer capture raw possibility, craft capsules, review ingested material, and deliberately mature selected ideas into scenes.
4. **Reader** is a calm public or private experience for discovering and reading canonical and alternate paths.
5. **Contributor Studio** lets people speak, write, shape, seek permission for, and submit story material without learning Git.
6. **Steward Studio** lets authorized humans govern canon, feedback, safety, rights, continuity, and publication.
7. **Telling Forward Services** provide identity, optional AI assistance, synchronization, search, notifications, analytics, and safe integrations.

GitHub remains the durable, inspectable record for a world’s versioned story assets and governance artifacts. Telling Forward is the humane layer over that machinery. Whether the service is a thin GitHub-native layer or a broader API and database product remains **Open** under existing architecture decisions.

## 3. The people the dream serves

| Person | Their real job | What success feels like |
| --- | --- | --- |
| Reader | Find something worth reading and understand where it belongs. | “I know what is official, what is alternate, and where to go next.” |
| First-time storyteller | Share a memory, scene, character, or possibility despite not identifying as a writer. | “My voice became something I recognize and approve.” |
| Contributor | Extend a world while respecting its rules and other people’s work. | “I can participate without guessing the rules or losing credit.” |
| Worldbuilder | Open a new world without becoming a systems administrator. | “My world is live, protected, understandable, and ready for the kind of collaboration I chose.” |
| Steward or editor | Protect a world’s creative direction while giving contributors clear, humane feedback. | “I can make accountable decisions without drowning in operational noise.” |
| Co-creator or writing group | Create together with shared authority and clear boundaries. | “We know who can decide what, and our work does not disappear into chat.” |
| Teacher, facilitator, or oral historian | Run a bounded, consent-aware storytelling activity. | “Participants can contribute safely, and I can preserve the work appropriately.” |
| Publisher or rights manager | Assess what can be published, adapted, or licensed. | “The chain of rights, attribution, and approvals is traceable.” |
| Platform operator | Keep the service safe, resilient, and understandable. | “The system is governable without reading everybody’s private creative work.” |

## 4. Product promises

The target state must uphold these promises.

1. **Human intent stays in charge.** AI may propose, transform, organize, or flag. A human approves work represented as theirs and a steward makes canon decisions.
2. **Every contribution has a boundary.** A person knows what they are sharing, with whom, under which permission, and what future actions they allow.
3. **Canon and possibility stay separate.** Alternate paths are valuable and visible without being presented as the originating author’s canon.
4. **Credit is durable.** Attribution, revision history, consent, and review decisions do not rely only on an interface that may later disappear.
5. **The interface teaches by doing.** A contributor should not need Git, pull requests, file trees, or copyright jargon to complete a normal story action.
6. **Readers come first.** A branching world is only successful if it remains pleasant to read.
7. **Worlds are portable.** A worldbuilder can export its material, records, and reading edition without depending forever on Telling Forward.
8. **Safety is a feature, not a moderation afterthought.** Public contribution does not ship before appropriate permission, reporting, moderation, and recovery controls exist.

## 5. Dream journeys

### 5.1 Start a world

1. A worldbuilder chooses a kit that matches their intent: private workshop, author-led open world, shared writers’ room, classroom, oral-history archive, anthology, or public experimental world.
2. They name the world, select visibility, invite initial stewards, choose a canon policy, and choose a content and contribution agreement in plain language.
3. The service creates or connects a GitHub repository, applies the selected template, configures labels, automation, access, and optional reader hosting.
4. A guided setup creates a story seed, world bible, reader orientation, contribution invitation, and steward checklist.
5. The worldbuilder publishes a reader-safe landing page or keeps the world private until ready.

**Outcome:** a usable, governed storyworld exists in minutes, with no manual repository configuration required for the normal path.

### 5.2 Workbench: capture, craft, ingest, and mature

1. A worldbuilder begins with whatever they have: a note, a spoken riff, an outline, a scene fragment, a character sketch, a plot idea, a visual reference, a manuscript, or a body of research they have the right to use.
2. They can create a capsule directly, or upload source material for ingestion. The workbench keeps the original source, extracted text or transcript, provenance, and processing status together.
3. The Capsule Maturation Engine (CME) turns raw, human-provided material into candidate capsules. It may extract motifs, characters, plot or arc beats, planned events, scene seeds, settings, and worldbuilding questions. It never silently treats an extraction as canon or finished prose.
4. The writer reviews every candidate capsule against its source, corrects it, merges or splits it, rejects it, and chooses which capsules belong on the private Concept Board.
5. Selected capsules move through deliberate, named maturation actions. Promotion Maturation Engine (PME) develops a capsule into a scene plan or agent-assisted draft. Conceptual Inversion Engine (CIE) proposes a conceptual shadow. Prose Inversion Engine (PIE) proposes a divergent prose direction from permitted source text.
6. Every transformation retains links to its input capsule, source material, human approvals, agent assistance, and resulting outputs. No xME action submits, publishes, merges, or changes canon by itself.

**Outcome:** the product is a writer's actual workshop before it is a collaboration platform. A writer can make a world from their own raw material, then decide whether and when to invite other people in.

### 5.3 Read a world

1. A reader enters through a story rather than a dashboard.
2. They see a short premise, the creator’s invitation, content notes, and the difference between canon, alternate paths, drafts, and companion material.
3. They read scenes as coherent text, not commit messages or metadata summaries.
4. At meaningful branch points, they can continue a path, compare divergences, save their place, or discover a related character, place, event, or edition.
5. When invited, they can react, ask a bounded question, or take a small first contribution step without being pushed into public authorship.

**Outcome:** branching adds discovery instead of cognitive load.

### 5.4 Turn a spoken idea into a proposed scene

1. A contributor chooses a world and sees what they are allowed to do there.
2. They choose an available path, a prompt, or a story gap and record a voice note, type a fragment, upload accessible source material, or co-create with others.
3. The system transcribes and structures the input. An agent may offer a scene draft, continuity questions, alternative phrasing, accessibility improvements, and an explanation of significant changes.
4. The contributor reviews, revises, and explicitly approves the work, attribution, visibility, permission scope, and AI-assistance disclosure.
5. The system saves a private draft, creates a durable story record, and lets the contributor submit it as a proposed canon contribution or an alternate path according to the world’s rules.
6. The contributor sees only the calm, human review state and the next action they can take.

**Outcome:** somebody who has never used Git can produce an attributable, governable story contribution without surrendering authorship.

### 5.5 Steward a world

1. A steward has one queue for submissions, safety reports, continuity flags, unanswered questions, expiring permissions, and publication tasks.
2. Each submission shows the contributor’s intent, the proposed scene, its source and revision history, relevant world rules, an agent-generated continuity review, and its consent/rights record.
3. The steward can accept into canon, return with focused creative feedback, publish as an alternate path, request changes, archive, or escalate. Material actions record who decided, why, and what was affected.
4. Accepted work updates the reader experience and durable provenance record. A declined-for-canon contribution can remain available as an alternate path when permitted.
5. The steward can publish editions, manage the world bible, manage invitations and roles, and review moderation signals without raw infrastructure noise being placed before contributors.

**Outcome:** governance is accountable and kind, rather than opaque or bureaucratic.

## 6. Functional requirements

### 6.1 Worldbuilder kits and deployment

| ID | Requirement |
| --- | --- |
| WLD-01 | **Proposed:** Offer a curated catalogue of versioned worldbuilder kits with an explicit collaboration model, visibility model, rights posture, and included automation. |
| WLD-02 | **Proposed:** Let a worldbuilder create a new GitHub repository from a selected kit or connect an eligible existing repository. |
| WLD-03 | **Proposed:** Configure default branch protection, roles, labels, issue forms, pull-request templates, and GitHub Actions from the selected kit. |
| WLD-04 | **Proposed:** Generate a world manifest containing title, steward identities, canon references, visibility, permission model, content notices, and kit version. |
| WLD-05 | **Proposed:** Provide a guided first-world checklist that ends in either private readiness or public reader publication. |
| WLD-06 | **Proposed:** Permit kit upgrades through reviewed, reversible migrations, never silent overwrites of worldbuilder material. |
| WLD-07 | **Proposed:** Offer a local-first export so a world can survive loss of platform access. |

### 6.2 World model, canon, and lineage

| ID | Requirement |
| --- | --- |
| WRLD-01 | **Proposed:** Model a storyworld, canon line, story path, scene, saved moment, contribution, edition, companion entry, contributor, steward decision, permission record, and provenance record as separately identifiable objects. |
| WRLD-02 | **Proposed:** Show each item’s relationship to canon, origin path, contributors, status, visibility, and applicable permission before a reader or contributor relies on it. |
| WRLD-03 | **Proposed:** Support personal work, open paths, proposed canon, and published alternate paths as distinct contribution permissions. |
| WRLD-04 | **Proposed:** Treat accepted canon and published alternate path as mutually exclusive terminal outcomes for a submission. |
| WRLD-05 | **Proposed:** Allow a world to declare its own valid contribution surfaces: scene, character, place, event, note, theory, illustration, audio, or other approved type. |
| WRLD-06 | **Proposed:** Retain history and provenance when material is revised, moved, superseded, redacted, or withdrawn. |
| WRLD-07 | **Proposed:** Apply a separate restriction and withdrawal lifecycle to any artifact. It must support private restriction, removal request, archival, restoration, and a minimal non-content provenance record without treating restriction as canon or alternate publication. |

### 6.3 Writer's Workbench, capsule lifecycle, and ingestion

The **capsule** is the workbench's small, human-reviewable unit of possibility. It is not a proposal and does not enter the submission-state machine until a human deliberately promotes resulting work for contribution or review.

| ID | Requirement |
| --- | --- |
| WBX-01 | **Proposed:** Provide a private-first Concept Board where a writer can create, edit, group, link, search, archive, and annotate capsules before any public or collaborative action. |
| WBX-02 | **Proposed:** Let a writer craft capsules for at least character, plot or arc beat, scene, event, setting, motif, theme, question, and freeform vision. Worldbuilder kits may add types without breaking the core capsule record. |
| WBX-03 | **Proposed:** Give every capsule a stable identifier, author, created and revised timestamps, source links, content type, current maturity, visibility, permission context, relationships, and a human-readable body. |
| WBX-04 | **Proposed:** Preserve a capsule's relationship to its source and descendants: source material or manual capture, extracted candidate, human-edited capsule, PME scene plan/draft, CIE inversion, PIE divergence, contribution, proposal, and published revision. |
| WBX-05 | **Proposed:** Distinguish capsule maturity from editorial status. A capsule can become more developed without becoming submitted, accepted, public, or canonical. |
| WBX-06 | **Proposed:** Let a writer compare related capsules, merge duplicates, split overloaded capsules, mark contradictions or open questions, and retain the rationale and source links for significant changes. |
| WBX-07 | **Proposed:** Allow a writer to work entirely alone in the workbench. Collaboration and public discovery are opt-in layers, not prerequisites for creating value. |
| ING-01 | **Proposed:** Accept direct capture and upload of supported text, Markdown, DOCX, EPUB, text-based PDF, audio, image, and structured-data sources. Each source type has documented size, format, rights, and quality limits. |
| ING-02 | **Proposed:** Detect unsupported, password-protected, corrupted, or image-only scanned files and explain the recovery path. Scanned documents can proceed only through an explicit OCR route, never a silent empty extraction. |
| ING-03 | **Proposed:** Store or reference each original upload with a content hash, owner, received timestamp, source name, processing configuration, visibility, retention policy, and permission record. Private source material is private by default. |
| ING-04 | **Proposed:** Produce an inspectable ingestion record: extracted text or transcript, segmentation, candidate capsules, source excerpts or locations, confidence indicators, duplicate/continuity signals, processing failures, and a fidelity note describing material transformations. |
| ING-05 | **Proposed:** Require a human to approve or edit candidate capsules before they join a Concept Board. Batch ingestion can create draft capsules, but never scenes, submissions, canon, or public content automatically. |
| ING-06 | **Proposed:** Support rules-only ingestion as a baseline. AI-enhanced extraction is optional, disclosed, consent-aware, budgeted, and has a manual fallback. |
| ING-07 | **Proposed:** Let writers resume, retry, cancel, delete, or export an ingestion job without losing the original source or confusing partial candidates for approved content. |
| ING-08 | **Proposed:** Keep raw private sources out of Git history, reader builds, public exports, and routine logs until an explicit, authorized publication action permits a derived artifact. A lifecycle policy must define quarantine, cancellation, deletion, restriction, retention, backup/restore, and non-content audit-tombstone behavior. |
| ING-09 | **Proposed:** Treat every upload as untrusted. Before real uploads are accepted, require authenticated authorization, extension and content-signature allowlists, size/count/time limits, isolated no-egress processing, malware and archive checks, parser/OCR resource limits, redacted errors, cleanup, incident handling, and malicious-fixture tests. |
| ING-10 | **Proposed:** Until ING-09 is approved and tested, limit ingestion work to manual capture plus synthetic or demonstrably owned test fixtures. The interface must not imply that an unapproved upload pipeline is safe for confidential or third-party material. |
| XME-01 | **Proposed:** Define CME as the controlled capture-to-candidate-capsule process. It creates structured draft material from raw human input and must preserve a reviewable source basis. |
| XME-02 | **Proposed:** Define PME as a deliberate capsule-to-scene maturation action that creates a scene plan or draft for human shaping, not a final scene or automatic contribution. |
| XME-03 | **Proposed:** Define CIE and PIE as opt-in divergence tools. They can operate only on material whose permission record allows the requested transformation, and they create separately attributable outputs. |
| XME-04 | **Proposed:** Return a structured transformation record for every xME action: inputs, model or rules version, changes/preservations/uncertainties, output identifiers, cost/usage where applicable, and human approval state. |
| XME-05 | **Proposed:** Make xME actions reversible at the product layer. A writer can discard an output or revoke its use in later work without destroying the original capsule or provenance record. |
| XME-06 | **Proposed:** Default-deny every transformation action not explicitly granted for the specific source, actor, scope, visibility, and purpose. A broad “processing allowed” flag is never permission for CIE, PIE, translation, model-context use, display, canon review, or commercial evaluation. |
| XME-07 | **Proposed:** Maintain a descendant lineage for every transformation. A withdrawal or permission revocation must identify affected outputs, block prohibited future use, apply the documented restriction policy to accessible editions, and preserve only the minimum necessary non-content audit record. |

### 6.4 Reader experience

| ID | Requirement |
| --- | --- |
| RDR-01 | **Proposed:** Render full reader-approved story content, including text, approved media, content notes, authorship, and path context. |
| RDR-02 | **Proposed:** Offer a coherent linear reading mode that never requires a reader to understand the underlying graph. |
| RDR-03 | **Proposed:** Offer an optional path map and divergence comparison mode with a clear canon legend. |
| RDR-04 | **Proposed:** Support continue-reading, bookmarks, reading history, accessible typography, colour themes, screen-reader semantics, reduced motion, and offline or exportable editions where permitted. |
| RDR-05 | **Proposed:** Make an invitation to contribute optional, legible, and proportionate to a reader’s context and the world’s consent rules. |
| RDR-06 | **Proposed:** Let a reader discover worlds by genre, invitation type, accessibility metadata, maturity/content notes, languages, steward-curated collections, and trusted connections. |

### 6.5 Contribution and authoring

| ID | Requirement |
| --- | --- |
| CNT-01 | **Proposed:** Support private drafts from voice, typed text, uploaded files, prompts, structured forms, and approved collaborative sessions. |
| CNT-02 | **Proposed:** Provide transcription with correction tools, speaker control, privacy notices, language selection, and a graceful manual-entry fallback. |
| CNT-03 | **Proposed:** Let a contributor select a story path, contribution type, visibility, permission scope, and intended review outcome before submission. |
| CNT-04 | **Proposed:** Create a new path from an eligible canon or open path without exposing branch operations. |
| CNT-05 | **Proposed:** Save approved work as a durable versioned contribution and create the appropriate GitHub commit or equivalent durable source record. |
| CNT-06 | **Proposed:** Submit eligible work for review using the plain-language six-state model: Draft, Submitted, Under review, Returned with notes, Accepted into canon, Published as an alternate path. |
| CNT-07 | **Proposed:** Let contributors withdraw unreviewed work and request removal or restriction of published material according to the world’s policy and any legal obligations. |
| CNT-08 | **Proposed:** Preserve co-creator roles, source material acknowledgements, AI-assistance disclosures, and contributor approval of the final represented text. |

### 6.6 Agent assistance

| ID | Requirement |
| --- | --- |
| AGT-01 | **Proposed:** Make every AI action optional, attributable, reviewable, and reversible. |
| AGT-02 | **Proposed:** Support transcription, organization, expansion, compression, readability assistance, translation, continuity questions, fact extraction, and scene suggestions. |
| AGT-03 | **Proposed:** Show the source basis and material transformation of an agent output. A contributor can accept, edit, reject, or regenerate it before it is saved as theirs. |
| AGT-04 | **Proposed:** Respect the world’s AI policy and each contribution’s permission scope before using material as context for an agent action. |
| AGT-05 | **Proposed:** Provide steward-facing continuity and governance assistance as recommendations, not automatic canon decisions. |
| AGT-06 | **Proposed:** Block or route risky requests, such as attempts to recreate protected third-party material, impersonate a contributor, or bypass a world’s permissions. |

### 6.7 Editorial governance, trust, and safety

| ID | Requirement |
| --- | --- |
| GOV-01 | **Proposed:** Define roles for owner, steward, editor, moderator, contributor, reader, and service agent, with least-privilege access and auditable delegation. |
| GOV-02 | **Proposed:** Let a steward provide focused editor questions attached to a scene or passage and record resolution without exposing raw GitHub mechanics to contributors. |
| GOV-03 | **Proposed:** Require a human steward decision for canon acceptance, rights-sensitive publication, contributor sanctions, and difficult creative feedback. |
| GOV-04 | **Proposed:** Provide reporting, block/mute, spam controls, harassment/NSFW flags, plagiarism escalation, review queues, and emergency restriction or unpublish controls before public open contribution. |
| GOV-05 | **Proposed:** Separate contributor-facing notifications from a technical maintainer and agent operations stream. |
| GOV-06 | **Proposed:** Record the reason, authority, timestamp, and affected artifacts for consequential decisions. |

### 6.8 Attribution, consent, and rights

| ID | Requirement |
| --- | --- |
| RGT-01 | **Proposed:** Require an explicit contributor identity, co-creator attribution, source declaration, visibility choice, and permission record for every submitted contribution. |
| RGT-02 | **Proposed:** Make consent action-specific. Reading, reacting, contributing, display, canon review, derivative use, translation, AI processing, commercial evaluation, and adaptation are separately understandable permissions. |
| RGT-03 | **Proposed:** Let a contributor see the current permission status and downstream use of their contribution. |
| RGT-04 | **Proposed:** Produce a durable provenance ledger for canon decisions that links source path, contributors, approving steward, timestamp, and resulting canonical revision. |
| RGT-05 | **Proposed:** Offer rights profiles supplied by a kit or a worldbuilder, but never present platform visibility as a blanket grant of reuse rights. |
| RGT-06 | **Open:** Define the legally reviewed terms, jurisdictional handling, and process for withdrawals, minors, personal testimony, and commercial adaptation. |
| RGT-07 | **Proposed:** Version every consent decision with actor, action, source scope, recipient/service, visibility, purpose, expiry, revocation, authority, and descendant effect. Missing or ambiguous consent denies the action. |

### 6.9 Publishing, interoperability, and preservation

| ID | Requirement |
| --- | --- |
| PUB-01 | **Proposed:** Publish a reader-safe web edition from selected canon and permitted alternate-path material. |
| PUB-02 | **Proposed:** Create immutable, citable editions tied to a specified canonical revision, content notices, and attribution page. |
| PUB-03 | **Proposed:** Export permitted worlds and editions as structured Markdown or plain text, EPUB, PDF, JSON/CSV provenance records, and a repository archive. |
| PUB-04 | **Proposed:** Support private sharing, public release, embeddable reading, and controlled collaborator access without changing the underlying rights posture. |
| PUB-05 | **Proposed:** Keep platform metadata interoperable and documented, rather than locking a world into proprietary opaque formats. |
| PUB-06 | **Proposed:** Define a versioned portable archive manifest and prove restoration into a clean environment, including reader edition, attribution, consent/provenance records, restriction markers, and documented Git-history limits. An archive must not reconstruct excluded private source material from its metadata. |

### 6.10 Community and sustainable value

| ID | Requirement |
| --- | --- |
| COM-01 | **Proposed:** Allow worldbuilders to invite cohorts, create contribution prompts, recognize contributors, and host bounded story events. |
| COM-02 | **Proposed:** Enable reader reactions and discussion only where the steward has chosen and configured appropriate safety controls. |
| COM-03 | **Proposed:** Provide transparent, non-financial contribution recognition before any rewards or revenue features are introduced. |
| COM-04 | **Open:** Do not introduce paid access, virtual credits, revenue sharing, commercial licensing, or adaptation eligibility until the rights chain, rules, reporting, tax/legal treatment, and dispute process are explicitly designed and reviewed. |

## 7. Non-functional requirements

| Area | Target-state requirement |
| --- | --- |
| Accessibility | Meet WCAG 2.2 AA for the primary web and mobile reader/contribution flows. Voice is an option, never the only way to contribute. |
| Privacy | Use data minimization, clear retention controls, private drafts by default, export/delete mechanisms where applicable, and no undisclosed use of creative material for model training. |
| Security | Use least privilege, encrypted secrets, secure session handling, signed webhooks, abuse limits, audit logs, and a GitHub App or similarly scoped service identity rather than a personal token for platform operations. |
| Resilience | Treat GitHub and Telling Forward as independently recoverable systems. Reconciliation detects missed webhook events; user work has drafts and recovery paths. |
| Performance | A reader should receive an initial readable scene quickly on ordinary consumer connections; expensive AI work must be asynchronous, cancellable, and never block a basic read. |
| Observability | Operators can diagnose integration failures, unsafe content reports, publishing errors, and queue health without logging raw private prose unnecessarily. |
| Internationalization | Support Unicode, time zones, accessible dates, configurable language, and eventual localization without making English-only assumptions part of the data model. |
| Cost control | Make model use visible, configurable, rate-limited, and budgeted at platform and world levels. |

## 8. The worldbuilder kit catalogue

| Kit | Ideal user | Default contribution posture | First useful release |
| --- | --- | --- | --- |
| Private Story Studio | Solo author or small trusted team | Private drafts and steward-controlled collaborators | Repository, world bible, reader preview, edition export |
| Author-Led Open World | Author inviting selected community paths | Contributor paths and steward review | Contributor invitation, submit-for-review flow, alternate publication |
| Shared Writers’ Room | Group with co-stewards | Shared contributions under a defined editorial model | Roles, proposal queue, review notes, provenance |
| Classroom or Workshop | Educator or facilitator | Time-bounded and consent-aware | Roster, private cohorts, prompts, moderation, export |
| Oral History Archive | Community memory project | Consent-led testimony and controlled access | Consent records, transcripts, role-based reader access, archival export |
| Public Experiment | Experienced steward testing open contribution | Strong moderation and constrained prompts | Reporting, anti-spam, structured contribution forms, moderation queue |

Every kit must state who it is *not* safe for. For example, an open public kit cannot claim to be suitable for sensitive testimony without the safeguards of the oral-history kit.

## 9. Open decisions that shape the dream

The following existing questions remain preconditions, not details to hide under implementation.

1. **Repository boundary:** one repository per storyworld or several worlds per repository.
2. **Contributor identity:** platform-native identity, linked GitHub identity, or a supported hybrid.
3. **Service identity:** GitHub App or another scoped integration model rather than continued platform use of a personal token.
4. **Content and code licensing:** the public code license and the world-specific creative rights models.
5. **Derivative consent:** whether Disrupt, Invert, translation, training, and other transformations need separate per-action consent.
6. **Moderation baseline:** the minimum capability threshold before public contribution opens.
7. **Submission-state model:** confirmation that the six-state review model is the intended contributor experience.
8. **Commercial model:** no implied ownership, royalties, or adaptation rights without a separate governed programme.
9. **Restriction and deletion lifecycle:** authority, notice, retention, repository boundary, backup/restore, export, and non-public provenance behavior for withdrawn, restricted, and safety-removed material.

## 10. What success would prove

The dream is not proven by a large feature list. It is proven when a real worldbuilder can say:

> I opened a world without becoming a developer. Someone who does not call themselves a writer contributed in their own voice. They understood what they permitted. I made a humane, traceable editorial decision. Readers can now enjoy the result and understand where it belongs.

That is the smallest complete proof of the full promise.
