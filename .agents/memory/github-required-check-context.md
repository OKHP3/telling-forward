---
name: GitHub required-check context
description: Live branch protection must use the exact check context emitted by the workflow.
---

GitHub branch protection matches required status checks by exact context name.
An otherwise successful Actions job does not satisfy a differently named
required context.

**Why:** The Pilot Grove exercise exposed that a successful job named
`Validate structural contract` still left the PR blocked because protection
expected `validate-storyworld`. Treating the job result alone as proof of a
merge-ready gate would overstate the evidence.

**How to apply:** When validating a protected branch, record both the
configured required contexts and the actual check-run names on the PR head.
Keep the mismatch visible until an owner-approved configuration change aligns
them.