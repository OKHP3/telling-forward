# Authentication Rate-Limit Two-Instance Verification

This record preserves the result of the authentication rate-limit verification
attempt on 2026-08-25. It distinguishes local control evidence from production
evidence and does not include any Redis connection details.

## Run identity and publication

- **Run ID:** `2026-08-25-auth-rate-limit`
- **Run time (UTC):** `2026-08-25T16:05:07Z`
- **Run type:** `controlled production-like verification`
- **Decision:** `blocked`
- **Evidence status:** `local control only`
- **Published URL:** `TBD — no active deployment`
- **Published revision:** `TBD — no deployment revision available`
- **Deployment lookup:** `2026-08-25; deployment service reported success=true, isDeployed=false, hasSuccessfulBuild=false`
- **Workspace revision under test:** `44ece080d4efe6bcf7b180d01b8bfb3283df1662`

## Prerequisite status

| Prerequisite | Result | Evidence tier | Evidence |
| --- | --- | --- | --- |
| Published API deployment | Blocked | Local control | Deployment lookup returned no active deployment or production URL |
| Reachable shared Redis service | Blocked | Local control | `REDIS_URL` was not present in the verification environment; its value was never read or recorded |
| Two live API instances | Not run | Local control | Cannot start production-like instances against a shared service without the prerequisites above |

## Local control results

| Check | Result | Evidence |
| --- | --- | --- |
| Redis-backed limiter unit tests | Pass | 4 rate-limit Redis tests passed |
| Authentication rate-limit and lockout tests | Pass | Targeted command completed with 187 tests passed across 26 files |
| API typecheck | Pass | `@workspace/api-server` typecheck completed successfully |
| API build | Pass | Production bundle completed successfully |
| Production startup without Redis | Pass | Process exited with status 1 before listening and reported that `REDIS_URL` must be configured in production |
| Runtime Redis failure fail-closed behavior | Pass | Mocked production-like coverage in the authentication lockout suite |

## Deferred live checks

The following checks remain unobserved and must be rerun after a deployment has a
reachable shared Redis service:

1. Start two production-like API instances using the same Redis service and
   confirm both report `Rate-limit Redis connection ready`.
2. Distribute login requests across both instances and confirm the shared
   ten-request IP quota is consumed once, not once per process.
3. Break or remove Redis in a production-like instance and confirm startup
   fails or the protected route returns a fail-closed error.
4. Record the deployed revision and safe Redis-readiness log references for the
   same run.

No connection string, credential, participant identity, or production URL was
recorded because none was available and secrets must not be included in
evidence.