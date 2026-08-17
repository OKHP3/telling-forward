# AGENTS.md

## Project identity

- **Project:** Telling Forward
- **Repository:** `telling-forward`
- **Suite:** OverKill Hill P3
- **Repository type:** pnpm/TypeScript monorepo (Replit-hosted, Node 24) for a collaborative storytelling platform prototype
- **GitHub:** https://github.com/OKHP3/telling-forward
- **License:** No code license file confirmed at the repository root. Story and content rights are governed separately by `CONTENT-LICENSE.md`.

## Purpose and status

**Confirmed:** Telling Forward is a voice-first, agent-assisted collaborative storytelling platform. It helps people contribute characters, story arcs, memories, and possibilities through conversation, then turns those contributions into readable, attributable works. The larger idea is open-canon collaborative fiction: an originating author can open a storyworld, other people can extend it through distinct paths, and readers can follow the resulting narrative lineage without confusing a community branch with the author's canon.

**Confirmed:** This repository is an early concept and prototype seed. The product model, contribution rules, agent skills, and content governance are expected to evolve through documented experiments (see `README.md`, "Repository status").

**Confirmed:** The checkout contains a working pnpm/TypeScript monorepo (API server, shared libraries, database layer) alongside product and mission documentation. It is not a documentation-only repository.

Treat the project as active platform development plus content governance work. Update this guide with evidence as the implementation matures.

## Scope and boundaries

In scope:

- The Telling Forward API server, shared libraries, and database layer under `artifacts/` and `lib/`.
- Product, mission, and contribution-governance documentation under `docs/`, `README.md`, `CONTRIBUTING.md`, and `CONTENT-LICENSE.md`.
- Repository-local Agent Skills and prompts under `.agents/` that support project work.
- Replit workspace and GitHub-sync tooling under `scripts/` and `.replit`.

Out of scope for the current repository:

- Treating any story, draft, or storyworld material as reusable simply because it appears in this repository. See `CONTENT-LICENSE.md`.
- Promising royalties, canon selection, or adaptation rights to a contributor without a separate written agreement (see `CONTRIBUTING.md`).
- Accepting unpublished third-party fiction or personal material without confirmed rights to share it.
- Secrets, credentials, tokens, or personal machine paths in tracked files. The GitHub auto-push flow depends on the `GITHUB_PAT` Replit secret and must never have that token committed.

## Repository structure

- `README.md`: project overview, mission summary, and document map.
- `CONTRIBUTING.md`: contribution model, story-submission requirements, and public-facing review language.
- `CONTENT-LICENSE.md`: default story and content rights, separate from platform code.
- `docs/MISSION.md`: mission statement and working principles.
- `docs/platform-requirements.md`: platform requirements baseline (GitHub-backed community storytelling interface); the authoritative design intent for the platform build.
- `docs/decisions/open-questions.md`: open decisions log tracking the unresolved questions from the requirements doc, Section 15, with status and owner decisions.
- `docs/adr/`: Architecture Decision Records capturing naming, contributor vocabulary, the notification model, and open architecture questions. Read before making naming, vocabulary, notification, or backend-architecture changes.
- `lib/`: shared workspace packages — `api-client-react`, `api-spec`, `api-zod`, `db`.
- `artifacts/`: deployable/buildable packages — `api-server`, `mockup-sandbox`.
- `attached_assets/`: uploaded creative source material (e.g. Magnus Saga documents). Confirm the intended public/private content boundary before publication work touches this directory.
- `scripts/`: Replit tooling — `git-askpass.sh` (GitHub auto-push auth helper), `post-merge.sh`, plus its own `package.json`/`tsconfig.json`/`src`.
- `.agents/`: repository-local Agent Skills and prompts used to support project work.
- `.agents/skills/`: repository-local agent skills and their supporting references. These have their own skill-specific instructions.
- `skills/`: publication mirror for selected repository-local skills. The active source remains under `.agents/skills/`.
- `.replit`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `tsconfig.json`: Replit and pnpm-workspace configuration.
- `CLAUDE.md`: compatibility pointer to this file.

There are no nested project roots or nested agent guidance files in the current checkout.

## Documented architecture

The repository documents this stack (see `replit.md`):

1. pnpm workspaces manage the monorepo; each package manages its own dependencies.
2. An Express 5 API server (`artifacts/api-server`) is the backend surface.
3. PostgreSQL with Drizzle ORM is the data layer (`lib/db`).
4. Zod (`zod/v4`) and `drizzle-zod` provide validation; Orval generates API hooks and Zod schemas from an OpenAPI spec (`lib/api-spec`).
5. esbuild produces a CJS bundle for deployment.
6. Every commit made in Replit auto-pushes to `github.com/OKHP3/telling-forward` via a `post-commit` hook that is not tracked by git and must be re-created after a fresh clone (see `replit.md` for the exact script).

## Technology and environments

- Node.js 24, pnpm workspaces, TypeScript 5.9.
- Express 5 for the API framework.
- PostgreSQL + Drizzle ORM for the database.
- Zod (`zod/v4`) and `drizzle-zod` for validation.
- Orval for API codegen from an OpenAPI spec.
- esbuild for the CJS build.
- Replit as the hosting/workspace environment, with autoscale deployment (`.replit`).

## Validation and working commands

- `pnpm run typecheck` — full typecheck across all packages.
- `pnpm run build` — typecheck + build all packages.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec.
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only).
- `pnpm --filter @workspace/api-server run dev` — run the API server locally.
- Run `git diff --check` before handoff.
- Inspect the final diff and preserve unrelated user changes.

Do not claim a command was executed unless it was actually run in a suitable environment.

## Content, security, and operational conventions

- Use plain-language terms on public-facing surfaces (`story seed`, `path`, `branch`, `proposed canon`, `alternate continuity`) per `README.md`; Git terminology (branch, commit, pull request, review) may remain backstage implementation. Full vocabulary table and contributor-facing notification states: `docs/adr/0001-product-naming-and-vocabulary.md` and `docs/adr/0002-contributor-notification-model.md`.
- Distinguish personal work, open path, proposed canon, and published alternate path per `CONTRIBUTING.md` when handling story submissions or contribution tooling.
- Do not present repository visibility as reuse permission. Point to `CONTENT-LICENSE.md` for the current default.
- Preserve standalone punchy lines. Do not consolidate them into paragraphs.
- Do not use em dashes in generated content.
- Follow the OverKill Hill P3 ROY principle: explanation should earn its space.
- AutoCAD version is R10 when that unrelated brand rule is applicable.
- Label claims as confirmed, inferred, or unknown when evidence matters.
- Never add credentials, tokens, private URLs, or personal machine paths to tracked files. The `GITHUB_PAT` Replit secret must only ever be read via `scripts/git-askpass.sh`, never embedded in git config, files, or process arguments.
- Because commits auto-push to GitHub via the post-commit hook, treat every commit as effectively public immediately.

## Safe change procedure

1. Read `README.md`, `CONTRIBUTING.md`, `CONTENT-LICENSE.md`, `docs/MISSION.md`, and this guide before editing.
2. Check repository status and preserve existing changes.
3. Make the smallest change that addresses the request.
4. For code changes, run `pnpm run typecheck` and `pnpm run build` before handoff.
5. Update stale claims instead of extending them with unsupported assumptions.
6. Re-read every changed file, verify links and referenced paths, run `git diff --check`, and inspect the diff.
7. Remember commits auto-push to GitHub on the current branch; be deliberate about what gets committed.
8. Update this guide when the repository's architecture, governance model, or project boundary changes.

## Known gaps and open questions

- **Open (see `docs/adr/0003-github-native-fast-path-vs-custom-backend.md`):** the original concept scoped a GitHub-native fast path (GitHub Pages SPA, PRs and Actions as the backend). The repository instead contains a custom Express/Postgres API on Replit. This is not a security problem, but the reason for the divergence is not yet recorded. Do not assume either architecture is "correct" until the project owner confirms.
- The product model, contribution rules, agent skills, and content governance described in `README.md` and `CONTRIBUTING.md` are explicitly still evolving, not finalized features.
- No code license file is confirmed at the repository root; only content/story licensing is documented (`CONTENT-LICENSE.md`). Confirm the intended code license with the project owner if this matters for a task.
- `attached_assets/` contains creative source material whose relationship to the platform's public/private content boundary is not yet documented; confirm before treating it as either product fixture or protected fiction.
- Ownership and maintenance responsibilities beyond the `OKHP3` GitHub org are not documented in the repository.

Do not turn these gaps into assumptions. Record verified decisions here when the project owner establishes them.

Keep this file aligned with the repository as it changes. It is the canonical project guide; `CLAUDE.md` should remain a short compatibility pointer unless Claude-specific instructions are genuinely required.
