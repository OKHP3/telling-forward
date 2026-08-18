#!/usr/bin/env node
/**
 * Telling Forward MCP server entrypoint.
 *
 * Run this locally under your own MCP host (Claude Code, Claude Desktop,
 * or another MCP-capable client) — see README.md for setup. This process
 * never calls an AI provider and never holds an AI credential. It only
 * talks to GitHub, using the GITHUB_TOKEN you supply.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetCapsuleSchema } from "./tools/get-capsule-schema.js";
import { registerReadCanon } from "./tools/read-canon.js";
import { registerCreateDraftCapsule } from "./tools/create-draft-capsule.js";

async function main() {
  const server = new McpServer({
    name: "telling-forward-mcp",
    version: "0.0.0",
  });

  registerGetCapsuleSchema(server);
  registerReadCanon(server);
  registerCreateDraftCapsule(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("telling-forward-mcp failed to start:", err);
  process.exit(1);
});
