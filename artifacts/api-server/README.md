# API server

## Authentication rate-limit cache

Authentication endpoints use `express-rate-limit` with `rate-limit-redis`.
Set `REDIS_URL` to a shared Redis service in every production API instance.
The API starts only after it can reach that service, so login and registration
counters remain available across process restarts and are shared by scaled
instances.

All endpoint-specific stores reuse one `ioredis` connection per API process.
Their distinct Redis key prefixes keep login, registration, verification, and
password-reset limits independent.

### Redis availability behavior

- **Development and tests without `REDIS_URL`:** the API intentionally uses
  express-rate-limit's in-memory store. This is convenient locally, but counters
  reset when the process restarts and are not shared across processes.
- **Production without `REDIS_URL`:** startup fails. This prevents an accidental
  deployment with resettable, per-instance sign-in counters.
- **Redis configured but unreachable:** startup fails. If Redis becomes
  unavailable after startup, the rate limiter fails closed (the request receives
  an error) instead of allowing a bypass; the account-level PostgreSQL lockout
  remains an additional durable protection.