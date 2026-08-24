# Telling Forward

> Dismantling the barriers to storytelling so more human experiences can be imagined, shaped, shared, and carried through time.

Telling Forward is a voice-first, agent-assisted collaborative storytelling platform. It helps people contribute characters, story arcs, memories, and possibilities through conversation, then turns those contributions into readable, attributable works.

The larger idea is **open-canon collaborative fiction**: an originating author can open a storyworld, other people can extend it through distinct paths, and readers can follow the resulting narrative lineage without confusing a community branch with the author's canon.

## Why it exists

Everyone has a story to share, but not everyone sees themselves as an author. Writing mechanics, blank-page anxiety, editing, continuity, and unfamiliar publishing tools can all make sharing feel harder than it needs to be.

Telling Forward is designed to move those barriers into the background while keeping creative intent, consent, attribution, and human judgment in the foreground.

## The initial concept

- Contributors can begin with voice, conversation, notes, or a narrative idea.
- Agents can help transcribe, organize, revise, check continuity, and prepare a readable draft.
- People remain the originators and approvers of their contributions.
- Stories can develop as personal works, shared worlds, alternate paths, or proposed canon.
- GitHub remains the durable source for story content, authorship, editorial review, and canon decisions. The custom Express/PostgreSQL layer provides trusted actions, account-aware permissions, private control planes, and a reader-friendly projection while keeping PostgreSQL rebuildable from GitHub-native identifiers. GitHub-native Projects, Actions, CODEOWNERS, and branch controls are complementary primitives, not replacements for the product layer. See [ADR-0003](docs/adr/0003-github-native-fast-path-vs-custom-backend.md) and [ADR-0013](docs/adr/0013-github-native-boundary-and-donor-primitives.md).

## The experience we are exploring

The reader is the front door. A person should be able to discover a story seed, read a coherent path, see where it branches, and choose whether to continue reading or contribute. The public experience should use plain language such as **story seed**, **path**, **branch**, **proposed canon**, and **alternate continuity**. GitHub branches, commits, pull requests, and reviews may remain the backstage implementation for an early prototype.

The platform is not intended to make every contribution part of one undifferentiated work. A healthy storyworld keeps several layers visible:

- the originating author's seed and protected canon;
- community branches and alternate continuities;
- contributions selected into an explicitly governed canon;
- the provenance record showing who contributed what and under which terms.

## A staged model

The first experiments should optimize for trust and creative momentum, not financial complexity:

1. Invite a small set of authors to open bounded portions of original worlds.
2. Let readers explore paths and let approved contributors extend them.
3. Record attribution, permissions, lineage, and canon decisions from the beginning.
4. Test whether people return to read, contribute, and bring others.
5. Only after a real storyworld earns attention should the project explore commercial adaptation, contributor rewards, or platform fees.

Any future adaptation deal would require a clear chain of rights. Participation alone would not automatically make every branch part of a commercial package; eligibility would depend on the governing agreement and whether a contribution is actually selected into the adapted canon.

## Repository status

This repository contains a substantive Stage 0–1 prototype, not a bare scaffold. The checkout includes a private Author App, a reader application, configured companion reader surfaces, an API and PostgreSQL index, an Expo mobile client scaffold, GitHub-backed provenance and reconciliation code, proposal-state safeguards, and API/core-flow tests.

The current product model is deliberately split between two primary apps:

- **Author App** (`artifacts/web`) — the canonical workspace for storyworld setup, concept-board work, scene writing, proposals, and steward operations.
- **Reader** (`artifacts/reader`) — the Editorial reading experience for discovering storyworlds, reading paths, and distinguishing canon, alternate, and draft states.

Archive, Broadsheet, Signal/Noise, and Scriptorium are configured companion reader-oriented surfaces with their own visual treatments. `artifacts/mockup-sandbox` remains design-only. The canonical Author App has a verified public GitHub Pages deployment; the companion surfaces and API-backed operations are not claimed as independently deployed.

The approved visual system is paper-first and editorial: Paper `#F6F2EE`, Teal `#1C3A34`, Espresso `#2A2320`, Rust `#5B3A27`, Orange `#C46A2C`, and Amber `#E6A03C`, with DM Sans for working voice, JetBrains Mono for structured detail, and Alfa Slab One reserved for display moments.

Authentication and identity are also settled at the current boundary: the web reader's password sessions and Clerk identities coexist at protected API boundaries, while optional GitHub identity linking supports attribution. GitHub remains the durable creative/provenance source; PostgreSQL is a rebuildable application index. Consent and moderation remain design boundaries for the private pilot, not delivered public-launch safeguards.

Capability states in this README are intentionally conservative:

- **Implemented in checkout** does not mean production-deployed.
- **Provisional** means local or test evidence exists, but participant, device, or production acceptance is still missing.
- **Not yet deployed** means no published revision and route smoke evidence has been recorded.
- **Intentionally deferred** means it is not available for the current pilot, including public contribution, untrusted uploads, rights-sensitive derivatives, monetization, and automatic canon decisions.

### Verified public deployment

The canonical Author App (`artifacts/web`) is published through the repository's GitHub Pages Actions workflow:

- **URL:** https://okhp3.github.io/telling-forward/
- **Deployed revision:** `e4612f79754b2232cb9aee80c0166ceb70db4ea0`
- **Pages run:** [successful Actions run](https://github.com/OKHP3/telling-forward/actions/runs/32655379391)
- **Verified:** 2026-08-24 — root returned HTTP 200 and the deployed HTML referenced `/telling-forward/` asset paths.

This is a static client deployment. The API server, authenticated writes, GitHub-backed contribution operations, and other service-backed behavior still require a separately hosted API and are not implied by this Pages URL.

## Important content boundary

The platform code and documentation are separate from any protected fiction, drafts, or storyworld material. No story is open for reuse merely because it appears in a public repository. See [CONTENT-LICENSE.md](CONTENT-LICENSE.md) for the current default.

## Start here

- [Mission](docs/MISSION.md)
- [Contribution guide](CONTRIBUTING.md)
- [Content and story rights](CONTENT-LICENSE.md)
- [Changelog](CHANGELOG.md)
- [Decision record (naming, vocabulary, notifications, architecture)](docs/adr/)
- [Platform requirements (design baseline)](docs/platform-requirements.md)
- [Dream platform specification](docs/product/dream-platform-specification.md)
- [Attainable delivery roadmap](docs/product/attainable-delivery-roadmap.md)
- [Open questions log](docs/decisions/open-questions.md)
