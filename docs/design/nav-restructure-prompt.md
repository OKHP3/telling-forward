# Navigation Restructure — Implementation Prompt for Replit

Prepared for: Replit
Prepared by: Jamie Hill, OverKill Hill P3
Repo: `telling-forward` (OKHP3), Author App at `artifacts/web`

Paste this directly into Replit to scope the change. It is implementation
direction, not a finished spec — Replit should ask before making structural
choices not covered below.

## Problem

A 2026-08-21 audit of `artifacts/web` found that the Author App's primary
navigation (`src/components/layout.tsx`) only exposes two links: **Storyworlds**
and **Submissions**, plus a Settings gear and sign-in/out. Two substantial,
already-built pages have no top-level entry point:

- **Concept Board** (`src/pages/concept-board.tsx`, route
  `/worlds/:worldId/board`) — non-linear capsule capture.
- **Scene Writer** (`src/pages/scene-writer.tsx`, route
  `/worlds/:worldId/scene-writer/:capsuleId`) — linear scene drafting.

Both are currently reachable only after clicking into a specific storyworld
from the home grid, then clicking a button on `world-detail.tsx`. A
first-time or returning author has no way to tell authoring exists from the
top nav, and reaching it takes at least two clicks past sign-in.

## Constraint that shapes the fix

Concept Board and Scene Writer are **world-scoped routes**
(`/worlds/:worldId/board`, not `/board`). A capsule or scene always belongs
to one storyworld. This means the fix cannot be "add a flat top-nav link" —
there is no single URL to send someone to without knowing which world they
mean. The fix has to handle: zero accessible worlds, exactly one, and many.

## Implementation direction

1. **Add a persistent "Write" entry to the primary nav** in `layout.tsx`,
   alongside Storyworlds and Submissions.
   - If the signed-in user has access to exactly one storyworld, "Write"
     routes directly to that world's Concept Board
     (`/worlds/:worldId/board`).
   - If they have access to more than one, "Write" opens a lightweight
     picker (a dropdown or a small routed page) listing accessible
     storyworlds by title, each linking to that world's Concept Board.
   - If they have access to none yet (or aren't signed in), "Write" routes
     to the Storyworlds home page with a short inline note that they need to
     be part of a world first — do not fabricate a "create a world" action
     here; that flow does not exist yet and is tracked separately in
     ADR-0014.
2. **Surface Concept Board and Scene Writer one click sooner on the home
   grid.** On `home.tsx`, each storyworld card currently links only to
   `/worlds/:id`. Add a small secondary action or icon link on the card
   itself straight to that world's Concept Board, so a returning author
   doesn't have to land on World Detail first just to start writing.
3. **Leave `world-detail.tsx` unchanged in substance.** Its existing
   "Browse Concept Board," "Explore Story Graph," and "Steward Panel" links
   stay as in-world secondary navigation. This task is about discoverability
   from outside a world, not about redesigning the in-world page.
4. **Keep the existing visual language.** Match the current nav's spacing,
   typography, and active-state treatment (`text-foreground bg-accent/50`
   pattern already used for Storyworlds/Submissions) rather than introducing
   a new nav style.

## Non-goals

- Do not build storyworld creation. That is a separate, still-open decision
  (see ADR-0014, `docs/adr/0014-storyworld-creation-boundary.md`) and should
  not be implied or stubbed in this pass.
- Do not touch the Reader App (`artifacts/reader`) — this is Author App only.
- Do not change any backend route, schema, or the generated API client.
- Do not restyle unrelated pages (Settings, Submissions, auth) beyond what's
  needed for the picker component if one is added.

## Acceptance checks

- From a fresh sign-in with access to exactly one storyworld, a user reaches
  Concept Board in one click from any page via the top nav.
- With access to multiple storyworlds, the picker lists all of them and each
  link resolves to the correct world's board.
- With no accessible storyworlds, "Write" degrades gracefully — no dead
  link, no console error, no implied "create world" action.
- Existing routes (`/worlds/:worldId`, `/worlds/:worldId/graph`,
  `/worlds/:worldId/steward`, `/submissions`, `/settings`) are unaffected.
- `pnpm build` (or the project's existing build/test command) still passes.
