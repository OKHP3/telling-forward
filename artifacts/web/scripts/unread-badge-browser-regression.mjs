import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.UNREAD_BADGE_REGRESSION_BASE_URL ?? "http://localhost:22333";
const email = `unread-badge-${Date.now()}@example.test`;
const password = "browser-regression-password";
const user = {
  id: 1101,
  displayName: "Unread Badge Contributor",
  email,
};

let currentUser = null;
let unreadCountMode = "count";
let unreadCountRequests = 0;

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/me" && request.method() === "GET") {
      return currentUser
        ? json(route, { user: currentUser, github: null })
        : json(route, { error: "Authentication required" }, 401);
    }

    if (path === "/api/auth/login" && request.method() === "POST") {
      const body = request.postDataJSON();
      assert.equal(body.email, email);
      currentUser = user;
      return json(route, { user: currentUser, github: null });
    }

    if (path === "/api/auth/logout" && request.method() === "POST") {
      currentUser = null;
      return json(route, { message: "Logged out" });
    }

    if (
      path === "/api/me/notifications/unread-count" &&
      request.method() === "GET"
    ) {
      unreadCountRequests += 1;
      if (unreadCountMode === "unauthorized") {
        return json(route, { error: "Authentication required" }, 401);
      }
      return json(route, { count: 4 });
    }

    if (path === "/api/me/notifications" && request.method() === "GET") {
      return currentUser
        ? json(route, [])
        : json(route, { error: "Authentication required" }, 401);
    }

    return route.continue();
  });

  try {
    await page.goto(`${base}/sign-in`);
    await page.locator("#sign-in-email").fill(email);
    await page.locator("#sign-in-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${base}/`);

    await page.goto(`${base}/inbox`);
    await page.getByTestId("inbox-unread-count").waitFor();
    assert.equal(
      await page.getByTestId("inbox-unread-count").innerText(),
      "4",
    );

    const requestsBeforeLogout = unreadCountRequests;
    await page.getByTestId("button-logout").click();
    await page.getByTestId("button-sign-in").waitFor();
    assert.equal(await page.getByTestId("inbox-unread-count").count(), 0);

    await page.goto(`${base}/inbox`);
    await page.getByText("Sign in to see updates about your scenes.").waitFor();
    assert.equal(
      unreadCountRequests,
      requestsBeforeLogout,
      "signed-out inbox navigation must not request the unread count",
    );

    // A 401 is a handled, non-retryable response: it must not resurrect a
    // previous count or generate repeated background requests.
    unreadCountMode = "unauthorized";
    const requestsBeforeUnauthorizedSession = unreadCountRequests;
    await page.goto(`${base}/sign-in`);
    await page.locator("#sign-in-email").fill(email);
    await page.locator("#sign-in-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${base}/`);
    await page.getByTestId("link-inbox").waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.getByTestId("inbox-unread-count").count(), 0);
    assert.equal(
      unreadCountRequests,
      requestsBeforeUnauthorizedSession + 1,
      "a 401 unread-count response must not be retried",
    );

    console.log(
      "unread badge logout/cache clearing and unauthenticated no-retry regression passed",
    );
  } catch (error) {
    await page.screenshot({
      path: "test-results/unread-badge-browser-failure.png",
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
}

await main();