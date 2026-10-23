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

## Historical publication evidence (2026-08-26)

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

## Publication recheck (2026-10-23)

The following evidence was inspected at 16:07 UTC against canonical revision
`24440fb1b434b804dd91b9c20da4db825057cdac`. It supersedes the historical
table only where a fresh observation is available.

| Check | Observed result |
|---|---|
| Repository Actions variables | The authenticated repository lookup returned zero variables. `TELLING_FORWARD_API_BASE_URL` is not configured. |
| [Dependency health](https://github.com/OKHP3/telling-forward/actions/runs/39719085959) | Completed successfully at the inspected revision. |
| [Web browser regression](https://github.com/OKHP3/telling-forward/actions/runs/39719085955) | Completed successfully at the inspected revision. |
| [Refresh Mermaid](https://github.com/OKHP3/telling-forward/actions/runs/39895811928) | Completed successfully at the inspected revision. |
| [Pages deployment](https://github.com/OKHP3/telling-forward/actions/runs/39719086008) | Skipped at the inspected revision. This is not a successful deployment. |
| Replit production deployment | Current deployment status, HTTPS origin, and deployed revision remain unverified. |
| Production acceptance | Health, Pages-origin CORS, sign-in, protected read, authorized write, and callback checks remain outstanding. |

The [Pages workflow](../../.github/workflows/deploy-pages.yml) gates its build
on a nonempty `TELLING_FORWARD_API_BASE_URL`. The missing variable therefore
still prevents a new Pages publication. Passing source checks do not establish
production API availability, a new Pages release, or authenticated runtime
behavior. No placeholder origin was configured and no publication gate was
removed during this recheck.

Before resuming the checklist below, restore authorized deployment access and
establish the actual deployment status and permitted hosting terms. Do not
infer a production URL from a preview or initiate a paid deployment as a
fallback for unavailable access. The existing hosting decision is unchanged.

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
