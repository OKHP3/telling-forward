# GitHub-Native Boundary Research

## Research question

Which claims in the attached “Telling Forward vs. alternatives” comparison are
confirmed by current authoritative documentation, and which GitHub-native
primitives should Telling Forward adopt without weakening its existing
hybrid-architecture, privacy, provenance, and human-stewardship constraints?

## Decision context

The repository already accepts a GitHub-canonical hybrid in ADR-0003. This
research therefore tests whether that decision should be replaced, narrowed, or
clarified. It does not authorize implementation or public launch.

## Local evidence checked

- `docs/adr/0003-github-native-fast-path-vs-custom-backend.md`
- `docs/decisions/open-questions.md`
- `docs/decisions/consent-ladder-design.md`
- `docs/decisions/moderation-tooling-design.md`
- `docs/platform-requirements.md`
- `lib/db/src/schema/telling-forward.ts`
- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/api-server/src/routes/storyworlds.ts`
- `artifacts/api-server/src/routes/webhooks.ts`
- `artifacts/api-server/src/routes/admin.ts`
- `artifacts/api-server/src/lib/provenance.ts`
- `attached_assets/Pasted--TF-Goals-vs-What-The-Alternatives-Can-Already-Sort-Of-_1787200785399.txt`

## Source ledger

Retrieved 2026-08-20. GitHub documentation is used for GitHub capability
claims; Git documentation is used for trailer behavior. Platform plan,
organization settings, and live repository configuration remain unknown until
the target installation is inspected.

| ID | Source | Publisher | Exact claim supported | Authority and limit |
|---|---|---|---|---|
| S-01 | [Understanding fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields) | GitHub Docs | Projects support custom text, number, date, single-select, iteration, issue, and pull-request-related fields | Primary product documentation; establishes field capability, not canonical story provenance |
| S-02 | [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) | GitHub Docs | CODEOWNERS identifies responsible people/teams and required code-owner approval can be enabled by repository administrators/owners | Primary documentation; does not define moderation, rights, or storyworld policy |
| S-03 | [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | GitHub Docs | Protected branches can require reviews and status checks and restrict deletion/force-push; administrators may have bypass behavior unless configured otherwise | Primary documentation; exact behavior depends on repository settings and plan |
| S-04 | [Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) | GitHub Docs | Installation access tokens are scoped to an installation and expire after one hour | Primary documentation; confirms the direction in open question 15.6 |
| S-05 | [Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) | GitHub Docs | Actions workflows can respond to pull-request, review, issue, and related events; fork-triggered workflows have secret and execution-context constraints | Primary documentation; automation is not a complete authorization model |
| S-06 | [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) | GitHub Docs | Pages can publish from a branch or Actions workflow and published sites are public on the internet even when the repository is private where the plan allows it | Primary documentation; makes Pages suitable only for intentionally public editions |
| S-07 | [Get a commit](https://docs.github.com/en/rest/commits/commits#get-a-commit) | GitHub Docs | GitHub's commit representation includes author and committer metadata and the commit SHA | Primary API documentation; metadata is durable when tied to a reachable commit, but does not itself encode all editorial or rights context |
| S-08 | [git-interpret-trailers](https://git-scm.com/docs/git-interpret-trailers) | Git project | Git trailers are structured key/value lines in commit messages that tooling can interpret | Primary Git documentation; trailers are metadata conventions, not signatures by themselves |

## Claim-to-source mapping

| Claim from comparison | Result | Evidence | Architecture implication |
|---|---|---|---|
| Projects v2 supports typed custom fields | Confirmed | S-01 | A native `Canon Status` mirror is feasible, but it is metadata and cannot replace the product state machine |
| CODEOWNERS and branch protection can gate review/merge | Confirmed with limits | S-02, S-03 | Use as defense in depth; keep application steward authority and moderation controls |
| GitHub Apps offer scoped, short-lived installation tokens | Confirmed | S-04 | Keep GitHub App migration as Stage 1 tech debt and do not confuse workspace PAT auto-push with platform identity |
| Actions can implement event-driven automation | Confirmed with security limits | S-05 | Use for validation, projections, and reconciliation aids; keep human authorization and secret boundaries explicit |
| Pages can publish a branch or Actions-built site | Confirmed with privacy limit | S-06 | Optional public editions only; not the primary reader authorization layer |
| Commit history provides author/committer and SHA identity | Confirmed | S-07 | Keep GitHub-native identities in all indexed records; do not treat raw author metadata as complete contributor attribution |
| Commit trailers can carry structured attribution/provenance fields | Confirmed as a Git mechanism | S-08 | Use trailers as supplemental recoverable metadata; retain signed acceptance records and actual merge-parent checks |
| AO3 provides useful taxonomy/orphaning analogies | Unverified in this research | Attached comparison only | Borrow design patterns only after separate source and owner review; not an architecture basis |
| Voice can be reduced to an Issue comment | Rejected as a product inference | Local routes and write-path contract | Voice capture needs private recording/transcription/correction/retry and approved durable writing through the API |
| GitHub native primitives solve the full Telling Forward product | Rejected | S-01 through S-08 plus local safety designs | Native substrate does not supply plain-language UX, private consent, moderation, recovery, or account-aware permissions |

## Responsibility classification

| Area | Classification | Rationale |
|---|---|---|
| Creative content, branches, commits, PRs, reviews | Mirror with GitHub as source of truth | Durable creative and editorial history belongs in GitHub |
| Capsule Issues and type labels | Move canonical storage to GitHub-native primitive | Already implemented as Issues; the API remains the product projection |
| Capsule validation and drift checks | Move selected validation to GitHub-native Actions later | Required checks can catch malformed labels; they cannot replace the API's prose UX |
| Proposal lifecycle and contributor status | Keep custom API/database layer; mirror native events | Product states include rights-sensitive and local terminal outcomes beyond PR metadata |
| Steward authority | Keep custom layer plus native branch controls | CODEOWNERS does not cover moderation, consent, or product permissions |
| Provenance | Mirror with GitHub as source of truth | Signed acceptance records and merge parent ranges must be recoverable; PostgreSQL indexes them |
| Notifications | Keep custom layer; consume GitHub events | Product language and account-aware delivery are not native GitHub notification semantics |
| Voice ingestion | Keep custom API/database workflow | Privacy, correction, typed fallback, idempotency, and approval require the product layer |
| Reader rendering | Keep custom reader; optionally publish public editions through Pages | Pages cannot safely represent private or restricted reader behavior |
| Consent and moderation | Keep custom private control plane | These are not creative GitHub metadata and must not expose sensitive evidence |
| PostgreSQL | Keep as rebuildable index | Joins, cached reads, sessions, and private controls need it; it must not become the creative source |
| Monetization | Defer | The comparison correctly identifies a later product/legal decision, not a current architectural requirement |

## Uncertainty register

- **U-01:** The target GitHub organization plan and repository settings were not
  inspected. CODEOWNERS, branch protection, Projects, and Pages availability
  must be verified in the pilot repository before implementation.
- **U-02:** No live GitHub App installation or repository rebuild was exercised.
- **U-03:** GitHub Actions security depends on event type, fork status, workflow
  permissions, and secrets configuration.
- **U-04:** AO3 and Patreon/Substack comparisons were not used as authoritative
  architecture evidence in this decision.
- **U-05:** Open questions 15.7, 15.10, and 15.13 remain open and cannot be
  resolved by native GitHub capability.

## Implications and next action

The attached comparison should change the project's implementation posture, not
its source-of-truth decision: avoid duplicating GitHub's durable collaboration
mechanics, but do not delete the application layer that makes the product safe
and usable.

**Recommended next action:** execute the existing GitHub rebuild and external
acceptance evidence tasks before authorizing any native-status or Storyworld Kit
migration. A native primitive should graduate only when it passes the
rebuild, state-parity, safety, reader, and user gates in ADR-0013.