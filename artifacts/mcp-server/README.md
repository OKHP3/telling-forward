# Telling Forward MCP server

Bring your own AI. This package exposes three tools over the Model Context
Protocol so **your own** Claude Code, Claude Desktop, or another
MCP-capable client can read a manuscript you're working from and file
draft capsules into a Telling Forward storyworld, using your own AI
subscription and your own GitHub identity.

This process never calls an AI provider and never holds an AI credential.
It only talks to GitHub, with a token you supply. See
`docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md` for the full
reasoning behind this tier and how it relates to the free, zero-setup
GitHub Actions ingestion tier.

Status: prototype scaffold. Tool listing, schema output, and the
no-token error path are verified by a local smoke test (see the ADR).
`read_canon` and `create_draft_capsule` have not yet been exercised
against a real GitHub repository — do that before relying on this in
production.

## Tools

- `get_capsule_schema` — read-only, no GitHub call. Returns the JSON
  Schema a draft capsule must match. Call this first.
- `read_canon` — read-only. Lists existing capsules (GitHub Issues
  labeled `capsule`) for a storyworld, so new capsules can be checked
  against what already exists.
- `create_draft_capsule` — the only write action. Creates one GitHub
  Issue labeled `capsule` and `state:draft`. Never promotes, never
  touches a pull request or the canon branch. Your MCP host should
  surface this call for your approval before it fires, the same way it
  would any other write-capable tool — this server does not add its own
  confirmation step on top of that.

## Setup

1. Create a GitHub personal access token (fine-grained, scoped to just the
   storyworld repository you're contributing to; `issues: write` is the
   only permission this server needs).
2. Build this package: `pnpm --filter @workspace/mcp-server run build`.
3. Add it to your MCP host's config. For Claude Code or Claude Desktop,
   add an entry like:

   ```json
   {
     "mcpServers": {
       "telling-forward": {
         "command": "node",
         "args": ["/absolute/path/to/artifacts/mcp-server/dist/index.mjs"],
         "env": { "GITHUB_TOKEN": "your-token-here" }
       }
     }
   }
   ```

4. In a conversation with your AI client, point it at a manuscript file
   and ask it to propose capsules for a named storyworld repo. It will
   call `get_capsule_schema`, optionally `read_canon`, then
   `create_draft_capsule` once per capsule it proposes.

## What this deliberately does not do

- Does not call any AI provider. That's the whole point — the reasoning
  happens in your MCP host, under your subscription or your local model.
- Does not promote a capsule to a scene or touch canon. Promotion stays a
  deliberate human action in the Concept Board UI.
- Does not use Telling Forward's own `GITHUB_PAT`. It only ever uses the
  `GITHUB_TOKEN` you provide, scoped to your own GitHub identity.
