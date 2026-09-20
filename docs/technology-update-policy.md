# Technology maintenance and upgrade plan

Research date: 2026-09-19 UTC (2026-09-18 America/Chicago).

## Outcome and activation state

The [inventory](technology-inventory.md), [full JSON](technology-inventory.json), and [transitive appendix](technology-transitive-inventory.md) identify the source-controlled technology set and compare it with publisher releases. This plan keeps updates moving through a proposal, validation, review, release, and verification cycle.

**Confirmed:** the maintenance change was merged in [PR #16](https://github.com/OKHP3/telling-forward/pull/16). Its inventory, full build, model metadata and Linux native ingestion dependency checks passed. The first complete [Technology watch run](https://github.com/OKHP3/telling-forward/actions/runs/35421726169) passed and produced a fresh artifact at 2026-09-19T04:42:05Z from commit `caf938b845e2723cce05ea505a6d4d4c915a30b2`. Python and Actions Dependabot proposals #17 through #22 demonstrate that those update channels are active. The pnpm 11 updater gap below remains open.

**Confirmed:** [PR #15](https://github.com/OKHP3/telling-forward/pull/15) subsequently upgraded Mermaid from 11.17.2 to 12.0.0. Full build, contributor account-switch regression, and a Chromium smoke using the story graph's Mermaid configuration, path classes, pointer selection and keyboard selection passed. This does not establish older Safari compatibility; Mermaid 12 requires Safari 17.4+ and Node 22.12+. No host runtimes, database versions, models, deployment settings, repository permissions, or auto-merge settings were changed. The committed inventory and the first artifact describe their recorded source revisions; consult a newer watch artifact for subsequent dependency changes.

### Replit workspace observations

The Shell returned these executable versions on 2026-09-19 UTC. They describe the development workspace, not a published deployment or resolved native dependency closure.

| Executable | Observed version |
| --- | --- |
| Node.js | 24.13.0 |
| pnpm | 10.26.1 |
| Python | 3.13.11 |
| Git | 2.50.1 |
| Bash | 5.2.37 |
| Pandoc | 3.6 |
| Redis | 7.2.10 |
| Nix | Determinate Nix 3.11.2 / Nix 2.31.1 |

Replit's pnpm differs from the 11.19.0 used by Windows and CI. Coordinate a package-manager pin and frozen-install verification before claiming identical environments. The live PostgreSQL patch and published runtime remain unverified. Shell authentication and guarded synchronization passed, while the graphical Git provider separately returned `UNAUTHENTICATED`; GitHub account confirmation is still required for that connection. Matching Git commits does not certify the provider connection or running services.

**Confirmed:** existing Dependabot configuration covers npm and a separate daily workflow refreshes Mermaid. This change adds Python and Actions coverage, separates routine updates from major proposals, groups the Expo/React family, and avoids duplicate Mermaid proposals. The new weekly Technology watch produces a fresh source-linked inventory as an Actions artifact and job summary. It has read-only repository permissions and cannot install a production upgrade.

**Unknown:** GitHub's published support table lists pnpm v7 through v10, while this repository uses pnpm 11.19.0. Catalog support is documented, but that does not establish v11 lockfile update support. Preserve the existing bot until a replacement successfully generates and validates a v11 update. The inventory remains independent of either update bot. [GitHub ecosystem support](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [catalog support announcement](https://github.blog/changelog/2025-02-04-dependabot-now-supports-pnpm-workspace-catalogs-ga/).

## Update ownership

| Technology family | Detection and proposal | Acceptance and release |
| --- | --- | --- |
| npm direct dependencies, shared catalogs and overrides | Existing daily Dependabot proposals; weekly inventory catches omissions. Recommended next step: verify the Renovate candidate below on pnpm 11. | Frozen install, typecheck, full build, relevant tests, owner review. Never replace platform exclusion overrides with latest numbers. |
| npm transitive packages | Full lockfile inventory; security alerts; Renovate weekly lock maintenance after cutover | Update parent packages and regenerate the lockfile. Do not force every transitive copy to the highest major with overrides. Remove security overrides only after the upstream fix is verified. |
| Mermaid | Existing daily refresh workflow is the sole updater | Author App typecheck/build already run before proposal; browser visualizer smoke and owner review before merge. |
| Expo, React, React Native and native modules | Grouped proposals; latest values remain visible even when deliberately deferred | Upgrade one Expo SDK at a time using Expo's supported dependency set and `expo install --fix`; run Expo Doctor, mobile cache test, a device/development build, and web browser regression. Shared React pins must move together. |
| Python ingestion packages | Weekly pip Dependabot proposals | New PR job installs the proposed requirements under Python 3.12, checks dependency compatibility and native imports, and runs synthetic ingestion tests. No manuscripts, model weights, or Issue creation are needed for the gate. |
| GitHub Actions | Weekly Dependabot proposals | Review changed action behavior and runner requirements; relevant workflow must pass before merge. Versioned actions do not update their Node/Python/pnpm input values automatically. |
| Node.js | Weekly watch checks official Current and LTS releases separately | Stay on supported Node 24 LTS for routine patches. Verify the exact host patch after rebuild. Node 26 is a separate compatibility proposal; update .replit and every setup-node input together after full checks. |
| pnpm | Weekly npm registry comparison against all workflow pins | Update all pnpm/action-setup version inputs together, validate frozen install and v9 lockfile compatibility on Windows and Linux. Consider a root packageManager pin as a separate coordinated follow-up. |
| Python interpreter | Weekly official-release comparison; CI currently 3.12 and Replit 3.13 | Test the ingestion native build and fixtures before moving a minor line; coordinate setup-python inputs, cache keys and Replit module. Patch selectors float in CI, so record the actual run version. |
| PostgreSQL | Weekly official version table; configured Replit major 16 | Verify live server version first. Stay current within 16 where supported. A major upgrade requires backup, restore rehearsal, migration/reconciliation and rollback tests; a package bot cannot perform this safely. |
| Pandoc, Redis, Nix and native libraries | Weekly Pandoc/Redis release checks; monthly supported-channel review | Replit controls available modules and channel builds. Rebuild a preview, inspect actual versions, exercise ingestion/browser/Redis behavior, then release. NixOS upstream 26.05 does not prove a Replit channel of that name exists. |
| OpenAPI, ECMAScript, MCP and browser APIs | Monthly standards and SDK compatibility review | Update the code generator/SDK first. Regenerate API clients and Zod output and review the diff. Preserve the ES2022 browser target until supported client requirements change. |
| Hosted APIs, authentication and AI models | Monthly provider deprecation review, plus provider notices | Run account-switch, permission, provenance and representative synthetic model evaluations. Confirm costs, supported endpoints and provider routing before any model change. |

Routine version updates wait three days after release in the bot configuration; the existing pnpm minimum release age remains intact. GitHub documents that the Dependabot cooldown does not apply to security updates. A security fix can take the urgent review path without blanket disabling supply-chain controls. Major updates remain visible as proposals and must not merge merely because the version is numerically larger. [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## Ordered implementation and release plan

1. Merge the inventory, tests, Python/Actions coverage and read-only watch. Run Technology watch manually once; require a freshly dated artifact and zero lookup failures, or explicitly record each unavailable source. Check the first pip/Actions proposal and its CI run. The local run is not evidence that GitHub executed it.
2. Verify npm automation with an actual pnpm 11 proposal. The [Renovate candidate](maintenance/renovate-candidate.json) is deliberately outside Renovate's auto-discovered configuration paths. Install/authorize the Renovate GitHub App for this repository, copy the candidate to `renovate.json`, and validate a dry run. Then remove only the npm block from Dependabot in the same cutover change. Leave pip, Actions, and the dedicated Mermaid workflow with their existing owners. Do not run two npm update bots at once.
3. Prove that the candidate updates `pnpm-workspace.yaml`, nested manifests, security overrides and `pnpm-lock.yaml` together using pnpm 11.19.0. Require a passing frozen install on Linux and Windows. Renovate documents catalog/override/lock maintenance support and pnpm v11 registry handling; this repository-specific dry run remains required. [Renovate npm manager](https://docs.renovatebot.com/modules/manager/npm/), [pnpm v11 handling](https://github.com/renovatebot/renovate/blob/main/docs/usage/getting-started/private-packages.md).
4. Review the initial backlog in bounded groups: action maintenance and compatible packages first; TypeScript/Vite/testing tools next; Zod/codegen and backend packages with API tests; Expo/React as a separate migration. The September 20 compatibility repair restores `expo-file-system` and `expo-speech` to SDK 54 lines and passes Expo's dependency check. Keep future Expo/React majors separate and follow the [recorded migration checklist](reviews/2026-09-20-dependency-convergence.md); typecheck/build success does not establish native device acceptance.
5. The eight Replit executable versions were recorded above on September 19. Remaining host checks are the resolved native Nix derivations, PostgreSQL `SHOW server_version`, and published runtime/package versions. Refresh the executable observations after a workspace rebuild. Capture version strings only, never environment dumps or connection URLs. Local Windows observations are Node 24.11.1, pnpm 11.19.0 and Python 3.14.0rc1. They do not describe Replit; the local Python interpreter is a prerelease.
6. Once a proposal passes its gates, merge normally under repository protections. Verify deployment revision and relevant routes, then synchronize Replit with the approved GitHub revision and verify runtime versions. If validation or smoke checks fail, keep the current release; revert the upgrade commit if needed. For databases, use the rehearsed restoration plan rather than a code-only revert.
7. Every month, review deliberately deferred updates, deprecations, service contracts and runtime support. Record owner, reason and next review date for each hold. Weekly monitoring reports versions; it does not guarantee compatibility, automatic publication, or zero maintenance effort.

Expo requires coordinated dependency upgrades, not independent latest-version replacement. Its upgrade guide is the authority for the SDK migration sequence. [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Additional technologies and evidence boundaries

| Technology | In-place evidence | Current upstream / update treatment |
| --- | --- | --- |
| JavaScript / ECMAScript | ES2022 target and library in tsconfig.base.json; ESM and Node build scripts | ECMAScript 2026, 17th edition. A compiler target is a compatibility choice, not an out-of-date package to replace automatically. [Ecma](https://ecma-international.org/publications-and-standards/standards/ecma-262/) |
| HTML, CSS, DOM, Fetch, Web Audio, MediaRecorder | Browser source under artifacts and integration libraries | Living specifications and browser-implemented APIs; no single installed version. Verify the supported browser set and feature behavior. [WHATWG HTML](https://html.spec.whatwg.org/), [W3C CSS](https://www.w3.org/Style/CSS/) |
| JSON, YAML, TOML, Markdown/GFM, SQL, shell | Configuration, API spec, docs, database queries and .sh files | Update parsers, runtime/database engines and tooling listed in the inventory; do not invent binary versions for file formats. GitHub's hosted Markdown/Mermaid renderer is service-managed. |
| shadcn/ui source components | components.json and copied UI source in seven web surfaces | No installed shadcn runtime version or immutable source snapshot recorded. Radix, Tailwind and React versions are inventoried; inspect component diffs when refreshing copied source. [shadcn documentation](https://ui.shadcn.com/docs) |
| Git, GitHub, Pages, Actions runners, Replit, Nix | Repository/workflows; ubuntu-latest; .replit stable-25_05 | Hosted services do not expose one application-controlled stable version. Replit Git/Nix/Bash executable versions are recorded above; published runtime and resolved derivations remain unverified, and the Actions runner label floats. Upstream NixOS stable is 26.05, with Replit availability unverified. [NixOS release](https://nixos.org/blog/announcements/2026/nixos-2605/) |
| PostgreSQL / SQL, Redis, Pandoc | .replit PostgreSQL 16, native redis/pandoc; CI apt Pandoc | Latest releases are in the generated runtime table. Installed patches/native library versions require host evidence. PostgreSQL 16's current minor can be read in the full official version table. |
| Clerk, GitHub REST/GraphQL, OpenAI/Replit AI integration, SMTP | Clerk/Octokit/OpenAI/nodemailer SDKs and API routes | SDK releases are listed; hosted API versions and account capabilities require provider checks. No universal service SemVer. |
| MCP | Installed SDK exposes latest protocol 2025-11-25 and earlier compatible revisions; artifacts/mcp-server uses that SDK | Current published protocol is 2026-07-28. Protocol negotiation is not an independent npm dependency; test client/server compatibility when upgrading the SDK. The actual negotiated version requires a client session. [MCP versioning](https://modelcontextprotocol.io/specification/versioning) |
| OpenAI text generation | gpt-5.6-luna in storyworld routes | The official catalog includes GPT-6 Astra and GPT-5.6 variants. Different performance/cost classes are not automatic drop-in version upgrades. |
| OpenAI images | gpt-image-1 in integration clients | Current catalog includes GPT-Image-2.5 Sunburst and Flare; gpt-image-1 is marked deprecated. Evaluate endpoint support, quality, routing and cost before replacement. |
| OpenAI audio / transcription | gpt-audio, gpt-4o-mini-transcribe; whisper-1 in transcription route | Catalog lists GPT-Audio-1.5 and GPT-Transcribe among current options; gpt-audio is marked deprecated. Keep aliases/snapshots and endpoint capabilities explicit. |
| Phi-4-mini-instruct GGUF / llama.cpp | Workflow pins unsloth/Phi-4-mini-instruct-GGUF revision 78eb92a46fc37e6b524df991ed9aca9bc6aa7b80 plus filename, size and SHA-256 | A model revision is not SemVer. Preserve the verified weight contract; model replacement requires synthetic extraction evaluation. llama-cpp-python updates are tracked separately through pip. |
| Google Fonts | Hosted CSS references DM Sans, JetBrains Mono, Alfa Slab One; mobile Inter package | Hosted font CSS is unpinned/service-managed; Inter's package version is inventoried. Self-host immutable fonts only as a separate design/performance change. |
| Skill support packages | Seven .agents package manifests, each version 0.1.0 with no external package dependencies | Internal authoring/test support, separate from shipped product dependencies. Example dependencies in skill documentation are not installed product technology. |

Model facts above were checked against the [official OpenAI catalog](https://developers.openai.com/api/docs/models/all) on the research date. They identify migration candidates, not a recommendation to change creative processing or rights-sensitive behavior automatically. Provider access through Replit remains unverified.

## Reproduce the inventory

After a normal frozen workspace install:

```sh
node --test scripts/check-technology-updates.test.mjs
node scripts/check-technology-updates.mjs --offline
node scripts/check-technology-updates.mjs --include-transitive --write
```

If a registry rate-limits a partial run, use `--resume` with the last command. It reuses successful release observations younger than one hour and preserves their per-row check timestamps. Normal scheduled runs fetch fresh data. Requests are paced and retries bounded. Prerelease npm latest tags fall back to the highest numeric stable release. The script returns 2 on retrieval/parsing failure, and optional `--fail-on-outdated` returns 1 when a package has a newer stable release. Detection never edits package versions or installs dependencies.

## Remaining unknowns and next check

Local validation completed for this maintenance change:

- Four inventory tests passed, including catalog resolution, multiple locked versions, prerelease/yanked release filtering, numeric comparison and full repository extraction.
- `pnpm run typecheck` and `pnpm run build` passed. The September 20 full workspace build also passed, including iOS and Android Metro bundles. Existing source-map/chunk-size notices remain; Expo's dependency compatibility check now passes. Bundles do not establish native device acceptance.
- All 18 synthetic ingestion tests passed under isolated Python 3.12.10 with the repository's pytest/pdfplumber/python-docx pins and checksum-verified Pandoc 3.11. The Linux native llama-cpp-python installation, imports, dependency check and synthetic tests also passed in [PR #16's ingestion run](https://github.com/OKHP3/telling-forward/actions/runs/35421134813).
- The changed workflows passed actionlint 1.7.12 (shellcheck/pyflakes were unavailable and disabled). Dependabot and the Renovate candidate passed JSON-schema validation. These checks do not establish a successful hosted updater dry run.

| Claim | Tier | Evidence | Consequence if false | Next check |
| --- | --- | --- | --- | --- |
| Local source and GitHub main baseline matched at audit start | Confirmed | Both refs 8f79f5f90be2b1d116886054b29c21b45309f0e4; GitHub connector package.json matched | Audit could otherwise compare the wrong baseline | Recheck before publication |
| Replit executes those exact locked versions | Unknown | Workspace executable versions recorded above; pnpm differs from CI; published packages not inspected | Published runtime could differ from source | Coordinate pnpm and verify frozen install plus deployed package versions |
| Every native library has a known installed version | Unknown | .replit lists packages and a channel, not resolved derivations | Native/browser compatibility cannot be certified | Record Replit derivation closure; refresh the recorded executable versions after a rebuild |
| Python transitive environment is reproducible | Unknown | Requirements pin six direct packages but no full Python lock | Future installation can change transitive packages | Capture a resolved environment in Python 3.12 and introduce a reviewed lock |
| Dependency bot can update pnpm 11 correctly | Unknown | Official Dependabot table stops at v10 | Updates may stall or churn lockfiles | Successful real update PR and frozen install |
| All newer stable releases are compatible | Proposal only | Version comparison is not runtime testing | Blind upgrades can break native clients or behavior | Validate each bounded upgrade using the gates above |

The next actions are to review the generated update proposals, coordinate the pnpm versions, and verify the pnpm 11 updater before declaring all continuous upgrade channels operational.
