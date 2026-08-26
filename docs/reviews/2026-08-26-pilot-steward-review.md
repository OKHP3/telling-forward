# Pilot Protected-Canon Steward Review Evidence

**Date:** 2026-08-26  
**Repository:** `OKHP3/telling-forward-pilot-grove`  
**Visibility:** Private  
**Storyworld ID:** `pilot-grove-2026`  
**Disposition:** Closed without merge

## Purpose and scope

This was an owner-approved synthetic governance exercise for the private Pilot
Grove repository. It did not use real story material, third-party material, or
a contributor submission. The synthetic change was intentionally kept out of
canon by closing the pull request without merging it.

The service identity created the test branch, commit, and pull request. The
designated steward identity `@OKHP3` supplied the human review. Automation was
used only for repository and structural validation; no check was treated as a
canon, rights, moderation, or publication decision.

## Protected path exercised

- Canon branch: `main`
- Base commit before the exercise: `874ee678e96f46b7610045e50d315e2dab12c1ae`
- Synthetic branch: `pilot/steward-review-2026-08-26`
- Synthetic head commit: `acf3b0133c0a0ee7b5325739d637e45a3b986f09`
- Synthetic file: `content/pilot-storyworld/.synthetic-steward-review.md`
- Pull request: [#1](https://github.com/OKHP3/telling-forward-pilot-grove/pull/1)
- Pull request author: `telling-forward-platform[bot]`

The changed file is under the repository's `/content/` CODEOWNERS rule, which
assigns ownership to `@OKHP3`.

## Structural validation

The pull-request workflow completed successfully:

- Workflow: **Validate Storyworld Kit**
- Job/check: **Validate structural contract**
- Result: `success`
- Run/job:
  [32922715841](https://github.com/OKHP3/telling-forward-pilot-grove/actions/runs/32922715841)
  /
  [98039270334](https://github.com/OKHP3/telling-forward-pilot-grove/actions/runs/32922715841/job/98039270334)
- Check completed: `2026-08-26T02:26:25Z`

This check validated repository structure only. It did not make an editorial,
rights, moderation, canon, or publication decision.

## Pre-review merge gate

Before the steward review was submitted:

- PR state: `open`
- Mergeable state: `blocked`
- Reviews: none
- Merge attempt: HTTP `405`
- GitHub response: `Waiting on code owner review from OKHP3. Required status
  check "validate-storyworld" is expected.`

This records that the protected canon branch did not accept the synthetic
change without the designated code-owner review.

## Steward review

- Reviewer: `@OKHP3`
- Review:
  [5026197087](https://github.com/OKHP3/telling-forward-pilot-grove/pull/1#pullrequestreview-5026197087)
- State: `APPROVED`
- Submitted: `2026-08-26T02:26:40Z`

The review explicitly states that it is evidence of human steward review and
not an automatic canon, rights, moderation, or publication decision.

## Final disposition and evidence boundary

The pull request was closed without merge at `2026-08-26T02:27:25Z`:

- Final PR state: `closed`
- Merged: `false`
- Main after closure:
  `874ee678e96f46b7610045e50d315e2dab12c1ae`
- Main changed by this exercise: `false`

The review, successful structural check, blocked pre-review merge attempt, and
final closure are all recoverable from GitHub. No synthetic file entered the
canon branch.

## Configuration discrepancy discovered

The live branch-protection rule requires the status context
`validate-storyworld`, while the workflow currently emits the check name
`Validate structural contract`. The structural job succeeded, but GitHub still
reported the PR as blocked after steward approval because the exact required
context was still expected.

This evidence therefore proves the review gate and the successful structural
job, but it does **not** claim that the live required-check configuration is
merge-ready. Aligning the protected context with the emitted check name is a
separate follow-up and is intentionally not changed by this exercise.