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
`validate-storyworld`, while the workflow at the time emitted the check name
`Validate structural contract`. The structural job succeeded, but GitHub still
reported the PR as blocked after steward approval because the exact required
context was still expected.

This evidence therefore proves the review gate and the successful structural
job, but it does **not** claim that the live required-check configuration is
merge-ready for that historical run.

## Post-fix acceptance check

**Date:** 2026-08-31
**Type:** Owner-approved synthetic configuration check
**Disposition:** Passed; no synthetic change merged

The Storyworld Kit now keeps the protected requirement and emitted check
context identical:

- Required branch-protection context: `validate-storyworld`
- Workflow job/check emitted: `validate-storyworld`
- Required steward review: one approving review from the designated code owner

The synthetic acceptance matrix is conjunctive:

| Structural check | Steward approval | Expected pull-request state |
| --- | --- | --- |
| success | present | merge-ready |
| success | absent | blocked |
| missing or unsuccessful | present | blocked |

The matrix confirms that a pull request is merge-ready only after the named
structural check succeeds **and** the designated steward approval is present.
This is a gate-readiness assertion, not a decision about canon, rights,
moderation, or publication; the structural workflow retains read-only contents
permission and has no merge authority.

## Live re-run after check-name fix

**Date:** 2026-09-03
**Type:** Owner-approved private-pilot propagation and synthetic gate exercise
**Disposition:** Workflow fix merged; synthetic pull request closed without merge

The corrected workflow was propagated to the private pilot through workflow-only
pull request [#4](https://github.com/OKHP3/telling-forward-pilot-grove/pull/4).
The service identity `telling-forward-platform[bot]` authored the branch and
pull request; `@OKHP3` supplied the approving owner review. Before approval,
the exact `validate-storyworld` check had completed successfully while the pull
request remained `blocked` with no reviews. After the owner approval, GitHub
reported the pull request as `clean`, and the workflow-only change was merged.
No storyworld or synthetic content was included in that propagation pull request.

The live protected-branch configuration and workflow now agree:

- `main` required status context: `validate-storyworld`
- workflow job/check emitted on `main`: `validate-storyworld`
- required code-owner review: enabled
- workflow merge authority: none; contents permission remains read-only
- propagated `main` commit:
  `0d9ec5e78d36f5f5045530eab55ac904a0f71c75`

### Fresh synthetic pull request matrix

Fresh synthetic pull request
[#5](https://github.com/OKHP3/telling-forward-pilot-grove/pull/5) was authored
by `telling-forward-platform[bot]` and reviewed by `@OKHP3`
([review](https://github.com/OKHP3/telling-forward-pilot-grove/pull/5#pullrequestreview-5096660331)).
The disposable fixture was never merged.

The same pull request exercised the protected gate in all required states:

| Structural check / emitted context | Steward approval | Observed state |
| --- | --- | --- |
| `validate-storyworld` absent; `Validate structural contract` succeeded | present | `blocked` |
| `validate-storyworld` failed | present | `blocked` |
| `validate-storyworld` succeeded | present | `clean` |

The absent-context run is recoverable from the
[check run](https://github.com/OKHP3/telling-forward-pilot-grove/actions/runs/33701034775/job/100480168045);
the successful final run is recoverable from the
[check run](https://github.com/OKHP3/telling-forward-pilot-grove/actions/runs/33701059475/job/100480246406).
The PR was then closed at `2026-09-03T00:48:49Z` with `merged: false`.
Its temporary branches were deleted after closure. The final PR head was
`c7274d08b6fbc2f94d27ec6fa115cf5f72f8fdbf`; `main` remained at
`0d9ec5e78d36f5f5045530eab55ac904a0f71c75`.

This live evidence proves gate behavior only. The structural check remains
repository-shape evidence and does not decide canon, rights, moderation, or
publication; those decisions remain with the human steward and the
application's independent policy controls.
