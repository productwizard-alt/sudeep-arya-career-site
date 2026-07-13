import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { quickScenarios, advancedScenarios } from "./scenario-fixtures.mjs";
import { independentPilotRate, referenceQuick, referenceQuickScenario, referenceAdvanced, referenceAdvancedScenario } from "./independent-scenario-oracle.mjs";
import { calculatePilotRate, calculateQuickDecisionMetrics } from "../../tools/ai-cost-reality-calculator/quick-decision-metrics.js";
import { calculateAdvancedEstimate } from "../../tools/ai-cost-reality-calculator/advanced/advanced-calculator-core.js";

const tolerance = (expected) => Math.max(1e-8, Math.abs(expected || 0) * 1e-10);
const close = (actual, expected, label) => {
  if (expected === null) return assert.equal(actual, null, label);
  assert.ok(Number.isFinite(actual), `${label}: actual is not finite`);
  assert.ok(Math.abs(actual - expected) <= tolerance(expected), `${label}: ${actual} != ${expected}`);
};

function compareQuick(actual, expected, id) {
  assert.equal(actual.status, expected.status, `${id} status`);
  for (const [actualValue, expectedValue, label] of [
    [actual.currentCostPerSuccess.value, expected.currentCostPerAccepted, "current unit cost"],
    [actual.successfulAiOutcomes.value, expected.acceptedAiOutcomes, "accepted AI outcomes"],
    [actual.aiCostPerAttempt.value, expected.aiCostPerAttempt, "AI cost per attempt"],
    [actual.aiCostPerSuccess.value, expected.aiCostPerAccepted, "AI cost per accepted outcome"],
    [actual.equivalentOutputAiCost.value, expected.equivalentOutputAiCost, "equivalent-output AI cost"],
    [actual.selectedPeriodSavings.value, expected.selectedPeriodSavings, "selected-period savings/loss"],
    [actual.annualizedSavings.value, expected.annualizedSavings, "annualized savings/loss"],
    [actual.breakEvenRate.value, expected.breakEvenRate, "break-even acceptance rate"],
    [actual.breakEvenMargin.value, expected.breakEvenMargin, "margin to break-even"],
    [actual.failedAttempts.value, expected.failedAttempts, "failed attempts"],
    [actual.annualFailureCost.value, expected.failureCost, "failure-cost allocation"],
  ]) close(actualValue, expectedValue, `${id} ${label}`);
  assert.equal(actual.breakEvenRate.status, expected.breakEvenStatus, `${id} break-even status`);
  assert.equal(actual.decisionSignal, expected.decisionSignal, `${id} decision signal`);
}

function actualQuickScenario(scenario) {
  const input = { ...scenario.input };
  if (scenario.acceptanceMode === "pilot") {
    const pilot = calculatePilotRate(scenario.pilot.attempts, scenario.pilot.accepted);
    assert.equal(pilot.status, "valid", `${scenario.id} production pilot status`);
    input.successRate = pilot.value;
  }
  return calculateQuickDecisionMetrics({ ...input, period: scenario.period });
}

for (const scenario of quickScenarios) {
  test(`${scenario.id} Quick scenario independently reconciles: ${scenario.name}`, () => {
    const expected = referenceQuickScenario(scenario);
    const actual = actualQuickScenario(scenario);
    compareQuick(actual, expected, scenario.id);
    assert.equal(actual.decisionSignal, scenario.expectedDecision);
  });
}

for (const scenario of advancedScenarios) {
  test(`${scenario.id} Advanced scenario independently reconciles: ${scenario.name}`, () => {
    const expected = referenceAdvancedScenario(scenario);
    const actual = calculateAdvancedEstimate({ ...scenario.input, period: scenario.period });
    compareQuick(actual, expected, scenario.id);
    close(actual.currentCost, expected.currentCost, `${scenario.id} built current total`);
    close(actual.aiCost, expected.aiCost, `${scenario.id} built AI total`);
    close(actual.maximumBreakEvenAiCost.value, expected.maximumBreakEvenAiCost, `${scenario.id} maximum break-even AI cost`);
    close(actual.costThresholdDifference.value, expected.costThresholdDifference, `${scenario.id} cost headroom / reduction`);
    assert.deepEqual(actual.completenessNotes, expected.completenessNotes, `${scenario.id} completeness notes`);
    if (expected.composition) {
      for (const key of ["technologyCost", "annualizedImplementation", "allocatedImplementation", "reviewCost", "otherOperatingCost", "total"]) close(actual.composition[key], expected.composition[key], `${scenario.id} composition ${key}`);
    } else assert.equal(actual.composition, null, `${scenario.id} known total has no composition`);
    assert.equal(actual.decisionSignal, scenario.expectedDecision);
  });
}

test("scenario package has 12 materially distinct fixtures per mode", () => {
  assert.equal(quickScenarios.length, 12);
  assert.equal(advancedScenarios.length, 12);
  assert.equal(new Set(quickScenarios.map(({ category }) => category)).size, 12);
  assert.equal(new Set(advancedScenarios.map(({ category }) => category)).size, 12);
});

test("independent oracle imports no production calculator implementation", async () => {
  const source = await readFile(new URL("./independent-scenario-oracle.mjs", import.meta.url), "utf8");
  for (const prohibited of ["calculator-core.js", "basic-calculator.js", "quick-decision-metrics.js", "advanced-calculator-core.js", "advanced-calculator.js", "calculator.js"]) assert.doesNotMatch(source, new RegExp(prohibited.replaceAll(".", "\\.")));
  assert.doesNotMatch(source, /^import /m);
});

test("0% and 100% acceptance edge cases reconcile independently", () => {
  for (const successRate of [0, 100]) {
    const input = { currentOutcomes: 100, currentCost: 1000, aiAttempts: 125, successRate, aiCost: 700, period: "annual" };
    compareQuick(calculateQuickDecisionMetrics(input), referenceQuick(input), `edge ${successRate}%`);
  }
});

test("near-zero positive, decimal, and very large plausible values retain precision", () => {
  for (const input of [
    { currentOutcomes: .0001, currentCost: .0003, aiAttempts: .0002, successRate: 33.3333, aiCost: .00009, period: "monthly" },
    { currentOutcomes: 1234.56, currentCost: 98765.43, aiAttempts: 2345.67, successRate: 67.89, aiCost: 54321.09, period: "quarterly" },
    { currentOutcomes: 12000000, currentCost: 6000000, aiAttempts: 15000000, successRate: 88, aiCost: 5500000, period: "annual" },
  ]) compareQuick(calculateQuickDecisionMetrics(input), referenceQuick(input, input.period), `precision ${input.currentOutcomes}`);
});

test("currency, comma, percentage, and decimal display rounding is explicit", () => {
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const percentage = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
  assert.equal(currency.format(1234567.891), "$1,234,567.89");
  assert.equal(percentage.format(.72849), "72.8%");
  assert.equal(new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(1234567.891), "1,234,567.89");
});

test("invalid negative, blank, malformed, and comma-containing numeric inputs are rejected", () => {
  const valid = { currentOutcomes: 100, currentCost: 1000, aiAttempts: 125, successRate: 80, aiCost: 700, period: "annual" };
  for (const mutation of [{ currentCost: -1 }, { currentCost: "" }, { currentCost: "not-a-number" }, { currentCost: "1,000" }]) {
    assert.equal(calculateQuickDecisionMetrics({ ...valid, ...mutation }).status, "validation_error");
    assert.equal(referenceQuick({ ...valid, ...mutation }).status, "validation_error");
  }
});

test("pilot invalid states match the independent oracle", () => {
  for (const [attempts, accepted] of [[0, 0], [10, 11], ["", 1], [10, -1]]) {
    assert.equal(calculatePilotRate(attempts, accepted).status, independentPilotRate(attempts, accepted).status);
  }
});

test("inactive methods remain excluded even with invalid or populated retained values", () => {
  const scenario = advancedScenarios.find(({ id }) => id === "A05");
  const actual = calculateAdvancedEstimate({ ...scenario.input, period: scenario.period });
  const expected = referenceAdvancedScenario(scenario);
  assert.equal(actual.status, "valid");
  close(actual.currentCost, expected.currentCost, "inactive current builder ignored");
  close(actual.aiCost, expected.aiCost, "inactive AI builder ignored");
  const nested = advancedScenarios.find(({ id }) => id === "A09");
  assert.equal(calculateAdvancedEstimate({ ...nested.input, period: nested.period }).status, "valid", "inactive calculated-review values ignored");
});

test("switching known totals, component builders, direct rates, and pilot rates changes only active inputs", () => {
  const base = advancedScenarios.find(({ id }) => id === "A03");
  const built = calculateAdvancedEstimate({ ...base.input, period: base.period });
  const known = calculateAdvancedEstimate({ ...base.input, period: base.period, currentCostMethod: "known", knownCurrentCost: 1300000, aiCostMethod: "known", knownAiCost: 830000 });
  close(built.currentCost, known.currentCost, "known and built current totals reconcile");
  close(built.aiCost, known.aiCost, "known and built AI totals reconcile");
  const direct = calculateAdvancedEstimate({ ...base.input, period: base.period, successMethod: "direct", successRate: 72 });
  const pilot = calculateAdvancedEstimate({ ...base.input, period: base.period, successMethod: "pilot", pilotAttempts: 100, pilotAccepted: 72 });
  close(direct.enteredSuccessRate.value, pilot.enteredSuccessRate.value, "direct and pilot rate reconcile");
});

test("period changes after entry preserve inputs and apply the documented period conversion", () => {
  const source = advancedScenarios.find(({ id }) => id === "A04").input;
  for (const period of ["monthly", "quarterly", "annual"]) {
    const actual = calculateAdvancedEstimate({ ...source, period });
    const expected = referenceAdvanced({ ...source, period }, period);
    compareQuick(actual, expected, `period switch ${period}`);
    close(actual.composition.allocatedImplementation, expected.composition.allocatedImplementation, `period switch ${period} implementation`);
  }
});

test("blank required Advanced inputs and blank builder technology cost are rejected", () => {
  const base = advancedScenarios[0].input;
  for (const mutation of [
    { currentOutcomes: "" }, { aiAttempts: "" },
    { currentCostMethod: "known", knownCurrentCost: "" },
    { aiCostMethod: "known", knownAiCost: "" },
    { aiCostMethod: "builder", aiCostBuilder: { ...base.aiCostBuilder, technologyCost: "" } },
  ]) assert.equal(calculateAdvancedEstimate({ ...base, period: "monthly", ...mutation }).status, "validation_error");
});
