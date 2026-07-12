#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("../.netlify/plugins/node_modules/puppeteer");
const root = process.cwd();
const outputDir = path.join(root, "reports/ai-economics-v1/screenshots");
mkdirSync(outputDir, { recursive: true });
const executablePath = path.join(root, ".netlify/plugins/node_modules/puppeteer/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome");
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const base = "http://127.0.0.1:8080";
const findings = [];

async function pageFor(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (error) => findings.push({ type: "pageerror", message: error.message }));
  page.on("console", (message) => { if (message.type() === "error") findings.push({ type: "console", message: message.text() }); });
  return page;
}

async function auditPage(page, route, screenshotName) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: false });
  const audit = await page.evaluate(() => ({
    route: location.pathname,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1Count: document.querySelectorAll("h1").length,
    duplicateIds: [...document.querySelectorAll("[id]")].map((node) => node.id).filter((id, index, all) => all.indexOf(id) !== index),
    brokenAriaControls: [...document.querySelectorAll("[aria-controls]")].map((node) => node.getAttribute("aria-controls")).filter((id) => !document.getElementById(id)),
  }));
  findings.push({ type: "page-audit", ...audit });
}

const desktop = await pageFor({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await auditPage(desktop, "/insights/", "insights-desktop.png");
await auditPage(desktop, "/insights/running-before-crawling/", "whitepaper-desktop.png");
await auditPage(desktop, "/tools/ai-cost-reality-calculator/", "calculator-initial-desktop.png");
await desktop.keyboard.press("Tab");
findings.push({ type: "keyboard", focusVisible: await desktop.evaluate(() => document.activeElement !== document.body && document.activeElement !== document.documentElement) });
await desktop.evaluate(() => document.querySelector("[data-methodology]").open = true);
await desktop.evaluate(() => document.querySelector("[data-methodology]").scrollIntoView());
await desktop.screenshot({ path: path.join(outputDir, "calculator-methodology-expanded.png") });

await desktop.goto(`${base}/tools/ai-cost-reality-calculator/`, { waitUntil: "networkidle0" });
const requests = [];
desktop.on("request", (request) => requests.push({ url: request.url(), postData: request.postData() || "" }));
await desktop.click("[data-next]");
await desktop.click('[name="baseline_cost"]'); await desktop.keyboard.down("Control"); await desktop.keyboard.press("KeyA"); await desktop.keyboard.up("Control"); await desktop.type('[name="baseline_cost"]', "918273.45");
for (let index = 0; index < 3; index += 1) await desktop.click("[data-next]");
await desktop.click('[name="discount_rate"]');
await desktop.type('[name="discount_rate"]', "8");
await desktop.click('[name="risk_not_double_counted"]');
await desktop.click("[data-calculate]");
await desktop.waitForSelector('[data-output="year1"]');
await desktop.evaluate(() => { document.activeElement?.blur(); const target = document.querySelector(".results-heading"); target.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); });
await new Promise((resolve) => setTimeout(resolve, 350));
await desktop.screenshot({ path: path.join(outputDir, "calculator-results-desktop.png") });
await desktop.click("[data-formula-disclosure] summary");
await desktop.evaluate(() => document.querySelector("[data-formula-disclosure]").scrollIntoView());
await desktop.screenshot({ path: path.join(outputDir, "calculator-how-calculated.png") });
findings.push({ type: "privacy", sentinelFound: requests.some((request) => `${request.url}${request.postData}`.includes("918273.45")), requestCount: requests.length });
await auditPage(desktop, "/case-studies/ai-economics-decision-framework/", "case-study-desktop.png");

const mobile = await pageFor({ width: 390, height: 844, deviceScaleFactor: 1 });
await auditPage(mobile, "/insights/", "insights-mobile.png");
await auditPage(mobile, "/insights/running-before-crawling/", "whitepaper-mobile.png");
await auditPage(mobile, "/tools/ai-cost-reality-calculator/", "calculator-initial-mobile.png");
for (let index = 0; index < 4; index += 1) await mobile.click("[data-next]");
await mobile.click('[name="discount_rate"]'); await mobile.type('[name="discount_rate"]', "8"); await mobile.click('[name="risk_not_double_counted"]');
await mobile.click("[data-calculate]");
await mobile.evaluate(() => { document.activeElement?.blur(); const target = document.querySelector(".results-heading"); target.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); });
await new Promise((resolve) => setTimeout(resolve, 350));
const mobileResultsY = await mobile.$eval(".results-heading", (target) => target.getBoundingClientRect().top + window.scrollY);
await mobile.screenshot({ path: path.join(outputDir, "calculator-results-mobile.png"), clip: { x: 0, y: Math.max(0, mobileResultsY - 70), width: 390, height: 844 } });
await auditPage(mobile, "/case-studies/ai-economics-decision-framework/", "case-study-mobile.png");
await mobile.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await mobile.goto(`${base}/tools/ai-cost-reality-calculator/`, { waitUntil: "networkidle0" });
findings.push({ type: "reduced-motion", behavior: await mobile.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) });

const noScript = await browser.newPage();
await noScript.setJavaScriptEnabled(false);
await noScript.goto(`${base}/tools/ai-cost-reality-calculator/`, { waitUntil: "networkidle0" });
findings.push({ type: "no-javascript", methodologyAvailable: await noScript.evaluate(() => document.body.textContent.includes("Why model cost is not the full cost") && document.body.textContent.includes("Interactive calculation requires JavaScript")) });
await noScript.close();

await browser.close();
const failures = findings.filter((item) => item.type === "pageerror" || item.type === "console" || item.type === "privacy" && item.sentinelFound || item.type === "keyboard" && !item.focusVisible || item.type === "no-javascript" && !item.methodologyAvailable || item.type === "reduced-motion" && item.behavior !== "auto" || item.type === "page-audit" && (item.overflow > 1 || item.h1Count !== 1 || item.duplicateIds.length || item.brokenAriaControls.length));
writeFileSync(path.join(root, "reports/ai-economics-v1/browser-qa.json"), `${JSON.stringify({ status: failures.length ? "FAIL" : "PASS", findings }, null, 2)}\n`);
console.log(`${failures.length ? "FAIL" : "PASS"}: browser QA completed with ${failures.length} failure(s).`);
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
