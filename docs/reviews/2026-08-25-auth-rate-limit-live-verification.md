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

## Follow-up controlled run — 2026-08-27

This run reached the shared-service phase using two production-like API
processes and one ephemeral local Redis service. The Redis endpoint is
intentionally omitted.

- **Run ID:** `2026-08-27-auth-rate-limit-two-instance`
- **Run time (UTC):** `2026-08-27T13:39:42Z`
- **Run type:** `controlled production-like verification`
- **Decision:** `local shared-service controls passed; publication evidence blocked`
- **Workspace revision under test:** `b081215492850c8d5d5d9389b2acc26ddbbf7cce`
- **Published revision:** `TBD — deployment metadata reports no active deployment`
- **Published URL:** `TBD — deployment metadata reports no active deployment`

### Prerequisite and readiness evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Shared Redis service | Pass | One ephemeral Redis service was used by both API processes; the endpoint was not recorded |
| API instance 1 readiness | Pass | Log emitted `Rate-limit Redis connection ready` before listening |
| API instance 2 readiness | Pass | Log emitted `Rate-limit Redis connection ready` before listening |
| Published deployment | Blocked | Deployment lookup succeeded but reported `isDeployed=false` and no production URL or revision |

### Shared quota evidence

Requests used the same resolved client IP and alternated between the two API
processes. The login limiter allowed ten invalid-credential requests across
both processes and rejected the eleventh:

| Alternating request range | Result |
| --- | --- |
| Requests 1, 3, 5, 7, 9 | `401` on instance 1 |
| Requests 2, 4, 6, 8, 10 | `401` on instance 2 |
| Request 11 | `429` on instance 1 with `Retry-After` |

This proves the ten-request IP quota was consumed once by the shared Redis
store rather than independently by each process.

### Redis removal / failure evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Production startup without `REDIS_URL` | Pass | Process exited with status 1 before listening and reported `REDIS_URL must be configured in production...` |
| First request after runtime Redis shutdown | Not used as acceptance evidence | The initial probe raced the client's disconnect detection and returned `401`; no fail-closed claim is made from it |

The required removal path is therefore satisfied by the production startup
guard. A public deployment smoke test remains outstanding and must use the
published revision plus a reachable managed Redis service; this local run does
not establish production availability.