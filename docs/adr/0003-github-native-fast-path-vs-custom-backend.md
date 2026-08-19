# ADR-0003: GitHub-Native Fast Path vs. Custom Backend

## Status

**Open.** This is a documented tension, not yet a reconciled decision. It needs a call from the project owner. See "Update" below: the tension is no longer undocumented, but it is also not yet resolved.

## Context

The earliest architecture concept for this project, from the same August 16, 2026 planning thread that produced the naming and vocabulary decisions, was a deliberately fast prototype path:

> A custom single-page web application, hosted on GitHub Pages, using the GitHub repository itself as the plumbing for story check-in/check-out: pull requests as proposed canon, GitHub Actions validating structure and rebuilding the public reading view. Caveat: never put write tokens in a static page. Start by routing contributors into normal PR flow; later add a small trusted service or GitHub App to create PRs with proper scoped permissions.

The goal of that shape was speed and thinness: let GitHub's own version-control and review machinery *be* the backend, and spend engineering effort only on the plain-language skin described in ADR-0001, not on a parallel data layer.

What the repository actually contains today (`AGENTS.md`, `replit.md`) is a pnpm/TypeScript monorepo with an Express 5 API server, a PostgreSQL database via Drizzle ORM, Zod validation, Orval-generated API clients, and an esbuild deployment, developed on Replit, with every commit auto-pushed to GitHub via a PAT-backed `post-commit` hook. That is a custom backend-and-database architecture, not "GitHub's PR/Actions machinery is the backend."

This is not a violation of the original security caveat. The PAT lives server-side in a Replit secret, read only through `scripts/git-askpass.sh`, and is never exposed to a static page. But it is a materially different architecture from the one that was scoped as the "go fast" prototype.

## Update: this is no longer undocumented

Since this ADR was written, `docs/platform-requirements.md` (386 lines) was added as the authoritative design baseline, and it builds entirely on the custom-backend direction: an `Octokit` client, a Postgres `contributions` table, a full contributor-submission state machine (Section 7.3), and an explicit recommendation in Section 6.1 to move from PAT auth to a **GitHub App** for the platform's own read/write integration, keeping the current PAT only for the workspace's own outbound push. `docs/decisions/open-questions.md` tracks the specific unresolved levers this ADR's broader question actually depends on: **15.1** (one repository per storyworld or many storyworlds per repository), **15.2** (platform-native contributor identity vs. bring-your-own GitHub identity), and **15.6** (GitHub App vs. continued PAT for the platform's integration).

So the earlier claim that "nothing in the repository records why the project moved from one to the other" is no longer accurate. The reasoning is recorded, in detail, in `docs/platform-requirements.md`. What is still missing is the explicit owner sign-off: 15.1, 15.2, and 15.6 are all still logged **Open**, and platform code (auth, contributor-adjacent schema) has already been written against the direction those items imply, not against a confirmed decision. That is the actual live risk, not architectural secrecy.

## Two honest framings

**(a) Intentional supersession.** The fast path was a napkin sketch before real product requirements existed. Once accounts, agent workflows, and structured contributor/story data entered the picture, GitHub's native PR flow stopped being sufficient on its own, and a real API plus database became the right call.

**(b) Unexamined infrastructure momentum.** The Express/Postgres/Replit scaffold may simply be what Replit defaults to for a new project, adopted before the "keep it thin, let GitHub do the work" instinct from the original concept was deliberately checked against it.

The repository's own status line in `README.md` ("This repository is an early concept and prototype seed") is more consistent with (b) than with a project that has already outgrown the fast path. That is an inference, not a confirmed fact, and should not be treated as one.

`docs/platform-requirements.md` has since given framing (a) real substance: it specifies a `contributions` table, a five-state review machine, and contributor-identity options (Section 7.2) that GitHub's native PR flow genuinely cannot hold on its own. That is evidence for (a), not proof of it. The requirements document is a design proposal, not a ratified decision, and open-questions 15.1, 15.2, and 15.6 are exactly the parts of that proposal the project owner has not yet signed off on.

## Recommendation

Given the project is still explicitly at the concept/prototype-seed stage, and the original goal was to test whether people return to read and contribute before investing further (see `README.md`, "A staged model," step 4), the lower-risk default is to confirm framing (a) only where the API server is already earning its complexity: for example, contributor accounts or agent-orchestration state that GitHub genuinely cannot hold. Where the backend is standing in for what a native PR/Actions flow could still do (the read to propose to review to accept loop itself), it's worth a deliberate check before more is built on top of it.

That check is no longer abstract. Auth and contributor-adjacent schema work has already landed in the API server while 15.2 (contributor identity model) is still Open. Resolving 15.2 before more contributor-facing code is written is the concrete version of this ADR's recommendation, not a separate concern.

## Next action

This ADR should not be marked Accepted or Superseded until the project owner confirms which framing applies, or documents a third one. In practice, that confirmation now happens by resolving `docs/decisions/open-questions.md` items 15.1, 15.2, and 15.6, since those are the specific decisions `docs/platform-requirements.md` is waiting on. Once they are resolved, update this ADR's Status and record the rationale here rather than leaving it split across two documents.
