import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateClosedPeriod, validateComparison } from "../../assets/js/ai-economics/validation.js";
import { unitCostImprovement } from "../../tools/ai-cost-reality-calculator/calculator-core.js";

const vectors = JSON.parse(await readFile(new URL("../../.codex-input/running-before-crawling/07_CALCULATOR_TEST_VECTORS.json", import.meta.url)));
const byId = Object.fromEntries(vectors.cases.map((item) => [item.id, item]));

test("closed period counts must reconcile", () => {
  const { inputs, expected } = byId.closed_period_reconciliation_error;
  const actual = validateClosedPeriod({
    periodClosed: inputs.period_closed,
    attempts: inputs.attempts,
    firstPass: inputs.first_pass,
    reviewedPass: inputs.reviewed_pass,
    corrected: inputs.corrected,
    failed: inputs.failed,
    unresolved: inputs.unresolved,
  });
  assert.equal(actual.status, expected.validation.status);
  assert.equal(actual.reason, expected.validation.reason);
  assert.equal(actual.difference, expected.validation.difference);
});

test("mismatched outcome definitions return not comparable", () => {
  const { inputs, expected } = byId.not_comparable_outcomes;
  const actual = validateComparison(inputs.baseline_outcome_definition, inputs.ai_outcome_definition);
  assert.equal(actual.status, expected.unit_cost_improvement.status);
  assert.equal(actual.reason, expected.unit_cost_improvement.reason);
});

test("all supplied validation vectors execute through the isolated core contract", () => {
  const mismatch = byId.not_comparable_outcomes;
  const actual = unitCostImprovement({
    baselineDefinition: mismatch.inputs.baseline_outcome_definition,
    aiDefinition: mismatch.inputs.ai_outcome_definition,
    baselineUnitCost: mismatch.inputs.baseline_unit_cost,
    aiUnitCost: mismatch.inputs.ai_unit_cost,
  });
  assert.equal(actual.status, mismatch.expected.unit_cost_improvement.status);
});
