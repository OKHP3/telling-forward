# Steward Moderation Tooling Design

## Status

**Design complete; enforcement not approved.** This records the Stage 0–1
design required by open question 15.15. It does not authorize a moderation
queue, public reporting surface, database migration, automated classifier, or
public contribution launch.

## Context

Telling Forward assigns each storyworld to a steward with permission, canon,
and moderation responsibility. That role needs an operational minimum before
the project offers an open public contribution surface. In particular,
constrained-choice contribution and sequential relay concepts described in
ADR-0008 must not launch before a steward can find, contain, explain, and
record harmful or unsuitable submissions.

Moderation is not the same as editorial review. A proposal can be stylistically
weak and returned with a question without becoming a moderation matter.
Conversely, a safety, spam, or plagiarism concern may require a pause or
restriction before normal editorial review can continue.

## Decision

Use a **private, case-based moderation control plane** linked to a visible
proposal lifecycle when the moderated item is a proposal. The minimum viable
Stage 3 primitive is a steward-owned moderation case that can:

1. receive a report or internal flag;
2. identify the affected contribution, proposal, capsule, reaction, or account;
3. classify the concern without treating an automated signal as a verdict;
4. apply a temporary hold or a final outcome;
5. record the acting steward, evidence references, and reason code; and
6. produce a contributor-facing explanation only when it is safe and
   appropriate.

Private safety findings must not be copied into public GitHub Issues, PR
comments, commit messages, or labels. GitHub remains canonical for creative
content and content provenance; the moderation control plane governs access and
workflow around that content.

## Minimum pre-launch capabilities

Before any open, public contribution surface goes live, stewards need all of
the following:

| Need | Minimum behavior | Boundary |
|---|---|---|
| Spam handling | Report, classify, hold/restrict, dismiss, and record repeat patterns | A heuristic may flag content but cannot silently remove it or make a final decision |
| NSFW / harassment reporting | Contributor and steward reporting with a private reason category, triage priority, and safe contributor communication | No public exposure of reporter identity or detailed allegation by default |
| Plagiarism / unauthorized-material check | Source-reference capture and a “needs review” signal for the steward | Similarity detection is evidence, not a plagiarism determination or automated takedown |
| Blocklist / mute | Storyworld-scoped ability to stop a user from submitting, contacting, or surfacing reactions, with reason, actor, expiry, and review path | A steward's local action is not a global ban and must not silently change other worlds |
| Batch review | Previewed multi-select actions for low-risk, homogeneous cases (for example, obvious duplicate spam) | No bulk canon decision, no bulk deletion of Git history, and no unreviewed automated finalization |
| Audit and review | Case timeline, actor, time, evidence reference, action, and reversal/appeal marker | Private notes require restricted access and retention rules |

Published community rules, a clear report route, and an identified steward are
also launch prerequisites. Tooling alone cannot substitute for a stated
moderation policy.

## Rationale

The proposal lifecycle should remain understandable to contributors: it
describes editorial progress and final editorial outcomes. Private safety,
rights, and conduct evidence needs a separate, access-controlled record so a
steward can act consistently without publishing sensitive allegations to
GitHub. A case/event model is the smallest durable primitive that supports
reporting, review, reversal, and later accountability without pretending that
automation can decide difficult safety or plagiarism questions.

## Draft moderation model

Moderation state belongs in **separate moderation records**, not in the
proposal-state enum. The proposal state answers “where is this editorial
submission?” A moderation case answers “what safety or conduct process applies
to this item?” Keeping them separate avoids overloading `restricted` with
private or ambiguous reasons.

The following is a draft structure only; do not implement it in Stage 0–1.

```sql
CREATE TABLE moderation_cases (
  id UUID PRIMARY KEY,
  storyworld_id INTEGER NOT NULL REFERENCES storyworlds(id),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN (
    'proposal', 'contribution', 'capsule', 'reaction', 'theory', 'account'
  )),
  subject_reference TEXT NOT NULL,
  opened_by_user_id INTEGER REFERENCES users(id),
  assigned_steward_id INTEGER REFERENCES stewards(id),

  status TEXT NOT NULL CHECK (status IN (
    'open', 'triaged', 'awaiting-steward', 'resolved', 'dismissed', 'appealed'
  )),
  visibility_action TEXT NOT NULL CHECK (visibility_action IN (
    'none', 'hold', 'restricted', 'muted', 'blocked'
  )),
  primary_reason_code TEXT NOT NULL CHECK (primary_reason_code IN (
    'spam', 'harassment', 'nsfw', 'plagiarism-review',
    'rights-concern', 'safety', 'other'
  )),
  contributor_message TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE moderation_events (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES moderation_cases(id),
  actor_user_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  reason_code TEXT,
  private_note TEXT,
  evidence_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE storyworld_moderation_controls (
  id UUID PRIMARY KEY,
  storyworld_id INTEGER NOT NULL REFERENCES storyworlds(id),
  subject_user_id INTEGER NOT NULL REFERENCES users(id),
  control_kind TEXT NOT NULL CHECK (control_kind IN ('mute', 'block')),
  applies_to TEXT NOT NULL CHECK (applies_to IN (
    'reaction', 'theory', 'submission', 'contact', 'all-contributions'
  )),
  reason_code TEXT NOT NULL,
  imposed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  lifted_at TIMESTAMPTZ
);
```

A future implementation should treat moderation events as append-only and keep
the sensitive evidence reference out of public GitHub metadata. It must specify
private-data access controls, retention, export/deletion handling, backups, and
recovery before creating these tables. The case's public-facing state, when
needed, is limited to a safe, plain-language outcome such as “submission
restricted.”

The private-pilot recovery boundary and the explicit owner/legal decisions
still required for retention, export, and deletion are recorded in
`docs/operations/private-control-plane-recovery.md`.

## Workflow and lifecycle interaction

### Triage

1. A contributor, reader, automated detector, or steward creates a report or
   flag.
2. The system creates a moderation case with `open` status and links the
   relevant subject by durable reference (proposal ID plus PR number, commit
   SHA, Issue number, or account ID).
3. A steward triages the case. A high-risk report may apply a temporary `hold`;
   a hold pauses visibility/review but is not a final guilt finding.
4. The steward resolves, dismisses, or escalates the case, recording a
   reason code and evidence reference.

### Proposal restriction, withdrawal, and archive

- **Restriction:** A steward may restrict an active proposal under the proposal
  lifecycle. If moderation prompted that action, the case links to the
  proposal; the `decision_reason` shown to the contributor is a safe summary,
  not the private case record. Restriction can also be editorial/policy-based
  without creating a moderation case.
- **Withdrawal:** A contributor may withdraw their eligible own proposal. This
  stops editorial processing but does not resolve or conceal an already-open
  moderation case. Withdrawal must never be presented as an admission of
  wrongdoing.
- **Archive:** A steward may archive terminal proposal outcomes. Archival is
  filing, not deletion; it does not erase a linked moderation case or prevent
  policy-required preservation.
- **Accepted and alternate outcomes:** A later moderation concern must open a
  case rather than mutate history or mislabel an accepted contribution. Any
  remediation beyond this baseline design requires an explicit owner decision.

The separate preservation policy at
`docs/decisions/withdrawal-preservation-policy.md` defines why withdrawal,
restriction, attribution changes, archival, and deletion must not be treated
as interchangeable outcomes.

Webhook and GitHub reconciliation must preserve locally managed restriction,
withdrawal, and archive states. A future moderation implementation must use the
same principle: a GitHub event cannot silently clear a private safety hold or a
steward decision.

## Batch actions

Batch review is limited to actions where a steward can understand the entire
selected set from a preview. The interface must show count, targets, resulting
state, contributor-notification behavior, and any items that cannot be changed
before confirmation. It must record one event per affected target and report
partial failure rather than claiming an all-or-nothing result.

The following are excluded from batch finalization:

- accepting content into canon;
- permanent rights or licensing decisions;
- deleting source content or Git history;
- marking plagiarism as proven; and
- an irreversible account-wide block without a review path.

## Consequences

### Positive

- Stewards have a concrete prerequisite baseline before public contribution
  creates predictable harm and workload.
- Editorial states stay readable because private moderation detail is separate.
- Reports, blocks, and outcomes become auditable rather than ad hoc messages.
- The design does not expose sensitive allegations or reporter identity in
  public GitHub artifacts.

### Costs and risks

- Moderation is a policy and support commitment, not merely a queue UI.
- Private records introduce a retention, access-control, and recovery burden.
- Automated spam, NSFW, or plagiarism signals can be biased or wrong and must
  remain review aids.
- Appeals, response times, and cross-storyworld escalation need owner policy
  before launch.

## Not yet decided

- Community standards, prohibited-content definitions, age rules, and legal
  reporting obligations.
- Appeals process, response-time targets, steward escalation, and how a
  disabled steward is replaced.
- Whether reports can be anonymous and what anti-abuse controls they require.
- Similarity-check providers, evidence thresholds, and any human review policy
  for plagiarism claims.
- Retention and deletion schedules for private moderation notes.
- Any remediation process for already accepted or displayed content.

## References

- `docs/adr/0008-reader-contribution-consent-ladder-data-stream-separation-and-echo-relay-concept.md`
- `docs/decisions/consent-ladder-design.md`
- `docs/decisions/open-questions.md` (15.15)
- `docs/platform-requirements.md` §§6.4, 6.5, 7.3
- `CONTENT-LICENSE.md`