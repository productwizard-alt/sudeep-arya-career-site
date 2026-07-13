const { test, expect } = require("@playwright/test");
const path = require("node:path");

const baseURL = "http://127.0.0.1:4173";
const screenshotDir = path.resolve("reports/engagements-site-hardening-v1/screenshots");
const analyticsExcludedRoutes = new Set([
  "/tools/ai-cost-reality-calculator/",
  "/tools/ai-cost-reality-calculator/advanced/",
  "/tools/content-operations-readiness/",
]);

const interceptAnalytics = (target) => target.route(/googletagmanager|google-analytics|\/g\/collect/i, (route) =>
  route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
);

const expectGtmOnly = (requests) => {
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => url.includes("googletagmanager.com/gtm.js?id=GTM-N2MVP44C"))).toBe(true);
};

test.beforeEach(async ({ page }) => {
  await interceptAnalytics(page);
});

const watchRuntime = (page) => {
  const errors = [];
  const failedRequests = [];
  const analyticsRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`));
  page.on("request", (request) => {
    if (/google-analytics|googletagmanager|\/g\/collect/i.test(request.url())) analyticsRequests.push(request.url());
  });
  return { errors, failedRequests, analyticsRequests };
};

test("desktop engagement journey and component states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const runtime = watchRuntime(page);
  await page.goto(`${baseURL}/engagements/`, { waitUntil: "networkidle" });

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`ENGAGEMENTS_DESKTOP_HEIGHT=${height}`);
  expect(height).toBeGreaterThanOrEqual(3500);
  expect(height).toBeLessThanOrEqual(5000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await page.locator("h1").count()).toBe(1);
  expect(page.locator("[data-inquiry-panel]")).toBeHidden();
  expect(page.locator("[data-topic-selector-list] button")).toHaveCount(4);

  await page.locator(".engagements-hero").screenshot({ path: path.join(screenshotDir, "hero-desktop.png") });
  await page.locator(".engagements-formats").screenshot({ path: path.join(screenshotDir, "formats-desktop.png") });

  const selectors = page.locator(".topic-selector");
  for (let index = 0; index < 4; index += 1) {
    await selectors.nth(index).click();
    await expect(selectors.nth(index)).toHaveAttribute("aria-pressed", "true");
    await page.locator(".topic-pillar:not([hidden])").screenshot({ path: path.join(screenshotDir, `topic-desktop-${index + 1}.png`) });
  }

  await selectors.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(selectors.nth(1)).toBeFocused();
  await expect(selectors.nth(1)).toHaveAttribute("aria-pressed", "true");

  await page.locator(".engagements-audience").screenshot({ path: path.join(screenshotDir, "audience-fit-desktop.png") });
  await page.locator(".engagements-invitation").screenshot({ path: path.join(screenshotDir, "invitation-form-closed-desktop.png") });

  await page.locator("[data-inquiry-toggle]").first().click();
  await expect(page.locator("[data-inquiry-panel]")).toBeVisible();
  await expect(page.locator("#engagement-form-title")).toBeFocused();
  await expect(page).toHaveURL(/#engagement-inquiry-form$/);
  await page.locator("[data-inquiry-panel]").screenshot({ path: path.join(screenshotDir, "invitation-form-open-desktop.png") });

  await page.goBack();
  await expect(page.locator("[data-inquiry-panel]")).toBeHidden();
  await page.locator("[data-inquiry-toggle]").last().click();
  await page.locator("#engagement-inquiry-form button[type=submit]").click();
  await expect(page.locator("#engagement-form-errors")).toBeVisible();
  await expect(page.locator("#engagement-form-errors")).toBeFocused();
  expect(await page.locator("#engagement-inquiry-form [aria-invalid=true]").count()).toBeGreaterThanOrEqual(4);
  await page.locator("[data-inquiry-panel]").screenshot({ path: path.join(screenshotDir, "form-validation-errors-desktop.png") });

  await page.locator(".engagements-faq details").first().locator("summary").click();
  await expect(page.locator(".engagements-faq details").first()).toHaveAttribute("open", "");
  await page.locator(".engagements-faq").screenshot({ path: path.join(screenshotDir, "faq-disclosure-desktop.png") });

  expectGtmOnly(runtime.analyticsRequests);
  expect(runtime.errors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test("mobile layout, disclosures, navigation, and height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = watchRuntime(page);
  await page.goto(`${baseURL}/engagements/`, { waitUntil: "networkidle" });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`ENGAGEMENTS_MOBILE_HEIGHT=${height}`);
  expect(height).toBeGreaterThanOrEqual(5500);
  expect(height).toBeLessThanOrEqual(7600);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const topics = page.locator(".topic-pillar");
  await expect(topics).toHaveCount(4);
  expect(await topics.evaluateAll((items) => items.filter((item) => item.open).length)).toBe(1);
  await topics.nth(2).locator("summary").click();
  expect(await topics.evaluateAll((items) => items.filter((item) => item.open).length)).toBe(1);
  await expect(topics.nth(2)).toHaveAttribute("open", "");
  await page.locator(".engagements-topics").screenshot({ path: path.join(screenshotDir, "topics-mobile-disclosure.png") });

  await page.locator(".nav-toggle").click();
  await expect(page.locator(".nav-menu")).toHaveClass(/open/);
  await expect(page.locator(".nav-menu a").first()).toBeFocused();
  await page.screenshot({ path: path.join(screenshotDir, "mobile-navigation-open.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await expect(page.locator(".nav-menu")).not.toHaveClass(/open/);
  await expect(page.locator(".nav-toggle")).toBeFocused();

  await page.locator(".engagements-hero").screenshot({ path: path.join(screenshotDir, "hero-mobile.png") });
  await page.locator(".engagements-formats").screenshot({ path: path.join(screenshotDir, "formats-mobile.png") });
  await page.locator(".site-footer").screenshot({ path: path.join(screenshotDir, "footer-mobile.png") });

  expectGtmOnly(runtime.analyticsRequests);
  expect(runtime.errors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test("progressive enhancement, reduced motion, and narrow reflow", async ({ browser }) => {
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await interceptAnalytics(noScriptContext);
  const noScriptPage = await noScriptContext.newPage();
  await noScriptPage.goto(`${baseURL}/engagements/`);
  await expect(noScriptPage.locator("[data-inquiry-panel]")).toBeVisible();
  await expect(noScriptPage.locator(".topic-pillar")).toHaveCount(4);
  await noScriptContext.close();

  const reducedContext = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  await interceptAnalytics(reducedContext);
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${baseURL}/engagements/`);
  await expect(reducedPage.locator("[data-inquiry-panel]")).toBeHidden();
  await reducedPage.locator("[data-inquiry-toggle]").first().click();
  const animation = await reducedPage.locator("[data-inquiry-panel]").evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toBe("none");
  await reducedPage.screenshot({ path: path.join(screenshotDir, "reduced-motion-desktop.png"), fullPage: false });
  await reducedContext.close();

  const narrowContext = await browser.newContext({ viewport: { width: 320, height: 720 } });
  await interceptAnalytics(narrowContext);
  const narrowPage = await narrowContext.newPage();
  await narrowPage.goto(`${baseURL}/engagements/`);
  expect(await narrowPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await narrowPage.screenshot({ path: path.join(screenshotDir, "reflow-320.png"), fullPage: true });
  await narrowContext.close();
});

test("priority regression routes load without browser errors or failed local requests", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const routes = [
    "/", "/publications/", "/publications/running-before-crawling/", "/publications/small-team-bigger-output/", "/tools/",
    "/tools/content-operations-readiness/", "/tools/ai-cost-reality-calculator/",
    "/case-studies/", "/case-studies/ai-economics-decision-framework/", "/case-studies/small-team-bigger-output/",
    "/skills/", "/audit/", "/contact/",
  ];
  for (const route of routes) {
    const runtime = watchRuntime(page);
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBe(200);
    if (analyticsExcludedRoutes.has(route)) expect(runtime.analyticsRequests, `${route} analytics`).toEqual([]);
    else expectGtmOnly(runtime.analyticsRequests);
    expect(runtime.errors, `${route} console`).toEqual([]);
    expect(runtime.failedRequests, `${route} requests`).toEqual([]);
    const slug = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replaceAll("/", "-");
    await page.screenshot({ path: path.join(screenshotDir, `regression-${slug}.png`), fullPage: true });
  }
});
