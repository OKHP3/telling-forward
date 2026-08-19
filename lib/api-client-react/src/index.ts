export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, getBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export {
  classifyStoryPathState,
  isCanonState,
  isAlternateState,
  isDevelopmentState,
} from "./story-path-state";
export type {
  StoryPathClassification,
  StoryPathStateValue,
} from "./story-path-state";
export type { AuthTokenGetter } from "./custom-fetch";
// GitHub OAuth linking: use these helpers, NOT the generated useGithubAuthorize hook.
// GitHub's OAuth endpoint does not support CORS; the flow must be a browser navigation.
export { navigateToGithubLink, getGithubLinkUrl } from "./github-link";
