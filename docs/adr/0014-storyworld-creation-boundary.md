# ADR-0014: Storyworld Creation Boundary

## Status

**Accepted (2026-08-21).** Framing (b2) below is confirmed: storyworld
creation stays a manual, GitHub-native act built on the existing Storyworld
Kit; the application adds an explicit steward-invoked **registration** step
rather than automating repository creation. Confirmed by Jamie Hill in
session on 2026-08-21, following the recommendation this ADR already
carried.

## Context

During a 2026-08-21 navigation audit of the Author App (`artifacts/web`), no
path to originate a new storyworld was found anywhere in the product:

- No `createStoryworld` (or equivalent) mutation exists in the generated API
  client (`lib/api-client-react`).
- No route, form, or button in `artifacts/web/src` calls one.
- `steward-dashboard.tsx` can *edit* an existing storyworld's seed and
  settings via `useUpdateStoryworld`, but nothing originates a world.

This reads as a genuine gap rather than an oversight in the audit, because
the repository already documents a specific, different mechanism for
starting a storyworld: `content/pilot-storyworld/README.md` describes itself
as "the checked-in **Storyworld Kit baseline** used to create a new private
pilot repository," and instructs a human to "Copy the repository-facing
files below into a new repository before adding world-specific material"
(`storyworld.json`, `CONTRIBUTING.md`, `CANON-POLICY.md`, `PROVENANCE.md`,
`.github/` templates, the validation workflow and script). `storyworld.json`
itself is a template with `"storyworldId": "replace-with-storyworld-slug"`
and an explicit governance block (`inviteOnly`, `publicContribution: false`,
`automaticCanon: false`, `automaticRightsDecision: false`).

This is consistent with the architecture already locked in
[ADR-0003](0003-github-native-fast-path-vs-custom-backend.md) and
[ADR-0013](0013-github-native-boundary-and-donor-primitives.md): GitHub is
the durable source for creative content and provenance, and PostgreSQL is
"a rebuildable index," not an authoring surface. But neither ADR said
explicitly whether *originating a new storyworld repository* was meant to
stay a manual, GitHub-side act permanently, or whether it was simply unbuilt
in-app tooling that hadn't been reached yet. This ADR closes that gap.

## Two honest framings

**(a) In-app creation.** The Author App gains a "New Storyworld" action.
A world steward fills out a form (title, slug, governance settings); the
application (via a GitHub App or the existing PAT) creates a new repository,
seeds it from the `content/pilot-storyworld/` Kit, and writes the
corresponding `storyworlds` row in one flow. Fastest path for a steward,
but it puts repository creation, rights confirmation, and Kit application
behind a single automated button.

**(b) GitHub-native creation, application-side registration.** A world
steward creates the repository by hand (or from a GitHub template built off
the Kit), copies in the Storyworld Kit files as the README already
instructs, and confirms the content is rights-cleared. The application then
either (b1) auto-registers the new storyworld via a webhook or Action that
fires on repo creation, or (b2) offers an explicit "Register storyworld"
action where a steward points the app at an existing repository and the
app reads `storyworld.json` plus the Kit contract to index it. This matches
the Kit README's already-documented copy-in workflow and keeps a human
decision point over rights and content boundaries, per
`content/pilot-storyworld/README.md`'s own boundary rule: "Human stewards
still decide permission, moderation, canon, and alternate publication
outcomes through the application."

## Decision

Framing **(b2)** is adopted: repository creation and Kit application remain
a manual, GitHub-side act exactly as the Kit README already documents. The
application adds an explicit steward-invoked **registration** step — reading
a repo's `storyworld.json` and Kit contract to create the indexed
`storyworlds` row — rather than either leaving registration undocumented or
automating repository creation itself.

Reasoning:

- ADR-0013's migration gates explicitly state "No GitHub-native migration is
  authorized by this ADR alone," and full in-app repository creation would
  need a GitHub App scoped for repo creation, which has not been authorized.
- The Kit's own stated purpose is a human copying files into a new
  repository "before adding world-specific material" — automating that step
  would silently reverse a decision already written into the Kit's README
  without a corresponding ADR.
- Rights and content-boundary confirmation (`content/pilot-storyworld/README.md`'s
  "What does not belong here" section) is a judgment call the Kit currently
  routes through a human. An automated "New Storyworld" button would need to
  reproduce that judgment, or bypass it.
- Auto-registration via webhook (b1) remains a reasonable later optimization
  once the Kit and registration flow have been exercised manually at least
  once, but starting there would skip verifying the registration/
  reconciliation logic itself works. b1 may be revisited once b2 is live and
  proven, without requiring a new ADR (it does not change the creation
  boundary, only the trigger for registration).

The registration gap identified by this ADR is now closed: the Author App
exposes a steward-guarded `registerStoryworld` mutation. It accepts only an
existing GitHub repository, requires an explicit rights confirmation, validates
`storyworld.json` and the complete Kit contract against the supported version,
and creates the rebuildable application index atomically. Repository creation
and Kit application remain outside the app.

## Guardrails

- The `registerStoryworld` action must satisfy ADR-0013's rebuild gate: the
  `storyworlds` row must be reconstructible from the repository's own
  GitHub-native identifiers and Kit contract, not authored directly in
  PostgreSQL.
- Registration must preserve the Kit's existing rights-confirmation step; it
  cannot be silently dropped for the sake of a one-click flow.
- `storyworld.json`'s `kitVersion` must be checked at registration time so an
  out-of-date Kit copy is caught rather than silently indexed.
- Repository creation itself (in-app or automated) is explicitly out of
  scope for any implementation that cites this ADR. A future ADR is required
  before that boundary moves.

## Related decisions

- [ADR-0003: GitHub-native fast path versus custom backend](0003-github-native-fast-path-vs-custom-backend.md)
- [ADR-0013: GitHub-native boundary and donor primitives](0013-github-native-boundary-and-donor-primitives.md)
- `content/pilot-storyworld/README.md` (Storyworld Kit baseline)
