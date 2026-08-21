# Changelog

All notable changes to Telling Forward are recorded here.

Format: plain dated entries per task or meaningful change, newest first.

---

## 2026-08-20

### Restore portable pnpm validation (Task #74)

Restored local Mac validation without changing the Replit/Linux deployment
contract.

- Retained Darwin optional binaries for esbuild, Rollup, Tailwind, Lightning
  CSS, and Expo tooling while keeping non-Replit platform exclusions.
- Made the pnpm-only install guard recognize pnpm through its lifecycle
  executable when the user-agent variable is unavailable.
- Mocked the unused OpenAI integration in the capsule authorization unit test,
  and the authentication rate-limit integration test, so they no longer need
  a provisioned integration endpoint merely to load their routes under test.

## 2026-08-19

### Design consent and moderation safeguards for public contribution (Task #73)

Completed the Stage 0–1 design prerequisites for any future public
contribution surface. No enforcement UI, API gate, database migration, or
public contribution feature was implemented.

- Added [`docs/decisions/consent-ladder-design.md`](docs/decisions/consent-ladder-design.md):
  per-action, versioned, revocable consent; a draft private consent ledger; and
  an explicit rule that generic AI-assist consent does not authorize CIE/PIE or
  other derivative transformation.
- Added [`docs/decisions/moderation-tooling-design.md`](docs/decisions/moderation-tooling-design.md):
  steward minimums for spam, safety reports, plagiarism review, block/mute,
  batch review, and an auditable private case/event model.
- Recorded 15.14 and 15.15 as design-complete decisions in
  `docs/decisions/open-questions.md`, while retaining the implementation and
  policy work they intentionally do not decide.

### Record owner decisions and update repository governance (Task #69)

Propagated ten explicit owner decisions from the PRD Build Directive v1
(Jamie Hill, 2026-08-19) into the repository's governance documents.

**Decisions recorded in `docs/decisions/open-questions.md`:**

- 15.1 — One GitHub repository per storyworld; new worlds created from a
  Storyworld Kit template.
- 15.2 — App-native identity with optional GitHub OAuth link is sufficient for
  Stage 0–1; full contributor identity model is Stage 2/3 work.
- 15.3 — `artifacts/web` is the canonical Author App integration candidate;
  `mockup-sandbox` stays a sandbox.
- 15.4 — Root `LICENSE` file added: proprietary, all rights reserved,
  placeholder pending a further explicit decision.
- 15.5 — `content/pilot-storyworld/` is the single authorized location for
  real creative source material in Stage 0–1.
- 15.6 — Migrate to a GitHub App; current PAT is acceptable for the private
  pilot but is scheduled tech debt within Stage 1.
- 15.11 — Six-state proposal model locked; four-state documentation is stale.
- 15.12 — No capsules database table; GitHub Issues with `capsule:*` labels
  are the canonical capsule store.
- 15.14 — Consent ladder: design only in this phase, not enforcement.
- 15.15 — Moderation tooling: design only in this phase, not enforcement.

**`AGENTS.md` updated:**

- ADR-0003 "Known gaps" entry replaced with a confirmed architecture-direction
  section recording the custom Express/Postgres/Replit backend as the decided
  direction ("GitHub holds / Replit executes").
- License line updated to reflect the new root `LICENSE` file.
- Open questions section updated to reflect newly decided and still-open items.

**New files:**

- `LICENSE` — proprietary/all-rights-reserved placeholder (decision 15.4).
- `content/pilot-storyworld/README.md` — boundary declaration for authorized
  pilot creative source material (decision 15.5).
- `CHANGELOG.md` — this file; initialized for the project.
