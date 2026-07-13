import test from "node:test";
import assert from "node:assert/strict";
import { buildAiCost, buildCurrentCost, calculateAdvancedEstimate, calculateReviewCost } from "../../tools/ai-cost-reality-calculator/advanced/advanced-calculator-core.js";

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const base = (overrides = {}) => ({
  period: "annual", currentOutcomes: 100000, currentCostMethod: "known", knownCurrentCost: 1000000,
  aiAttempts: 125000, successMethod: "direct", successRate: 84,
  aiCostMethod: "known", knownAiCost: 600000, ...overrides,
});
const calculate = (overrides) => calculateAdvancedEstimate(base(overrides));
const builder = (overrides = {}) => ({ technologyCost: 300000, implementationCost: 300000, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 150000, otherOperatingCost: 50000, ...overrides });

test("known-current-total method", () => close(calculate().currentCost, 1000000));
test("current-cost builder", () => close(buildCurrentCost({ laborHours: 1000, loadedHourlyCost: 100, agencyCost: 10000, softwareCost: 20000, reworkCost: 30000, otherCost: 40000 }), 200000));
test("known-AI-total method", () => close(calculate().aiCost, 600000));
test("AI component-builder method", () => close(calculate({ aiCostMethod: "builder", aiCostBuilder: builder() }).aiCost, 600000));
test("known review-cost method", () => close(buildAiCost(builder(), "annual", 125000).reviewCost, 150000));
test("calculated review-cost method", () => close(calculateReviewCost({ aiAttempts: 1000, reviewRate: 50, reviewMinutes: 12, reviewHourlyCost: 100 }), 10000));
test("one-year implementation amortization", () => close(buildAiCost(builder({ amortizationYears: 1 }), "annual", 1).allocatedImplementation, 300000));
test("three-year implementation amortization", () => close(buildAiCost(builder(), "annual", 1).allocatedImplementation, 100000));
test("ten-year implementation amortization", () => close(buildAiCost(builder({ amortizationYears: 10 }), "annual", 1).allocatedImplementation, 30000));
test("monthly implementation allocation", () => close(buildAiCost(builder(), "monthly", 1).allocatedImplementation, 300000 / 3 / 12));
test("quarterly implementation allocation", () => close(buildAiCost(builder(), "quarterly", 1).allocatedImplementation, 300000 / 3 / 4));
test("annual implementation allocation", () => close(buildAiCost(builder(), "annual", 1).allocatedImplementation, 100000));
test("zero optional costs", () => close(calculate({ aiCostMethod: "builder", aiCostBuilder: builder({ technologyCost: 0, implementationCost: 0, knownReviewCost: 0, otherOperatingCost: 0 }) }).aiCost, 0));
test("pilot-derived success rate", () => close(calculate({ successMethod: "pilot", pilotAttempts: 200, pilotAccepted: 150 }).enteredSuccessRate.value, .75));
test("direct success rate", () => close(calculate().enteredSuccessRate.value, .84));
test("break-even below entered rate", () => assert.ok(calculate().breakEvenMargin.value > 0));
test("break-even equal to entered rate", () => close(calculate({ knownAiCost: 1050000 }).breakEvenMargin.value, 0));
test("break-even above entered rate", () => assert.ok(calculate({ knownAiCost: 1200000 }).breakEvenMargin.value < 0));
test("break-even above 100 percent", () => assert.equal(calculate({ knownAiCost: 1300000 }).breakEvenRate.status, "not_achievable"));
test("equivalent-output savings", () => assert.ok(calculate().selectedPeriodSavings.value > 0));
test("equivalent-output loss", () => assert.ok(calculate({ knownAiCost: 1200000 }).selectedPeriodSavings.value < 0));
test("maximum break-even AI cost", () => close(calculate().maximumBreakEvenAiCost.value, 1050000));
test("cost headroom", () => close(calculate().costThresholdDifference.value, 450000));
test("required cost reduction", () => close(calculate({ knownAiCost: 1200000 }).costThresholdDifference.value, -150000));
test("human-review cost", () => close(buildAiCost(builder({ reviewMethod: "calculated", reviewRate: 50, reviewMinutes: 12, reviewHourlyCost: 100 }), "annual", 1000).reviewCost, 10000));
test("zero review percentage", () => close(calculateReviewCost({ aiAttempts: 1000, reviewRate: 0, reviewMinutes: 12, reviewHourlyCost: 100 }), 0));
test("100 percent review percentage", () => close(calculateReviewCost({ aiAttempts: 1000, reviewRate: 100, reviewMinutes: 12, reviewHourlyCost: 100 }), 20000));
test("decimal currency", () => close(calculate({ knownAiCost: 1234.56 }).aiCost, 1234.56));
test("large values", () => assert.equal(calculate({ currentOutcomes: 1e12, knownCurrentCost: 1e14, aiAttempts: 2e12, knownAiCost: 5e13 }).status, "valid"));
test("negative-value rejection", () => assert.equal(calculate({ knownAiCost: -1 }).status, "validation_error"));
test("inactive method values are ignored and not double counted", () => { const result = calculate({ knownAiCost: 600000, aiCostBuilder: builder({ technologyCost: -900000 }) }); assert.equal(result.status, "valid"); close(result.aiCost, 600000); });
test("inactive calculated-review values are ignored", () => { const result = calculate({ aiCostMethod: "builder", aiCostBuilder: builder({ reviewMethod: "known", reviewRate: 150 }) }); assert.equal(result.status, "valid"); close(result.aiCost, 600000); });
test("switching methods changes active value only", () => close(calculate({ aiCostMethod: "builder", knownAiCost: 999999, aiCostBuilder: builder() }).aiCost, 600000));
test("builder requires a technology-cost entry", () => assert.equal(calculate({ aiCostMethod: "builder", aiCostBuilder: builder({ technologyCost: "" }) }).status, "validation_error"));
test("no Infinity", () => assert.equal(JSON.stringify(calculate({ knownCurrentCost: 0 })).includes("Infinity"), false));
test("no NaN", () => assert.equal(JSON.stringify(calculate({ successRate: 0 })).includes("NaN"), false));
test("selected-period display", () => assert.equal(calculate({ period: "monthly" }).periodLabel, "Monthly"));
test("annualization", () => close(calculate({ period: "quarterly" }).annualizedSavings.value, calculate({ period: "quarterly" }).selectedPeriodSavings.value * 4));
test("cost-component sum", () => { const c = calculate({ aiCostMethod: "builder", aiCostBuilder: builder() }).composition; close(c.total, c.technologyCost + c.allocatedImplementation + c.reviewCost + c.otherOperatingCost); });
test("omitted-cost completeness note", () => assert.ok(calculate({ aiCostMethod: "builder", aiCostBuilder: builder({ implementationCost: 0, knownReviewCost: 0 }) }).completenessNotes.length >= 2));
test("pilot attempts cannot be zero", () => assert.equal(calculate({ successMethod: "pilot", pilotAttempts: 0, pilotAccepted: 0 }).status, "validation_error"));
test("pilot accepted cannot exceed attempts", () => assert.equal(calculate({ successMethod: "pilot", pilotAttempts: 10, pilotAccepted: 11 }).status, "validation_error"));
