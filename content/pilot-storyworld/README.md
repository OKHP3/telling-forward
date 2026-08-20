# Pilot Storyworld Content

This directory is the **single authorized location** for real creative source
material during Stage 0–1 of the Telling Forward build.

It also contains the checked-in **Storyworld Kit baseline** used to create a
new private pilot repository. Copy the repository-facing files below into a
new repository before adding world-specific material:

- `storyworld.json` — world identity and baseline contract version
- `CONTRIBUTING.md` — plain-language invitation and rights boundary
- `CANON-POLICY.md` — steward-owned canon decision rules
- `PROVENANCE.md` — durable attribution and acceptance record convention
- `.github/labels.json` — canonical issue labels
- `.github/ISSUE_TEMPLATE/` — capsule and story-submission forms
- `.github/CODEOWNERS.example` — maintainer template to customize
- `.github/branch-protection.md` — defense-in-depth setup requirements
- `.github/workflows/validate-storyworld.yml` — structural-only validation
- `scripts/validate-storyworld-kit.mjs` — local/CI baseline checker

The Kit is an operations baseline, not an automatic editorial authority.
Human stewards still decide permission, moderation, canon, and alternate
publication outcomes through the application.

## What belongs here

- Creative fiction, story seeds, character notes, or scene drafts that the
  project owner (Jamie Hill) has confirmed are clearly owned and authorized
  for use in the pilot.
- Storyworld configuration, premise text, and canonical reference material
  for the Stage 0–1 private pilot storyworld.

## What does not belong here

- Third-party fiction or published material you do not hold rights to.
- Unpublished personal material from other contributors without their explicit
  consent.
- AI-generated content that has not been reviewed and approved by a human.
- Secrets, tokens, credentials, or personal machine paths.

## Boundary rule

Nothing outside `content/pilot-storyworld/` is treated as reusable product
fixture or rights-cleared pilot content. This includes `attached_assets/`,
which holds working documents and research material whose public/private
status is separately governed.

Treating a file as "fixture content" when it is actually protected fiction
can create rights and consent problems downstream. When in doubt, add it here
only after confirming you are authorized to use it.

## Decision record

This directory and its boundary were established on 2026-08-19 by Jamie Hill
as decision 15.5 in the PRD Build Directive v1.

See also: `CONTENT-LICENSE.md` for the default rights policy governing all
creative content in this repository.
