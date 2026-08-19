/**
 * GitHub client for the MCP server, Issues-only.
 *
 * Deliberately separate from artifacts/api-server/src/lib/github.ts rather
 * than shared: that client authenticates with the app's own GITHUB_PAT
 * secret and talks to branches/commits/PRs. This client authenticates
 * with a token the *end user* supplies (their own PAT or fine-grained
 * token, scoped to the one storyworld repo they're contributing to) and
 * only ever touches Issues. Nothing here should ever read process.env
 * for a Telling-Forward-owned secret — that would defeat the point of
 * this being the "bring your own AI, bring your own GitHub identity" tier.
 *
 * Mirrors the interface-behind-a-factory shape used in
 * artifacts/api-server/src/lib/github.ts so the two clients stay easy to
 * compare, even though they intentionally do not share code.
 */

import { Octokit } from "@octokit/rest";
import type { CapsuleKind } from "./capsule-schema.js";

export interface DraftCapsuleIssue {
  number: number;
  url: string;
}

export interface GitHubIssueClient {
  /** List issues carrying a canonical `capsule:<type>` label so a host can
   * build canon context before drafting new capsules (avoid proposing a
   * character that already exists, etc.). */
  listCapsuleIssues(owner: string, repo: string): Promise<
    Array<{ number: number; title: string; body: string; labels: string[] }>
  >;
  /** Create a new draft capsule as a GitHub Issue. Always labeled with the
   * canonical `capsule:<type>` label plus `state:draft` — this client never
   * creates an issue in any other state. Promotion out of draft is a human
   * action taken in the Concept Board UI, not something this MCP server does. */
  createDraftCapsule(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    kind: CapsuleKind;
  }): Promise<DraftCapsuleIssue>;
}

const CAPSULE_LABEL_PREFIX = "capsule:";
const DRAFT_STATE_LABEL = "state:draft";

class OctokitIssueClient implements GitHubIssueClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listCapsuleIssues(owner: string, repo: string) {
    const results: Array<{ number: number; title: string; body: string; labels: string[] }> = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.issues.listForRepo,
      { owner, repo, state: "all", per_page: 100 },
    )) {
      for (const issue of page.data) {
        // The Issues API also returns PRs (they share the same underlying
        // object in GitHub's model) — exclude those explicitly.
        if ("pull_request" in issue) continue;
        // GitHub only accepts exact label filters, so enforce the canonical
        // capsule:* contract locally rather than querying the obsolete bare
        // "capsule" label.
        const labels = issue.labels.map((label) =>
          typeof label === "string" ? label : (label.name ?? ""),
        );
        if (!labels.some((label) => label.startsWith(CAPSULE_LABEL_PREFIX))) {
          continue;
        }
        results.push({
          number: issue.number,
          title: issue.title,
          body: issue.body ?? "",
          labels,
        });
      }
    }
    return results;
  }

  async createDraftCapsule(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    kind: CapsuleKind;
  }): Promise<DraftCapsuleIssue> {
    const { owner, repo, title, body, kind } = params;
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: [`${CAPSULE_LABEL_PREFIX}${kind}`, DRAFT_STATE_LABEL],
    });
    return { number: data.number, url: data.html_url };
  }
}

let _client: GitHubIssueClient | null = null;
let _clientToken: string | null = null;

/** Factory reads GITHUB_TOKEN — the *user's own* token, set when they
 * launch this MCP server locally, never the platform's GITHUB_PAT. */
export function getGitHubIssueClient(): GitHubIssueClient {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. This MCP server acts under your own GitHub " +
        "identity, not Telling Forward's — set GITHUB_TOKEN to a personal " +
        "access token scoped to the storyworld repo you're contributing to " +
        "before starting this server. See README.md.",
    );
  }
  if (!_client || _clientToken !== token) {
    _client = new OctokitIssueClient(token);
    _clientToken = token;
  }
  return _client;
}

/** Inject a mock for testing. */
export function setGitHubIssueClient(client: GitHubIssueClient): void {
  _client = client;
  _clientToken = "test-override";
}
