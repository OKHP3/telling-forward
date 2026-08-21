# Live Webhook Duplicate-Delivery Evidence

**Date:** 2026-08-21  
**Task:** Verify duplicate GitHub deliveries stay harmless in a live pilot

## Status

**Blocked at the live-evidence boundary.**

The deployment service reports:

- `isDeployed: false`
- no production URL
- no successful production build

`GITHUB_WEBHOOK_SECRET` is also not configured in the workspace. The webhook
handler therefore correctly fails closed rather than accepting unsigned or
unverifiable traffic. No GitHub delivery IDs or production audit rows were
created, and a development URL was not presented to GitHub as a webhook
target.

## Confirmed locally

The focused API regression run passed:

- 25 test files
- 185 tests
- `artifacts/api-server/src/routes/__tests__/path-state-sync.test.ts` passed
  with 36 tests

The local suite covers signed handler replay behavior, invalid signatures,
protected `restricted`, `withdrawn`, and `archived` proposal outcomes,
editor-question upserts keyed by GitHub review identity, notification
idempotency, and provenance rebuild safeguards. This is implementation
evidence only; it is not a substitute for a live GitHub delivery and deployed
database test.

## Required next evidence

After the API is published and a webhook secret is configured on both GitHub
and the deployed service, replay the same signed pull-request, review, and
label/metadata deliveries against the private Pilot Grove repository. Record
the GitHub delivery IDs, HTTP responses, resulting proposal states, editor
question counts, notification keys, and provenance rows in the deployment
evidence record.