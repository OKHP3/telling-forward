# ADR-0003: GitHub-Native Fast Path vs. Custom Backend

## Status

**Open.** This is a documented tension, not yet a reconciled decision. It needs a call from the project owner.

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

## Recommendation

Given the project is still explicitly at the concept/prototype-seed stage, and the original goal was to test whether people return to read and contribute before investing further (see `README.md`, "A staged model," step 4), the lower-risk default is to confirm framing (a) only where the API server is already earning its complexity: for example, contributor accounts or agent-orchestration state that GitHub genuinely cannot hold. Where the backend is standing in for what a native PR/Actions flow could still do (the read to propose to review to accept loop itself), it's worth a deliberate check before more is built on top of it.

## Next action

This ADR should not be marked Accepted or Superseded until the project owner confirms which framing applies, or documents a third one. Once confirmed, update this ADR's Status and record the rationale here rather than leaving it in conversation only.
