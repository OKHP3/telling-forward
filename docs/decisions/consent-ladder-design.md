# Consent Ladder Design

## Status

**Private-pilot policy approved; enforcement not approved.** This records the
Stage 0–1 design required by open questions 15.10 and 15.14. It defines the
source-specific Disrupt and Invert decision, but does not authorize a consent
screen, API gate, database migration, or public-contribution feature.

## Context

Telling Forward distinguishes authored creative contribution from passive
reading and ordinary product telemetry. A contributor may want to react to a
story, submit an idea, share a branch for display, or ask for canon review
without granting every other permission. A blanket terms checkbox cannot
accurately express those choices.

This design follows:

- ADR-0008's requirement for separately decidable contribution actions;
- `CONTENT-LICENSE.md`, which says public repository availability is not a
  license to copy, adapt, train on, or create derivatives;
- the Stage 0–1 identity decision: an app-native signed-in user is sufficient,
  with a `contributors` record where attribution requires one; and
- the rule that GitHub is the durable source for creative content while
  PostgreSQL is a rebuildable product index where possible.

Consent is a rights and privacy control, not an editorial judgment. A steward
may still restrict a submission for safety, quality, or policy reasons; that
does not revoke the contributor's underlying authorship.

## Decision

Use a **versioned, per-action consent ladder**. Each action below is distinct
and must be presented in plain language immediately before its first use for a
given contributor and storyworld scope. A successful action records the
specific consent version that enabled it. Future Stage 2/3 enforcement must
deny an action when the applicable consent is absent, revoked, expired, or
superseded by a materially changed policy.

No single action implies another action. In particular, submitting content does
not license it for display, canon review, adaptation, model training, or
derivative transformation.

### Action catalogue

| Action type | Separate consent covers | Does not cover |
|---|---|---|
| `read` | Viewing a storyworld under its reader notice, including the minimum service data needed to deliver that view | Feedback, telemetry beyond the stated notice, reuse of story content, or any contribution right |
| `react` | Saving or publishing an explicit reaction such as a rating, response, or response choice | Writing a theory or branch; use of reaction data as a proxy for creative-rights permission |
| `submit-theory` | Sending original interpretive or speculative text for the scope and visibility stated in the prompt | A branch, canon review, display of that theory outside the stated surface, or a license to adapt it |
| `submit-branch` | Uploading original proposed branch material into the stated private or steward-review workflow | Public display, canon review, transfer of copyright, or permission to derive new work |
| `license-for-display` | A clearly stated, non-exclusive permission to host and display the identified contribution in the named storyworld and surface | Canon acceptance, commercial use, sublicensing beyond the declared operator, or derivative transformation |
| `submit-for-canon-review` | Asking the steward to review the identified branch or scene for canon consideration | A promise of acceptance, ownership transfer, display beyond its agreed scope, or permission for later transformations |
| `ai-assisted-draft` | The contributor's use of the disclosed drafting assistance for the contributor's own input, plus the required disclosure of that use | Consent to train an AI on the contribution, reuse another contributor's work, CIE/PIE operations, or any derivative transformation |
| `disrupt-derivative` | The source-specific permission defined in "Disrupt and Invert derivative decision" below, for one accepted scene and one private transformation run | Invert, display licensing, canon acceptance, public release, commercial adaptation, model training, or any other source/resource |
| `invert-derivative` | The source-specific permission defined in "Disrupt and Invert derivative decision" below, for one accepted capsule and one private transformation run | Disrupt, display licensing, canon acceptance, public release, commercial adaptation, model training, or any other source/resource |

`read` must not become a disguised creative-rights waiver. For anonymous public
reading, the product may present a notice without creating a persistent
identity-linked record. If a signed-in reader turns on a feature that requires
an affirmative reading choice or separately consented telemetry, that
acknowledgment is recorded as `read`.

## Rationale

The ladder preserves meaningful choice at the exact point a contributor takes
on a new kind of participation. It is deliberately finer-grained than a
single terms acceptance because the platform's core promise is visible
provenance without implied reuse. It also keeps the future CIE/PIE decision
honest: a contributor who permits drafting assistance has not necessarily
permitted another person or agent to transform their work.

### Generic AI-assist boundary

Generic `ai-assisted-draft` consent is deliberately narrow. It allows a
contributor to ask a disclosed drafting tool to assist with material they are
submitting under the action's own terms. It does **not** authorize:

- Concept Inversion Engine (CIE) use on a contributor's capsule;
- Prose Inversion Engine (PIE) or Disrupt use on a contributor's accepted
  scene;
- any derivative transformation, remix, adaptation, or training use of
  contributor material; or
- a steward, another contributor, or an agent to invoke a tool on the
  contributor's material merely because the contributor used AI themselves.

Open question 15.10 is resolved for the private-pilot policy by the
source-specific decision below. A future implementation must use distinct
Disrupt and Invert records or an equivalently explicit action discriminator. A
generic `cie-pie-derivative` grant is not a substitute and remains unavailable.

### Disrupt and Invert derivative decision

The private-pilot policy is **approved in principle, with enforcement not
approved**. A contributor may approve a Disrupt or Invert derivative only when
all of the following are true:

- the contributor is verified and is the recorded source contributor for the
  identified accepted resource;
- the request names exactly one accepted source resource and exactly one
  action;
- the contributor gives a separate affirmative choice for Disrupt or Invert,
  in plain language, immediately before that action is requested; and
- the request is limited to the audience, purpose, and duration shown in that
  choice.

Consent to submit, display, send for canon review, use drafting assistance, or
perform the other derivative action never satisfies this gate.

| Field | Disrupt | Invert |
|---|---|---|
| Contributor choice | “Allow Disrupt to make one private prose exploration from this accepted scene.” Declining leaves the scene unchanged and does not affect contribution, display, or canon-review rights. | “Allow Invert to make one private concept exploration from this accepted capsule.” Declining leaves the capsule unchanged and does not affect contribution, display, or canon-review rights. |
| Storyworld and resource scope | Within the named storyworld, one named accepted scene identified by its durable provenance record. A world-wide grant, a branch-wide grant, and a grant for unspecified scenes are invalid. | Within the named storyworld, one named accepted capsule identified by its durable provenance record. A world-wide grant, a branch-wide grant, and a grant for unspecified capsules are invalid. |
| Purpose | Private creative exploration of a scene into a proposed prose derivative. The output is not canon, an alternate publication, a submission by the source contributor, or training data. | Private creative exploration of a capsule into a proposed inverted concept. The output is not canon, an alternate publication, a submission by the source contributor, or training data. |
| Audience | The source contributor and authorized stewards in the private pilot only. No reader-facing display, external export, or third-party sharing is included. | The source contributor and authorized stewards in the private pilot only. No reader-facing display, external export, or third-party sharing is included. |
| Attribution | Preserve the source contributor as the source contributor and identify the Disrupt operation, source record, consent version, and derivative creator or operator. Do not label the derivative as solely authored by the source contributor. | Preserve the source contributor as the source contributor and identify the Invert operation, source record, consent version, and derivative creator or operator. Do not label the derivative as solely authored by the source contributor. |
| Duration | One requested transformation run. A grant expires unused 30 calendar days after it is recorded, or sooner if revoked or superseded. It grants no continuing reuse right after the run. | One requested transformation run. A grant expires unused 30 calendar days after it is recorded, or sooner if revoked or superseded. It grants no continuing reuse right after the run. |
| Further use | Any new transformation, publication, reader display, canon consideration, alternate-path release, commercial use, or reuse in another storyworld needs its own approved action and consent. | Any new transformation, publication, reader display, canon consideration, alternate-path release, commercial use, or reuse in another storyworld needs its own approved action and consent. |
| Revocation before execution | Deny the request. A request already queued but not started must be cancelled or held. | Deny the request. A request already queued but not started must be cancelled or held. |
| Revocation after creation | Stop new source-dependent use and hold an unreleased derivative. A released derivative follows the accepted-derivative preservation policy below. | Stop new source-dependent use and hold an unreleased derivative. A released derivative follows the accepted-derivative preservation policy below. |

This decision grants a narrow permission to make a private derivative. It does
not transfer copyright, grant an adaptation license, waive attribution, permit
model training, or allow the steward or an agent to infer consent from a prior
action.

### Enforcement gate

No Disrupt or Invert endpoint, consent toggle, background job, export, or
reader-facing surface may be enabled against real contributor material until
the following gate is approved and evidenced:

1. the policy and contributor-facing copy have completed owner, legal, and
   privacy review;
2. the server derives the action from the endpoint and verifies the
   contributor, accepted source resource, action, policy version, audience,
   purpose, and unexpired consent record;
3. revocation, expiry, supersession, restriction, and source-status changes
   fail closed, including queued and in-flight work;
4. every generated derivative stores source lineage, consent version,
   transformation action, purpose, audience, attribution, operator, and
   release time;
5. generated output is private and unreleased by default, with separate
   review and display permission; and
6. the preservation, independent-copy, backup, legal-hold, appeal, and
   correction paths in `withdrawal-preservation-policy.md` are operationally
   owned and tested.

Until this gate is approved, existing prototype affordances must not be
treated as permission to transform real contributor material.

## Capture and scope model

### User flow

When a contributor first invokes a gated action, the interface presents one
short, action-specific sheet:

1. name the action and storyworld;
2. state who may see or use the material and for what purpose;
3. state the rights the contributor retains and the permission being requested;
4. link the full, versioned policy text;
5. show a clear affirmative control; and
6. offer a route to decline without silently changing the requested action.

The future action request carries a `consentRecordId` field, not a generic
`acceptedTerms: true` flag. The server derives the required action type from
the endpoint, then verifies that the referenced record belongs to the
signed-in user, matches the storyworld and required action, is currently
granted, and names the required policy version. Clients must not be trusted to
infer consent from a previous navigation or checkbox.

### Scope rules

- **Per contributor:** a record is bound to the authenticated app user and,
  when a creative record exists, the linked `contributor_id`.
- **Per storyworld:** contribution, display, and canon-review consent are
  scoped to one storyworld. A permission in one world never transfers to
  another world.
- **Per action type:** every row names one action. Consent to a lower ladder
  rung never unlocks a higher rung.
- **Per policy version:** materially changed terms require a new affirmative
  record. Historical records remain auditable.
- **Per resource when necessary:** a display license, canon-review request, or
  future derivative permission must additionally identify the contribution,
  branch, capsule, or scene it covers. A world-wide grant is not the default.
- **Revocable:** future use stops when a withdrawal is recorded, subject to the
  preservation limits below.

## Draft data model

This is a design only. Do not add this table or migration in Stage 0–1.

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  subject_user_id INTEGER NOT NULL REFERENCES users(id),
  contributor_id INTEGER REFERENCES contributors(id),
  storyworld_id INTEGER REFERENCES storyworlds(id),

  action_type TEXT NOT NULL CHECK (action_type IN (
    'read',
    'react',
    'submit-theory',
    'submit-branch',
    'license-for-display',
    'submit-for-canon-review',
    'ai-assisted-draft',
    'cie-pie-derivative',
    'disrupt-derivative',
    'invert-derivative'
  )),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN (
    'storyworld',
    'contribution',
    'branch',
    'scene',
    'capsule'
  )),
  scope_reference TEXT,

  status TEXT NOT NULL CHECK (status IN ('granted', 'revoked', 'superseded')),
  policy_document_ref TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  audience TEXT NOT NULL,
  attribution_treatment TEXT NOT NULL,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  supersedes_consent_id UUID REFERENCES consent_records(id),
  recorded_via TEXT NOT NULL,
  request_id TEXT
);

CREATE INDEX consent_records_subject_scope_action_idx
  ON consent_records (subject_user_id, storyworld_id, action_type, recorded_at DESC);
CREATE INDEX consent_records_contributor_idx
  ON consent_records (contributor_id, recorded_at DESC);
```

The ledger is append-only: revocation and supersession create a new record
linked to the prior grant rather than mutating consent history. The effective
consent is the most recent applicable record for the scope and action. A future
implementation must validate that `scope_reference` is present for every
resource-specific action and must not allow any derivative action to be granted
until the enforcement gate above is approved. The legacy
`cie-pie-derivative` umbrella value must not be used for a Disrupt or Invert
grant.

Consent records are intentionally a **private PostgreSQL control-plane
exception** to the general GitHub-rebuildable-content rule. Putting identity,
withdrawal timing, or private policy choices into a public repository would
create a new privacy problem. The implementation proposal must document backup,
access controls, export, deletion handling, and recovery before this table is
created. GitHub remains canonical for the creative content and its provenance;
the consent ledger only governs whether future product actions may use it.

The private-pilot recovery boundary and unresolved retention/export/deletion
decisions are recorded in
`docs/operations/private-control-plane-recovery.md`.

## Revocation, withdrawal, and preservation

A contributor can revoke an action consent from their consent settings or
through the relevant submission flow. Revocation applies prospectively:

- no new action relying on that consent may begin;
- a display-license revocation removes future display permission after the
  declared operational window;
- a canon-review revocation prevents further review activity where the proposal
  is still eligible to be withdrawn;
- an AI-assist revocation prevents future use of that assistance; and
- revocation does not silently erase Git history, a merged canon commit, or a
  legally required audit trail.

### Accepted derivative boundary

The `disrupt-derivative` and `invert-derivative` permissions defined above are
approved as a private-pilot policy, but are not enabled for enforcement. Their
revocation still cannot recall a derivative that was already created. The future
implementation must:

- stop new source-dependent transformations and new publication after the
  revocation becomes effective;
- identify every managed derivative by source record, consent version,
  transformation purpose, audience, attribution, and release time;
- hold an unreleased derivative while the owner and legal/privacy reviewers
  decide its disposition;
- preserve a released derivative when it is sufficiently separable and its
  independent permission remains valid, unless safety, privacy, rights, or a
  legal hold requires another result;
- provide a separate path for reader-facing removal, attribution correction,
  appeal, and correction, without rewriting Git history automatically; and
- state plainly that independent copies, third-party publications, exports, and
  retention-bound backups may be outside the service's control.

This boundary is a product policy decision for the private pilot, not a legal
determination. No consent toggle, derivative endpoint, or public derivative
feature may be enabled until the enforcement gate above is approved.

The proposal lifecycle is the operational companion to consent:

- the original PR author may withdraw an eligible draft, submitted,
  under-review, or returned-with-notes proposal;
- a steward may restrict an active proposal, with an optional contributor-facing
  reason;
- a steward may archive a completed outcome; and
- accepted, alternate, restricted, withdrawn, and archived proposal outcomes
  cannot be reopened by a consent toggle.

Withdrawing a proposal is not a general data-erasure request, and a restricted
proposal is not proof that the contributor revoked consent or committed
misconduct. A future service process must separately handle requests to remove
displayed material, preserve Git/provenance history where required, and explain
what cannot be retroactively undone.

The distinct preservation choices are defined in
`withdrawal-preservation-policy.md`. Revoking a consent action, withdrawing a
proposal, removing displayed attribution, restricting a work, archiving it,
and deleting material are separate decisions with different authorities and
retention effects.

## Consequences

### Positive

- Contributors make specific, understandable choices instead of accepting an
  overbroad click-through.
- Future API gates can be deterministic and auditable.
- The design protects the CIE/PIE decision from accidental authorization by a
  generic AI feature.
- Consent and proposal state remain distinct, preventing editorial actions from
  being misrepresented as rights transfers.

### Costs and risks

- Versioned consent and revocation require product, legal, privacy, and support
  work before implementation.
- The private control ledger has a recovery obligation distinct from GitHub.
- Policy copy and the exact meaning of a display license still require owner
  and legal review; this design does not supply legal terms.

## Not yet decided

- The contributor-facing legal text, jurisdictional basis, retention schedule,
  and age/guardian rules.
- The exact deletion/export process and the operational window for taking
  licensed displays down.
- The legal/privacy review and operational enforcement of the source-specific
  Disrupt/Invert derivative consent model.
- The legal/privacy review, jurisdictional terms, and operational enforcement
  for the accepted-derivative disposition policy.
- Whether anonymous readers may use any optional reaction or telemetry features.
- Whether a future storyworld may offer a broader, independently negotiated
  contribution agreement; it must remain an explicit alternative, not a hidden
  default.

## References

- `docs/adr/0008-reader-contribution-consent-ladder-data-stream-separation-and-echo-relay-concept.md`
- `docs/decisions/open-questions.md` (15.10, 15.14, 15.18)
- `docs/decisions/provenance-fidelity-contract.md` (reader visibility boundary, open question 15.18)
- `docs/decisions/withdrawal-preservation-policy.md`
- `docs/platform-requirements.md` §§6.5, 7.1–7.4
- `CONTENT-LICENSE.md`