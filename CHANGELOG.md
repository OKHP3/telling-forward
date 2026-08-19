# Changelog

All notable changes to Telling Forward are recorded here.

Format: plain dated entries per task or meaningful change, newest first.

---

## 2026-08-19

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
