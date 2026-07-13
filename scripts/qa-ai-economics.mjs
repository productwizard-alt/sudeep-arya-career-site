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
const base = `${process.env.QA_BASE_URL || "http://127.0.0.1:4173"}/tools/ai-cost-reality-calculator/`;
const findings = [];
const realCases = [
  { id: "published-example", values: [100000, 1000000, 125000, 84, 600000], expected: ["$10.00", "$4.80", "$5.71", "20,000", "$96,000.00", "Modeled savings"] },
  { id: "perfect-success", values: [100000, 1000000, 100000, 100, 600000], expected: ["$10.00", "$6.00", "$6.00", "0", "$0.00", "Modeled savings"] },
  { id: "half-success-higher-cost", values: [100000, 1000000, 100000, 50, 750000], expected: ["$10.00", "$7.50", "$15.00", "50,000", "$375,000.00", "Modeled loss"] },
  { id: "unit-cost-parity", values: [100000, 1000000, 100000, 60, 600000], expected: ["$10.00", "$6.00", "$10.00", "40,000", "$240,000.00", "Approximately break-even"] },
  { id: "zero-success", values: [100000, 1000000, 100000, 0, 600000], expected: ["$10.00", "$6.00", "Not calculable", "100,000", "$600,000.00", "More information required"] },
  { id: "small-content-workflow", values: [2400, 186000, 3600, 72.5, 94500], expected: ["$77.50", "$26.25", "$36.21", "990", "$25,987.50", "Modeled savings"] },
  { id: "zero-ai-cost", values: [100000, 1000000, 125000, 84, 0], expected: ["$10.00", "$0.00", "$0.00", "20,000", "$0.00", "Modeled savings"] },
];

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
    resultsHidden: document.querySelector("[data-results]").hidden,
    helpButtons: document.querySelectorAll(".field-help").length,
  }));
  findings.push({ type: "initial", viewport: prefix, ...initial });
  await page.click(".field-help summary");
  findings.push({ type: "help", viewport: prefix, expanded: await page.$eval(".field-help", (node) => node.open), visible: await page.$eval(".field-help p", (node) => getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility === "visible") });

  await page.evaluate((values) => {
    ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost"].forEach((name, index) => { document.querySelector(`[name="${name}"]`).value = values[index]; });
  }, realCases[0].values);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-results]:not([hidden])');
  await page.$eval("[data-results]", (node) => node.scrollIntoView({ block: "start" }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: path.join(outputDir, `${prefix}-results.png`), fullPage: false });
  const result = await page.evaluate(() => ({
    evidenceDropdowns: document.querySelectorAll(".evidence-select").length,
    primaryOutputs: document.querySelectorAll(".primary-results article").length,
  }));
  findings.push({ type: "result", viewport: prefix, ...result });
  for (const testCase of realCases) {
    await page.evaluate((values) => {
      ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost"].forEach((name, index) => { document.querySelector(`[name="${name}"]`).value = values[index]; });
    }, testCase.values);
    await page.click('button[type="submit"]');
    const actual = await page.evaluate(() => ["baseline-cost", "attempt-cost", "verified-cost", "failed-attempts", "failure-cost", "decision-signal"].map((name) => document.querySelector(`[data-output="${name}"]`).textContent.trim()));
    findings.push({ type: "calculation-case", viewport: prefix, id: testCase.id, passed: JSON.stringify(actual) === JSON.stringify(testCase.expected), actual, expected: testCase.expected });
  }
  await page.$eval('[name="verified_rate"]', (node) => { node.value = "101"; });
  await page.click('button[type="submit"]');
  findings.push({ type: "browser-validation", viewport: prefix, passed: await page.$eval("[data-error-summary]", (node) => !node.hidden && node.textContent.includes("0% to 100%")) });
  await page.close();
}

await exercise({ width: 1440, height: 1000, deviceScaleFactor: 1 }, "desktop-1440");
await exercise({ width: 390, height: 844, deviceScaleFactor: 1 }, "mobile-390");
await browser.close();

const failures = findings.filter((item) => item.type === "pageerror" || item.type === "console" || item.type === "initial" && (item.overflow > 1 || item.requiredQuickInputs !== 5 || !item.resultsHidden || item.helpButtons !== 5) || item.type === "help" && (!item.expanded || !item.visible) || item.type === "result" && (item.evidenceDropdowns !== 0 || item.primaryOutputs !== 6) || item.type === "calculation-case" && !item.passed || item.type === "browser-validation" && !item.passed);
const report = { status: failures.length ? "FAIL" : "PASS", findings, failures };
writeFileSync(path.join(root, "reports/ai-economics-v2/browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status}: calculator browser QA completed with ${failures.length} failure(s).`);
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
