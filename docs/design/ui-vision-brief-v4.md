# Telling Forward — UI Vision Brief for Replit Design (v4)

Prepared for: Replit Design
Prepared by: Jamie Hill, OverKill Hill P3
Repo: `telling-forward` (OKHP3), staged on Replit, mockup surface at `artifacts/mockup-sandbox`

v4 replaces v3's single generic "extract to cards" Inversion action with a two-operation model matching the proven PME/PIE/CME/CIE precedent from the Magnus Progenitor Saga / Biases as Constants development history, renames "cards" to "capsules" (Jamie's own established term), and adds the concrete rationale for why capsules are GitHub Issues rather than prose files. Two-app split, reader theme catalog, vocabulary contract, and GitHub-only constraint all carry forward unchanged from v3.

## Executive summary

- Two apps, not one. The **Author App** is the web app itself, the GitHub abstraction layer, used by both world creators and branch contributors. The **Reader App** is a separate, themeable e-reader for consumers.
- The Author App has two modes: the **Concept Board** (non-linear capsule capture) and the **Scene Writer** (linear, agent-assisted drafting and submission).
- The Concept Board is not a new idea invented for this product. It's a direct port of a proven personal system: PME/PIE (Prose Maturation/Inversion Engine) and CME/CIE (Concept Maturation/Inversion Engine), developed and tested during actual manuscript work on the Magnus Progenitor Saga, later generalized into the domain-agnostic xME/xIE framework. Telling Forward is porting the mechanic to a multi-author, GitHub-only platform, not inventing one.
- Maturation (fold) and Inversion (unfold) are both first-class actions in the Concept Board, not just a promote-to-scene one-way street. Maturation matures a capsule toward prose. Inversion takes mature material and generates deliberately divergent new raw material from it, useful for seeding alternate-path branches.
- The atomic unit is called a **capsule**. Capsules are GitHub Issues, not prose files with string-matched markers, specifically because the original system's development history shows that approach failing repeatedly and expensively.
- A capsule can carry a maturity indicator, but maturity only observes. It never gates or drives what an author can do next. That's a hard rule carried over verbatim from the original system.
- Content stays markdown-native, visuals stay PNG/WebP/SVG, repo topology stays one repo per storyworld, and no part of the data model depends on Notion or any other third-party system, GitHub only.

## The two-app model

| | Author App | Reader App |
|---|---|---|
| Who | World creators and branch contributors, permission-differentiated | Consumers, no login required to read |
| Purpose | Capture story concepts non-linearly, write and review scenes, submit, manage canon and permissions | Discover a story seed, read a path, see where it branches |
| Design posture | One consistent system across every world, editorial, calm | Themeable per world, motif-driven, author-tailored |
| Content model | Markdown source, PNG/WebP/SVG visuals, GitHub as version control | Same markdown source, rendered through the active reader theme |
| Vocabulary contract | Full ADR-0001/0002 translation layer applies | Same contract, expressed through the theme's own voice |

## Where the Concept Board actually comes from

Jamie's `refoldec` framework formalizes xME (Maturation, fold) and xIE (Inversion, unfold) as a domain-agnostic process-capture theory. Its own origin chain states plainly: "PME/PIE and CME/CIE become xME/xIE." Those four engines were built and used during real work on the Magnus Progenitor Saga (MPS), documented in the `magnus-progenitor-saga` repo's conversation history, and are confirmed (not inferred) as:

| Engine | Full name | Function | Routing |
|---|---|---|---|
| PME | Prose Maturation Engine | Matures raw prose through a Rung Ladder, R0 (proto-symbolic debris) to R10 (Eternal Mirror, fossilized) | ideation → narrative → processing → export |
| PIE | Prose Inversion Engine | Takes accepted narrative and deliberately disrupts its continuity to generate new raw ideation | narrative → ideation → processing |
| CME | Concept Maturation Engine | Matures raw "riff sessions" (loose conversational ideation) into structured concept capsules | ideation ↔ raw input → ideation |
| CIE | Concept Inversion Engine | Takes an accepted concept or motif and generates its symbolic inversion as a new capsule | narrative → ideation → processing |

Two governing rules from that system carry over directly:

**Execution is blind to rank; evaluation is blind to purpose.** Maturity assessment and the logic that actually transforms content are strictly separate. A maturity score never gates or forces a workflow step, it only observes.

**Inversion is generative disruption, not decomposition.** PIE and CIE didn't break mature material down into inert parts for storage. They deliberately scrambled or inverted it to produce new, divergent, usable raw material. That's a creative move, not an archival one.

## Non-linear authorship: the Concept Board

Authors do not have to start on page one and write forward. They capture atomic units called **capsules**: character personas tagged by role (protagonist, antagonist, and others the author defines), major arc beats, and planned events, at whatever resolution they currently have. Nuance-level detail only gets added when the author has an actual epiphany moment worth capturing, not because a template demanded it.

**Interface metaphor: a corkboard, not a project-management board.** Capsules get created cheap: a name, a role tag, one line, done. They expand only when the author adds to them. Visible columns, swimlanes, or ticket chrome would undercut the entire premise of hiding developer machinery from a non-developer author.

**Two first-class actions, matching the PME/PIE and CME/CIE precedent:**

- **Promote to scene** (Maturation / fold): hands a capsule to the Scene Writer for agent-assisted drafting. Deliberate, not automatic, so the board stays a living space instead of quietly becoming a second manuscript.
- **Disrupt** and **Invert** (Inversion / unfold), two distinct operations, not one generic "extract" action:
  - A **prose-level disrupt** action takes an already-written, accepted scene and deliberately generates a divergent variant from it, raw material for an alternate-path branch, not a summary of the original.
  - A **concept-level invert** action takes an accepted character, motif, or concept capsule and generates its symbolic inversion as a brand-new capsule, a "what's the opposite of this" creative prompt an author can use or discard.

Both actions write new capsules back to the board. Neither one is archival bookkeeping; both are meant to produce something an author might actually want.

**Backstage wiring (invisible to the author):** each capsule is a GitHub Issue in the storyworld's repo. Type and role live as labels or custom fields. A GitHub Project scoped to that repo renders the board. Confirmed repo topology: capsules live inside the storyworld's own repo, not a separate per-author or per-concept-type repo, so this Project only needs to read one repo per world.

**Why capsules are Issues and not prose files, concretely, not just in principle:** the original PME/PIE/CME/CIE system stored capsules as free text between `--- [CONCEPT:name] ---` markers in flat files, and a large share of its development history is the model failing repeatedly to pattern-match and edit that unstructured text (`FileNotFoundError`, "the exact line wasn't found," the document not existing where it was expected). That is the exact failure mode structured fields (Issue title, body, labels, state) avoid. Capsules-as-Issues isn't a stylistic preference, it's a fix for a problem that already happened once.

**Keep the primitive set small.** The original system's builder explicitly resisted spawning new files, merging new scaffolding into existing canonical files instead of multiplying them. Apply the same discipline here: Issues, labels, and Projects, not a sprawling custom schema of bespoke file types.

## Content and rendering model

Markdown is the canonical story format, a deliberate departure from EPUB/Word/PDF platforms, since GitHub renders markdown natively and the format stays diffable, versionable, and plain-text-portable. Visuals are PNG, WebP, or SVG. Capsules are pre-markdown, short structured notes; only promotion to the Scene Writer turns a capsule into an actual markdown file, a saved moment in the storyworld's repo.

## GitHub-only interoperability

Telling Forward does not depend on Notion or any other third-party system, GitHub only. This is a deliberate departure from both `refoldec` (which pairs a Notion capture plane with GitHub canon) and the original BAC/MPS system (which used Notion as its working canon workbench). Any tool that currently or eventually supports connecting to a GitHub repo, ChatGPT, Claude, Notion's own GitHub sync, an IDE, whatever comes next, should be able to read and write a storyworld's capsules and canon. The Author App is one client among potentially many, not a gatekeeper.

## The reader theme system

A finite starter catalog, not open-ended customization. A handful of full themes, each with its own palette, typography, chrome, and motion language.

### Starter theme catalog (strawman, for reaction)

| Theme | Motif | Fits |
|---|---|---|
| Editorial (default) | Literary magazine, generous serif/sans pairing, restrained | The fallback for any world that doesn't customize |
| Terminal / Found Footage | Dated 2030s-2050s computer system, monospace, phosphor accent, boot-sequence transitions | Magnus Progenitor Saga, the reference example |
| Archive / Illuminated | Manuscript-adjacent, marginalia for branches, aged paper texture | Myth, epic, or historical-feeling worlds |
| Dispatch / Newsprint | Column layout, byline-style attribution, dateline framing | Serialized or journalistic-feeling fiction |
| Transmission / Signal | Radio-log or field-report framing, waveform or static motifs | Found-media, epistolary, or in-world "recovered signal" fiction |

Every theme must preserve canon/branch/draft legibility, attribution and provenance visibility, and accessibility floors (contrast, scaling, reduced-motion), regardless of skin.

## What carries over unchanged

- The vocabulary contract (ADR-0001), the four-state submission status, the five-state contributor inbox (ADR-0002), and the three separate axes (status, ownership type, canon/branch relationship).
- `artifacts/mockup-sandbox` (React + Vite + Tailwind v4 + shadcn/ui + Radix + lucide-react) as the mockup scaffold. The Author App, including the Concept Board, should stay closer to shadcn conventions; reader themes will likely need their own token sets and custom chrome.

## Assumptions and confirmed decisions

- **Confirmed:** the engine mapping is Prose (PME/PIE) and Concept (CME/CIE), not Character/Plot as an earlier draft of this brief guessed.
- **Confirmed:** capsules live inside the storyworld's own repo; GitHub only, no Notion or other third-party dependency anywhere in the data model.
- Open: BAC's own contribution-state vocabulary (draft, fanon, apocrypha, candidate canon, accepted canon, rejected, archived) is richer than Telling Forward's current four states (Draft, Under review, Accepted into canon, Published as alternate path). Not yet reconciled; flagged for a future pass rather than guessed at here.

## Suggested next actions

- Reconcile BAC's seven-state contribution vocabulary against Telling Forward's current four states, decide whether Telling Forward needs more granularity or whether four remains the right, calmer number (ADR-0002's whole point was keeping the list short).
- Design the capsule detail view: what a capsule looks like cheap (name, role tag) versus expanded (epiphany detail, disrupt/invert history).
- Prototype the disrupt/invert actions as actual interactions, what does an author see happen when they trigger one, and how does the new capsule it produces get presented as a proposal versus a fait accompli.
- React to the five strawman reader themes: keep, cut, reorder, or name others.
