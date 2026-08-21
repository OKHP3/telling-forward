# Public Reporting Policy and Launch Decision

## Status

**Policy approved for the private pilot; public reporting surface declined.**

Recorded 2026-08-20 for the Telling Forward private pilot. This decision
defines the rules and operating commitments that must exist before a public
report route can open. It does not authorize public contribution, anonymous
intake, untrusted uploads, or publication of moderation records.

## Community rules

Telling Forward is a collaborative storytelling space. Participants must:

1. Treat contributors, readers, stewards, and subjects of stories as people,
   not targets.
2. Submit work they created or are authorized to share. Repository visibility
   is not permission to reuse material.
3. Keep personal information, private communications, and identifying details
   out of story submissions unless the people involved have expressly agreed.
4. Label or avoid material that could reasonably create a safety, age,
   harassment, or rights concern.
5. Follow a steward's temporary hold or request for clarification while a
   concern is reviewed.
6. Use a report only for a good-faith safety, conduct, spam, or rights concern,
   not to silence an editorial disagreement or competing story path.

### Prohibited content and conduct

The following are prohibited in a contribution, comment, reaction, theory,
report, or account activity:

- sexual exploitation of minors or sexual content involving minors;
- credible threats, instructions for imminent violence, or targeted
  encouragement of self-harm;
- targeted harassment, hateful attacks against protected groups, stalking,
  intimidation, or retaliation against a reporter or participant;
- doxxing, non-consensual intimate material, or publication of private
  personal information;
- malware, credential theft, phishing, fraud, or instructions intended to
  facilitate those acts;
- spam, coordinated manipulation, impersonation, or attempts to evade a
  storyworld block;
- plagiarism, unauthorized copyrighted material, or other rights concerns
  presented as original work; and
- knowingly false reports, fabricated evidence, or attempts to weaponize the
  moderation process.

Fictional depictions are not automatically a violation. Stewards must
distinguish fictional content from real-world targeting, exploitation,
incitement, or unlawful use, and must record uncertainty rather than treating a
flag as a verdict.

## Reporting and reporter safety

The private pilot accepts reports only through an authenticated, steward-facing
workflow or a directly identified steward. There is no public report endpoint.

If a public report route is later authorized:

- the route must accept structured text only; it must not accept arbitrary
  uploads or expose a reporter's identity to contributors or readers;
- the interface must explain that “anonymous” means hidden from the reported
  participant, not an absolute promise against service logs or lawful
  disclosure;
- abuse controls must include authentication or a separately approved
  anonymous mechanism, rate limits, duplicate suppression, and a way to reject
  malicious reports;
- reports must identify a storyworld and target when possible, but reporters
  must not be required to investigate or prove a violation;
- private evidence references belong in the moderation case, never in public
  GitHub Issues, pull requests, comments, commits, or labels; and
- reporters must receive a case receipt that does not disclose private case
  notes, the steward's internal reasoning, or another person's identity.

Retaliation, doxxing, or attempts to identify a reporter are themselves
moderation concerns.

## Review, appeals, and escalation

- A steward acknowledges a complete report within 7 calendar days.
- A credible safety threat, exploitation concern, or active privacy exposure
  receives an initial hold-or-escalate decision within 24 hours when coverage
  permits.
- Ordinary reports receive a disposition or an explained status update within
 30 calendar days.
- A contributor affected by a restriction, mute, block, or other final action
  may appeal through an authenticated channel within 30 days of notice.
- The original acting steward must not be the sole reviewer of an appeal when
  another qualified steward is available.
- Appeals may uphold, narrow, reverse, or return an action for more evidence.
  An appeal is not a promise that content will be restored while a safety or
  rights hold remains active.
- Urgent threats, suspected child exploitation, credible imminent harm, and
  legal or rights claims are escalated to the project owner and, where
  appropriate, the relevant professional or legal authority. The platform
  does not promise a particular external response or outcome.

These targets are service objectives, not a guarantee that every report will
receive a final decision inside the target window.

## Retention and access

- Moderation cases and append-only events are private, storyworld-scoped
  control-plane records.
- Access is limited to the assigned storyworld steward, an approved backup
  steward, and the project owner or explicitly authorized incident reviewer.
- Private notes and evidence references are retained while a case or appeal is
  open and for 24 months after final resolution, then deleted unless a
  documented legal hold or active safety investigation requires longer
  retention.
- Raw reporter submissions and uploaded evidence are not retained by default;
  the pilot stores the minimum text and references needed to explain and audit
  an action. Any future evidence-upload feature requires a separate security
  and retention decision.
- Backups inherit the same access boundary and retention deadline. Restores
  must not make private moderation records public.
- GitHub creative history is not deleted or rewritten as a moderation action.
  A safe public outcome may say that a submission is restricted, but must not
  reveal private allegations, reporter identity, or evidence references.

## Steward coverage and replacement

Before any public report route opens, each participating storyworld must have:

1. one named primary steward;
2. one named, trained backup steward with equivalent private-record access;
3. an owner-maintained escalation contact; and
4. a tested process for disabling a steward's access and transferring open
   cases without exposing them to another storyworld.

If a primary steward is unavailable and no backup is active, public reports for
that storyworld remain closed. A global ban or cross-storyworld control is not
an automatic substitute for local stewardship.

## Launch decision

**Decline public contribution reporting for the current pilot.**

The private steward desk may continue to receive and act on internally created
cases. No public contributor or reader route may create a moderation case until
all of the following are separately evidenced:

- a reviewed public report flow with reporter-safety and abuse controls;
- authenticated appeals and safe contributor communication;
- retention, export, recovery, and deletion handling in the deployed
  environment;
- primary and backup steward coverage for every enabled storyworld;
- route-level tests proving storyworld isolation and batch-action safety; and
- an explicit owner decision changing this launch status.

This is a launch gate, not a claim that the rules eliminate all safety or legal
risk.

## References

- `docs/decisions/moderation-tooling-design.md`
- `docs/decisions/open-questions.md` (15.15 and 15.16)
- `docs/platform-requirements.md` §7.5
- `docs/operations/private-control-plane-recovery.md`