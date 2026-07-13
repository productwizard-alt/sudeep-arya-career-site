import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateAdvancedEstimate, buildCurrentCost } from "../../tools/ai-cost-reality-calculator/advanced/advanced-calculator-core.js";
import { CALCULATOR_EXAMPLES, unitTerms } from "../../tools/ai-cost-reality-calculator/calculator-examples.js";
import { calculateQuickDecisionMetrics } from "../../tools/ai-cost-reality-calculator/quick-decision-metrics.js";
import { currencyDisplayParts, deriveAiUnitCostSeries, deriveUnitCostSeries } from "../../tools/ai-cost-reality-calculator/unit-cost-reference.js";
import { referenceAdvanced, referenceQuickScenario } from "./independent-scenario-oracle.mjs";

const quickHtml = readFileSync("tools/ai-cost-reality-calculator/index.html", "utf8");
const advancedHtml = readFileSync("tools/ai-cost-reality-calculator/advanced/index.html", "utf8");
const quickController = readFileSync("tools/ai-cost-reality-calculator/calculator.js", "utf8");
const advancedController = readFileSync("tools/ai-cost-reality-calculator/advanced/advanced-calculator.js", "utf8");
const referenceSource = readFileSync("tools/ai-cost-reality-calculator/unit-cost-reference.js", "utf8");
const sharedCss = readFileSync("tools/ai-cost-reality-calculator/calculator-mode.css", "utf8");
const quickCss = readFileSync("tools/ai-cost-reality-calculator/calculator.css", "utf8");
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-10, Math.abs(expected) * 1e-12), `${actual} !== ${expected}`);

test("1. references are hidden in the initial blank state", () => {
  for (const html of [quickHtml, advancedHtml]) assert.match(html, /data-current-unit-reference hidden/);
});

test("2. valid current-process values produce a reference", () => {
  assert.ok(deriveUnitCostSeries(350000, 350000));
});

test("3. current-process per-unit result is correct", () => {
  assert.equal(deriveUnitCostSeries(350000, 350000).perOne, 1);
});

test("4. current-process per-100 result is correct", () => {
  assert.equal(deriveUnitCostSeries(350000, 350000).perHundred, 100);
});

test("5. current-process per-1,000 result is correct", () => {
  assert.equal(deriveUnitCostSeries(350000, 350000).perThousand, 1000);
});

test("6. Quick and Advanced update the reference from live input events", () => {
  assert.match(quickController, /form\.addEventListener\("input"[\s\S]*updateCurrentUnitReference\(\)/);
  assert.match(advancedController, /form\.addEventListener\("input"[\s\S]*updateLiveSummary\(\)/);
  assert.match(advancedController, /function updateLiveSummary\(\)[\s\S]*updateCurrentUnitReference\(input\)/);
});

test("7. Quick reference matches the independent oracle", () => {
  const input = CALCULATOR_EXAMPLES[0].quick;
  const oracle = referenceQuickScenario({ period: input.period, acceptanceMode: input.acceptanceMode, input: { currentOutcomes: input.currentOutcomes, currentCost: input.currentCost, aiAttempts: input.aiAttempts, successRate: input.successRate, aiCost: input.aiCost } });
  const result = calculateQuickDecisionMetrics(input);
  const series = deriveUnitCostSeries(input.currentCost, input.currentOutcomes);
  close(series.perOne, oracle.currentCostPerAccepted);
  close(series.perOne, result.currentCostPerSuccess.value);
});

test("8. Advanced known-total reference matches the independent oracle", () => {
  const input = CALCULATOR_EXAMPLES[1].advanced;
  const oracle = referenceAdvanced(input, input.period);
  const result = calculateAdvancedEstimate(input);
  const series = deriveUnitCostSeries(input.knownCurrentCost, input.currentOutcomes);
  close(series.perOne, oracle.currentCostPerAccepted);
  close(series.perOne, result.currentCostPerSuccess.value);
});

test("9. Advanced component-builder reference matches the independent oracle", () => {
  const input = CALCULATOR_EXAMPLES[0].advanced;
  const oracle = referenceAdvanced(input, input.period);
  const builtCost = buildCurrentCost(input.currentCostBuilder);
  const series = deriveUnitCostSeries(builtCost, input.currentOutcomes);
  close(series.perOne, oracle.currentCostPerAccepted);
});

test("10. AI comparison requires valid cost, attempts, and a positive accepted rate", () => {
  assert.equal(deriveAiUnitCostSeries("", 100, 80), null);
  assert.equal(deriveAiUnitCostSeries(100, 0, 80), null);
  assert.equal(deriveAiUnitCostSeries(100, 100, 0), null);
  assert.equal(deriveAiUnitCostSeries(100, 100, 101), null);
});

test("11. AI accepted-outcome calculation is correct", () => {
  assert.equal(deriveAiUnitCostSeries(82000, 2500, 78).acceptedOutcomes, 1950);
});

test("12. AI per-unit, per-100, and per-1,000 values match the oracle", () => {
  const input = CALCULATOR_EXAMPLES[0].quick;
  const oracle = referenceQuickScenario({ period: input.period, acceptanceMode: input.acceptanceMode, input: { currentOutcomes: input.currentOutcomes, currentCost: input.currentCost, aiAttempts: input.aiAttempts, successRate: input.successRate, aiCost: input.aiCost } });
  const series = deriveAiUnitCostSeries(input.aiCost, input.aiAttempts, input.successRate);
  close(series.perOne, oracle.aiCostPerAccepted);
  close(series.perHundred, oracle.aiCostPerAccepted * 100);
  close(series.perThousand, oracle.aiCostPerAccepted * 1000);
});

test("13. zero accepted current-process outcomes hide the reference", () => {
  assert.equal(deriveUnitCostSeries(100, 0), null);
});

test("14. zero accepted AI-assisted outcomes hide the comparison", () => {
  assert.equal(deriveAiUnitCostSeries(100, 1000, 0), null);
});

test("15. blank, negative, malformed, and nonfinite values are rejected", () => {
  for (const args of [["", 10], [10, ""], [-1, 10], [10, -1], ["abc", 10], [Infinity, 10]]) assert.equal(deriveUnitCostSeries(...args), null);
});

test("16. valid references never contain invalid numeric values", () => {
  const series = deriveUnitCostSeries(125.47, 7);
  for (const value of Object.values(series)) assert.ok(Number.isFinite(value));
  assert.doesNotMatch(JSON.stringify(series), /NaN|Infinity|undefined|null/);
});

test("17. selected unit labels are used dynamically in both displays", () => {
  for (const html of [quickHtml, advancedHtml]) {
    assert.match(html, /data-current-unit-reference[\s\S]*data-unit-singular/);
    assert.match(html, /data-unit-cost-comparison[\s\S]*data-unit-plural/);
  }
});

test("18. blank unit labels use the safe accepted-outcome fallback", () => {
  assert.deepEqual(unitTerms(""), { singular: "accepted outcome", plural: "accepted outcomes" });
});

test("19. currency formatting preserves cents and separates accessible visual parts", () => {
  assert.deepEqual(currencyDisplayParts(125.47), { formatted: "$125.47", currency: "$", whole: "125", cents: ".47", belowOne: false });
  assert.deepEqual(currencyDisplayParts(0.18), { formatted: "$0.18", currency: "$", whole: "0", cents: ".18", belowOne: true });
  assert.doesNotMatch(referenceSource, /setAttribute\("aria-label", parts\.formatted\)/);
  assert.doesNotMatch(referenceSource, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(referenceSource, /dataset\.exactValue/);
});

test("20. desktop and mobile layouts prevent compressed or overflowing value grids", () => {
  assert.match(quickCss, /min-width:1101px[\s\S]*minmax\(250px,\.72fr\)/);
  assert.match(sharedCss, /@media \(max-width:620px\)[\s\S]*\.unit-cost-series,\.unit-cost-comparison-grid \{ grid-template-columns:1fr;/);
  assert.match(sharedCss, /overflow-wrap:anywhere/);
});
