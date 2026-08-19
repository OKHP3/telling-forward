/**
 * Capsule schema for MCP-driven ingestion.
 *
 * Confirmed context (project memory, 2026-08-17 planning thread): a
 * "capsule" is Concept Board's atomic unit — a character persona, arc beat,
 * or planned event, captured before it's promoted to a scene. Capsules are
 * intentionally lightweight and are not the same object as a `proposal`
 * (which maps to a GitHub pull request in lib/db/src/schema/telling-forward.ts
 * and carries the full draft/submitted/under-review/returned-with-notes/
 * accepted-into-canon/published-alternate state machine).
 *
 * Inferred, not confirmed: as of this file's authoring there is no
 * `capsules` table in lib/db/src/schema/telling-forward.ts and no
 * capsules.ts route in artifacts/api-server/src/routes/, and
 * artifacts/api-server/src/lib/github.ts has no Issues API usage at all.
 * That means capsule storage as a GitHub Issue — the design recorded in
 * project memory — has no implementation elsewhere in this repository yet.
 * This MCP server is the first code to act on that design. Flag any
 * divergence you find between this file and a later capsules API for the
 * project owner to reconcile, don't silently pick a side.
 *
 * A capsule stays in a single state for MCP-driven ingestion: draft. It
 * only becomes a `proposal` (and enters the six-state machine above) when
 * a human deliberately promotes it via the Concept Board's existing
 * "Promote to scene" action, per the confirmed non-linear authorship model.
 * Nothing in this MCP server auto-promotes a capsule.
 */

import { z } from "zod";

export const CapsuleKindSchema = z.enum([
  "character",
  "arc-beat",
  "planned-event",
  "motif",
]);
export type CapsuleKind = z.infer<typeof CapsuleKindSchema>;

export const CharacterRoleSchema = z.enum([
  "protagonist",
  "antagonist",
  "supporting",
  "unspecified",
]);

export const CapsuleSchema = z.object({
  kind: CapsuleKindSchema.describe(
    "What kind of atomic idea this capsule represents.",
  ),
  title: z
    .string()
    .min(1)
    .max(120)
    .describe("Short, human-scannable label. E.g. a character's name, or a one-line beat."),
  body: z
    .string()
    .min(1)
    .describe(
      "The capsule content itself, in the ingesting model's own words. This is a draft " +
        "for human review, not finished prose — keep it concise rather than exhaustive.",
    ),
  role: CharacterRoleSchema.optional().describe(
    "Only meaningful when kind === 'character'. Omit for non-character capsules.",
  ),
  sourceExcerpt: z
    .string()
    .max(2000)
    .optional()
    .describe(
      "The manuscript passage this capsule was drawn from, trimmed to a representative " +
        "excerpt. Lets a human reviewer verify the capsule against the source without " +
        "re-reading the whole submission.",
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "The ingesting model's own confidence that this capsule is accurate and non-redundant " +
        "with existing canon. Low-confidence capsules should still be created — the review " +
        "gate is a human, not this field — but the label helps a steward triage a large batch.",
    ),
});

export type Capsule = z.infer<typeof CapsuleSchema>;

/** JSON Schema form, for the get_capsule_schema tool's output — MCP hosts
 * that aren't TypeScript/zod-aware still need a plain schema to read. */
export function capsuleJsonSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "TellingForwardCapsule",
    type: "object",
    required: ["kind", "title", "body", "confidence"],
    properties: {
      kind: { type: "string", enum: CapsuleKindSchema.options },
      title: { type: "string", minLength: 1, maxLength: 120 },
      body: { type: "string", minLength: 1 },
      role: { type: "string", enum: CharacterRoleSchema.options },
      sourceExcerpt: { type: "string", maxLength: 2000 },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
  };
}
