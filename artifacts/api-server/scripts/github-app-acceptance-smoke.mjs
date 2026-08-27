import assert from "node:assert/strict";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

const owner = "OKHP3";
const repo = "telling-forward-pilot-grove";
const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
const appId = process.env.GITHUB_APP_ID;
const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
const privateKey = rawPrivateKey
  ?.replace(/\\r/g, "\r")
  .replace(/\\n/g, "\n")
  .replace(/(-----BEGIN [^-]+-----)\s*/, "$1\n")
  .replace(/\s*(-----END [^-]+-----)\s*$/, "\n$1\n");

assert.ok(appId && installationId && privateKey, "GitHub App secrets are incomplete");

const auth = createAppAuth({ appId, installationId, privateKey });
const appAuthentication = await auth({ type: "app" });
const appClient = new Octokit({ auth: appAuthentication.token });
const appIdentity = await appClient.rest.apps.getAuthenticated();
const installation = await appClient.rest.apps.getInstallation({
  installation_id: installationId,
});

assert.equal(
  appIdentity.data.id,
  Number(appId),
  "App identity does not match GITHUB_APP_ID",
);
assert.equal(
  installation.data.id,
  Number(installationId),
  "Installation identity does not match configured installation",
);
assert.equal(
  installation.data.repository_selection,
  "selected",
  "Pilot installation is not selected-repository scoped",
);
assert.equal(
  installation.data.permissions?.contents,
  "write",
  "Pilot installation does not have the contents write permission required by the platform",
);

const first = await auth({
  type: "installation",
  installationId,
  refresh: true,
});
const firstClient = new Octokit({ auth: first.token });
const repository = await firstClient.rest.repos.get({ owner, repo });
const accessible = await firstClient.rest.apps.listReposAccessibleToInstallation({
  per_page: 100,
});
const accessibleNames = accessible.data.repositories.map((item) => item.full_name);

assert.ok(
  accessibleNames.includes(`${owner}/${repo}`),
  "Pilot repository is not accessible to the installation token",
);
assert.equal(repository.data.full_name, `${owner}/${repo}`);
assert.equal(repository.data.private, true, "Pilot repository is not private");

const second = await auth({
  type: "installation",
  installationId,
  refresh: true,
});
const secondClient = new Octokit({ auth: second.token });
assert.notEqual(
  first.token,
  second.token,
  "Forced installation-token refresh returned the same token",
);
assert.ok(first.expiresAt && second.expiresAt, "Installation-token expiry metadata is missing");

const branch = `pilot/app-acceptance-${Date.now()}`;
const defaultRef = await secondClient.rest.git.getRef({
  owner,
  repo,
  ref: `heads/${repository.data.default_branch}`,
});
let branchCreated = false;
try {
  await secondClient.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: defaultRef.data.object.sha,
  });
  branchCreated = true;
} finally {
  if (branchCreated) {
    await secondClient.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
  }
}

console.log(
  JSON.stringify({
    result: "passed",
    app: {
      id: appIdentity.data.id,
      slug: appIdentity.data.slug,
    },
    installation: {
      id: installation.data.id,
      account: installation.data.account?.login ?? null,
      repositorySelection: installation.data.repository_selection,
      permissions: installation.data.permissions,
      accessibleRepositories: accessibleNames,
    },
    pilotRepository: {
      fullName: repository.data.full_name,
      private: repository.data.private,
      defaultBranch: repository.data.default_branch,
    },
    tokenRefresh: {
      firstExpiresAt: first.expiresAt,
      secondExpiresAt: second.expiresAt,
      tokensDiffer: first.token !== second.token,
    },
    write: {
      operation: "create-and-delete-empty-branch",
      actor: `${appIdentity.data.slug}[bot]`,
      branchDeleted: true,
    },
    rollbackBoundary:
      "PAT fallback remains configuration-only and is covered by github-auth.test.ts",
  }),
);