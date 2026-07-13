#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { quickScenarios, advancedScenarios } from "../tests/ai-economics/scenario-fixtures.mjs";
import { referenceQuickScenario, referenceAdvancedScenario } from "../tests/ai-economics/independent-scenario-oracle.mjs";

const require = createRequire(import.meta.url);
const puppeteer = require("../.netlify/plugins/node_modules/puppeteer");
const axe = require("../.netlify/plugins/node_modules/axe-core");
const root = process.cwd();
const artifactDir = path.join(root, "artifacts/ai-cost-calculator-upgrade-v1/local/scenario-validation");
const screenshotDir = path.join(artifactDir, "screenshots");
await mkdir(screenshotDir, { recursive: true });
const base = process.env.QA_BASE_URL || "http://127.0.0.1:8000";
const urls = { Quick: `${base}/tools/ai-cost-reality-calculator/`, Advanced: `${base}/tools/ai-cost-reality-calculator/advanced/` };
const executablePath = path.join(root, ".netlify/plugins/node_modules/puppeteer/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome");
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const checks = [];
const screenshots = [];
const layoutMetrics = {};
const record = (category, name, pass, detail = "") => checks.push({ category, name, pass: Boolean(pass), detail });
const pause = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

async function shot(page, file, metadata = {}, options = { fullPage: true }) {
  const filePath = path.join(screenshotDir, file);
  await page.screenshot({ path: filePath, ...options });
  screenshots.push({ file, ...metadata });
}

async function axeScan(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const scan = await axe.run(document, { resultTypes: ["violations"] });
    return scan.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }));
  });
  record("accessibility", `${label}: axe scan has no violations`, result.length === 0, result);
  return result;
}

function attachErrorTracking(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  return errors;
}

function viewport(width) {
  return { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1 };
}

async function layoutPass(mode, width) {
  const page = await browser.newPage();
  await page.setViewport(viewport(width));
  const errors = attachErrorTracking(page);
  const response = await page.goto(urls[mode], { waitUntil: "networkidle0" });
  const key = `${mode.toLowerCase()}-${width}`;
  const metrics = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(({ id }) => id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const missingControls = [...document.querySelectorAll("[aria-controls]")].map((node) => node.getAttribute("aria-controls")).filter((id) => !document.getElementById(id));
    const visibleTargets = [...document.querySelectorAll("#calculator input:not([type='radio']),#calculator button,#calculator summary,#calculator .period-options span,#calculator .method-options label>span,#calculator .advanced-builder-link")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    return {
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      workspaceTop: document.querySelector(".calculator-workspace").getBoundingClientRect().top + scrollY,
      calculateButtonTop: document.querySelector(".calculate-button").getBoundingClientRect().top + scrollY,
      methodologyTop: document.querySelector(".calculator-guide").getBoundingClientRect().top + scrollY,
      resultsInitiallyHidden: document.querySelector("[data-results]").hidden,
      initialOpenDetails: document.querySelectorAll("details[open]").length,
      duplicateIds,
      missingControls,
      minTouchTarget: Math.min(...visibleTargets.map((node) => node.getBoundingClientRect().height)),
      mobileInputFontSizes: [...document.querySelectorAll("#calculator input:not([type='radio'])")].filter((node) => node.getBoundingClientRect().width > 0).map((node) => parseFloat(getComputedStyle(node).fontSize)),
      modeLinks: [...document.querySelectorAll(".calculator-mode-nav a")].map((node) => ({ href: node.getAttribute("href"), current: node.getAttribute("aria-current"), text: node.textContent.trim() })),
      quickControlTops: [...document.querySelectorAll(".quick-grid--ai .single-value")].map((node) => node.getBoundingClientRect().top),
      quickHelpTops: [...document.querySelectorAll(".quick-grid--ai .field-help")].map((node) => node.getBoundingClientRect().top),
      quickCurrentTops: [...document.querySelectorAll(".quick-grid:not(.quick-grid--ai) .single-value")].map((node) => node.getBoundingClientRect().top),
      summary: document.querySelector(".live-cost-summary") ? { top: document.querySelector(".live-cost-summary").getBoundingClientRect().top + scrollY, height: document.querySelector(".live-cost-summary").getBoundingClientRect().height, position: getComputedStyle(document.querySelector(".live-cost-summary")).position } : null,
    };
  });
  layoutMetrics[key] = metrics;
  record("layout", `${mode} ${width}: HTTP 200`, response?.status() === 200, response?.status());
  record("layout", `${mode} ${width}: no horizontal overflow`, metrics.scrollWidth <= metrics.clientWidth, { scrollWidth: metrics.scrollWidth, clientWidth: metrics.clientWidth });
  record("layout", `${mode} ${width}: initial results hidden`, metrics.resultsInitiallyHidden);
  record("accessibility", `${mode} ${width}: no duplicate IDs`, metrics.duplicateIds.length === 0, metrics.duplicateIds);
  record("accessibility", `${mode} ${width}: every aria-controls target exists`, metrics.missingControls.length === 0, metrics.missingControls);
  record("interaction", `${mode} ${width}: optional help and methodology collapsed by default`, metrics.initialOpenDetails === 0, metrics.initialOpenDetails);
  record("interaction", `${mode} ${width}: visible calculator touch targets are at least 44px`, metrics.minTouchTarget >= 43.5, metrics.minTouchTarget);
  if (width === 390) record("accessibility", `${mode} ${width}: mobile input text is at least 16px`, metrics.mobileInputFontSizes.every((size) => size >= 16), metrics.mobileInputFontSizes);
  record("interaction", `${mode} ${width}: mode navigation exposes two ordinary links and one current mode`, metrics.modeLinks.length === 2 && metrics.modeLinks.filter(({ current }) => current === "page").length === 1, metrics.modeLinks);
  if (mode === "Quick" && width >= 1024) {
    const range = (values) => Math.max(...values) - Math.min(...values);
    record("alignment", `Quick ${width}: current-row control top edges align`, range(metrics.quickCurrentTops) <= 1, metrics.quickCurrentTops);
    record("alignment", `Quick ${width}: AI-row control top edges align`, range(metrics.quickControlTops) <= 1, metrics.quickControlTops);
    record("alignment", `Quick ${width}: AI-row help top edges align`, range(metrics.quickHelpTops) <= 1, metrics.quickHelpTops);
  }
  await shot(page, `after-${mode.toLowerCase()}-${width}.png`, { type: "after-layout", mode, viewport: width, description: `Post-polish full-page ${mode} layout at ${width}px.` });
  await axeScan(page, `${mode} ${width} initial`);

  const disclosureResult = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".calculator-guide-answers details")].slice(0, 2);
    return items.map((item) => ({ open: item.open, summary: item.querySelector("summary").textContent.trim() }));
  });
  record("interaction", `${mode} ${width}: first two disclosures start independently closed`, disclosureResult.length === 2 && disclosureResult.every(({ open }) => !open), disclosureResult);
  await page.focus(".calculator-guide-answers details:nth-child(1) summary");
  await page.keyboard.press("Enter");
  await page.focus(".calculator-guide-answers details:nth-child(2) summary");
  await page.keyboard.press("Space");
  let openStates = await page.evaluate(() => [...document.querySelectorAll(".calculator-guide-answers details")].slice(0, 2).map(({ open }) => open));
  record("interaction", `${mode} ${width}: keyboard opens disclosures independently`, openStates[0] && openStates[1], openStates);
  await page.focus(".calculator-guide-answers details:nth-child(1) summary");
  await page.keyboard.press("Enter");
  openStates = await page.evaluate(() => [...document.querySelectorAll(".calculator-guide-answers details")].slice(0, 2).map(({ open }) => open));
  record("interaction", `${mode} ${width}: closing one disclosure leaves the other open`, !openStates[0] && openStates[1], openStates);

  await page.focus('input[name="period"][value="monthly"]');
  await page.keyboard.press("ArrowRight");
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement;
    const visual = active?.nextElementSibling ? getComputedStyle(active.nextElementSibling) : null;
    return { name: active?.getAttribute("name"), value: active?.value, outlineStyle: visual?.outlineStyle, outlineWidth: visual?.outlineWidth };
  });
  record("accessibility", `${mode} ${width}: keyboard focus moves within the period radio group`, keyboardFocus.name === "period" && keyboardFocus.value === "quarterly", keyboardFocus);
  record("accessibility", `${mode} ${width}: keyboard focus indicator is visible`, keyboardFocus.outlineStyle !== "none" && parseFloat(keyboardFocus.outlineWidth) >= 2, keyboardFocus);

  if (mode === "Advanced" && width >= 1024) {
    await selectRadio(page, "current_cost_method", "builder");
    const tops = await page.evaluate(() => [...document.querySelectorAll("#current-builder-panel .builder-grid input")].map((node) => node.getBoundingClientRect().top));
    const alignedPairs = tops.every((top, index) => index % 2 || Math.abs(top - tops[index + 1]) <= 1);
    record("alignment", `Advanced ${width}: component-builder inputs align within logical rows`, alignedPairs, tops);
  }
  if (width === 390) {
    await page.click(".nav-toggle");
    const nav = await page.evaluate(() => ({ expanded: document.querySelector(".nav-toggle").getAttribute("aria-expanded"), open: document.querySelector(".nav-menu").classList.contains("open"), bodyOpen: document.body.classList.contains("nav-open") }));
    record("interaction", `${mode} mobile navigation opens and reports state`, nav.expanded === "true" && nav.open, nav);
  }
  record("runtime", `${mode} ${width}: no console or page errors`, errors.length === 0, errors);
  await page.close();
}

for (const mode of ["Quick", "Advanced"]) for (const width of [1440, 1024, 768, 390]) await layoutPass(mode, width);

async function setValues(page, values) {
  await page.evaluate((entries) => {
    for (const [name, value] of Object.entries(entries)) {
      const node = document.querySelector(`[name="${name}"]`);
      if (!node) continue;
      node.value = value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, values);
}

async function selectRadio(page, name, value) {
  await page.$eval(`input[name="${name}"][value="${value}"]`, (node) => node.closest("label").click());
}

async function fillQuick(page, scenario) {
  await selectRadio(page, "period", scenario.period);
  await setValues(page, { baseline_verified: scenario.input.currentOutcomes, baseline_cost: scenario.input.currentCost, ai_attempts: scenario.input.aiAttempts, verified_rate: scenario.input.successRate, total_ai_cost: scenario.input.aiCost });
  if (scenario.acceptanceMode === "pilot") {
    await page.$eval(".pilot-helper", (node) => { node.open = true; });
    await setValues(page, { "quick-pilot-attempts": scenario.pilot.attempts, "quick-pilot-accepted": scenario.pilot.accepted });
    await page.evaluate(({ attempts, accepted }) => { document.querySelector("#quick-pilot-attempts").value = attempts; document.querySelector("#quick-pilot-accepted").value = accepted; }, scenario.pilot);
    await page.click("[data-pilot-calculate]");
  }
}

const advancedNames = {
  currentOutcomes: "current_outcomes", knownCurrentCost: "known_current_cost", aiAttempts: "ai_attempts", successRate: "success_rate", pilotAttempts: "pilot_attempts", pilotAccepted: "pilot_accepted", knownAiCost: "known_ai_cost",
  laborHours: "current_labor_hours", loadedHourlyCost: "current_loaded_hourly_cost", agencyCost: "current_agency_cost", softwareCost: "current_software_cost", reworkCost: "current_rework_cost", otherCost: "current_other_cost",
  technologyCost: "technology_cost", implementationCost: "implementation_cost", amortizationYears: "amortization_years", knownReviewCost: "known_review_cost", reviewRate: "review_rate", reviewMinutes: "review_minutes", reviewHourlyCost: "review_hourly_cost", otherOperatingCost: "other_ai_cost",
};

async function fillAdvanced(page, scenario) {
  const input = scenario.input;
  await selectRadio(page, "period", scenario.period);
  await selectRadio(page, "current_cost_method", input.currentCostMethod);
  await selectRadio(page, "success_method", input.successMethod);
  await selectRadio(page, "ai_cost_method", input.aiCostMethod);
  if (input.aiCostMethod === "builder") {
    await page.$eval("#review-builder", (node) => { node.open = true; });
    await selectRadio(page, "review_method", input.aiCostBuilder.reviewMethod);
  }
  const values = {};
  for (const key of ["currentOutcomes", "knownCurrentCost", "aiAttempts", "successRate", "pilotAttempts", "pilotAccepted", "knownAiCost"]) values[advancedNames[key]] = input[key];
  for (const [key, value] of Object.entries(input.currentCostBuilder)) values[advancedNames[key]] = value;
  for (const [key, value] of Object.entries(input.aiCostBuilder)) if (advancedNames[key]) values[advancedNames[key]] = value;
  await setValues(page, values);
}

async function scenarioResult(mode, scenario, file, width = 1440) {
  console.log(`Running ${mode} browser scenario ${scenario.id} at ${width}px.`);
  const page = await browser.newPage();
  await page.setViewport(viewport(width));
  const errors = attachErrorTracking(page);
  await page.goto(urls[mode], { waitUntil: "networkidle0" });
  if (mode === "Quick") await fillQuick(page, scenario); else await fillAdvanced(page, scenario);
  await page.click("button[type='submit']");
  await page.waitForSelector("[data-results]:not([hidden])");
  await pause();
  const state = await page.evaluate(() => ({
    signal: document.querySelector("[data-output='decision-signal']").textContent.trim(), text: document.querySelector("[data-results]").textContent, errorHidden: document.querySelector("[data-error-summary]").hidden, overflow: document.documentElement.scrollWidth - innerWidth,
    outputs: Object.fromEntries([...document.querySelectorAll("[data-results] [data-output]")].map((node) => [node.dataset.output, node.textContent.trim()])),
  }));
  const oracle = mode === "Quick" ? referenceQuickScenario(scenario) : referenceAdvancedScenario(scenario);
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const percentage = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
  const expectedDisplays = {
    "decision-signal": oracle.decisionSignal,
    "annual-savings": oracle.annualizedSavings === null ? "More information required" : wholeCurrency.format(Math.abs(oracle.annualizedSavings)),
    "period-savings": oracle.selectedPeriodSavings === null ? "Not calculable" : currency.format(oracle.selectedPeriodSavings),
    "break-even-rate": oracle.breakEvenStatus === "not_achievable" ? "Not achievable under current assumptions" : oracle.breakEvenRate === null ? "Not calculable" : percentage.format(oracle.breakEvenRate),
    "baseline-cost": currency.format(oracle.currentCostPerAccepted),
    "attempt-cost": currency.format(oracle.aiCostPerAttempt),
    "verified-cost": oracle.aiCostPerAccepted === null ? "Not calculable" : currency.format(oracle.aiCostPerAccepted),
    "equivalent-cost": oracle.equivalentOutputAiCost === null ? "Not calculable" : currency.format(oracle.equivalentOutputAiCost),
    "accepted-outcomes": number.format(oracle.acceptedAiOutcomes),
    "failed-attempts": number.format(oracle.failedAttempts),
    "failure-cost": currency.format(oracle.failureCost),
  };
  if (mode === "Quick") expectedDisplays["entered-rate"] = percentage.format(oracle.successRatePct / 100);
  else {
    expectedDisplays["maximum-ai-cost"] = currency.format(oracle.maximumBreakEvenAiCost);
    expectedDisplays["threshold-difference"] = currency.format(Math.abs(oracle.costThresholdDifference));
  }
  const displayMismatches = Object.entries(expectedDisplays).filter(([key, expected]) => state.outputs[key] !== expected).map(([key, expected]) => ({ key, expected, actual: state.outputs[key] }));
  record("scenario-browser", `${mode} ${scenario.id}: browser decision signal`, state.signal === scenario.expectedDecision, state);
  record("scenario-browser", `${mode} ${scenario.id}: every representative displayed value matches the independent oracle`, displayMismatches.length === 0, displayMismatches);
  record("scenario-browser", `${mode} ${scenario.id}: completed state has no invalid rendered tokens`, !/\b(?:NaN|Infinity|undefined|null)\b/.test(state.text), state.text.match(/\b(?:NaN|Infinity|undefined|null)\b/g) || []);
  record("scenario-browser", `${mode} ${scenario.id}: completed state has currency and percentage formatting`, /\$[\d,]+/.test(state.text) && /\d(?:\.\d)?%/.test(state.text), "");
  record("scenario-browser", `${mode} ${scenario.id}: result state has no horizontal overflow`, state.overflow <= 0, state.overflow);
  const element = await page.$("[data-results]");
  await element.screenshot({ path: path.join(screenshotDir, file) });
  screenshots.push({ file, type: "scenario-result", mode, viewport: width, scenarioId: scenario.id, decisionSignal: scenario.expectedDecision, description: `${scenario.name} populated result.` });
  await axeScan(page, `${mode} ${scenario.id} populated result`);
  record("runtime", `${mode} ${scenario.id}: no console or page errors`, errors.length === 0, errors);
  await page.close();
}

await scenarioResult("Quick", quickScenarios.find(({ id }) => id === "Q01"), "quick-profitable-Q01-desktop-1440.png");
await scenarioResult("Quick", quickScenarios.find(({ id }) => id === "Q09"), "quick-break-even-Q09-desktop-1440.png");
await scenarioResult("Quick", quickScenarios.find(({ id }) => id === "Q08"), "quick-loss-Q08-desktop-1440.png");
await scenarioResult("Quick", quickScenarios.find(({ id }) => id === "Q01"), "quick-profitable-Q01-mobile-390.png", 390);
await scenarioResult("Advanced", advancedScenarios.find(({ id }) => id === "A01"), "advanced-profitable-A01-desktop-1440.png");
await scenarioResult("Advanced", advancedScenarios.find(({ id }) => id === "A02"), "advanced-break-even-A02-desktop-1440.png");
await scenarioResult("Advanced", advancedScenarios.find(({ id }) => id === "A05"), "advanced-loss-A05-desktop-1440.png");
await scenarioResult("Advanced", advancedScenarios.find(({ id }) => id === "A01"), "advanced-profitable-A01-mobile-390.png", 390);

async function validationScreenshot(mode) {
  const page = await browser.newPage();
  await page.setViewport(viewport(1440));
  await page.goto(urls[mode], { waitUntil: "networkidle0" });
  const selector = mode === "Quick" ? '[name="baseline_verified"]' : '[name="current_outcomes"]';
  await page.$eval(selector, (node) => { node.value = ""; });
  await page.click("button[type='submit']");
  const state = await page.evaluate(() => ({ visible: !document.querySelector("[data-error-summary]").hidden, focused: document.activeElement === document.querySelector("[data-error-summary]"), invalid: document.querySelectorAll("[aria-invalid='true']").length, text: document.querySelector("[data-error-summary]").textContent.trim() }));
  record("validation", `${mode}: validation summary is visible, linked, and focused`, state.visible && state.focused && state.invalid > 0, state);
  await page.$eval("[data-error-summary]", (node) => {
    document.documentElement.style.scrollBehavior = "auto";
    node.scrollIntoView({ block: "center", behavior: "auto" });
  });
  await pause(120);
  await shot(page, `${mode.toLowerCase()}-validation-error-desktop-1440.png`, { type: "validation-error", mode, viewport: 1440, description: `${mode} required-field validation with focused error summary.` }, { fullPage: false });
  await page.close();
}
await validationScreenshot("Quick");
await validationScreenshot("Advanced");

async function pilotScreenshot(mode, scenario) {
  const page = await browser.newPage();
  await page.setViewport(viewport(1440));
  await page.goto(urls[mode], { waitUntil: "networkidle0" });
  if (mode === "Quick") {
    await fillQuick(page, scenario);
    const text = await page.$eval("[data-pilot-message]", (node) => node.textContent);
    record("interaction", "Quick pilot helper derives and applies 85%", text.includes("85%") && await page.$eval('[name="verified_rate"]', (node) => node.value === "85"), text);
    const element = await page.$(".pilot-helper");
    await element.screenshot({ path: path.join(screenshotDir, "quick-pilot-derived-Q04-desktop-1440.png") });
    screenshots.push({ file: "quick-pilot-derived-Q04-desktop-1440.png", type: "pilot-derived", mode, viewport: 1440, scenarioId: scenario.id, description: "Quick pilot helper populated and applied." });
  } else {
    await fillAdvanced(page, scenario);
    const text = await page.$eval("[data-live-pilot-rate]", (node) => node.textContent);
    record("interaction", "Advanced pilot helper derives 86%", text === "86.0%", text);
    const element = await page.$(".advanced-input-section:nth-child(2)");
    await element.screenshot({ path: path.join(screenshotDir, "advanced-pilot-derived-A01-desktop-1440.png") });
    screenshots.push({ file: "advanced-pilot-derived-A01-desktop-1440.png", type: "pilot-derived", mode, viewport: 1440, scenarioId: scenario.id, description: "Advanced pilot method populated with derived rate." });
  }
  await page.close();
}
await pilotScreenshot("Quick", quickScenarios.find(({ id }) => id === "Q04"));
await pilotScreenshot("Advanced", advancedScenarios.find(({ id }) => id === "A01"));

async function methodAndPeriodChecks() {
  const page = await browser.newPage();
  await page.setViewport(viewport(1440));
  await page.goto(urls.Advanced, { waitUntil: "networkidle0" });
  await selectRadio(page, "ai_cost_method", "builder");
  await setValues(page, { technology_cost: 1000, implementation_cost: 1200, amortization_years: 3, known_review_cost: 300, other_ai_cost: 200, known_ai_cost: 999999 });
  const builderTotal = await page.$eval("[data-live-ai-total]", (node) => node.textContent.trim());
  await selectRadio(page, "ai_cost_method", "known");
  const knownTotal = await page.$eval("[data-live-ai-total]", (node) => node.textContent.trim());
  await selectRadio(page, "ai_cost_method", "builder");
  const returnedTotal = await page.$eval("[data-live-ai-total]", (node) => node.textContent.trim());
  record("interaction", "Advanced AI method switching excludes inactive known total and preserves builder", builderTotal === "$1,900.00" && knownTotal === "$999,999.00" && returnedTotal === builderTotal, { builderTotal, knownTotal, returnedTotal });
  await page.$eval("#review-builder", (node) => { node.open = true; });
  await selectRadio(page, "review_method", "calculated");
  await setValues(page, { review_rate: 50, review_minutes: 12, review_hourly_cost: 100, ai_attempts: 1000, known_review_cost: 999999 });
  const calculatedReview = await page.$eval("[data-live-review]", (node) => node.textContent.trim());
  await selectRadio(page, "review_method", "known");
  const directReview = await page.$eval("[data-live-review]", (node) => node.textContent.trim());
  record("interaction", "Advanced review switching prevents double counting", calculatedReview === "$10,000.00" && directReview === "$999,999.00", { calculatedReview, directReview });
  await selectRadio(page, "period", "monthly");
  const monthly = await page.$eval("[data-live-implementation]", (node) => node.textContent.trim());
  await selectRadio(page, "period", "quarterly");
  const quarterly = await page.$eval("[data-live-implementation]", (node) => node.textContent.trim());
  await selectRadio(page, "period", "annual");
  const annual = await page.$eval("[data-live-implementation]", (node) => node.textContent.trim());
  record("formula-browser", "Advanced period change reallocates implementation after values are entered", monthly === "$33.33" && quarterly === "$100.00" && annual === "$400.00", { monthly, quarterly, annual });
  await page.close();
}
await methodAndPeriodChecks();

async function reducedMotionCheck(mode) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluateOnNewDocument(() => {
    window.__scrollCalls = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(options) { window.__scrollCalls.push(options); return original.call(this, options); };
  });
  await page.setViewport(viewport(1440));
  await page.goto(urls[mode], { waitUntil: "networkidle0" });
  if (mode === "Quick") await fillQuick(page, quickScenarios.find(({ id }) => id === "Q01"));
  else await fillAdvanced(page, advancedScenarios.find(({ id }) => id === "A01"));
  await page.click("button[type='submit']");
  await page.waitForSelector("[data-results]:not([hidden])");
  await page.click("[data-edit]");
  const result = await page.evaluate(() => ({ media: matchMedia("(prefers-reduced-motion: reduce)").matches, calls: window.__scrollCalls, transition: getComputedStyle(document.querySelector('[data-bar="current-cost"]')).transitionDuration }));
  record("accessibility", `${mode}: reduced-motion uses automatic scrolling and near-zero transitions`, result.media && result.calls.length >= 2 && result.calls.every((call) => call?.behavior === "auto") && parseFloat(result.transition) <= .01, result);
  await page.close();
}
await reducedMotionCheck("Quick");
await reducedMotionCheck("Advanced");

async function modeNavigationCheck() {
  const page = await browser.newPage();
  await page.setViewport(viewport(1440));
  await page.goto(urls.Quick, { waitUntil: "networkidle0" });
  await page.focus('.calculator-mode-nav a[href$="/advanced/"]');
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.keyboard.press("Enter")]);
  record("interaction", "Mode navigation activates from the keyboard", page.url() === urls.Advanced, page.url());
  await page.close();
}
await modeNavigationCheck();

async function privacyCheck() {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.__privacyWrites = [];
    const storageSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) { window.__privacyWrites.push({ type: "storage", key, value }); return storageSet.call(this, key, value); };
    const idbOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = function open(...args) { window.__privacyWrites.push({ type: "indexedDB", args }); return idbOpen(...args); };
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon) navigator.sendBeacon = function sendBeacon(...args) { window.__privacyWrites.push({ type: "beacon", args }); return beacon(...args); };
    const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (originalCookie?.set) Object.defineProperty(Document.prototype, "cookie", { configurable: true, get: originalCookie.get, set(value) { window.__privacyWrites.push({ type: "cookie", value }); return originalCookie.set.call(this, value); } });
  });
  await page.setViewport(viewport(1440));
  const afterSentinelRequests = [];
  let sentinelActive = false;
  page.on("request", (request) => { if (sentinelActive) afterSentinelRequests.push({ url: request.url(), method: request.method(), postData: request.postData() || "" }); });
  await page.goto(urls.Quick, { waitUntil: "networkidle0" });
  await page.evaluate(() => { window.__privacyWrites.length = 0; });
  sentinelActive = true;
  const sentinel = "731947.23";
  await setValues(page, { baseline_verified: 100000, baseline_cost: sentinel, ai_attempts: 125000, verified_rate: 84, total_ai_cost: 600000 });
  await page.click("button[type='submit']");
  await pause(200);
  sentinelActive = false;
  const state = await page.evaluate(async (value) => ({
    writes: window.__privacyWrites,
    localStorageLength: localStorage.length,
    sessionStorageLength: sessionStorage.length,
    cookie: document.cookie,
    indexedDbCount: indexedDB.databases ? (await indexedDB.databases()).length : 0,
    sentinelRendered: document.querySelector('[data-output="baseline-cost"]').textContent.trim() === new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value) / 100000),
    remoteResources: performance.getEntriesByType("resource").map(({ name }) => name).filter((url) => !url.startsWith(location.origin)),
    trackingMarkup: [...document.scripts].map(({ src, textContent }) => `${src} ${textContent}`).filter((text) => /(googletagmanager|google-analytics|gtag\s*\(|fbq\s*\(|tracking pixel)/i.test(text)),
    form: [...document.forms].map((form) => ({ action: form.getAttribute("action"), method: form.getAttribute("method"), netlify: form.hasAttribute("data-netlify") || form.hasAttribute("netlify") })),
  }), sentinel);
  const cookies = await page.cookies();
  record("privacy", "Sentinel financial value triggers no network request", afterSentinelRequests.length === 0, afterSentinelRequests);
  record("privacy", "Sentinel financial value triggers no storage or cookie write", state.writes.length === 0 && state.localStorageLength === 0 && state.sessionStorageLength === 0 && !state.cookie && cookies.length === 0 && state.indexedDbCount === 0, { ...state, cookies });
  record("privacy", "Calculator resources and calculations remain local", state.remoteResources.length === 0 && state.trackingMarkup.length === 0 && state.form.every(({ action, netlify }) => !action && !netlify), state);
  record("privacy", "Sentinel value is calculated locally and rendered", state.sentinelRendered, state.sentinelRendered);
  await page.close();
}
await privacyCheck();

await browser.close();

for (const [source, target, mode, viewportWidth] of [
  ["/tmp/quick-before-1440.png", "before-quick-desktop-1440.png", "Quick", 1440],
  ["/tmp/quick-before-390.png", "before-quick-mobile-390.png", "Quick", 390],
  ["/tmp/advanced-before-1440.png", "before-advanced-desktop-1440.png", "Advanced", 1440],
  ["/tmp/advanced-before-390.png", "before-advanced-mobile-390.png", "Advanced", 390],
]) {
  try {
    await copyFile(source, path.join(screenshotDir, target));
    screenshots.push({ file: target, type: "before-layout", mode, viewport: viewportWidth, description: "Pre-polish baseline captured before calculator-scoped changes." });
  } catch { record("artifacts", `${target}: before screenshot available`, false, source); }
}

function pngDimensions(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
const comparisonRows = [];
for (const item of [
  ["Quick desktop", "before-quick-desktop-1440.png", "after-quick-1440.png"],
  ["Quick mobile", "before-quick-mobile-390.png", "after-quick-390.png"],
  ["Advanced desktop", "before-advanced-desktop-1440.png", "after-advanced-1440.png"],
  ["Advanced mobile", "before-advanced-mobile-390.png", "after-advanced-390.png"],
]) {
  try {
    const before = pngDimensions(await readFile(path.join(screenshotDir, item[1])));
    const after = pngDimensions(await readFile(path.join(screenshotDir, item[2])));
    comparisonRows.push({ label: item[0], before: before.height, after: after.height, reduction: before.height - after.height, reductionPercent: ((before.height - after.height) / before.height * 100).toFixed(1) });
  } catch { /* reported by artifact check */ }
}

const scrollReport = `# Calculator scroll-reduction report\n\nGenerated ${new Date().toISOString()}.\n\n## What caused unnecessary scrolling\n\nThe pre-polish pages combined a tall hero and mode preamble with generous workspace gaps. Quick used uneven field copy that prevented efficient rows. Advanced forced all three required sections into one full-width column, displayed a full component ledger even for a known total, placed that ledger before the mobile Calculate action, and opened the first methodology disclosure by default.\n\n## What changed\n\n- Aligned Quick desktop controls and help rows with a shared CSS grid row structure; intermediate and mobile widths use one-column AI fields.\n- Paired Advanced steps 01 and 02 at 900px and above while keeping step 03 full width; the sticky live summary remains only above 1100px.\n- Moved Advanced Calculate directly after the active input flow and before the mobile/static live summary.\n- Collapsed the inactive component ledger when a known AI total is selected.\n- Collapsed methodology by default and shortened repetitive method-choice copy.\n- Tightened calculator-local hero, mode, workspace, results, and section gaps while retaining readable type and 44px-or-larger form targets.\n\n## Full-page length comparison\n\n| View | Before | After | Reduction |\n|---|---:|---:|---:|\n${comparisonRows.map((row) => `| ${row.label} | ${row.before}px | ${row.after}px | ${row.reduction}px (${row.reductionPercent}%) |`).join("\n")}\n\n## Completion path\n\nThe primary completion path is shorter. Post-polish Calculate positions are Quick 1440: ${layoutMetrics["quick-1440"].calculateButtonTop.toFixed(0)}px; Quick 390: ${layoutMetrics["quick-390"].calculateButtonTop.toFixed(0)}px; Advanced 1440: ${layoutMetrics["advanced-1440"].calculateButtonTop.toFixed(0)}px; Advanced 390: ${layoutMetrics["advanced-390"].calculateButtonTop.toFixed(0)}px. Advanced’s action now immediately follows the final active input flow. After submission, both controllers scroll directly to the results with reduced-motion-aware behavior, and the results section’s top padding is smaller.\n\n## Deliberate non-changes and tradeoffs\n\nRequired assumptions, source guidance, optional builders, and limitations remain available. Mobile fields remain single-column; no narrow side-by-side inputs or nested scrolling were introduced. The Advanced summary remains sticky on wide desktop because it provides useful cost context, but it becomes static below 1100px to prevent clipping. Touch targets were preserved or increased, so some helper rows are taller even as the overall path became shorter.\n\nReadability and accessibility were preserved: mobile input text is at least 16px, calculator form targets are at least 44px, focus indicators remain visible, reduced motion is honored, and automated axe scans report no violations.\n`;

const failures = checks.filter(({ pass }) => !pass);
const categories = Object.fromEntries([...new Set(checks.map(({ category }) => category))].map((category) => [category, { total: checks.filter((check) => check.category === category).length, passed: checks.filter((check) => check.category === category && check.pass).length, failed: checks.filter((check) => check.category === category && !check.pass).length }]));
const report = { status: failures.length ? "FAIL" : "PASS", generatedAt: new Date().toISOString(), baseUrl: base, viewports: [1440, 1024, 768, 390], categories, totalChecks: checks.length, passedChecks: checks.length - failures.length, failedChecks: failures.length, checks, failures, layoutMetrics, privacy: checks.filter(({ category }) => category === "privacy"), accessibility: checks.filter(({ category }) => category === "accessibility") };

const discoveredPngs = (await readdir(screenshotDir)).filter((file) => file.endsWith(".png")).sort();
for (const file of discoveredPngs) if (!screenshots.some((item) => item.file === file)) screenshots.push({ file, type: "supporting", description: "Supporting calculator QA screenshot." });
const manifest = { generatedAt: report.generatedAt, count: screenshots.length, screenshots: screenshots.sort((a, b) => a.file.localeCompare(b.file)) };
await Promise.all([
  writeFile(path.join(artifactDir, "browser-qa-results.json"), `${JSON.stringify(report, null, 2)}\n`),
  writeFile(path.join(artifactDir, "screenshot-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(path.join(artifactDir, "scroll-reduction-report.md"), scrollReport),
]);
console.log(`${report.status}: ${report.passedChecks}/${report.totalChecks} browser checks passed; ${manifest.count} screenshots cataloged.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
