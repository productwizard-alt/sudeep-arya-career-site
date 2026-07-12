import test from "node:test";
import assert from "node:assert/strict";
import { calculateBasicEstimate } from "../../tools/ai-cost-reality-calculator/basic-calculator.js";

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const calculate = (overrides = {}) => calculateBasicEstimate({ annualOutcomes: 100000, currentAnnualCost: 1000000, aiAttempts: 125000, successRate: 84, annualAiCost: 600000, ...overrides });

test("published example reconciles every displayed result", () => {
  const result = calculate();
  close(result.currentCostPerSuccess.value, 10);
  close(result.aiCostPerAttempt.value, 4.8);
  close(result.successfulAiOutcomes.value, 105000);
  close(result.aiCostPerSuccess.value, 600000 / 105000);
  close(result.failedAttempts.value, 20000);
  close(result.annualFailureCost.value, 96000);
  assert.equal(result.signal, "Lower cost per success under this estimate");
});

test("100 percent success has no failed attempts or failure cost", () => {
  const result = calculate({ successRate: 100 });
  close(result.aiCostPerSuccess.value, 4.8); close(result.failedAttempts.value, 0); close(result.annualFailureCost.value, 0);
});

test("50 percent success doubles cost per success relative to cost per attempt", () => {
  const result = calculate({ aiAttempts: 1000, successRate: 50, annualAiCost: 20000 });
  close(result.aiCostPerAttempt.value, 20); close(result.aiCostPerSuccess.value, 40); close(result.annualFailureCost.value, 10000);
});

test("zero percent success produces explicit no-success state", () => {
  const result = calculate({ successRate: 0 });
  assert.equal(result.aiCostPerSuccess.status, "not_calculable");
  close(result.failedAttempts.value, 125000); close(result.annualFailureCost.value, 600000);
  assert.equal(result.signal, "No successful AI outcomes under this estimate");
});

test("higher AI unit cost produces a higher-cost signal", () => {
  const result = calculate({ aiAttempts: 100000, successRate: 50, annualAiCost: 750000 });
  close(result.aiCostPerSuccess.value, 15); assert.equal(result.signal, "Higher cost per success under this estimate");
});

test("equal unit cost produces parity signal", () => {
  const result = calculate({ aiAttempts: 100000, successRate: 60, annualAiCost: 600000 });
  close(result.aiCostPerSuccess.value, 10); assert.equal(result.signal, "Cost per success is approximately the same");
});

test("small real-world content workflow retains decimal precision", () => {
  const result = calculate({ annualOutcomes: 2400, currentAnnualCost: 186000, aiAttempts: 3600, successRate: 72.5, annualAiCost: 94500 });
  close(result.currentCostPerSuccess.value, 77.5); close(result.successfulAiOutcomes.value, 2610);
  close(result.aiCostPerSuccess.value, 94500 / 2610); close(result.failedAttempts.value, 990); close(result.annualFailureCost.value, 25987.5);
});

test("zero AI cost remains valid and does not create NaN", () => {
  const result = calculate({ annualAiCost: 0 });
  close(result.aiCostPerAttempt.value, 0); close(result.aiCostPerSuccess.value, 0); close(result.annualFailureCost.value, 0);
});

test("zero current outcomes is rejected", () => assert.equal(calculate({ annualOutcomes: 0 }).status, "validation_error"));
test("zero AI attempts is rejected", () => assert.equal(calculate({ aiAttempts: 0 }).status, "validation_error"));
test("success above 100 percent is rejected", () => assert.equal(calculate({ successRate: 100.01 }).status, "validation_error"));
test("negative and missing inputs are rejected", () => {
  assert.equal(calculate({ annualAiCost: -1 }).status, "validation_error");
  assert.equal(calculateBasicEstimate({ annualOutcomes: "", currentAnnualCost: 1, aiAttempts: 1, successRate: 50, annualAiCost: 1 }).status, "validation_error");
});
