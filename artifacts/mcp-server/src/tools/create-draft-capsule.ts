import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CapsuleKindSchema, CharacterRoleSchema } from "../capsule-schema.js";
import { getGitHubIssueClient } from "../github-client.js";

/**
 * create_draft_capsule — the one write action this server exposes. Always
 * creates a GitHub Issue labeled capsule:<kind> + state:draft. Never merges,
 * never promotes, never touches a pull request or canon branch. Promotion is
 * a deliberate human action taken later in the Concept Board UI.
 *
 * Per docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md: the
 * MCP host (the user's own Claude Code, Claude Desktop, or other
 * MCP-capable client) is expected to surface each tool call for the
 * user's approval before it fires, per that host's own permission model.
 * This server does not implement its own confirmation step — it relies
 * on the host, same as any other MCP write tool.
 */
export function registerCreateDraftCapsule(server: McpServer): void {
  server.registerTool(
    "create_draft_capsule",
    {
      title: "Create a draft capsule",
      description:
        "Creates one new draft capsule as a GitHub Issue labeled " +
        "'capsule:<kind>' and 'state:draft' on the given storyworld repository. " +
        "Call get_capsule_schema first and read_canon before batches, to avoid " +
        "duplicating existing capsules.",
      inputSchema: {
        owner: z.string().min(1).describe("GitHub org or user that owns the storyworld repo."),
        repo: z.string().min(1).describe("Storyworld repository name."),
        kind: CapsuleKindSchema,
        title: z.string().min(1).max(120),
        body: z.string().min(1),
        role: CharacterRoleSchema.optional(),
        sourceExcerpt: z.string().max(2000).optional(),
        confidence: z.enum(["high", "medium", "low"]),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ owner, repo, kind, title, body, role, sourceExcerpt, confidence }) => {
      try {
        const client = getGitHubIssueClient();
        const issueBody = [
          `**Kind:** ${kind}`,
          role ? `**Role:** ${role}` : null,
          `**Confidence:** ${confidence}`,
          "",
          body,
          sourceExcerpt ? `\n---\n**Source excerpt:**\n\n> ${sourceExcerpt.replace(/\n/g, "\n> ")}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n");

        const created = await client.createDraftCapsule({
          owner,
          repo,
          title,
          body: issueBody,
          kind,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Created draft capsule #${created.number}: ${created.url}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error creating draft capsule: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
