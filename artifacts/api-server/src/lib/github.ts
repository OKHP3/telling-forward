/**
 * GitHub client module for the Telling Forward sync layer.
 *
 * Architecture intent (Section 6.1 of platform-requirements.md):
 *   - Currently uses a PAT for the prototype; swap to a GitHub App by changing
 *     ONLY the `createOctokit` factory — route handlers and service functions
 *     must not reference the token directly.
 *   - Structured behind a `GitHubClientInterface` so tests can inject a mock
 *     without modifying route handlers.
 */

import { Octokit } from "@octokit/rest";
import { graphql as createGraphql } from "@octokit/graphql";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Public interface — swap the implementation without touching callers
// ---------------------------------------------------------------------------

export interface GitHubBranch {
  name: string;
  sha: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string | null;
  authorEmail: string | null;
  timestamp: string;
}

export interface GitHubPullRequest {
  number: number;
  state: "open" | "closed";
  merged: boolean;
  /** SHA of the merge commit; only present when merged === true */
  mergeCommitSha: string | null;
  title: string;
  headRef: string;
  baseRef: string;
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
}

export interface GitHubPullRequestReview {
  id: number;
  state: string; // e.g. "COMMENTED", "REQUEST_CHANGES", "APPROVED"
  body: string;
}

export interface CreateBranchParams {
  owner: string;
  repo: string;
  branchName: string;
  fromRef: string;
}

export interface CreateCommitParams {
  owner: string;
  repo: string;
  branch: string;
  /** Map of file path → UTF-8 content */
  files: Record<string, string>;
  message: string;
  authorName: string;
  authorEmail: string;
}

export interface MergePullRequestParams {
  owner: string;
  repo: string;
  prNumber: number;
  /** Commit title written to GitHub — must use platform vocabulary, not Git jargon */
  commitTitle: string;
}

export interface CreatePullRequestReviewParams {
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
  /** 'COMMENT' leaves a note; 'REQUEST_CHANGES' also blocks further merges until answered */
  event: "COMMENT" | "REQUEST_CHANGES";
}

export interface GitHubClientInterface {
  listBranches(owner: string, repo: string): Promise<GitHubBranch[]>;
  listCommitsForBranch(
    owner: string,
    repo: string,
    branch: string,
    maxPages?: number,
  ): Promise<GitHubCommit[]>;
  listOpenPullRequests(
    owner: string,
    repo: string,
  ): Promise<GitHubPullRequest[]>;
  getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequest | null>;
  /**
   * Return all reviews for a pull request (most recent first).
   * Used to detect whether a review was already posted before retrying.
   */
  listPullRequestReviews(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequestReview[]>;
  createBranch(params: CreateBranchParams): Promise<void>;
  createCommit(params: CreateCommitParams): Promise<string>;
  /**
   * Merge a pull request into its base branch.
   * Section 6.3: "Accept into canon"
   * Returns the SHA of the resulting merge commit.
   */
  mergePullRequest(params: MergePullRequestParams): Promise<string>;
  /**
   * Post a PR review (editor question) or change-request.
   * Section 6.3: "Leave an editor question" / "Return with notes"
   * Returns the review ID.
   */
  createPullRequestReview(
    params: CreatePullRequestReviewParams,
  ): Promise<number>;
}

// ---------------------------------------------------------------------------
// Concrete implementation
// ---------------------------------------------------------------------------

class OctokitGitHubClient implements GitHubClientInterface {
  private readonly octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const results: GitHubBranch[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.repos.listBranches,
      { owner, repo, per_page: 100 },
    )) {
      for (const b of page.data) {
        results.push({ name: b.name, sha: b.commit.sha });
      }
    }
    return results;
  }

  async listCommitsForBranch(
    owner: string,
    repo: string,
    branch: string,
    maxPages = 10,
  ): Promise<GitHubCommit[]> {
    const results: GitHubCommit[] = [];
    let page = 1;
    while (page <= maxPages) {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: 100,
        page,
      });
      for (const c of data) {
        results.push({
          sha: c.sha,
          message: c.commit.message,
          authorName: c.commit.author?.name ?? null,
          authorEmail: c.commit.author?.email ?? null,
          timestamp: c.commit.author?.date ?? new Date().toISOString(),
        });
      }
      if (data.length < 100) break;
      page++;
    }
    return results;
  }

  async listOpenPullRequests(
    owner: string,
    repo: string,
  ): Promise<GitHubPullRequest[]> {
    const results: GitHubPullRequest[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.pulls.list,
      { owner, repo, state: "all", per_page: 100 },
    )) {
      for (const pr of page.data) {
        results.push({
          number: pr.number,
          state: pr.state === "open" ? "open" : "closed",
          merged: !!pr.merged_at,
          mergeCommitSha: pr.merge_commit_sha ?? null,
          title: pr.title,
          headRef: pr.head.ref,
          baseRef: pr.base.ref,
          createdAt: pr.created_at,
          closedAt: pr.closed_at ?? null,
          mergedAt: pr.merged_at ?? null,
        });
      }
    }
    return results;
  }

  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequest | null> {
    try {
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      return {
        number: pr.number,
        state: pr.state === "open" ? "open" : "closed",
        merged: !!pr.merged_at,
        mergeCommitSha: pr.merge_commit_sha ?? null,
        title: pr.title,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        createdAt: pr.created_at,
        closedAt: pr.closed_at ?? null,
        mergedAt: pr.merged_at ?? null,
      };
    } catch {
      return null;
    }
  }

  async listPullRequestReviews(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequestReview[]> {
    const results: GitHubPullRequestReview[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.pulls.listReviews,
      { owner, repo, pull_number: prNumber, per_page: 100 },
    )) {
      for (const r of page.data) {
        results.push({ id: r.id, state: r.state, body: r.body });
      }
    }
    // Return most-recent first so callers find the latest matching review
    return results.reverse();
  }

  /**
   * Create a new branch from a given ref (SHA or branch name).
   * Section 6.3: "Start a new path from a story seed"
   */
  async createBranch(params: CreateBranchParams): Promise<void> {
    const { owner, repo, branchName, fromRef } = params;

    // Resolve the SHA of the source ref
    let sha: string;
    try {
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromRef}`,
      });
      sha = ref.object.sha;
    } catch {
      // fromRef might already be a SHA
      sha = fromRef;
    }

    await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
  }

  async mergePullRequest(params: MergePullRequestParams): Promise<string> {
    const { owner, repo, prNumber, commitTitle } = params;
    const { data } = await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      commit_title: commitTitle,
      merge_method: "merge",
    });
    if (!data.merged) {
      throw new Error(`GitHub merge was not completed: ${data.message}`);
    }
    return data.sha;
  }

  async createPullRequestReview(
    params: CreatePullRequestReviewParams,
  ): Promise<number> {
    const { owner, repo, prNumber, body, event } = params;
    const { data } = await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
    });
    return data.id;
  }

  /**
   * Create a commit with one or more files on an existing branch.
   * Section 6.3: "Submit a contribution"
   * Uses the tree/blob API for multi-file commits.
   */
  async createCommit(params: CreateCommitParams): Promise<string> {
    const { owner, repo, branch, files, message, authorName, authorEmail } =
      params;

    // 1. Get the current HEAD of the branch
    const { data: ref } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const parentSha = ref.object.sha;

    // 2. Get the tree SHA of the parent commit
    const { data: parentCommit } = await this.octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: parentSha,
    });
    const baseTreeSha = parentCommit.tree.sha;

    // 3. Create blobs for each file
    const treeItems = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner,
          repo,
          content,
          encoding: "utf-8",
        });
        return {
          path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      }),
    );

    // 4. Create a new tree
    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // 5. Create the commit
    const now = new Date().toISOString();
    const { data: newCommit } = await this.octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [parentSha],
      author: { name: authorName, email: authorEmail, date: now },
      committer: { name: authorName, email: authorEmail, date: now },
    });

    // 6. Update the branch reference
    await this.octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return newCommit.sha;
  }
}

// ---------------------------------------------------------------------------
// GraphQL client (for future N+1-safe queries — Section 6.2)
// ---------------------------------------------------------------------------

export function createGraphqlClient(token?: string) {
  if (!token) return null;
  return createGraphql.defaults({ headers: { authorization: `token ${token}` } });
}

// ---------------------------------------------------------------------------
// Singleton factory (PAT-based prototype; swap to App tokens here later)
// ---------------------------------------------------------------------------

let _client: GitHubClientInterface | null = null;

export function getGitHubClient(): GitHubClientInterface {
  if (!_client) {
    const token = process.env["GITHUB_PAT"];
    if (!token) {
      logger.warn(
        "GITHUB_PAT not set — GitHub client will make unauthenticated requests (60 req/hr limit)",
      );
    }
    _client = new OctokitGitHubClient(token);
  }
  return _client;
}

/** Inject a mock for testing — call before any route handler under test */
export function setGitHubClient(client: GitHubClientInterface): void {
  _client = client;
}
