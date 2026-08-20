import assert from "node:assert/strict";

const base = process.env.AUTH_REGRESSION_BASE_URL ?? "http://localhost:8080";
const email = `auth-regression-${Date.now()}@example.test`;
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

const registered = await call("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ displayName: "Reload Reader", email, password }),
});
assert.equal(registered.status, 201);
const authenticatedCookie = cookieFrom(registered);
assert.ok(authenticatedCookie);
assert.notEqual(authenticatedCookie, anonymousCookie, "authentication must rotate the session cookie");

// A second request is the browser's full-page reload boundary.
const afterReload = await call("/api/auth/me", { headers: { cookie: authenticatedCookie } });
assert.equal(afterReload.status, 200);
assert.equal((await afterReload.json()).user.displayName, "Reload Reader");

const logout = await call("/api/auth/logout", {
  method: "POST",
  headers: { cookie: authenticatedCookie },
});
assert.equal(logout.status, 200);
const afterLogout = await call("/api/auth/me", { headers: { cookie: authenticatedCookie } });
assert.equal(afterLogout.status, 401);

console.log("auth session reload/logout regression passed");