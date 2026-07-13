#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const puppeteer = require("../.netlify/plugins/node_modules/puppeteer");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const executablePath = new URL("../.netlify/plugins/node_modules/puppeteer/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome", import.meta.url).pathname;
const routes = [
  "/", "/404.html", "/audit/", "/case-studies/", "/case-studies/ai-economics-decision-framework/",
  "/case-studies/banfield-subscription-commerce/", "/case-studies/small-team-bigger-output/", "/contact/",
  "/contact/success/", "/engagements/", "/engagements/success/", "/publications/",
  "/publications/running-before-crawling/", "/publications/small-team-bigger-output/", "/recruiters/",
  "/resume/", "/skills/", "/thank-you/", "/tools/", "/tools/ai-cost-reality-calculator/",
  "/tools/ai-cost-reality-calculator/advanced/", "/tools/content-operations-readiness/",
];
const analyticsExcludedRoutes = new Set([
  "/tools/ai-cost-reality-calculator/",
  "/tools/ai-cost-reality-calculator/advanced/",
  "/tools/content-operations-readiness/",
]);
const viewports = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }];
const issues = [];
let checks = 0;
const check = (pass, message) => { checks += 1; if (!pass) issues.push(message); };

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    const runtimeErrors = [];
    const failedRequests = [];
    const analyticsRequests = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
    page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
    page.on("request", (request) => {
      if (/googletagmanager|google-analytics|\/g\/collect/iu.test(request.url())) {
        analyticsRequests.push(request.url());
        void request.respond({ status: 200, contentType: "application/javascript", body: "" });
      } else {
        void request.continue();
      }
    });
    const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      const step = Math.max(500, window.innerHeight);
      for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
        window.scrollTo(0, top);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    const state = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const missingControls = [...document.querySelectorAll("[aria-controls]")].flatMap((node) => (node.getAttribute("aria-controls") || "").trim().split(/\s+/u)).filter((id) => id && !document.getElementById(id));
      const imageIssues = [...document.images].filter((image) => {
        const rect = image.getBoundingClientRect();
        const shouldBeLoaded = rect.width > 0 && rect.height > 0;
        return !image.hasAttribute("width") || !image.hasAttribute("height") || (shouldBeLoaded && (!image.complete || image.naturalWidth === 0));
      }).map((image) => image.getAttribute("src"));
      const priorityIssues = [...document.querySelectorAll(".page-hero-image, .paper-cover img, .publication-hero__cover img, .engagements-hero img")].filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0 && image.getAttribute("fetchpriority")?.toLowerCase() !== "high";
      }).map((image) => image.getAttribute("src"));
      return {
        h1Count: document.querySelectorAll("h1").length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        duplicateIds,
        missingControls,
        imageIssues,
        priorityIssues,
        publicationsLinks: document.querySelectorAll('.nav-menu a[href="/publications/"]').length,
        gtmHeadScripts: [...document.scripts].filter((script) => script.textContent.includes("GTM-N2MVP44C") && script.textContent.includes("googletagmanager.com/gtm.js")).length,
        gtmNoscriptBlocks: [...document.querySelectorAll("noscript")].filter((node) => node.textContent.includes("googletagmanager.com/ns.html?id=GTM-N2MVP44C")).length,
      };
    });
    const label = `${route} at ${viewport.width}px`;
    check(response?.status() === 200, `${label}: HTTP ${response?.status()}`);
    check(state.h1Count === 1, `${label}: expected one H1, found ${state.h1Count}`);
    check(state.overflow <= 1, `${label}: horizontal overflow ${state.overflow}px`);
    check(state.duplicateIds.length === 0, `${label}: duplicate IDs ${state.duplicateIds.join(", ")}`);
    check(state.missingControls.length === 0, `${label}: missing aria-controls targets ${state.missingControls.join(", ")}`);
    check(state.imageIssues.length === 0, `${label}: image load/dimension issues ${state.imageIssues.join(", ")}`);
    check(state.priorityIssues.length === 0, `${label}: above-the-fold LCP image priority issues ${state.priorityIssues.join(", ")}`);
    check(state.publicationsLinks === 1, `${label}: Publications navigation count ${state.publicationsLinks}`);
    check(runtimeErrors.length === 0, `${label}: runtime errors ${runtimeErrors.join(" | ")}`);
    check(failedRequests.length === 0, `${label}: failed requests ${failedRequests.join(" | ")}`);
    if (analyticsExcludedRoutes.has(route)) {
      check(state.gtmHeadScripts === 0 && state.gtmNoscriptBlocks === 0, `${label}: excluded page contains GTM markup`);
      check(analyticsRequests.length === 0, `${label}: excluded page made analytics requests ${analyticsRequests.join(" | ")}`);
    } else {
      const gtmRequests = analyticsRequests.filter((url) => url.includes("googletagmanager.com/gtm.js?id=GTM-N2MVP44C"));
      const directGaRequests = analyticsRequests.filter((url) => /googletagmanager\.com\/gtag\/js|google-analytics|\/g\/collect/iu.test(url));
      check(state.gtmHeadScripts === 1 && state.gtmNoscriptBlocks === 1, `${label}: expected one GTM head and one GTM noscript block`);
      check(gtmRequests.length === 1, `${label}: expected one GTM bootstrap request, found ${gtmRequests.length}`);
      check(directGaRequests.length === 0, `${label}: direct GA4 request on local QA ${directGaRequests.join(" | ")}`);
    }
    await page.close();
  }
}

for (const width of [720, 320]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.goto(`${base}/`, { waitUntil: "networkidle0" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `Homepage ${width === 720 ? "200% zoom equivalent" : "400% reflow equivalent"}: horizontal overflow ${overflow}px`);
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${base}/`, { waitUntil: "networkidle0" });
  await page.focus(".nav-toggle");
  await page.keyboard.press("Enter");
  check(await page.$eval(".nav-toggle", (node) => node.getAttribute("aria-expanded") === "true"), "Mobile navigation did not open from the keyboard");
  check(await page.$eval(".nav-menu a", (node) => node === document.activeElement), "Mobile navigation did not move focus to its first link");
  await page.keyboard.press("Escape");
  check(await page.$eval(".nav-toggle", (node) => node === document.activeElement && node.getAttribute("aria-expanded") === "false"), "Mobile navigation did not close and restore focus with Escape");
  const focusVisible = await page.$eval(".nav-toggle", (node) => { const style = getComputedStyle(node); return style.outlineStyle !== "none" || style.boxShadow !== "none"; });
  check(focusVisible, "Focused mobile navigation control has no visible focus treatment");
  await page.close();
}

for (const route of ["/tools/ai-cost-reality-calculator/", "/tools/ai-cost-reality-calculator/advanced/", "/tools/content-operations-readiness/"]) {
  const page = await browser.newPage();
  const externalRequests = [];
  page.on("request", (request) => { if (!request.url().startsWith(base)) externalRequests.push(request.url()); });
  await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
  const privacy = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), search: location.search, hash: location.hash }));
  check(externalRequests.length === 0, `${route}: external calculator requests ${externalRequests.join(" | ")}`);
  check(privacy.local.length === 0 && privacy.session.length === 0, `${route}: calculator wrote browser storage`);
  check(!privacy.search && !privacy.hash, `${route}: calculator state appears in the URL`);
  await page.close();
}

await browser.close();

if (issues.length) {
  console.error(`Complete release browser QA failed (${issues.length}/${checks} checks):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`Complete release browser QA passed: ${checks} checks across ${routes.length} routes, two primary viewports, 200%/400% reflow equivalents, keyboard navigation, and calculator privacy.`);
