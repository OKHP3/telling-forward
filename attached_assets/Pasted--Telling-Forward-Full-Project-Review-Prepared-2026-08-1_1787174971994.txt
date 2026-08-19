# Telling Forward — Full Project Review
*Prepared 2026-08-19*

## Executive Summary

- Telling Forward is a GitHub-native, voice-first collaborative fiction platform. An author opens a "storyworld," contributors extend it on permissioned branches ("story paths"), and readers can tell canon from community alternates. Mission: "authorship can be accessible without becoming anonymous, and collaboration can be open without making ownership unclear."
- Domain model maps cleanly to Git primitives: storyworld = repo, story path = branch, contribution = commit, proposal = PR (six-state), capsule = GitHub Issue. No `capsules` DB table exists by design; Issues are the store.
- Stack is real and coherent: Express 5 + Postgres/Drizzle + Zod/Orval-generated types, React 19/Vite 7/Tailwind v4/shadcn frontends, OpenAI audio/image/batch integrations, Octokit for GitHub, deployed via Replit with auto-push to `github.com/OKHP3/telling-forward`.
- What's actually built: auth (register/login/OAuth/lockout/reset), full storyworld/path/proposal schema, capsule CRUD against GitHub Issues with tested authorization boundaries, a working `/transcribe` endpoint, a manuscript-ingestion pipeline (DOCX/EPUB/PDF), and a smoke-tested MCP server. Six frontend app scaffolds exist but share one design system and none is confirmed as "the" production app.
- 11 of 12 ADRs are still **Open**, not Accepted. The single biggest unresolved risk (per `AGENTS.md` itself) is ADR-0003: whether the custom Express/Postgres backend is an intentional pivot from the original GitHub-Pages-native concept, or scope creep nobody signed off on. Code is already being written against a direction that isn't formally decided.
- Today's dated review (`docs/reviews/2026-08-19-dream-platform-equilibrium-review.md`) is the closest thing to an official state-of-the-project verdict: **"Approve with limits for controlled Stage 0 discovery and bounded Stage 1 design."** Explicitly not approved: real untrusted uploads, public contribution, derivative transformation of someone else's material, commercial activity, rights-sensitive publication. No live deployment, legal review, security test, restoration drill, or user study has been run.
- Repo is very active (last commit today, clean tree, in sync with origin) but is self-described as "an early concept and prototype seed," not a shippable product.

---

## What It Can and Can't Do

| Capability | Status | Evidence |
|---|---|---|
| User auth (register/login/logout/session, GitHub OAuth, lockout, password reset, email verify) | **Built** | `artifacts/api-server` routes + tests |
| Storyworld / path / proposal / provenance schema | **Built** | `lib/db/src/schema/telling-forward.ts` — 8 tables |
| Capsule CRUD as GitHub Issues, with boundary enforcement | **Built** | `storyworlds.ts` + `capsule-boundary.test.ts` |
| Voice transcription w/ per-user rate limiting | **Built** | OpenAI audio integration, `/transcribe` |
| Manuscript ingestion (DOCX/EPUB/PDF → scenes → draft capsules) | **Built, untested against real model weights** | `.github/scripts/ingestion`, Phi-4-mini never actually run |
| MCP server (bring-your-own-AI tier) | **Built, smoke-tested** | 3 tools, real MCP client test |
| Capsule promote / disrupt / invert business logic | **Stub only** | OpenAPI defines it; no backend logic beyond the stub |
| Notifications | **Not built** | ADR-0002 states explicitly: no notification system exists |
| GitHub webhook sync/reconciliation | **Not built** | Flagged in platform-requirements.md as net-new work |
| Steward moderation tooling | **Not built** | Blocking prerequisite per ADR-0008 |
| Concept Board UI | **Not built** | Design-brief only, "no implementation footprint" |
| Reader App / theme catalog | **Not built** | Design-brief only (v1–v4) |
| GitHub App identity | **Not built** | Still PAT-based auth to GitHub |
| Restriction/withdrawal/archive lifecycle for proposals | **Not designed** | Equilibrium review flags this as a gap: canon-vs-alternate doesn't cover every outcome |
| Per-action consent for AI-derivative work (CIE/PIE) | **Not designed** | Equilibrium review: generic AI-assist consent does NOT cover this; rejected as insufficient |
| Untrusted public uploads | **Blocked** | No security test, no contract tested |
| Export / portability | **Blocked** | Never tested |

---

## Potential Use Cases

- **Serialized fiction with a governed canon**: an author runs a storyworld like an open-source repo, accepting or rejecting reader-contributed scenes via PR review, with GitHub doing the heavy lifting on history/branching/attribution.
- **Fan-fiction-adjacent but IP-safe collaborative worlds**: since canon acceptance is explicit and gated by a steward, this sidesteps the usual "who owns what" mess of fandom platforms, so long as consent/rights-lifecycle work (currently missing) gets done first.
- **Voice-first drafting for authors**: transcription + agent-assisted capture already works end to end, useful as a personal writing tool even before the collaborative layer matures.
- **Manuscript-to-structured-world conversion**: the ingestion pipeline is a legitimate standalone capability. Point it at an existing manuscript and get scenes/capsules out, independent of whether the collaborative platform ships.
- **Workshop / writers'-room tool**: Concept Board (capsules as GitHub Issues/Project board) is designed for non-linear worldbuilding capture, which could work as an internal tool for a small writing team even without a public reader-facing product.
- **Reference implementation for "GitHub as a CMS" pattern**: the architecture itself (repo as system of record, app as thin interface layer) is a reusable pattern worth extracting regardless of what happens to the fiction product.

None of these are ready for public/untrusted use today. All are currently gated behind Stage 0/1 decisions.

---

## Key ADR Decisions (12 total, 11 Open)

| ADR | Topic | Status |
|---|---|---|
| 0001 | Product naming & vocabulary (repo→storyworld, branch→path, commit→saved moment, PR→submit scene, merge→canon) | **Accepted** |
| 0002 | Two-tier contributor notification model | Open, unbuilt |
| 0003 | GitHub-native fast path vs. custom backend | **Open — highest-risk unresolved item** |
| 0004 | Manuscript ingestion / bring-your-own-AI tiers | Open, partially prototyped |
| 0005 | Reader state & provenance signals | Open, 5 separable sub-decisions |
| 0006 | Canon governance concepts | Open, blocked on nonexistent capsules table |
| 0007 | Reader accessibility & clarity | Open, 5 sub-decisions |
| 0008 | Reader consent & contribution model | Open, 7 sub-decisions, includes blocking prerequisites |
| 0009 | Transformation fidelity / readability assist | Open, overlaps 0007 |
| 0010 | Content ops & governance (provenance schema, "Canon as Code") | Open |
| 0011 | Provenance/process artifacts, market positioning reframe | Open |
| 0012 | Scene-purpose framing at "Promote to scene" | Open |

---

## What's Left (Roadmap Reality Check)

`docs/product/attainable-delivery-roadmap.md` sequences 9 stages under a "build complete promises, not disconnected screens" rule. Current codebase sits at roughly early Stage 1/2 groundwork (auth, schema, capsule CRUD) without Stage 0's safety rails formally closed.

1. **Stage 0** — Decision/safety rails: resolve blocking open questions, define rights/consent + restriction/withdrawal lifecycle, define untrusted-upload boundary, pick one pilot storyworld. **Not done.**
2. **Stage 1** — Private Writer's Workbench + deployable Storyworld Kit (template repo, Concept Board, rules-only ingestion, basic reader edition, export). **Partially started, no Concept Board UI.**
3. **Stage 2** — Contributor draft-to-submission loop, identity model, full reader view. **Schema exists, flows don't.**
4. **Stage 3** — Steward review, provenance, alternate publication, notifications. **Not started.**
5. **Stage 4** — Voice + bounded AI assistance, cost controls. **Transcription works; rest not started.**
6. **Stage 5** — Govern derivative CIE/PIE work, per-action consent, revocation/lineage. **Not started — explicitly rejected as unsafe to skip.**
7. **Stage 6–7** — Expand kit types, reader depth, discovery/community. **Not started.**
8. **Stage 8** — Commercial/adaptation programs. **Explicitly out of scope for now — later legal/business track.**

The 15 open questions in `docs/decisions/open-questions.md` are the actual gating list. Most consequential: repo-per-storyworld convention (15.1), contributor identity model (15.2, blocks the `contributors` table), GitHub App vs. PAT (15.6), which frontend is production (15.3), no code license at repo root (15.4), consent ladder + moderation tooling (15.14/15.15 — both explicit blocking prerequisites for any public contribution surface).

---

## Recommendation

Don't build forward on Stage 1+ features until ADR-0003 gets a real answer. Right now there's schema and auth code committed against an architecture direction (custom backend) that was never formally chosen over the original GitHub-native-only concept. That's the kind of thing that's cheap to fix now and expensive to fix after six more stages of code depend on it.

Sequence: close ADR-0003 first (it's a one-person decision, not a design exercise), then knock out the open questions that block schema work (15.1, 15.2, 15.6), then do the consent/rights-lifecycle design work the equilibrium review flagged as missing before touching anything public-facing. The manuscript-ingestion pipeline and MCP server are solid enough to demo or use standalone right now, independent of the rest.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Architecture direction (ADR-0003) stays unresolved while more code gets written against it | Force a decision now; it's owner-level, not technical |
| Public contribution ships before consent/moderation gates (ADR-0008 items) are built | Equilibrium review already blocks this explicitly; hold the line |
| AI-derivative transforms (CIE/PIE) get treated as covered by generic AI-assist consent | Rejected outcome already documented; needs its own per-action consent design before any Stage 4/5 work |
| Six parallel frontend scaffolds create maintenance drag with no clear "production" one | Resolve open question 15.3 before adding a 7th |
| Untrusted uploads get tested against real users before security/restore testing | Equilibrium review already blocks; don't skip the gate |

---

## Next Actions

- [ ] Get an owner decision on ADR-0003 (custom backend: intentional or drift?)
- [ ] Resolve open questions 15.1, 15.2, 15.6 (repo topology, contributor identity, GitHub App vs. PAT)
- [ ] Design the restriction/withdrawal/archive lifecycle for proposals (currently missing per equilibrium review)
- [ ] Design per-action consent for CIE/PIE derivative work before any Stage 4/5 build
- [ ] Pick one pilot storyworld to build Stage 1 against, per the roadmap's own instruction
- [ ] Decide which of the six `artifacts/` frontends is production and archive/label the rest
