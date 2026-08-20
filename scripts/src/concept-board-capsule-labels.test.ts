import assert from "node:assert/strict";
import test from "node:test";
import { CAPSULE_TYPE_LABELS } from "../../artifacts/web/src/lib/capsule-type-labels";

test("Concept Board labels every supported capsule kind accurately", () => {
  assert.deepEqual(CAPSULE_TYPE_LABELS, {
    character: "Character",
    arc: "Arc",
    event: "Event",
    "arc-beat": "Arc Beat",
    "planned-event": "Planned Event",
    motif: "Motif",
  });
});