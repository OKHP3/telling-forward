import { describe, expect, it } from "vitest";
import {
  GitHubWorkflowPermissionError,
  isGitHubWorkflowPath,
  resolveGitHubAuth,
} from "./github";

describe("GitHub platform authentication", () => {
  it("prefers complete installation-scoped App credentials over the PAT", () => {
    expect(
      resolveGitHubAuth({
        GITHUB_APP_ID: "123",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY: "line-one\\nline-two",
        GITHUB_PAT: "pilot-pat",
      }),
    ).toEqual({
      kind: "app",
      credentials: {
        appId: "123",
        installationId: "456",
        privateKey: "line-one\nline-two",
      },
    });
  });

  it("normalizes flattened PEM keys from secret entry forms", () => {
    expect(
      resolveGitHubAuth({
        GITHUB_APP_ID: "123",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----encoded-body-----END PRIVATE KEY-----",
      }),
    ).toEqual({
      kind: "app",
      credentials: {
        appId: "123",
        installationId: "456",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nencoded-body\n-----END PRIVATE KEY-----\n",
      },
    });
  });

  it("rejects a partial App configuration instead of falling back to a PAT", () => {
    expect(() =>
      resolveGitHubAuth({
        GITHUB_APP_ID: "123",
        GITHUB_PAT: "pilot-pat",
      }),
    ).toThrow(
      "GitHub App authentication requires GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY",
    );
  });

  it("keeps PAT fallback explicit for the private pilot", () => {
    expect(resolveGitHubAuth({ GITHUB_PAT: "pilot-pat" })).toEqual({
      kind: "pat",
      token: "pilot-pat",
    });
  });

  it("does not invent credentials when neither boundary is configured", () => {
    expect(resolveGitHubAuth({})).toEqual({ kind: "anonymous" });
  });

  it("recognizes only files under the GitHub workflow directory", () => {
    expect(isGitHubWorkflowPath(".github/workflows/validate.yml")).toBe(true);
    expect(isGitHubWorkflowPath(".github/workflows")).toBe(true);
    expect(isGitHubWorkflowPath("docs/.github/workflows/notes.md")).toBe(false);
    expect(isGitHubWorkflowPath(".github/workflow-notes.md")).toBe(false);
  });

  it("describes a missing workflow permission without including credentials", () => {
    const error = new GitHubWorkflowPermissionError([
      ".github/workflows/validate.yml",
    ]);

    expect(error.name).toBe("GitHubWorkflowPermissionError");
    expect(error.status).toBe(403);
    expect(error.message).toContain("Workflows repository permission");
    expect(error.message).not.toContain("token");
    expect(error.message).not.toContain("private key");
    expect(error.paths).toEqual([".github/workflows/validate.yml"]);
  });
});