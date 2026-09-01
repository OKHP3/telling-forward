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
  const firstPage = await context.newPage();
  const secondPage = await context.newPage();
  const unreadCountRequests = new Map([
    [firstPage, 0],
    [secondPage, 0],
  ]);

  for (const page of [firstPage, secondPage]) {
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === "/api/me/notifications/unread-count" &&
        request.method() === "GET"
      ) {
        unreadCountRequests.set(page, unreadCountRequests.get(page) + 1);
      }
    });
  }

  await context.route("**/api/**", async (route) => {
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

  async function signInFromFirstTab() {
    await firstPage.goto(`${base}/sign-in`);
    await firstPage.locator("#sign-in-email").fill(email);
    await firstPage.locator("#sign-in-password").fill(password);
    await firstPage.getByRole("button", { name: "Sign in" }).click();
    await firstPage.waitForURL(`${base}/`);
    await secondPage.goto(`${base}/`);
    await secondPage.getByTestId("button-logout").waitFor();
  }

  async function loadUnreadBadge(page) {
    await page.goto(`${base}/inbox`);
    await page.getByTestId("inbox-unread-count").waitFor();
    assert.equal(await page.getByTestId("inbox-unread-count").innerText(), "4");
  }

  async function assertCrossTabLogout(sourcePage, label) {
    // Each tab has an independent React Query cache but shares the browser
    // session. Signing out in either tab must clear both caches before either
    // tab can refetch the user-scoped unread count.
    const requestsBeforeLogout = new Map(unreadCountRequests);
    await sourcePage.getByTestId("button-logout").click();

    await Promise.all([
      firstPage.getByTestId("button-sign-in").waitFor(),
      secondPage.getByTestId("button-sign-in").waitFor(),
    ]);
    assert.equal(await firstPage.getByTestId("inbox-unread-count").count(), 0);
    assert.equal(await secondPage.getByTestId("inbox-unread-count").count(), 0);

    await Promise.all([
      firstPage.goto(`${base}/inbox`),
      secondPage.goto(`${base}/inbox`),
    ]);
    await Promise.all([
      firstPage.getByText("Sign in to see updates about your scenes.").waitFor(),
      secondPage.getByText("Sign in to see updates about your scenes.").waitFor(),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 250));

    assert.equal(
      unreadCountRequests.get(firstPage),
      requestsBeforeLogout.get(firstPage),
      `${label}: first tab requested unread count after sign-out`,
    );
    assert.equal(
      unreadCountRequests.get(secondPage),
      requestsBeforeLogout.get(secondPage),
      `${label}: second tab requested unread count after sign-out`,
    );
  }

  try {
    await signInFromFirstTab();
    await Promise.all([loadUnreadBadge(firstPage), loadUnreadBadge(secondPage)]);
    await assertCrossTabLogout(firstPage, "first-tab logout");

    await signInFromFirstTab();
    await Promise.all([loadUnreadBadge(firstPage), loadUnreadBadge(secondPage)]);
    await assertCrossTabLogout(secondPage, "second-tab logout");

    // A 401 is a handled, non-retryable response: it must not resurrect a
    // previous count or generate repeated background requests.
    unreadCountMode = "unauthorized";
    const requestsBeforeUnauthorizedSession = unreadCountRequests.get(firstPage);
    await firstPage.goto(`${base}/sign-in`);
    await firstPage.locator("#sign-in-email").fill(email);
    await firstPage.locator("#sign-in-password").fill(password);
    await firstPage.getByRole("button", { name: "Sign in" }).click();
    await firstPage.waitForURL(`${base}/`);
    await firstPage.getByTestId("link-inbox").waitFor();
    await firstPage.waitForTimeout(100);
    assert.equal(await firstPage.getByTestId("inbox-unread-count").count(), 0);
    assert.equal(
      unreadCountRequests.get(firstPage),
      requestsBeforeUnauthorizedSession + 1,
      "a 401 unread-count response must not be retried",
    );

    console.log(
      "unread badge cross-tab logout/cache clearing and unauthenticated no-retry regression passed",
    );
  } catch (error) {
    await firstPage.screenshot({
      path: "test-results/unread-badge-browser-failure.png",
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
}

await main();