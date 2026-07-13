import test from "node:test";
import assert from "node:assert/strict";
import { calculateBasicEstimate } from "../../tools/ai-cost-reality-calculator/basic-calculator.js";
import { calculatePilotRate, calculateQuickDecisionMetrics } from "../../tools/ai-cost-reality-calculator/quick-decision-metrics.js";

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const input = (overrides = {}) => ({ currentOutcomes: 100000, currentCost: 1000000, aiAttempts: 125000, successRate: 84, aiCost: 600000, period: "annual", ...overrides });
const calculate = (overrides) => calculateQuickDecisionMetrics(input(overrides));

test("existing annual standard scenario remains identical", () => {
  const oldResult = calculateBasicEstimate({ annualOutcomes: 100000, currentAnnualCost: 1000000, aiAttempts: 125000, successRate: 84, annualAiCost: 600000 });
  const result = calculate();
  close(result.currentCostPerSuccess.value, oldResult.currentCostPerSuccess.value);
  close(result.aiCostPerAttempt.value, oldResult.aiCostPerAttempt.value);
  close(result.aiCostPerSuccess.value, oldResult.aiCostPerSuccess.value);
});
test("existing zero-success behavior remains valid", () => assert.equal(calculate({ successRate: 0 }).aiCostPerSuccess.status, "not_calculable"));
test("existing validation behavior remains valid", () => assert.equal(calculate({ aiAttempts: 0 }).status, "validation_error"));
test("monthly period annualizes by twelve", () => close(calculate({ period: "monthly" }).annualizedSavings.value, 12 * (1000000 - (100000 * (600000 / 105000)))));
test("quarterly period annualizes by four", () => close(calculate({ period: "quarterly" }).annualizedSavings.value, 4 * (1000000 - (100000 * (600000 / 105000)))));
test("annual period annualizes by one", () => close(calculate().annualizedSavings.value, 1000000 - (100000 * (600000 / 105000))));
test("break-even below entered rate", () => assert.ok(calculate().breakEvenMargin.value > 0));
test("break-even equal to entered rate", () => close(calculate({ aiCost: 1050000 }).breakEvenMargin.value, 0));
test("break-even above entered rate", () => assert.ok(calculate({ aiCost: 1200000 }).breakEvenMargin.value < 0));
test("break-even above 100 percent", () => assert.equal(calculate({ aiCost: 1300000 }).breakEvenRate.status, "not_achievable"));
test("equivalent-output savings", () => assert.ok(calculate().selectedPeriodSavings.value > 0));
test("equivalent-output loss", () => assert.ok(calculate({ aiCost: 1200000 }).selectedPeriodSavings.value < 0));
test("approximate break-even", () => assert.equal(calculate({ aiCost: 1050000 }).decisionSignal, "Approximately break-even"));
test("pilot-rate helper", () => close(calculatePilotRate(200, 150).value, 75));
test("pilot accepted outcomes exceed attempts", () => assert.equal(calculatePilotRate(100, 101).status, "validation_error"));
test("zero pilot attempts", () => assert.equal(calculatePilotRate(0, 0).status, "validation_error"));
test("no Infinity", () => assert.equal(JSON.stringify(calculate({ currentCost: 0 })).includes("Infinity"), false));
test("no NaN", () => assert.equal(JSON.stringify(calculate({ successRate: 0 })).includes("NaN"), false));
test("existing unit-cost outputs unchanged", () => { const r = calculate(); close(r.currentCostPerSuccess.value, 10); close(r.aiCostPerAttempt.value, 4.8); close(r.aiCostPerSuccess.value, 600000 / 105000); });
test("existing failed-attempt outputs unchanged", () => close(calculate().failedAttempts.value, 20000));
test("existing failure-cost allocation unchanged", () => close(calculate().annualFailureCost.value, 96000));
test("equivalent-output AI cost uses accepted current volume", () => close(calculate().equivalentOutputAiCost.value, 100000 * (600000 / 105000)));
test("selected period is reported", () => assert.equal(calculate({ period: "quarterly" }).periodLabel, "Quarterly"));
