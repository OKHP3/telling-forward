export const CAPSULE_TYPE_LABELS = {
  character: "Character",
  arc: "Arc",
  event: "Event",
  "arc-beat": "Arc Beat",
  "planned-event": "Planned Event",
  motif: "Motif",
} as const;

export type ConceptBoardCapsuleType = keyof typeof CAPSULE_TYPE_LABELS;