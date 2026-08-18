import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { capsuleJsonSchema } from "../capsule-schema.js";

/**
 * get_capsule_schema — zero-argument tool. Returns the JSON Schema for a
 * Telling Forward capsule so the calling AI (running under the user's own
 * subscription or local model) knows exactly what shape to produce before
 * it starts reading the manuscript. Read-only, no GitHub call, no
 * side effects — safe to call as often as the host wants.
 */
export function registerGetCapsuleSchema(server: McpServer): void {
  server.registerTool(
    "get_capsule_schema",
    {
      title: "Get Telling Forward capsule schema",
      description:
        "Returns the JSON Schema a draft capsule must conform to before calling " +
        "create_draft_capsule. Call this first, before reading any manuscript text, " +
        "so extraction output matches the shape Concept Board expects.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(capsuleJsonSchema(), null, 2),
          },
        ],
      };
    },
  );
}
