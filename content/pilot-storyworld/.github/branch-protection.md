# Branch protection prerequisites

Branch protection is a maintainer control, not a contributor-facing
requirement. Before a pilot repository is used:

1. Replace the placeholder in `CODEOWNERS.example` and copy it to
   `.github/CODEOWNERS`.
2. Protect the configured canon branch from force-push and deletion.
3. Require a review from the designated steward or team.
4. Require the exact check context `validate-storyworld`, emitted by the
   workflow job named `validate-storyworld`, before merging.
5. Require branches to be up to date before merging when the repository plan
   supports it.
6. Do not grant Actions permission to merge, accept canon, change rights, or
   bypass review.

## Acceptance gate

An owner-approved synthetic pull request is merge-ready only when both
conditions are satisfied:

- the `validate-storyworld` check completes successfully; and
- the designated steward supplies the required approving code-owner review.

The structural check is evidence about repository shape only. It does not
decide canon, rights, moderation, or publication, and it must not be granted
permission to merge or bypass the steward review.

GitHub plan and organization settings may limit CODEOWNERS, required reviews,
required status checks, or team-based review rules. Confirm those prerequisites
in the actual organization before treating this file as evidence that the
rules are active. The application must continue to enforce steward membership
and proposal state independently.