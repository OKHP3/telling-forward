# Author App API Deployment Record

**Date:** 2026-08-26  
**Surface:** `artifacts/api-server`  
**Hosting target:** Replit Autoscale  
**Static client origin:** `https://okhp3.github.io/telling-forward/`

## Decision

The separately hosted production API uses the registered Replit Autoscale
deployment for `artifacts/api-server`. This target supplies a stable HTTPS
`*.replit.app` URL, supports the existing Node 24 production bundle, and keeps
PostgreSQL, Redis, Clerk secrets, and GitHub write credentials server-side.

The Pages build receives the API origin from the GitHub repository variable
`TELLING_FORWARD_API_BASE_URL`; no API credential is embedded in the static
bundle.

## Current publication evidence

| Field | Value |
|---|---|
| Deployment lookup | 2026-08-26; deployment service reported `success=true`, `isDeployed=false`, `hasSuccessfulBuild=false` |
| API production URL | Not available until the owner publishes the API artifact |
| API revision | Not available |
| `/api/healthz` | Not run against production |
| Pages origin → API CORS | Not run against production |
| Clerk callback and proxy | Not run against production |
| Production database connectivity | Not run against production |

This is a publication prerequisite record, not a claim that service-backed
production is live. The verified GitHub Pages shell remains a separate static
availability claim.

## Release checklist

After the API artifact is published:

1. Record the HTTPS `primaryUrl` and successful build revision from the
   deployment service.
2. Set `TELLING_FORWARD_API_BASE_URL` to that origin in the GitHub repository
   Actions variables.
3. Set the API's `FRONTEND_URL`, `FRONTEND_ORIGIN`, and
   `GITHUB_OAUTH_CALLBACK_URL` values as documented in
   `docs/platform-requirements.md`.
4. Provision production `DATABASE_URL`, shared `REDIS_URL`, session secret,
   Clerk keys, and the existing GitHub integration secrets in the deployment
   environment.
5. Verify `GET <API base>/api/healthz` returns `200 {"status":"ok"}`.
6. From `https://okhp3.github.io/telling-forward/`, verify the health
   preflight returns the exact Pages origin with
   `Access-Control-Allow-Credentials: true`, then verify sign-in, a protected
   read, and one authorized write.
7. Exercise the Clerk session/callback path and GitHub OAuth callback using
   only the published HTTPS URLs.
8. Update this record with the deployment URL, revision, timestamps, and
   observed route results. Do not record secrets, tokens, or database contents.