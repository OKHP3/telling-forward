import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubIssueClient } from "../github-client.js";

/**
 * read_canon — lists existing draft/accepted capsules for a storyworld so
 * the calling AI has context before proposing new ones (avoid re-inventing
 * a character that already exists, contradicting an established beat,
 * etc.). Read-only.
 */
export function registerReadCanon(server: McpServer): void {
  server.registerTool(
    "read_canon",
    {
      title: "Read existing capsules for a storyworld",
      description:
        "Lists existing capsules (labeled 'capsule' on GitHub Issues) for the given " +
        "storyworld repository, so new capsules can be checked against what already " +
        "exists before creation. Call this before create_draft_capsule when ingesting " +
        "more than a trivial amount of material.",
      inputSchema: {
        owner: z.string().min(1).describe("GitHub org or user that owns the storyworld repo."),
        repo: z.string().min(1).describe("Storyworld repository name."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ owner, repo }) => {
      try {
        const client = getGitHubIssueClient();
        const issues = await client.listCapsuleIssues(owner, repo);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                issues.map((i) => ({ number: i.number, title: i.title, labels: i.labels })),
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error reading canon: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
