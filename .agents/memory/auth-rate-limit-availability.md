---
name: Authentication rate-limit availability
description: Availability policy for the shared authentication rate-limit cache.
---

Production authentication rate limits require a reachable shared Redis service at
startup and must fail closed if that store errors after startup. Development and
tests may use the process-local store only when Redis is intentionally absent.

**Why:** Silent fallback in production would reset IP counters on restarts and
allow scaled instances to track separate limits, weakening brute-force
protection.

**How to apply:** Keep the production startup check and middleware
fail-closed behavior when changing the cache client, rate-limit library, or
authentication endpoints. Document any local-only fallback clearly.