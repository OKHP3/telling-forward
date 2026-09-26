# Telling Forward — UI Vision Brief for Replit Design

Prepared for: Replit Design
Prepared by: Jamie Hill, OverKill Hill P3
Repo: `telling-forward` (OKHP3), staged on Replit, mockup surface at `artifacts/mockup-sandbox`

## Executive summary

- Telling Forward is a voice-first, agent-assisted collaborative fiction platform. Contributors speak or type character and plot intent; agents shape it into a readable scene; the human approves before anything goes public.
- The product concept is **open-canon collaborative fiction**: an author opens a storyworld, others extend it through permissioned branches, and readers can tell canon apart from alternate continuity without confusion.
- GitHub is the real backstage machinery (repos, branches, commits, PRs, merges). None of that vocabulary may reach the contributor-facing UI. A locked translation table exists and is non-negotiable (see Vocabulary section).
- Three audiences need distinct surfaces: readers (zero-friction entry), contributors (voice/conversation-first submission), and world stewards (canon and permission governance). This brief is scoped to the first two. Steward tooling and raw GitHub-facing maintainer views are out of scope for this pass.
- The core design problem is not decoration, it's legibility: make provenance, lineage, and canon-vs-branch status visually obvious at a glance, without the interface turning into a commit graph or a developer dashboard.
- Technical foundation already exists: React + Vite + Tailwind v4 + shadcn/ui (Radix primitives) + lucide-react, in `artifacts/mockup-sandbox`. Light/dark theme tokens are wired but still at shadcn's stock placeholder values (zinc grays, Inter). That token layer is the customization surface, not a system to replace.
- Tone target: editorial and human, closer to a literary magazine or a thoughtful reading app than a SaaS dashboard or a dev tool. Warm, not whimsical. Confident, not cute.

## Product essence

Telling Forward exists to dismantle the barriers between a person and their story: blank-page anxiety, unfamiliar writing mechanics, and publishing tools built for developers, not authors. It starts people with conversation, memory, or a character idea instead of a blank page, then uses agents to handle transcription, structure, and continuity while the human stays the author of record. The system needs to feel like a place for storytelling, not like a submission portal bolted onto a version-control system, even though a version-control system is exactly what's running underneath it.

## Who's using it

| Persona | What they need from the UI | What they must never have to see |
|---|---|---|
| Reader | Discover a story seed fast, read a coherent path, see where it branches, decide whether to keep reading or contribute | Any Git/GitHub concept |
| Contributor | Start from voice, text, or an idea; review an agent-shaped scene; submit with a clear sense of what happens next | Commits, branches, PR mechanics, CI/check noise |
| World steward | Approve or decline proposed canon, manage permissions, see the full operational feed (conflicts, duplicates, flags) | N/A — this is the one role allowed to see backstage detail, in its own surface, not blended into contributor views |

Reader and contributor are the two surfaces this brief asks Replit Design to focus on. Steward tooling can inherit the same visual language later but needs its own pass once the contributor flow is settled.

## The core design problem

Two things have to be true on screen at once, for every piece of content: which storyworld and path this belongs to, and whether it's the author's protected canon, a community branch, an accepted addition to canon, or a published alternate path. Readers and contributors need to absorb that distinction instantly, the way a reader instinctively knows the difference between a headline and a pull-quote. That's a typography and color-coding problem before it's a features problem. Get the visual grammar for "canon vs. branch vs. draft" right once, then reuse it everywhere: story cards, reading view, submission status, notification inbox.

## Vocabulary is UI contract

This table is locked (ADR-0001). Every label, button, and status pill in the contributor-facing UI must use the right column, never the left.

| Backstage (GitHub) | Contributor-facing term |
|---|---|
| Repository | The storyworld |
| Branch | Your story path |
| Commit | Saved moment |
| Pull request | Submit your scene (action) / story submission (object) |
| Merge | Accepted into official story / canon |
| Issue or comment | Story note or editor feedback |

Submission status is a separate, independently visible field on every submission (ADR-0001, ADR-0002). It has exactly four states and should not grow a fifth without a deliberate ADR change:

1. Draft
2. Under review
3. Accepted into canon
4. Published as an alternate path

The contributor-facing notification inbox is capped at five plain-language states (ADR-0002):

1. We received your scene.
2. Your scene is being reviewed.
3. We have one creative question for you.
4. Your scene is now part of the official story.
5. Your scene is published as an alternate path.

Ownership/permission outcome is a third, separate axis (CONTRIBUTING.md), describing what kind of thing a contribution is, not where it stands in review: Personal work, Open path, Proposed canon, Published alternate path. Design should not collapse these three axes (status, ownership type, and canon/branch relationship) into one badge. They answer different questions and a contributor may need to see more than one at once.

## Core flows to design for

**Reader front door.** Land on a story seed with no login wall. See a coherent path to read. See, without leaving the reading view, that a branch point exists and what its alternate paths are called, without the reading experience turning into a family tree.

**Reading a path.** Prose-first, generous line length and leading, minimal chrome. Branch indicators should feel like footnotes or chapter markers, not like a diff viewer.

**Contributor entry.** Choose a storyworld or story path, then start from voice, typed text, or a loose idea, not a blank editor. Voice input should be a first-class, prominent affordance, not a secondary icon buried in a toolbar.

**Scene review.** The agent's shaped draft is shown for approval. This screen needs to make it unmistakable that the human is approving, not that the agent published something. Attribution and "this was agent-assisted" should be visible without being a scary disclaimer.

**Submit and track.** One clear action ("Submit your scene"), then a simple status view using the four submission states above. No raw CI output, no merge-conflict language, ever.

**Notification inbox.** The five-state list above, nothing else. If the underlying system has more detail, it belongs in the steward/maintainer surface, not here.

## Visual and tonal direction

Recommend an editorial, human register: think literary magazine, thoughtful long-form reading app, or a well-designed writer's tool, not a SaaS admin dashboard and not a developer console. Storyworlds on the platform will vary wildly in genre (the seed content in this repo includes a fantasy/mythic saga), so the chrome itself should stay genre-neutral and let each storyworld's own content carry its mood. Warmth over sterility, but restrained: no illustrated mascots, no cutesy copy. Confident typography and generous whitespace do more work here than color.

Canon vs. branch vs. draft should read as a consistent, reusable visual language (a color or iconography system) applied across story cards, the reading view, and status pills, not reinvented per screen.

## Existing technical foundation (build on this, don't replace it)

`artifacts/mockup-sandbox` is a Vite + React + TypeScript app already wired with Tailwind v4, shadcn/ui components (Radix primitives), `lucide-react` icons, `framer-motion`, and `next-themes`-style light/dark support via CSS custom properties in `src/index.css`. The token set (`--background`, `--primary`, `--card`, `--sidebar`, `--chart-1..5`, `--radius`, `--font-sans/serif/mono`, etc.) is currently at shadcn's stock defaults (neutral zinc grays, Inter, 0.5rem radius) and has not been given a Telling Forward identity yet. Replit Design's job is to define real values for that token layer (palette, type pairing, radius, spacing rhythm) and apply them through the existing component library, not to introduce a second design system alongside it. The full shadcn component set (dialog, sheet, tabs, card, badge, avatar, command palette, toast, etc.) is already installed and available.

## Accessibility and content-boundary constraints

- Provenance must always be visible: who contributed what, and whether it was agent-assisted, cannot be a hover-only or hidden-menu detail.
- Unfinished or personal-work content needs a clearly different visual treatment from published/canon content so visibility never gets confused with reuse permission (CONTENT-LICENSE.md).
- Voice input needs a real accessible fallback to text at every step; voice-first must not mean voice-only.
- Standard WCAG AA contrast and keyboard navigation apply throughout; this is a reading and writing product, so typography accessibility (font size control, line-length, dark mode as a genuine reading mode) matters more than average.

## Explicitly out of scope for this pass

- Monetization, paid access, or contributor-reward UI. The project is pre-revenue by design (README, "A staged model").
- World steward / maintainer dashboards that expose GitHub-native detail.
- Full account/identity system design, beyond what's needed to attribute a submission.

## Assumptions (labeled, not confirmed)

- Assumed the immediate design target is the reader and contributor surfaces in `artifacts/mockup-sandbox`, not the Express API or steward tooling. Flag if Replit Design should scope differently.
- Assumed genre-neutral chrome is correct given the platform is meant to host multiple storyworlds, even though the only seed content currently attached (Magnus Saga) is mythic/fantasy in tone.
- Assumed "voice-first" means voice as the primary, most prominent entry point, with text always available, not a voice-only interface.

## Suggested next actions

- Confirm scope with Replit Design: reader + contributor surfaces only, or include a first-pass steward view.
- Pick 2-3 reference products for tone calibration (e.g., a literary magazine site, a long-form reading app) to anchor the palette and type choices before Replit Design generates options.
- Once a palette/type direction comes back, update `artifacts/mockup-sandbox/src/index.css` token values directly rather than hand-styling individual components.
- Sketch the canon/branch/draft visual language (color + icon pairing) as its own small spec before it gets applied across screens, so it stays consistent.
