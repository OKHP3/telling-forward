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
  authorLogin: string | null;
  timestamp: string;
}

export interface GitHubActor {
  login: string;
  displayName: string | null;
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
  headSha: string;
  baseSha: string;
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: GitHubActor | null;
  mergedBy: GitHubActor | null;
}

export interface GitHubPullRequestReview {
  id: number;
  state: string; // e.g. "COMMENTED", "REQUEST_CHANGES", "APPROVED"
  body: string;
  submittedAt: string | null;
}

export interface GitHubPullRequestComment {
  id: number;
  body: string;
  createdAt: string;
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
  /** GitHub rejects the merge if the submitted head changed since review. */
  expectedHeadSha?: string;
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

// ---------------------------------------------------------------------------
// Issues (Capsule data layer — ADR-0001 §Capsules)
// ---------------------------------------------------------------------------

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  /** Raw label names only — callers extract type/role from the `capsule:*` / `role:*` prefix */
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListIssuesParams {
  owner: string;
  repo: string;
  /** Filter by label name(s) — all must be present */
  labels?: string[];
  state?: "open" | "closed" | "all";
}

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

export interface UpdateIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  title?: string;
  body?: string;
  /** Full replacement label list — omit to leave labels unchanged */
  labels?: string[];
}

export interface CloseIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
}

export interface EnsureLabelsEntry {
  name: string;
  color: string; // 6-hex without '#'
  description?: string;
}

export interface GitHubClientInterface {
  listBranches(owner: string, repo: string): Promise<GitHubBranch[]>;
  listCommitsForBranch(
    owner: string,
    repo: string,
    branch: string,
    maxPages?: number,
  ): Promise<GitHubCommit[]>;
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string>;
  listCommitsBetween(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCommit[]>;
  listPullRequestCommits(
    owner: string,
    repo: string,
    prNumber: number,
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
  getMergeCommitRange(
    owner: string,
    repo: string,
    mergeCommitSha: string,
  ): Promise<{ baseSha: string; headSha: string } | null>;
  getCommitMessage(
    owner: string,
    repo: string,
    commitSha: string,
  ): Promise<string>;
  /**
   * Return all reviews for a pull request (most recent first).
   * Used to detect whether a review was already posted before retrying.
   */
  listPullRequestReviews(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequestReview[]>;
  listPullRequestComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequestComment[]>;
  createPullRequestComment(input: {
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
  }): Promise<void>;
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
  // Issues
  listIssues(params: ListIssuesParams): Promise<GitHubIssue[]>;
  createIssue(params: CreateIssueParams): Promise<GitHubIssue>;
  updateIssue(params: UpdateIssueParams): Promise<GitHubIssue>;
  closeIssue(params: CloseIssueParams): Promise<void>;
  /**
   * Idempotently ensure the given labels exist on the repo.
   * Creates missing labels; silently skips ones that already exist.
   */
  ensureLabels(
    owner: string,
    repo: string,
    labels: EnsureLabelsEntry[],
  ): Promise<void>;
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
    maxPages?: number,
  ): Promise<GitHubCommit[]> {
    const results: GitHubCommit[] = [];
    let page = 1;
    while (maxPages === undefined || page <= maxPages) {
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
          authorLogin: c.author?.login ?? null,
          timestamp: c.commit.author?.date ?? new Date().toISOString(),
        });
      }
      if (data.length < 100) break;
      page++;
    }
    return results;
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if (Array.isArray(data) || data.type !== "file" || !data.content) {
      throw new Error(`Expected ${path} to be a file at ${ref}`);
    }
    // GitHub file content is base64; Octokit's generated type deliberately
    // leaves `encoding` open-ended, so do not pass an arbitrary API string to
    // Node's stricter BufferEncoding parameter.
    const encoding = data.encoding === "utf-8" ? "utf8" : "base64";
    return Buffer.from(data.content, encoding).toString("utf8");
  }

  async listPullRequestCommits(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubCommit[]> {
    const results: GitHubCommit[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.pulls.listCommits,
      { owner, repo, pull_number: prNumber, per_page: 100 },
    )) {
      for (const commit of page.data) {
        results.push({
          sha: commit.sha,
          message: commit.commit.message,
          authorName: commit.commit.author?.name ?? null,
          authorEmail: commit.commit.author?.email ?? null,
          authorLogin: commit.author?.login ?? null,
          timestamp: commit.commit.author?.date ?? new Date().toISOString(),
        });
      }
    }
    return results;
  }

  async listCommitsBetween(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCommit[]> {
    const results: GitHubCommit[] = [];
    let page = 1;
    let totalCommits = 0;
    while (true) {
      const { data } = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base,
        head,
        per_page: 100,
        page,
      });
      totalCommits = data.total_commits;
      for (const commit of data.commits) {
        results.push({
          sha: commit.sha,
          message: commit.commit.message,
          authorName: commit.commit.author?.name ?? null,
          authorEmail: commit.commit.author?.email ?? null,
          authorLogin: commit.author?.login ?? null,
          timestamp: commit.commit.author?.date ?? new Date().toISOString(),
        });
      }
      if (data.commits.length < 100) break;
      page++;
    }
    // GitHub returns no more than 250 commits from compare. When the range is
    // larger, walk the graph so callers can safely replace a complete path
    // membership set rather than deleting valid older saved moments.
    if (totalCommits > results.length) {
      return this.listCommitGraphSince(owner, repo, base, head);
    }
    return results;
  }

  private async listCommitGraphSince(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCommit[]> {
    const { data: baseCommit } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: base,
    });
    const baseSha = baseCommit.sha;
    const pending = [head];
    const visited = new Set<string>();
    const results: GitHubCommit[] = [];

    while (pending.length) {
      const ref = pending.pop();
      if (!ref || visited.has(ref) || ref === baseSha) continue;
      visited.add(ref);
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref,
      });
      if (commit.sha === baseSha) continue;
      results.push({
        sha: commit.sha,
        message: commit.commit.message,
        authorName: commit.commit.author?.name ?? null,
        authorEmail: commit.commit.author?.email ?? null,
        authorLogin: commit.author?.login ?? null,
        timestamp: commit.commit.author?.date ?? new Date().toISOString(),
      });
      pending.push(...commit.parents.map((parent) => parent.sha));
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
          headSha: pr.head.sha,
          baseSha: pr.base.sha,
          createdAt: pr.created_at,
          closedAt: pr.closed_at ?? null,
          mergedAt: pr.merged_at ?? null,
          author: pr.user
            ? { login: pr.user.login, displayName: pr.user.name ?? null }
            : null,
          mergedBy: null,
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
        headSha: pr.head.sha,
        baseSha: pr.base.sha,
        createdAt: pr.created_at,
        closedAt: pr.closed_at ?? null,
        mergedAt: pr.merged_at ?? null,
        author: pr.user
          ? { login: pr.user.login, displayName: pr.user.name ?? null }
          : null,
        mergedBy: pr.merged_by
          ? { login: pr.merged_by.login, displayName: pr.merged_by.name ?? null }
          : null,
      };
    } catch {
      return null;
    }
  }

  async getMergeCommitRange(
    owner: string,
    repo: string,
    mergeCommitSha: string,
  ): Promise<{ baseSha: string; headSha: string } | null> {
    const { data } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: mergeCommitSha,
    });
    // Platform acceptance explicitly requests a merge commit. Its first
    // parent is canon before acceptance; its second is the submitted head.
    if (data.parents.length !== 2) return null;
    return {
      baseSha: data.parents[0].sha,
      headSha: data.parents[1].sha,
    };
  }

  async getCommitMessage(
    owner: string,
    repo: string,
    commitSha: string,
  ): Promise<string> {
    const { data } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });
    return data.commit.message;
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
        results.push({
          id: r.id,
          state: r.state,
          body: r.body,
          submittedAt: r.submitted_at ?? null,
        });
      }
    }
    // Return most-recent first so callers find the latest matching review
    return results.reverse();
  }

  async listPullRequestComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequestComment[]> {
    const results: GitHubPullRequestComment[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.issues.listComments,
      { owner, repo, issue_number: prNumber, per_page: 100 },
    )) {
      for (const comment of page.data) {
        results.push({
          id: comment.id,
          body: comment.body ?? "",
          createdAt: comment.created_at,
        });
      }
    }
    return results;
  }

  async createPullRequestComment(input: {
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
  }): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner: input.owner,
      repo: input.repo,
      issue_number: input.prNumber,
      body: input.body,
    });
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
    const { owner, repo, prNumber, commitTitle, expectedHeadSha } = params;
    const { data } = await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      commit_title: commitTitle,
      merge_method: "merge",
      ...(expectedHeadSha ? { sha: expectedHeadSha } : {}),
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

  // ── Issues ──────────────────────────────────────────────────────────────

  async listIssues(params: ListIssuesParams): Promise<GitHubIssue[]> {
    const { owner, repo, labels, state = "open" } = params;
    const results: GitHubIssue[] = [];
    for await (const page of this.octokit.paginate.iterator(
      this.octokit.rest.issues.listForRepo,
      {
        owner,
        repo,
        state,
        labels: labels?.join(","),
        per_page: 100,
      },
    )) {
      for (const issue of page.data) {
        // Skip pull requests (GitHub includes them in issues API)
        if (issue.pull_request) continue;
        results.push({
          number: issue.number,
          title: issue.title,
          body: issue.body ?? null,
          state: issue.state === "open" ? "open" : "closed",
          labels: issue.labels.map((l) =>
            typeof l === "string" ? l : (l.name ?? ""),
          ),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
        });
      }
    }
    return results;
  }

  async createIssue(params: CreateIssueParams): Promise<GitHubIssue> {
    const { owner, repo, title, body, labels } = params;
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });
    return {
      number: data.number,
      title: data.title,
      body: data.body ?? null,
      state: data.state === "open" ? "open" : "closed",
      labels: data.labels.map((l) =>
        typeof l === "string" ? l : (l.name ?? ""),
      ),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateIssue(params: UpdateIssueParams): Promise<GitHubIssue> {
    const { owner, repo, issueNumber, title, body, labels } = params;
    const { data } = await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(labels !== undefined && { labels }),
    });
    return {
      number: data.number,
      title: data.title,
      body: data.body ?? null,
      state: data.state === "open" ? "open" : "closed",
      labels: data.labels.map((l) =>
        typeof l === "string" ? l : (l.name ?? ""),
      ),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async closeIssue(params: CloseIssueParams): Promise<void> {
    const { owner, repo, issueNumber } = params;
    await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: "closed",
    });
  }

  async ensureLabels(
    owner: string,
    repo: string,
    labels: EnsureLabelsEntry[],
  ): Promise<void> {
    await Promise.all(
      labels.map(async ({ name, color, description }) => {
        try {
          await this.octokit.rest.issues.createLabel({
            owner,
            repo,
            name,
            color,
            description,
          });
        } catch (err: unknown) {
          // 422 = label already exists — safe to ignore
          const status = (err as { status?: number }).status;
          if (status !== 422) throw err;
        }
      }),
    );
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
