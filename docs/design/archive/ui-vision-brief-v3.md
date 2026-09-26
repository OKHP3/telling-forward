# Telling Forward — UI Vision Brief for Replit Design (v3)

Prepared for: Replit Design
Prepared by: Jamie Hill, OverKill Hill P3
Repo: `telling-forward` (OKHP3), staged on Replit, mockup surface at `artifacts/mockup-sandbox`

v3 adds the non-linear authorship model (Concept Board) as a new primary Author App surface. v2's two-app split and reader theme catalog carry forward unchanged. Repo topology for concept captures is confirmed: per storyworld, not per author and not per concept type.

## Executive summary

- Two apps, not one. The **Author App** is the web app itself: the abstraction layer over GitHub for everyone who writes, whether they're opening a world or extending someone else's path. The **Reader App** is a separate, themeable e-reader for consumers.
- The Author App now has two distinct modes, not one linear writing flow: a **Concept Board** for non-linear outline capture, and a **Scene Writer** for turning a concept into an actual submitted scene. They're sequential in purpose, not sequential in use, an author can live entirely in the Concept Board for weeks before writing a single scene.
- Authorship is deliberately anti-linear at the outline stage. Authors capture major story arcs, character personas (protagonist, antagonist, and other roles), and planned events as lightweight notes, not prose, and only go deep on a moment when they actually have it (an "epiphany" capture), not because a template demanded detail.
- Backstage, each atomic note (a character, an arc beat, an event) maps to a GitHub Issue, labeled by type and role. A GitHub Project (the cross-repo v2 board product) scoped to the storyworld's repo pulls those issues into one board. Confirmed current capability: GitHub Projects v2 supports adding issues and PRs from multiple repositories, even across an org, into a single project. None of this repo/issue machinery should be visible to the author; it's wiring, not UI.
- Repo topology is confirmed: concept captures live inside the storyworld's own repo (the same repo that holds eventual canon, per ADR-0001's "Repository = the storyworld"), not in the core platform repo, and not split into a separate per-author or per-concept-type repo.
- Content format and reader theming guidance from v2 is unchanged: markdown-native story files, PNG/WebP/SVG for visuals, a finite catalog of themeable reader experiences chosen and tuned by each world's originating author.

## The two-app model

| | Author App | Reader App |
|---|---|---|
| Who | World creators (originating authors) and contributors (branch authors) | Consumers, no login required to read |
| Purpose | Capture story concepts non-linearly, write and review scenes, submit, manage a world's canon and permissions | Discover a story seed, read a path, see where it branches |
| Design posture | One consistent system across every world. Editorial, calm, developer-abstraction-first | Themeable per world. Motif-driven, author-tailored |
| Content model | Markdown source, PNG/WebP/SVG for visuals, GitHub as the version-control backstage | Same markdown source, rendered through the active reader theme |
| Vocabulary contract | Full ADR-0001/0002 translation layer applies | Same contract, expressed through the theme's own voice |

Within the Author App, the world creator has additional powers a branch contributor doesn't: canon approval, permission management, and reader-theme selection for their world. That's a permissions difference inside one app, not a third app.

## Non-linear authorship: the Concept Board

This is the anti-pattern Jamie is deliberately designing for: writing does not have to start on page one and proceed to the end. It starts with the shape of the thing.

**What an author captures, and when:**

- Major story arc and character arcs, at whatever resolution the author has right now. A character might exist first as nothing more than "Antagonist: the Steward who refuses to hand over the vault codex."
- Personas tagged by narrative role (protagonist, antagonist, and other roles as the author defines them), not full character sheets by default.
- Planned events and plot beats, captured as short notes, not scenes.
- Nuance-level detail only when the author has an actual epiphany moment they want to preserve before it's gone. That detail attaches to the relevant card; it doesn't force every card to that depth.

**The interface metaphor is a corkboard, not a project-management board.** Cards get created cheap: a name, a role tag, one line, done. Cards expand only when the author adds to them. An explicit "promote to scene" action hands a card to the Scene Writer flow when the author is ready to actually draft it; promotion is a deliberate choice, not automatic, so the board stays a living scratch space instead of quietly becoming a second manuscript.

**Backstage wiring (invisible to the author):** each card is a GitHub Issue in the storyworld's repo, carrying type and role as labels or custom fields. A GitHub Project scoped to that repo renders the board. Since the repo topology is confirmed as one repo per storyworld, this Project only ever needs to reach into that single repo for a given world's board, no cross-repo lacing required at the concept-capture layer itself. (Cross-repo linking remains available if a future need reaches beyond a single world, but nothing in the current model requires it.)

**Design risk to actively avoid:** if this board renders with visible columns, swimlanes, ticket numbers, or any other recognizably-Jira chrome, it undercuts the entire premise of the platform, which is hiding developer machinery from a non-developer author. The board should read as index cards pinned to cork, freely arranged and regrouped, not as a sprint board with a different color scheme.

## Content and rendering model

Markdown is the canonical story format. This is a genuine departure from EPUB/Word/PDF-style publishing platforms, and it's the right departure, since GitHub-native markdown rendering means the Author App gets a working viewer almost for free, and the format stays diffable, versionable, and plain-text-portable. Visuals (maps, character art, diagrams) are PNG, WebP, or SVG, referenced from markdown like any other asset.

The Concept Board's cards are the pre-markdown layer, short structured notes, not full documents. Only once a card is promoted to the Scene Writer does it become an actual markdown file tracked as a saved moment in the storyworld's repo.

## The reader theme system

Recommend a **finite starter catalog**, not an open-ended customization surface. A handful of full themes, each with its own palette, typography, chrome, and motion language, gives world creators real differentiation without the QA and accessibility burden of unlimited combinations.

Each theme still needs to implement the same functional contract underneath its skin: canon/branch/draft states stay visually distinct, attribution and agent-assistance disclosure stay visible, and text stays legible with real contrast, real scaling, and a reduced-motion path.

### Starter theme catalog (strawman, for reaction)

| Theme | Motif | Fits |
|---|---|---|
| Editorial (default) | Literary magazine, generous serif/sans pairing, restrained | The fallback for any world that doesn't customize |
| Terminal / Found Footage | Dated 2030s-2050s computer system, monospace, phosphor accent, boot-sequence transitions | Magnus Progenitor Saga, the reference example |
| Archive / Illuminated | Manuscript-adjacent, marginalia for branches, aged paper texture | Myth, epic, or historical-feeling worlds |
| Dispatch / Newsprint | Column layout, byline-style attribution, dateline framing | Serialized or journalistic-feeling fiction |
| Transmission / Signal | Radio-log or field-report framing, waveform or static motifs | Found-media, epistolary, or in-world "recovered signal" fiction |

Not a commitment, five to seed the range and get a reaction.

## What carries over from v1/v2, unchanged

- The vocabulary contract (ADR-0001), the four-state submission status, the five-state contributor inbox (ADR-0002), and the three separate axes (status, ownership type, canon/branch relationship) all still apply.
- Accessibility floors, provenance visibility, and the personal-work/canon visibility distinction from CONTENT-LICENSE.md are non-negotiable regardless of theme or authoring mode.
- `artifacts/mockup-sandbox` (React + Vite + Tailwind v4 + shadcn/ui + Radix + lucide-react) is Replit's own component-preview scaffold. A CRT terminal reader theme will likely need its own token set and custom chrome; the Author App, including the Concept Board, should stay closer to shadcn conventions since it's a working tool, not a themed experience.

## Assumptions and confirmed decisions

- **Confirmed:** concept captures live inside the storyworld's own repo, not a separate per-author or per-concept-type repo.
- Assumed the Author App is one app serving both world creators and branch contributors, differentiated by permissions, not two separate apps.
- Assumed a finite, curated reader-theme catalog is the right shape, versus fully open per-world theming.
- Assumed the Concept Board and Scene Writer are two modes of one Author App, not separate apps, since an author moves between them constantly.

## Suggested next actions

- React to the five strawman reader themes: keep, cut, reorder priority, or name others.
- Sketch the Concept Board's card types (character, arc, event, and whatever else belongs) and confirm which fields are mandatory versus optional at creation.
- Decide the exact trigger and framing for "promote to scene," since that's the seam between non-linear capture and the linear submission flow already scoped in v1.
- Prioritize build order: recommend the Concept Board and Scene Writer (the Author App core) before the Reader App theme catalog, since the reader has nothing to read until the authoring loop works.

Sources:
- [Adding items to your project](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project) — GitHub Docs, confirms Projects (v2) accepts issues and pull requests from any repository you have access to, not just one
- [Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects) — GitHub Docs
