#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("../.netlify/plugins/node_modules/puppeteer");
const root = process.cwd();
const outputDir = path.join(root, "reports/ai-economics-v2/screenshots");
mkdirSync(outputDir, { recursive: true });
const executablePath = path.join(root, ".netlify/plugins/node_modules/puppeteer/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome");
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const base = "http://127.0.0.1:8080/tools/ai-cost-reality-calculator/";
const findings = [];

async function exercise(viewport, prefix) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (error) => findings.push({ type: "pageerror", viewport: prefix, message: error.message }));
  page.on("console", (message) => { if (message.type() === "error") findings.push({ type: "console", viewport: prefix, message: message.text() }); });
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(outputDir, `${prefix}-quick-estimate.png`), fullPage: true });
  const initial = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    requiredQuickInputs: [...document.querySelectorAll(".evidence-field")].filter((node) => !node.hasAttribute("data-optional")).length,
    advancedCollapsed: !document.querySelector("[data-advanced]").open,
    resultsHidden: document.querySelector("[data-results]").hidden,
    customRequired: document.querySelector('[name="custom_outcome"]').required,
  }));
  findings.push({ type: "initial", viewport: prefix, ...initial });

  await page.select('[data-field="total_ai_cost"] .evidence-select', "range");
  await page.$eval('[name="total_ai_cost_low"]', (node) => { node.value = "550000"; });
  await page.$eval('[name="total_ai_cost_high"]', (node) => { node.value = "650000"; });
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-results]:not([hidden])');
  await page.$eval("[data-results]", (node) => node.scrollIntoView({ block: "start" }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: path.join(outputDir, `${prefix}-results.png`), fullPage: false });
  const result = await page.evaluate(() => ({
    scenarioButtons: document.querySelectorAll("[data-scenario]").length,
    rangeSummaryVisible: !document.querySelector("[data-range-summary]").hidden,
    comparisonText: document.querySelector('[data-output="unit-improvement"]').textContent.trim(),
    primaryOutputs: document.querySelectorAll(".primary-results article").length,
  }));
  findings.push({ type: "result", viewport: prefix, ...result });
  await page.click("[data-advanced] summary");
  findings.push({ type: "advanced", viewport: prefix, quickValuePreserved: await page.$eval('[name="baseline_cost"]', (node) => node.value === "1000000") });
  await page.close();
}

await exercise({ width: 1440, height: 1000, deviceScaleFactor: 1 }, "desktop-1440");
await exercise({ width: 390, height: 844, deviceScaleFactor: 1 }, "mobile-390");
await browser.close();

const failures = findings.filter((item) => item.type === "pageerror" || item.type === "console" || item.type === "initial" && (item.overflow > 1 || item.requiredQuickInputs !== 5 || !item.advancedCollapsed || !item.resultsHidden || item.customRequired) || item.type === "result" && (item.scenarioButtons !== 3 || !item.rangeSummaryVisible || item.comparisonText !== "Available in Advanced Analysis" || item.primaryOutputs !== 6) || item.type === "advanced" && !item.quickValuePreserved);
const report = { status: failures.length ? "FAIL" : "PASS", findings, failures };
writeFileSync(path.join(root, "reports/ai-economics-v2/browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}: calculator browser QA completed with ${failures.length} failure(s).`);
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
