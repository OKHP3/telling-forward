import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.AUTH_BROWSER_REGRESSION_BASE_URL ?? "http://localhost:22333";
const runId = Date.now();
const firstEmail = `browser-contributor-a-${runId}@example.test`;
const secondEmail = `browser-contributor-b-${runId}@example.test`;
const password = "browser-regression-password";

const firstUser = { id: 1001, displayName: "Browser Contributor A", email: firstEmail };
const secondUser = { id: 1002, displayName: "Browser Contributor B", email: secondEmail };
const firstProposal = {
  id: 910001,
  storyworldId: 1,
  pathId: 1,
  prNumber: 910001,
  state: "submitted",
  submittedAt: "2026-08-25T12:00:00.000Z",
  decidedAt: null,
};
const secondProposal = {
  id: 910002,
  storyworldId: 1,
  pathId: 2,
  prNumber: 910002,
  state: "submitted",
  submittedAt: "2026-08-25T12:01:00.000Z",
  decidedAt: null,
};

let currentUser = null;
let releaseSecondProposals;
let holdFirstSecondProposals = true;

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
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/auth/me" && request.method() === "GET") {
      if (!currentUser) return json(route, { error: "Authentication required" }, 401);
      return json(route, { user: currentUser, github: null });
    }

    if (path === "/api/auth/login" && request.method() === "POST") {
      const body = request.postDataJSON();
      currentUser = body.email === firstEmail ? firstUser : body.email === secondEmail ? secondUser : null;
      assert.ok(currentUser, `unexpected login email: ${body.email}`);
      return json(route, { user: currentUser, github: null });
    }

    if (path === "/api/auth/logout" && request.method() === "POST") {
      currentUser = null;
      return json(route, { message: "Logged out" });
    }

    if (path === "/api/proposals" && request.method() === "GET") {
      if (currentUser?.id === secondUser.id) {
        if (holdFirstSecondProposals) {
          holdFirstSecondProposals = false;
          await new Promise((resolve) => {
            releaseSecondProposals = resolve;
          });
        }
        return json(route, [secondProposal]);
      }
      return json(route, currentUser?.id === firstUser.id ? [firstProposal] : [], 200);
    }

    return route.continue();
  });

  try {
    await page.goto(`${base}/sign-in`);
    await page.locator("#sign-in-email").fill(firstEmail);
    await page.locator("#sign-in-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${base}/`);

    await page.goto(`${base}/submissions`);
    await page.getByTestId(`card-submission-${firstProposal.id}`).waitFor();
    assert.match(await page.locator("body").innerText(), /Path #1/);

    await page.getByTestId("button-logout").click();
    await page.getByTestId("button-sign-in").click();
    await page.waitForURL(`${base}/sign-in`);
    await page.locator("#sign-in-email").fill(secondEmail);
    await page.locator("#sign-in-password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${base}/`);

    await page.goto(`${base}/submissions`);
    await page.getByTestId("skeleton-submissions").waitFor();
    assert.equal(await page.getByTestId(`card-submission-${firstProposal.id}`).count(), 0);

    assert.ok(releaseSecondProposals, "B submissions request did not reach the fixture boundary");
    releaseSecondProposals();
    await page.getByTestId(`card-submission-${secondProposal.id}`).waitFor();
    const secondText = await page.locator("body").innerText();
    assert.match(secondText, /Path #2/);
    assert.equal(await page.getByTestId(`card-submission-${firstProposal.id}`).count(), 0);

    await page.reload();
    await page.getByTestId(`card-submission-${secondProposal.id}`).waitFor();
    assert.equal(await page.getByTestId(`card-submission-${firstProposal.id}`).count(), 0);
    console.log("browser auth session reload/logout/contributor isolation regression passed");
  } catch (error) {
    await page.screenshot({ path: "test-results/auth-session-browser-failure.png", fullPage: true });
    throw error;
  } finally {
    await context.tracing.stop({ path: "test-results/auth-session-browser-trace.zip" });
    await browser.close();
  }
}

await main();