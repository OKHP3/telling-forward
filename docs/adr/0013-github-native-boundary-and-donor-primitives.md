# ADR-0013: GitHub-Native Boundary and Donor Primitives

## Status

**Accepted - clarifies ADR-0003 (2026-08-20).**

## Decision

Telling Forward will keep the **GitHub-canonical hybrid** architecture from
ADR-0003. GitHub is the durable source for creative content, Git history,
contribution authorship, editorial review evidence, and canon decisions.
PostgreSQL remains a rebuildable application index. The Replit API remains a
deliberately narrow support layer for trusted actions, account-aware
permissions, private control-plane records, plain-language product vocabulary,
and reader/contributor experiences.

GitHub-native primitives are adopted as donor and defense-in-depth mechanisms,
not as a wholesale replacement for the product layer:

- GitHub Issues and labels remain the canonical capsule store.
- Pull requests, reviews, commits, and webhooks remain the durable editorial
  events that the application projects into story language.
- Projects custom fields, Actions, CODEOWNERS, branch protection, and native
  notifications may be added as derived views or enforcement aids when their
  limits are understood.
- A GitHub App remains the target platform service identity. The existing PAT
  is acceptable only for the single private pilot and workspace auto-push
  boundary.
- The application proposal state machine remains authoritative for contributor
  status and product actions. A Project field may mirror it; it does not replace
  the application state or rights controls.
- The private consent and moderation control planes remain application-owned.
  They must not be placed in public Issues, pull requests, commit messages, or
  labels.

The Storyworld Kit baseline is checked in at `content/pilot-storyworld/`.
It standardizes the capsule labels, issue forms, contribution and canon
policies, provenance convention, CODEOWNERS template, and structural-only
validation Action for each new private pilot repository. The Action validates
the shape of the contract with read-only contents permission; it cannot make
editorial, rights, moderation, or publication decisions.

This decision rejects both extremes:

1. **GitHub-only application:** rejected as insufficient for private controls,
   contributor-friendly status, account/session permissions, moderation,
   consent, recovery, and reader behavior.
2. **PostgreSQL-authoritative application:** rejected because it would make
   creative history, attribution, and canon decisions dependent on a
   non-canonical cache that cannot independently recover the story.

## Context

The attached comparison identifies GitHub as a partial fit for governed
co-creation, capsules, provenance, extensibility, and notifications; AO3 as a
design donor for taxonomy and preservation patterns; and no existing platform
as a complete fit for voice-first contribution or source-specific CIE/PIE
consent.

The comparison is directionally useful but overstates several conclusions. A
typed Project field is not the same thing as a product state machine. CODEOWNERS
and branch protection gate merges, but do not define moderation or rights
policy. Actions are automation with their own secret and fork security
boundaries. GitHub Pages is a public publishing mechanism, not a general
reader authorization layer. Commit trailers are durable metadata when included
in a reachable commit, but are not a signature or a substitute for a signed
acceptance record.

The current repository already implements the core hybrid: storyworlds, paths,
contributions, proposals, editor questions, stewards, contributors, and
provenance records are indexed in PostgreSQL with GitHub-native identifiers;
GitHub reads/writes, webhook handling, reconciliation, plain-language clients,
and proposal safeguards exist in the checkout. The application must therefore
be thinned deliberately, not rewritten reflexively.

## Responsibility boundary

| Responsibility | Decision | GitHub-native role | Why the application remains |
|---|---|---|---|
| Proposal lifecycle | Keep custom state machine; mirror where useful | PR/review/merge events and optional Project `Canon Status` field | `restricted`, `withdrawn`, `archived`, contributor-facing reasons, recovery, and rights boundaries are not equivalent to PR state |
| Capsule taxonomy | GitHub-native source with application projection | Issues, labels, optional typed Project fields, future required checks | The API gives prose UX, canonical vocabulary, filtering, permissions, and recovery without exposing GitHub mechanics |
| Provenance | GitHub-recoverable signed record plus indexed projection | Commit SHA, PR/review history, trailers or committed metadata | Acceptance records bind steward intent, actual merge parents, attribution, and recovery; a mutable Project field or unsigned note is insufficient |
| Steward authority | Defense in depth | CODEOWNERS, branch protection, required reviews/status checks | Application steward membership controls product actions, moderation authority, and availability independent of a live permissions call |
| Notifications | Keep product notification layer | Webhook, review request, mention, watch, and status events as inputs | Contributors need calm, plain-language, account-aware status and notification semantics |
| Voice ingestion | Keep custom API path | GitHub receives the approved durable text commit | Recording, transcription, correction, privacy, typed fallback, retry/idempotency, and approval do not belong in a raw Issue comment |
| Reader rendering | Keep reader application and API | GitHub provides source content and optional public-edition build trigger | Reader recovery, themes, attribution, restricted content, and non-Git vocabulary need product logic; Pages is public by nature |
| Consent | Keep private application control plane | Optional future required check after authorization is proven | Consent is per contributor, action, scope, resource, and policy version; GitHub metadata is not an adequate private rights ledger |
| Moderation | Keep private application control plane | GitHub events can trigger a case or visibility projection | Safety evidence, reporter privacy, block/mute scope, appeals, and audit records must not be public repository metadata |
| PostgreSQL | Keep as rebuildable index | GitHub-native identifiers and reconciliation source | Query joins, sessions, private controls, cached reader views, and account-aware actions need a service index |
| GitHub service identity | Migrate to GitHub App | Installation-scoped, short-lived token with explicit permissions | The API still needs a trusted boundary to combine app identity, user identity, consent, and steward authorization |

## Guardrails

### Proposal state is not a Project field

The six-state editorial model plus terminal restriction, withdrawal, and
archive outcomes remains an application contract. A future Project field may
make the state visible to maintainers or support a reconciliation check, but no
state transition may be authorized solely by a Project field edit.

### Native permissions are not the complete steward role

CODEOWNERS and protected branches may require review by a designated owner, but
they do not provide storyworld-scoped moderation, contributor notices, consent
checks, or private case handling. The application steward table and protected
GitHub rules are complementary controls.

### GitHub metadata must remain recoverable and appropriately private

Creative content, authorship, editorial review, and canon decisions must be
recoverable from GitHub-native records. Private consent and moderation records
are an explicit application-owned control-plane exception. They require their
own backup, access-control, retention, export, deletion, and recovery design.
The pilot recovery contract is documented in
`docs/operations/private-control-plane-recovery.md`; it must be exercised
against an owner-controlled database before public launch.

The preservation choices for withdrawal, attribution removal, restriction,
archival, and deletion are defined separately in
`docs/decisions/withdrawal-preservation-policy.md`. None of those choices may
be inferred from the `withdrawn` proposal state or represented only by a public
GitHub metadata change.

### Reader and contributor vocabulary remains product-owned

No migration may expose repository, branch, commit, pull request, merge,
CODEOWNER, or Project terminology on contributor-facing or reader-facing
surfaces where the product vocabulary already exists.

### Automation is not authorization

Actions and required checks may validate structure or provide automation, but
they must not silently make editorial, rights, moderation, or canon decisions.
Any automated signal remains evidence for a human steward unless a separate
owner-approved policy explicitly says otherwise.

### Storyworld Kit governance is defense in depth

`content/pilot-storyworld/.github/branch-protection.md` documents protected
canon branches, required steward review, required structural checks, and the
GitHub plan/organization prerequisites for CODEOWNERS and required status
checks. These controls are not evidence that a newly created repository has
been configured: the steward must apply and verify them in that repository.

## Migration gates

No GitHub-native migration is authorized by this ADR alone. A future
implementation task must pass all applicable gates:

1. **GitHub App gate:** scoped installation permissions, token lifecycle,
   webhook verification, audit identity, rollback, and private-pilot evidence.

The platform client now prefers `GITHUB_APP_ID`,
`GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`. Octokit's
`@octokit/auth-app` strategy obtains and refreshes short-lived installation
tokens; the application never stores those tokens. A partial App
configuration fails closed instead of falling back to a PAT. When all App
variables are absent, `GITHUB_PAT` remains the explicit private-pilot
fallback. The workspace auto-push credential is separate and is not changed by
this client migration.

Webhook authenticity remains independently verified by
`GITHUB_WEBHOOK_SECRET`; an App installation token is not used as a webhook
signature. The audit identity is the GitHub App installation actor returned by
GitHub, while contributor attribution continues to come from the application
identity and signed provenance record. Rollback is configuration-only: remove
the complete App configuration and restore the private-pilot PAT without
changing route handlers or attribution code.
2. **Rebuild gate:** a clean GitHub fixture rebuilds storyworlds, paths,
   contributions, proposals, shared saved-moment membership, and provenance
   without a prior PostgreSQL snapshot.
3. **State parity gate:** mirrored native fields cannot create a state the
   application cannot explain, recover, or present in plain language.
4. **Safety gate:** no consent or moderation decision is represented only in
   public GitHub metadata, and negative authorization tests pass.
5. **Reader gate:** public Pages output contains only intentionally public
   material and does not replace access-controlled reader behavior.
6. **User gate:** a representative non-technical contributor and steward can
   complete the affected flow without GitHub literacy.

## Consequences

### Positive

- The project avoids reimplementing durable version history and review events.
- GitHub-native automation can reduce bespoke synchronization and taxonomy
  work without becoming the product's policy engine.
- The application remains small enough to explain: it translates, authorizes,
  protects, indexes, and renders.
- Voice-first capture and per-action derivative consent remain visible as
  genuinely custom product work.
- Existing provenance, privacy, moderation, and contributor-authentication
  safeguards remain compatible with the architecture.

### Negative

- Two representations must be kept consistent when native metadata is added.
- GitHub availability, rate limits, plan features, permission settings, and
  webhook delivery remain operational dependencies.
- Private consent and moderation data still require service backup and recovery
  even though creative content is recoverable from GitHub.
- A GitHub App migration and Storyworld Kit baseline require work before the
  architecture is fully portable beyond the private pilot.

## Evidence and uncertainty

The source-backed evidence note is
`docs/reviews/2026-08-20-github-native-boundary-research.md`.

The decision is supported for the current architecture boundary. The following
remain provisional or deferred: actual GitHub App deployment, organization
settings and plan-dependent features, live GitHub rebuild behavior, the
source-specific CIE/PIE consent decision in open question 15.10, mobile scope
15.7, and reader accessibility metadata 15.13.

## Related decisions

- [ADR-0003: GitHub-native fast path versus custom backend](0003-github-native-fast-path-vs-custom-backend.md)
- [ADR-0002: Contributor notification model](0002-contributor-notification-model.md)
- [ADR-0008: Reader consent and contribution](0008-reader-consent-and-contribution.md)
- [Open questions log](../decisions/open-questions.md)