---
name: Equilibrium review evidence boundary
description: Durable rule for separating repository, workspace workflow, and production evidence during project reviews.
---

Local code inspection and successful workspace workflows are analytical or live
workspace evidence, not proof that a published surface is available or behaves
the same way. Production claims require a recorded deployment revision, the
published route or URL, health checks, and representative external smoke tests.

**Why:** The project has multiple configured artifacts and some workspace
services can run while other surfaces fail from local port contention. Without
this boundary, a review can accidentally promote prototype capability into a
deployment claim.

**How to apply:** In equilibrium reviews and release decisions, classify
checkout, workspace, and production evidence separately. Keep production claims
`not-run` or `blocked` until deployment identity and route-level evidence exist.