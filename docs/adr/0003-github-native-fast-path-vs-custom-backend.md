# ADR-0003: GitHub-Native Fast Path vs. Custom Backend

## Status

**Accepted — GitHub-canonical hybrid (2026-08-19).**

## Context

The earliest architecture concept for this project, from the same August 16, 2026 planning thread that produced the naming and vocabulary decisions, was a deliberately fast prototype path:

> A custom single-page web application, hosted on GitHub Pages, using the GitHub repository itself as the plumbing for story check-in/check-out: pull requests as proposed canon, GitHub Actions validating structure and rebuilding the public reading view. Caveat: never put write tokens in a static page. Start by routing contributors into normal PR flow; later add a small trusted service or GitHub App to create PRs with proper scoped permissions.

The goal of that shape was speed and thinness: let GitHub's own version-control and review machinery *be* the backend, and spend engineering effort only on the plain-language skin described in ADR-0001, not on a parallel data layer.

What the repository actually contains today (`AGENTS.md`, `replit.md`) is a pnpm/TypeScript monorepo with an Express 5 API server, a PostgreSQL database via Drizzle ORM, Zod validation, Orval-generated API clients, and an esbuild deployment, developed on Replit, with every commit auto-pushed to GitHub via a PAT-backed `post-commit` hook. That is a custom backend-and-database architecture, not "GitHub's PR/Actions machinery is the backend."

This is not a violation of the original security caveat. The PAT lives server-side in a Replit secret, read only through `scripts/git-askpass.sh`, and is never exposed to a static page. But it is a materially different architecture from the one that was scoped as the "go fast" prototype, and nothing in the repository currently records why the project moved from one to the other.

## Two honest framings

**(a) Intentional supersession.** The fast path was a napkin sketch before real product requirements existed. Once accounts, agent workflows, and structured contributor/story data entered the picture, GitHub's native PR flow stopped being sufficient on its own, and a real API plus database became the right call.

**(b) Unexamined infrastructure momentum.** The Express/Postgres/Replit scaffold may simply be what Replit defaults to for a new project, adopted before the "keep it thin, let GitHub do the work" instinct from the original concept was deliberately checked against it.

The repository's own status line in `README.md` ("This repository is an early concept and prototype seed") is more consistent with (b) than with a project that has already outgrown the fast path. That is an inference, not a confirmed fact, and should not be treated as one.

## Decision

The project adopts framing **(a), intentional supersession**, with an explicit
constraint that preserves the original "GitHub holds / Replit executes"
principle:

- GitHub is the durable record for story content, contribution authorship,
  editorial review, and the decision to accept a contribution into canon.
- The Replit API provides trusted actions, account-aware permissions, and a
  reader-friendly language layer. It must not become the only record of a
  contributor's work or a steward's decision.
- PostgreSQL is a rebuildable index. Local serial IDs improve joins and
  presentation but are never sufficient provenance on their own; records must
  retain their GitHub-native identity alongside them.

This makes the API/database architecture a deliberately narrow support layer,
not a replacement backend for the collaborative editorial record.

## Rationale

The platform now needs trusted server-side actions and account-aware
permissions, neither of which should be embedded in a static page. GitHub
already provides the durable collaboration history needed for stories: a
contribution's author, its saved moments, editor questions, and the merged
decision. Keeping that history canonical avoids a second, lossy ledger while
the API translates it into the product vocabulary readers and stewards use.

## Guardrails

- Any new indexed story record must name its durable GitHub source and be
  recoverable by reconciliation.
- A reconciliation must replay paths, saved moments, proposals, editor
  questions, and accepted-contribution provenance without needing a prior
  database snapshot.
- Reader-facing interfaces describe lineage in story language ("accepted into
  canon," contributor, steward, and date), not implementation mechanics.
- A future move to a GitHub App may replace the prototype PAT at the client
  factory boundary; it does not alter this source-of-truth decision.

## Superseded recommendation

This decision resolves the previous request for owner confirmation. The
reconciliation/provenance implementation that follows is governed by the
guardrails above.
