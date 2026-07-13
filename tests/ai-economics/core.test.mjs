import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  baselineUnitCost,
  breakEvenVolume,
  cacheEconomics,
  costPerAttempt,
  costPerVerified,
  riskAdjustedRoi,
  simplePayback,
  unitCostImprovement,
  validateExpectedLossEvents,
  validateOutcomeCounts,
  calculateEconomics,
  evidenceState,
  validateNonNegativeInputs,
  humanReviewCost,
  humanReworkCost,
  escalationCost,
  expectedLossForEvent,
  evidenceCoverage,
  annualToMonthly,
  monthlyToAnnual,
  calculateNpv,
  evaluateDecisionGate,
  sumCostComponents,
} from "../../tools/ai-cost-reality-calculator/calculator-core.js";
import { formatMetric } from "../../assets/js/ai-economics/presenter.js";

const vectors = JSON.parse(await readFile(new URL("./fixtures/calculator-test-vectors.json", import.meta.url)));
const byId = Object.fromEntries(vectors.cases.map((item) => [item.id, item]));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= vectors.tolerance, `${actual} != ${expected}`);

test("formula version test vectors are current", () => assert.equal(vectors.formula_version, "1.1.0"));

test("synthetic happy path", () => {
  const { inputs, expected } = byId.synthetic_happy_path;
  close(baselineUnitCost(inputs.baseline_cost, inputs.baseline_verified).value, expected.baseline_unit_cost);
  close(costPerAttempt(inputs.unit_economics_tco, inputs.attempts).value, expected.cost_per_attempt);
  close(costPerVerified(inputs.unit_economics_tco, inputs.verified).value, expected.cost_per_verified);
  close(riskAdjustedRoi(inputs.hard_benefit, inputs.unit_economics_tco, inputs.expected_loss).value, expected.risk_adjusted_roi);
  close(simplePayback(inputs.upfront, inputs.monthly_net_hard_benefit).value, expected.simple_payback_months);
});

test("zero verified outcomes returns not calculable", () => {
  const { inputs, expected } = byId.zero_verified_outcomes;
  const actual = costPerVerified(inputs.unit_economics_tco, inputs.verified);
  assert.equal(actual.status, expected.cost_per_verified.status);
  assert.equal(actual.reason, expected.cost_per_verified.reason);
});

test("non-positive monthly benefit returns no payback", () => {
  const { inputs, expected } = byId.no_payback;
  const monthly = inputs.monthly_hard_benefit - inputs.monthly_recurring_tco - inputs.monthly_expected_loss;
  assert.equal(simplePayback(inputs.upfront, monthly).status, expected.payback.status);
});

test("non-positive unit contribution returns no break-even", () => {
  const { inputs, expected } = byId.no_break_even;
  assert.equal(breakEvenVolume(inputs.annual_fixed_ai_cost, inputs.baseline_variable_unit_cost, inputs.ai_variable_unit_cost).status, expected.break_even.status);
});

test("cache all-in pricing vector", () => {
  const { inputs, expected } = byId.cache_break_even_all_in;
  const actual = cacheEconomics({
    normalInputRate: inputs.normal_input_rate,
    writeAllInRate: inputs.write_all_in_rate,
    cacheReadRate: inputs.cache_read_rate,
    repeatedTokens: inputs.repeated_tokens / 1_000_000,
    reads: inputs.reads,
  });
  close(actual.noCacheCost, expected.no_cache_cost);
  close(actual.cacheCost, expected.cache_cost);
  close(actual.cacheSavings, expected.cache_savings);
  assert.equal(actual.minimumWholeReads.value, expected.minimum_whole_reads);
});

test("zero attempts is explicit, never Infinity or NaN", () => {
  const actual = costPerAttempt(1000, 0);
  assert.equal(actual.status, "not_calculable");
  assert.equal(actual.value, null);
});

test("verified outcomes exceeding attempts is invalid", () => {
  const actual = validateOutcomeCounts({ attempts: 10, firstPass: 11, reviewedPass: 0, corrected: 0, failed: 0, unresolved: 0 });
  assert.equal(actual.status, "validation_error");
  assert.equal(actual.reason, "verified_outcomes_exceed_attempts");
});

test("invalid quality reconciliation is explicit", () => {
  const actual = validateOutcomeCounts({ attempts: 100, firstPass: 60, reviewedPass: 10, corrected: 10, failed: 10, unresolved: 5 });
  assert.equal(actual.status, "validation_error");
  assert.equal(actual.reason, "attempt_categories_do_not_reconcile");
  assert.equal(actual.difference, 5);
});

test("negative recurring net benefit returns no payback", () => {
  assert.equal(simplePayback(250000, -5000).status, "no_payback");
});

test("unmatched outcome definitions return not comparable inside core", () => {
  const actual = unitCostImprovement({ baselineDefinition: "case closed", aiDefinition: "reply generated", baselineUnitCost: 12, aiUnitCost: 3 });
  assert.equal(actual.status, "not_comparable");
});

test("expected-loss double counting is rejected", () => {
  const actual = validateExpectedLossEvents([{ name: "refunds", expected_loss: 10000, included_in_observed_tco: true }]);
  assert.equal(actual.status, "validation_error");
  assert.equal(actual.reason, "expected_loss_already_in_observed_tco");
});

test("capacity is excluded from hard ROI", () => {
  const base = {
    metadata: { formula_version: "1.1.0" },
    baseline: { process_cost: 1000000, verified_outcomes: 100000 },
    ai: { attempts: 125000, verified_rate: 0.84, direct_model_platform_cost: 150000 },
    tco: { upfront: 300000, useful_life_years: 3, human_review: 160000, rework_exception: 90000, other_recurring: 300000 },
    benefits: { hard_annual_benefit: 1050000, capacity_hours: 0, loaded_hourly_rate: 100 },
    risk: { expected_annual_loss: 50000 },
    finance: { discount_rate: 0.08, horizon_years: 3 },
  };
  const withoutCapacity = calculateEconomics(base);
  const withCapacity = calculateEconomics({ ...base, benefits: { ...base.benefits, capacity_hours: 1000000 } });
  close(withoutCapacity.hardRoi.value, withCapacity.hardRoi.value);
  close(withoutCapacity.riskAdjustedRoi.value, withCapacity.riskAdjustedRoi.value);
  assert.ok(withCapacity.grossCapacityValue.value > withoutCapacity.grossCapacityValue.value);
});

test("expected annual loss is included exactly once", () => {
  const roi = riskAdjustedRoi(1000, 700, 50);
  close(roi.value, (1000 - 700 - 50) / (700 + 50));
});

test("decimal precision is retained until presentation", () => {
  close(costPerVerified(1, 3).value, 1 / 3);
  assert.notEqual(costPerVerified(1, 3).value, 0.33);
});

test("large safe integers retain unit precision", () => {
  const large = 8_000_000_000_000;
  close(costPerVerified(large, 4).value, 2_000_000_000_000);
});

test("more evidence required is an explicit non-numeric state", () => {
  const actual = evidenceState(false);
  assert.equal(actual.status, "more_evidence_required");
  assert.equal(actual.value, null);
});

test("negative inputs are rejected", () => {
  const actual = validateNonNegativeInputs({ recurringCost: -1, attempts: 5 });
  assert.equal(actual.status, "validation_error");
  assert.deepEqual(actual.fields, ["recurringCost"]);
});

test("zero useful life makes unit-economics TCO not calculable", () => {
  const actual = calculateEconomics({ baseline: {}, ai: {}, tco: { useful_life_years: 0 }, benefits: {}, risk: {}, finance: { discount_rate: 0, horizon_years: 3 } });
  assert.equal(actual.unitEconomicsTco.status, "not_calculable");
  assert.equal(actual.unitEconomicsTco.reason, "useful_life_zero");
});

test("zero discount rate uses an undiscounted denominator of one", () => {
  const actual = calculateNpv({ initialInvestment: 100, annualBenefit: 100, annualRecurringTco: 20, annualExpectedLoss: 10, discountRate: 0, horizonYears: 2 });
  assert.equal(actual.status, "valid");
  close(actual.value, 40);
});

test("capacity is excluded from payback and NPV", () => {
  const base = {
    metadata: { outcome_definition: "case closed" }, baseline: { process_cost: 1000, verified_outcomes: 100 },
    ai: { attempts: 100, verified_rate: .9, direct_model_platform_cost: 100 },
    tco: { upfront: 200, useful_life_years: 2, human_review: 50, rework_exception: 25, other_recurring: 25 },
    benefits: { hard_annual_benefit: 500, capacity_hours: 0, loaded_hourly_rate: 100 }, risk: { expected_annual_loss: 25 }, finance: { discount_rate: .1, horizon_years: 3 },
  };
  const zero = calculateEconomics(base);
  const large = calculateEconomics({ ...base, benefits: { ...base.benefits, capacity_hours: 1_000_000 } });
  close(zero.payback.value, large.payback.value);
  close(zero.npv.value, large.npv.value);
});

test("annual and monthly conversions round-trip without display rounding", () => {
  const annual = 1_234_567.89;
  close(monthlyToAnnual(annualToMonthly(annual).value).value, annual);
});

test("evidence coverage weights values and is not a confidence score", () => {
  const actual = evidenceCoverage([{ value: 300, evidence: "actual_reconciled" }, { value: 100, evidence: "forecast" }]);
  close(actual.value, .75);
});

test("rounding occurs only in the presenter", () => {
  const raw = costPerVerified(2, 3);
  assert.equal(raw.value, 2 / 3);
  assert.equal(formatMetric(raw, { style: "currency", currency: "USD", digits: 2 }), "$0.67");
});

test("JSON export round-trip reproduces core results", () => {
  const data = {
    metadata: { outcome_definition: "case closed" }, baseline: { process_cost: 1000, verified_outcomes: 100 }, ai: { attempts: 100, verified_rate: .9, direct_model_platform_cost: 100 },
    tco: { upfront: 200, useful_life_years: 2, human_review: 50, rework_exception: 25, other_recurring: 25 }, benefits: { hard_annual_benefit: 500 }, risk: { expected_annual_loss: 25 }, finance: { discount_rate: .1, horizon_years: 3 },
  };
  const original = calculateEconomics(data);
  const restored = calculateEconomics(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(restored, original);
});

test("human cost formulas retain explicit components", () => {
  close(humanReviewCost(120, 5, 60).value, 600);
  close(humanReworkCost(30, 20, 75, 250).value, 1000);
  close(escalationCost(10, 125).value, 1250);
});

test("detailed recurring components reconcile to one aggregate", () => {
  const actual = sumCostComponents({ hosting: 10.1, monitoring: 20.2, controls: 30.3, reserve: 40.4 });
  close(actual.value, 101);
});

test("expected loss event supports exposure and annual-probability models", () => {
  close(expectedLossForEvent({ annualExposures: 1000, probabilityOfEvent: .01, averageFinancialImpact: 500 }).value, 5000);
  close(expectedLossForEvent({ annualProbability: .2, financialImpact: 100000 }).value, 20000);
});

test("strongest governance output requires all ten conditions", () => {
  const all = Object.fromEntries(["comparableBaseline", "qualityAtOrAboveBaseline", "lowerCostPerVerifiedOutcome", "positiveRiskAdjustedNpv", "representativeProductionEvidence", "failureRecoveryTested", "specialistKnowledgeRetained", "namedAccountableOwner", "financeValidatedHardBenefits", "controlApprovalsComplete"].map((key) => [key, true]));
  assert.equal(evaluateDecisionGate(all).value, "replacement_economics_supportable_for_separate_leadership_review");
  assert.notEqual(evaluateDecisionGate({ ...all, controlApprovalsComplete: false }).value, "replacement_economics_supportable_for_separate_leadership_review");
});
