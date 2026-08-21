# Pilot Storyworld Kit Setup Evidence

**Date:** 2026-08-21  
**Repository:** `OKHP3/telling-forward-pilot-grove`  
**Visibility:** Private  
**Storyworld ID:** `pilot-grove-2026`

## Result

The first synthetic private pilot was created from the checked-in
`content/pilot-storyworld/` Storyworld Kit. The repository contains the
customized manifest, steward CODEOWNERS entry, canonical issue forms and
labels, pull-request template, governance policies, and structural validation
workflow.

The local Kit validator passed before the initial push. The GitHub Action
**Validate Storyworld Kit** then completed successfully on the repository's
initial commit:

- Action result: `success`
- Run: https://github.com/OKHP3/telling-forward-pilot-grove/actions/runs/32483602138

## Effective controls

- `main` is the configured canon branch.
- `validate-storyworld` is a required status check.
- Pull requests require one approving review.
- Code-owner review is required.
- Administrator enforcement is enabled.
- Force-pushes are disabled.
- Branch deletion is disabled.
- The repository remains invite-only and private.
- Automatic canon and automatic rights decisions remain disabled.

## Repository-specific customization

- Manifest identity is `pilot-grove-2026`.
- `.github/CODEOWNERS` assigns `/content/` and `/PROVENANCE.md` to `@OKHP3`.
- Issue form titles identify the Pilot Grove storyworld.
- Canonical Kit labels are installed, along with `world:pilot-grove`.

## Limitation and vocabulary note

`OKHP3` is a GitHub **user account**, not an organization. The organization
API endpoints returned `404`, while the user-owned repository and repository
settings APIs succeeded. Therefore this evidence proves repository-level
governance, but it does not prove organization/team settings, organization
plan features, or team-based CODEOWNERS behavior. The Kit's branch-protection
prerequisites remain applicable if the pilot is later moved into an actual
organization.

The GitHub-native names above are used only in this maintainer evidence
record. Contributor-facing product surfaces should continue using the
Storyworld, Canon, Path, Saved Moment, and Story Submission vocabulary.