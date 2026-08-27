# OverKill Hill Reference Pages Review

## Review scope

This review compares the deployed OverKill Hill project pages for Glee-fully Chai Chasers and Abrahamic Reference Engine with their GitHub source counterparts. It then uses the shared page pattern and the two existing Magnus Saga and Biases as Constants writing pages to define the required treatment for the Telling Forward project page.

**Retrieved:** 2026-08-26

The review distinguishes byte-level equality, semantic alignment, repository evidence, and inferred design guidance. It does not treat a polished public page as proof of runtime behavior that the underlying repository does not support.

## Source ledger

| Subject | Deployed page | GitHub source | Local mirror | Authority used |
| --- | --- | --- | --- | --- |
| Glee-fully Chai Chasers | `https://overkillhill.com/projects/glee-fully-chai-chasers/` | `https://github.com/OKHP3/OverKill-Hill/blob/main/projects/glee-fully-chai-chasers/index.html` | `projects/glee-fully-chai-chasers/index.html` | GitHub source and deployed response |
| Abrahamic Reference Engine | `https://overkillhill.com/projects/abrahamic-reference-engine/` | `https://github.com/OKHP3/OverKill-Hill/blob/main/projects/abrahamic-reference-engine/index.html` | `projects/abrahamic-reference-engine/index.html` | GitHub source and deployed response |
| Magnus Progenitor Saga | `https://overkillhill.com/writings/magnus-saga/` | `https://github.com/OKHP3/OverKill-Hill/blob/main/writings/magnus-saga/index.html` | `writings/magnus-saga/index.html` | Writing page source and deployed response |
| Biases as Constants | `https://overkillhill.com/writings/biases-as-constants/` | `https://github.com/OKHP3/OverKill-Hill/blob/main/writings/biases-as-constants/index.html` | `writings/biases-as-constants/index.html` | Writing page source and deployed response |

## Comparison result

### Glee-fully Chai Chasers

The deployed page and GitHub counterpart match byte-for-byte in the retrieved comparison. The recorded SHA-256 for both was:

`11a544994245a5f0765e1a9430f78e493ff8ea22f237164fc86a9b8aac43d740`

The local mirror matched the same hash. The deployed page presents a free mobile-first cascading-reels game, a multi-agent orchestration case study, a browser-only and zero-backend boundary, and a clear “What This Is Not” section. It also names its engine, oracle, product, deployment, orchestration pattern, principles, origin, license, and live links.

### Abrahamic Reference Engine

The deployed page and GitHub counterpart also match byte-for-byte in the retrieved comparison. The recorded SHA-256 for both was:

`2303319c255b78b9558b083cbb6c65c43209bec23c0dbdc19fa727795b94247c`

The local mirror matched the same hash. The deployed page presents the engine as a neutral, citation-first browser tool for Judaism, Christianity, and Islam. It clearly states its four modes, scope, “What This Is Not” boundary, agent skills, origin, current version, license, and free/open-source posture.

### Companion writing pages

The retrieved Magnus Saga and Biases as Constants pages are semantically aligned between deployed and GitHub/local source. Their byte-level hashes differ because the deployed response formats the first metadata/CSP line differently. A whitespace-insensitive comparison found only four changed lines, all in that first-line formatting area. The substantive titles, descriptions, sections, links, and draft/not-yet-published status align.

This establishes a useful rule for Telling Forward: link to the companion writings as separately governed works. Do not copy their narrative material into the product page or imply that a link grants reuse rights.

## Shared public project-page pattern

The two project pages share a strong, repeatable structure:

1. A title, concise promise, status tags, and a visual hero.
2. A small number of direct calls to action, usually live demo and source repository.
3. A problem or reference-gap section that explains why the project exists.
4. A visible live demonstration or product surface when one exists.
5. A plain-language explanation of what the product does.
6. Technical or operating model detail that earns its space.
7. Principles, scope, and a “What This Is Not” boundary.
8. Origin story and project information.
9. Related links and an on-page table of contents.

Glee-fully Chai Chasers uses its sections to explain the orchestration architecture and game boundaries. Abrahamic Reference Engine uses them to explain reference modes, neutrality, citation behavior, and agent skills. Both pages make status, scope, and access conditions legible instead of treating a hero paragraph as a complete specification.

## Telling Forward comparison and identified corrections

The existing local Telling Forward detail page already carries much of the shared pattern. It accurately communicates open-canon collaborative fiction, frontstage/backstage vocabulary, six proposal states, steward governance, attribution, staged delivery, origin, repository, and prototype links.

The following differences or deficiencies are in scope for the page refresh:

| Finding | Evidence | Required treatment |
| --- | --- | --- |
| The page is not discoverable from the public project catalogue or project submenu. | The local project index and header submenu list other project pages but omit `/projects/telling-forward/`. | Add a project-index card and navigation entry. Add the route to the source generator's active-route set. |
| The detail page tags Telling Forward as “Open Source.” | Telling Forward `LICENSE` describes the platform code as proprietary and all rights reserved. `CONTENT-LICENSE.md` separately governs story and content rights. | Replace the tag with “Proprietary” or remove it. Preserve the distinction between platform code and story/content rights. |
| The static prototype link can be mistaken for the entire application. | The current repository documentation confirms the GitHub Pages Author App is a static deployment. API, database, authenticated writes, GitHub-backed operations, and Reader deployment require separate evidence. | Add a visible prototype boundary that names what is and is not hosted at the public prototype URL. |
| Existing provenance copy is stronger than the currently evidenced policy boundary. | The page says accepted contributions keep source, contributor, and review history attached permanently. Current governance includes private, restricted, consent, moderation, and withdrawal concerns. | Qualify the statement to describe durable provenance subject to the approved rights and restriction policy. |
| Companion writing pages are not presented as part of the project context. | Magnus Saga and Biases as Constants are existing writing pages with their own source and status. | Add a “Companion Writings” section and related links. Identify them as companion works, not features, and retain their draft/not-yet-published status. |
| The page's mission and product model are substantially aligned. | The premise, vocabulary, six-state flow, steward model, and staged path correspond to Telling Forward repository documentation. | Preserve the core language. This is a correction and completion pass, not a new product definition. |

## Recommended page treatment

The refreshed page should retain the existing visual and structural language used by the two reference project pages. It should add:

- a corrected proprietary status tag;
- a short prototype-boundary statement;
- a Companion Writings section after the staged path;
- direct links to Magnus Progenitor Saga and Biases as Constants;
- a sentence that companion pages are separate works and do not change content rights;
- related-sidebar links and a table-of-contents entry;
- a catalogue card and header submenu entry so the page is reachable from the public project surface.

The companion section should describe the Magnus Saga as a speculative fiction series and narrative laboratory concerned with origin, recursion, memory, identity, and the emergence of intelligence. It should describe Biases as Constants as a research project examining persistent bias patterns in AI and human systems and how those patterns can be formalized for prompt engineering and model fine-tuning. Those summaries must remain source-bounded and must not imply that either work is published, licensed for reuse, or a platform feature.

## Evidence-based disposition

- **Confirmed aligned:** Telling Forward's purpose, open-canon model, steward role, attributed paths, and six-state lifecycle are consistent with repository mission and requirements.
- **Confirmed page gap:** The page is omitted from the public project index and project submenu.
- **Confirmed copy contradiction:** “Open Source” conflicts with the proprietary platform license.
- **Confirmed deployment boundary:** The public Author App URL is not evidence of a deployed API, database, authenticated write path, GitHub operation, or Reader.
- **Confirmed companion context:** Magnus Saga and Biases as Constants exist as separate writing pages and should be linked, not merged.
- **Inferred design guidance:** The shared project-page structure is a useful pattern for making scope, status, boundaries, and access clear.
- **Unknown:** Whether the Telling Forward API, Reader, or private pilot is currently reachable in a separately configured environment. This review does not convert repository implementation into live-service proof.

## Next action

Update the OverKill Hill source-generated Telling Forward page and its catalogue/navigation links using the corrections above, regenerate the site, run the site's validation suite, and verify the deployed URLs after GitHub Pages completes.

