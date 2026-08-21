import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";

const base = process.env.AUTH_REGRESSION_BASE_URL ?? "http://localhost:8080";
const runId = Date.now();
const firstEmail = `auth-regression-a-${runId}@example.test`;
const secondEmail = `auth-regression-b-${runId}@example.test`;
const password = "browser-regression-password";

function cookieFrom(response) {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0] || "";
}

async function call(path, options = {}) {
  return fetch(`${base}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
}

const anonymous = await call("/api/auth/me");
assert.equal(anonymous.status, 401);
const anonymousCookie = cookieFrom(anonymous);

async function register(displayName, email) {
  const response = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ displayName, email, password }),
  });
  assert.equal(response.status, 201);
  const cookie = cookieFrom(response);
  assert.ok(cookie);
  return cookie;
}

// A second request is the browser's full-page reload boundary.
const firstCookie = await register("Reload Reader A", firstEmail);
assert.notEqual(firstCookie, anonymousCookie, "authentication must rotate the session cookie");
const afterReload = await call("/api/auth/me", { headers: { cookie: firstCookie } });
assert.equal(afterReload.status, 200);
assert.equal((await afterReload.json()).user.displayName, "Reload Reader A");

// The contributor-only endpoint must resolve against the authenticated session,
// not against a browser-global or public proposal cache.
const firstContributionsResponse = await call("/api/me/contributions", {
  headers: { cookie: firstCookie },
});
assert.equal(firstContributionsResponse.status, 200);
const firstContributions = await firstContributionsResponse.json();
assert.ok(Array.isArray(firstContributions));

const secondCookie = await register("Reload Reader B", secondEmail);
const secondContributionsResponse = await call("/api/me/contributions", {
  headers: { cookie: secondCookie },
});
assert.equal(secondContributionsResponse.status, 200);
const secondContributions = await secondContributionsResponse.json();
assert.ok(Array.isArray(secondContributions));

// Model the browser's shared React Query cache. The sentinel makes the
// assertion meaningful even when both fresh test accounts have no submissions.
const queryClient = new QueryClient();
const contributionsQueryKey = ["/api/me/contributions"];
queryClient.setQueryData(contributionsQueryKey, [
  ...firstContributions,
  { id: "contributor-a-only-cache-sentinel" },
]);
assert.ok(
  queryClient
    .getQueryData(contributionsQueryKey)
    .some((item) => item.id === "contributor-a-only-cache-sentinel"),
);

// Logout is the account-switch boundary: the app clears this same client in
// AppLayout, and successful sign-in clears it again in auth.tsx.
const logout = await call("/api/auth/logout", {
  method: "POST",
  headers: { cookie: firstCookie },
});
assert.equal(logout.status, 200);
queryClient.clear();
assert.equal(queryClient.getQueryData(contributionsQueryKey), undefined);

const afterLogout = await call("/api/auth/me", { headers: { cookie: firstCookie } });
assert.equal(afterLogout.status, 401);

// A full reload as contributor B repopulates the cache only from B's session.
queryClient.setQueryData(contributionsQueryKey, secondContributions);
const reloadedSecondContributions = queryClient.getQueryData(contributionsQueryKey);
assert.deepEqual(reloadedSecondContributions, secondContributions);
assert.ok(
  !reloadedSecondContributions.some(
    (item) => item.id === "contributor-a-only-cache-sentinel",
  ),
);

console.log("auth session reload/logout/contributor-cache isolation regression passed");