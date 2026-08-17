/**
 * GitHub account linking helpers.
 *
 * The GitHub OAuth flow requires a full browser navigation to GitHub's
 * authorization page — it cannot be initiated as XHR/fetch because GitHub
 * itself does not support CORS on its OAuth endpoint.
 *
 * Usage in a React component:
 *
 *   import { navigateToGithubLink } from "@workspace/api-client-react";
 *
 *   <button onClick={navigateToGithubLink}>Link your GitHub account</button>
 */

import { getBaseUrl } from "./custom-fetch";

/**
 * Navigate the browser to the GitHub OAuth authorization page.
 * The server will redirect to GitHub, which redirects back to /callback,
 * which redirects back to the frontend with ?github_link=success|denied|error.
 *
 * Call this in a click handler or event callback — NOT inside a React Query
 * hook or useEffect that runs on render. This replaces the current page.
 */
export function navigateToGithubLink(): void {
  const base = getBaseUrl() ?? "";
  window.location.assign(`${base}/api/auth/github/authorize`);
}

/**
 * Returns the GitHub authorize URL without navigating.
 * Use when you need the URL string rather than triggering navigation directly,
 * e.g. to render an anchor tag with href.
 */
export function getGithubLinkUrl(): string {
  const base = getBaseUrl() ?? "";
  return `${base}/api/auth/github/authorize`;
}
