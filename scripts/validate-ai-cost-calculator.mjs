#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  baselineUnitCost, breakEvenVolume, cacheEconomics, costPerAttempt, costPerVerified,
  riskAdjustedRoi, simplePayback, unitCostImprovement, validateOutcomeCounts,
} from "../tools/ai-cost-reality-calculator/calculator-core.js";

const vectors = JSON.parse(await readFile(new URL("../.codex-input/running-before-crawling/07_CALCULATOR_TEST_VECTORS.json", import.meta.url)));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= vectors.tolerance, `${actual} != ${expected}`);
let passed = 0;

for (const testCase of vectors.cases) {
  const { inputs, expected, id } = testCase;
  if (id === "synthetic_happy_path") {
    close(baselineUnitCost(inputs.baseline_cost, inputs.baseline_verified).value, expected.baseline_unit_cost);
    close(costPerAttempt(inputs.unit_economics_tco, inputs.attempts).value, expected.cost_per_attempt);
    close(costPerVerified(inputs.unit_economics_tco, inputs.verified).value, expected.cost_per_verified);
    close(riskAdjustedRoi(inputs.hard_benefit, inputs.unit_economics_tco, inputs.expected_loss).value, expected.risk_adjusted_roi);
    close(simplePayback(inputs.upfront, inputs.monthly_net_hard_benefit).value, expected.simple_payback_months);
  } else if (id === "zero_verified_outcomes") {
    assert.deepEqual(costPerVerified(inputs.unit_economics_tco, inputs.verified), { ...expected.cost_per_verified, value: null });
  } else if (id === "no_payback") {
    assert.equal(simplePayback(inputs.upfront, inputs.monthly_hard_benefit - inputs.monthly_recurring_tco - inputs.monthly_expected_loss).status, expected.payback.status);
  } else if (id === "no_break_even") {
    assert.equal(breakEvenVolume(inputs.annual_fixed_ai_cost, inputs.baseline_variable_unit_cost, inputs.ai_variable_unit_cost).status, expected.break_even.status);
  } else if (id === "cache_break_even_all_in") {
    const actual = cacheEconomics({ normalInputRate: inputs.normal_input_rate, writeAllInRate: inputs.write_all_in_rate, cacheReadRate: inputs.cache_read_rate, repeatedTokens: inputs.repeated_tokens / 1_000_000, reads: inputs.reads });
    close(actual.noCacheCost, expected.no_cache_cost); close(actual.cacheCost, expected.cache_cost); close(actual.cacheSavings, expected.cache_savings); assert.equal(actual.minimumWholeReads.value, expected.minimum_whole_reads);
  } else if (id === "closed_period_reconciliation_error") {
    const actual = validateOutcomeCounts({ periodClosed: inputs.period_closed, attempts: inputs.attempts, firstPass: inputs.first_pass, reviewedPass: inputs.reviewed_pass, corrected: inputs.corrected, failed: inputs.failed, unresolved: inputs.unresolved });
    assert.equal(actual.status, expected.validation.status); assert.equal(actual.reason, expected.validation.reason); assert.equal(actual.difference, expected.validation.difference);
  } else if (id === "not_comparable_outcomes") {
    const actual = unitCostImprovement({ baselineDefinition: inputs.baseline_outcome_definition, aiDefinition: inputs.ai_outcome_definition, baselineUnitCost: inputs.baseline_unit_cost, aiUnitCost: inputs.ai_unit_cost });
    assert.equal(actual.status, expected.unit_cost_improvement.status); assert.equal(actual.reason, expected.unit_cost_improvement.reason);
  } else {
    throw new Error(`Unhandled supplied vector: ${id}`);
  }
  passed += 1;
  console.log(`PASS ${id}`);
}

console.log(`PASS: ${passed}/${vectors.cases.length} supplied calculator test vectors matched formula ${vectors.formula_version}.`);
