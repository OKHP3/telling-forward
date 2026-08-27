# GitHub App Private-Pilot Acceptance Evidence

**Date:** 2026-08-27  
**Repository:** `OKHP3/telling-forward-pilot-grove`  
**Visibility:** Private  
**Result:** Passed

## Evidence boundary

This acceptance run used the configured GitHub App credentials. It did not read
or use `GITHUB_PAT`, and it did not print or persist any installation token or
private key. The only write operation was creation and deletion of an empty
temporary branch from the pilot repository's default branch. No canon content
or story file was changed.

## App identity and installation scope

- App ID: `4720041`
- App slug: `telling-forward-platform`
- Installation ID: `156600820`
- Installation account: `OKHP3`
- Repository selection: `selected`
- Accessible repository: `OKHP3/telling-forward-pilot-grove`
- Pilot repository: private, default branch `main`
- Installation permissions observed: Actions write, Contents write, Issues
  write, Metadata read, Pull requests write

The selected installation exposed only the named private pilot repository in
the accessible-repository response.

## Token lifecycle

Two installation tokens were requested with forced refresh enabled:

- First token expiry: `2026-08-27T17:45:54Z`
- Second token expiry: `2026-08-27T17:45:54Z`
- Token values differed: yes

Only expiry metadata was recorded. The token values were never logged.

## Write and audit identity

The App created and then deleted a temporary empty branch. GitHub identified
the service actor as `telling-forward-platform[bot]`. The App identity, installation
account, and write-capable installation permission were all returned by
GitHub during the same run.

This is service-identity evidence, not a claim that a separate organization
audit-log export was performed. Human contributor attribution remains
application-owned and must continue to use the signed provenance contract.

## Rollback boundary

The App-versus-PAT boundary remains configuration-only:

- Complete App configuration selects installation-scoped authentication.
- Partial App configuration fails closed rather than falling back.
- Removing all App variables leaves the explicit private-pilot PAT fallback.
- The PAT is reserved for the private-pilot rollback and workspace auto-push
  boundary; it was not used in this acceptance run.

The configuration rollback behavior is covered by
`artifacts/api-server/src/lib/github-auth.test.ts`.

## Repeatable commands

```bash
pnpm --filter @workspace/api-server run test:github-app:smoke
pnpm --filter @workspace/api-server test -- src/lib/github-auth.test.ts
```

The smoke command requires `GITHUB_APP_ID`,
`GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY` in Replit Secrets.