# Open Questions Log

Tracks the unresolved questions from `docs/platform-requirements.md`, Section 15. Each row stays **Open** until the project owner records a decision here. Do not convert an Open question into an assumption in code.

| # | Title | Question | Status | Blocks | Decision |
|---|---|---|---|---|---|
| 15.1 | Repository-per-storyworld | One repo per storyworld, or one repo with multiple storyworlds? (Sections 4, 6.1) | Open | GitHub sync layer repository-discovery design | |
| 15.2 | Contributor identity model | Platform-native identity with service-account commits, or bring-your-own GitHub identity? (Section 7.2) | Open | `contributors` table design; commit-authoring flow; contributor sign-in work | |
| 15.3 | Production web app package location | New `artifacts/web` package, or promote `mockup-sandbox`? (Section 11; recommended: new package) | Open | Web app frontend work beyond the mockup sandbox | |
| 15.4 | Code license | No code license file confirmed at the repository root; only content/story licensing is documented. What license applies to platform code? | Open | Any code-reuse or open-source-adjacent decision | |
| 15.5 | `attached_assets/` content boundary | The directory contains creative source material whose public/private status relative to the platform is not documented. What is the boundary? | Open | Publication work touching `attached_assets/` | |
| 15.6 | GitHub App vs. PAT | GitHub App (recommended) or continued PAT usage for the platform's own read/write integration? (Section 6.1) | Open | Octokit wiring in the GitHub sync layer | |
| 15.7 | Mobile scope and timing | The Expo-compatible React version pin signals intent, but there is no scaffolded mobile package and no stated timeline. When and how does mobile land? | Open | Voice-first mobile companion work | |

## How to record a decision

1. Change **Status** from Open to Decided.
2. Fill in **Decision** with the choice, the date, and who made the call.
3. Update `docs/platform-requirements.md` and `AGENTS.md` if the decision changes a documented claim.
