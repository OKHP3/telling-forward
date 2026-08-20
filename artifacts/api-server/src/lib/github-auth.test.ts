import { describe, expect, it } from "vitest";
import { resolveGitHubAuth } from "./github";

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
});