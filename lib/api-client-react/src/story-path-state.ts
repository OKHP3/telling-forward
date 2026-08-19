import { StoryPathState } from "./generated/api.schemas";

export type StoryPathStateValue =
  (typeof StoryPathState)[keyof typeof StoryPathState];

export type StoryPathClassification = "canon" | "alternate" | "development";

/**
 * Single source of truth for how a story path state is presented to readers.
 *
 * This Record is keyed on the full StoryPathState enum, so adding a new state
 * to the OpenAPI spec (and regenerating) breaks the workspace typecheck here
 * until the new state is classified — preventing paths from silently
 * disappearing from reader UIs.
 */
const CLASSIFICATION: Record<StoryPathStateValue, StoryPathClassification> = {
  personal: "development",
  proposed: "development",
  open: "canon",
  "published-canon": "canon",
  "published-alternate": "alternate",
};

export function classifyStoryPathState(state: string): StoryPathClassification {
  return CLASSIFICATION[state as StoryPathStateValue] ?? "development";
}

export function isCanonState(state: string): boolean {
  return classifyStoryPathState(state) === "canon";
}

export function isAlternateState(state: string): boolean {
  return classifyStoryPathState(state) === "alternate";
}

export function isDevelopmentState(state: string): boolean {
  return classifyStoryPathState(state) === "development";
}
