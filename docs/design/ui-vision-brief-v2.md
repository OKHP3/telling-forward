# Telling Forward — UI Vision Brief for Replit Design (v2)

Prepared for: Replit Design
Prepared by: Jamie Hill, OverKill Hill P3
Repo: `telling-forward` (OKHP3), staged on Replit, mockup surface at `artifacts/mockup-sandbox`

This version supersedes v1's "keep the chrome genre-neutral" call. That was wrong for the reader experience. It still holds for the author app.

## Executive summary

- Two apps, not one. The **Author App** is the web app itself: the abstraction layer over GitHub for everyone who writes, whether they're opening a world or extending someone else's path. The **Reader App** is a separate, themeable e-reader for consumers.
- Content is native markdown, not EPUB/Word/PDF. That's a deliberate departure from typical publishing formats, and it's the right call precisely because GitHub already renders markdown natively. Visualizations are PNG, WebP, or SVG. The Author App doesn't need to build a markdown renderer from scratch as a hard requirement, GitHub's viewer is a fallback that already works; the Reader App needs its own *themed* renderer, since that's where the product experience actually lives.
- The Author App is one consistent design system regardless of which storyworld someone is writing in. Genre-neutral, editorial, calm. This is where v1's guidance still applies.
- The Reader App is the opposite on purpose. Each world's originating author can pick and tailor the reader-facing motif for their world. Your own example: a Magnus Progenitor Saga reader experience styled as a dated 2030s-2050s computer terminal, being accessed tens of thousands of years in the future, found-footage aesthetic. That's a template, not a one-off hack.
- Practical shape: build a small, finite catalog of reader themes (a handful, not infinite), each a full visual system (palette, type, chrome, motion), with Replit Design generating variants within that catalog rather than one-off bespoke builds per world.
- Non-negotiable across every reader theme, regardless of skin: canon vs. branch vs. draft has to stay legible, attribution has to stay visible, and accessibility floors don't get waived because a theme is retro or stylized.

## The two-app model

| | Author App | Reader App |
|---|---|---|
| Who | World creators (originating authors) and contributors (branch authors) | Consumers, no login required to read |
| Purpose | Write, review agent-shaped scenes, submit, manage a world's canon and permissions | Discover a story seed, read a path, see where it branches |
| Design posture | One consistent system across every world. Editorial, calm, developer-abstraction-first | Themeable per world. Motif-driven, author-tailored |
| Content model | Markdown source, PNG/WebP/SVG for visuals, GitHub as the version-control backstage | Same markdown source, rendered through the active reader theme |
| Vocabulary contract | Full ADR-0001/0002 translation layer applies (storyworld, story path, saved moment, submit your scene, etc.) | Same contract, expressed through the theme's own voice (a terminal theme might render "Under review" as a system status line, but it's still literally "Under review") |

Within the Author App, the world creator has additional powers a branch contributor doesn't: canon approval, permission management, and reader-theme selection/customization for their world. That's a permissions difference inside one app, not a third app.

## Content and rendering model

Markdown is the canonical story format. This is a genuine departure from EPUB/Word/PDF-style publishing platforms, and it's the right departure, since GitHub-native markdown rendering means the Author App gets a working viewer almost for free, and the format stays diffable, versionable, and plain-text-portable. Visuals (maps, character art, diagrams) are PNG, WebP, or SVG, referenced from markdown like any other asset.

The Author App can lean on relatively plain, functional markdown rendering, it's a writing and review tool, not a themed showcase. The Reader App is where markdown gets dressed: the same source file needs to render correctly and beautifully through whichever theme a given world has selected, meaning the Reader App's renderer has to be theme-aware at the markdown-to-DOM layer, not just a CSS reskin bolted onto one fixed layout.

## The reader theme system

Recommend a **finite starter catalog**, not an open-ended customization surface. A handful of full themes, each with its own palette, typography, chrome, and motion language, gives world creators real differentiation without the QA and accessibility burden of unlimited combinations. Replit Design's job is to build out that catalog and generate on-brand variants within it, not to hand every world creator a blank canvas.

Each theme still needs to implement the same functional contract underneath its skin:

- Canon, branch, and draft states stay visually distinct, using whatever visual grammar fits the theme (a terminal theme might use system-log styling for "alternate path," an illuminated-manuscript theme might use marginalia).
- Attribution and agent-assistance disclosure stay visible, not buried in a menu the theme happens to hide.
- Text remains legible: real contrast, real scaling, a reduced-motion path. This matters more, not less, for a stylized theme. A CRT/phosphor motif is exactly the kind of thing that tends to fail contrast and photosensitivity guidelines if built literally; the found-footage feel should come from framing devices (scanline texture, boot sequence, monospace type, amber/green accent) layered over an accessible base, not from actually simulating a washed-out low-contrast screen.

### Starter theme catalog (strawman, for reaction)

| Theme | Motif | Fits |
|---|---|---|
| Editorial (default) | Literary magazine, generous serif/sans pairing, restrained | The fallback for any world that doesn't customize |
| Terminal / Found Footage | Dated 2030s-2050s computer system, monospace, phosphor accent, boot-sequence transitions | Magnus Progenitor Saga, your example |
| Archive / Illuminated | Manuscript-adjacent, marginalia for branches, aged paper texture | Myth, epic, or historical-feeling worlds |
| Dispatch / Newsprint | Column layout, byline-style attribution, dateline framing | Serialized or journalistic-feeling fiction |
| Transmission / Signal | Radio-log or field-report framing, waveform or static motifs | Found-media, epistolary, or in-world "recovered signal" fiction |

This is five to seed the range, not a commitment. Confirm which ones are worth building first.

## World creator's theme controls (a new Author App screen)

The Author App needs a "Reader Experience" panel where a world creator picks a template from the catalog and tunes it within bounds Replit Design defines per theme (likely: accent color, type scale, maybe a motif variant or two, not full CSS access). This is a new surface v1 didn't account for and should get its own design pass once the base catalog exists.

## What carries over from v1, unchanged

- The vocabulary contract (ADR-0001), the four-state submission status, the five-state contributor inbox (ADR-0002), and the three separate axes (status, ownership type, canon/branch relationship) all still apply, and now need to be expressed correctly inside every reader theme, not just once.
- Accessibility floors, provenance visibility, and the personal-work/canon visibility distinction from CONTENT-LICENSE.md are non-negotiable regardless of theme.
- `artifacts/mockup-sandbox` (React + Vite + Tailwind v4 + shadcn/ui + Radix + lucide-react) is Replit's own component-preview scaffold, useful for mocking up both apps, not a constraint that the Reader App has to look shadcn-default. A CRT terminal theme will likely need its own token set and custom chrome components rather than stock shadcn styling; the Author App should stay closer to shadcn conventions.

## Assumptions (labeled, not confirmed)

- Assumed the Author App is one app serving both world creators and branch contributors, differentiated by permissions, not two separate apps. Flag if that's wrong.
- Assumed a finite, curated theme catalog is the right shape, versus fully open per-world theming. This trades some creative freedom for consistency, accessibility guarantees, and build cost.
- Assumed reader themes need their own dedicated token/component sets rather than all living inside one mega-flexible theme system, since a terminal aesthetic and an editorial aesthetic don't share much at the component level.

## Suggested next actions

- React to the five strawman themes: keep, cut, reorder priority, or name others.
- Decide how many theme controls a world creator actually gets per theme (accent color only, or type/motion too) before Replit Design scopes the customization panel.
- Prioritize which app Replit Design mocks up first. Recommend the Author App, since it's the shared foundation every world depends on, with the Terminal/Found-Footage reader theme as the first Reader App proof of concept once the base reading layout is solid.
- Once the Author App's "Reader Experience" panel is sketched, loop back to confirm it matches how you actually want world creators choosing and tuning a theme.
