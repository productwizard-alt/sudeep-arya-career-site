import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdvanced, calculateBreakEven, calculateQuick, compareScenarios, sameCostScope, sensitivityCheck } from "../../tools/content-operations-readiness/economics-model.js";
import { baselineInput, comparableDefinitions, proposedInput, quickSample } from "./scenario-fixtures.mjs";

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test("Quick sample independently reconciles", () => {
  const r = calculateQuick(quickSample);
  assert.equal(r.ok, true);
  assert.equal(r.attempted, 80);
  assert.equal(r.approved, 60);
  assert.equal(r.creationHours, 96);
  assert.equal(r.reviewCorrectionHours, 40);
  assert.equal(r.laborHours, 136);
  close(r.reviewCorrectionBurden, 40 / 136);
  assert.equal(r.modeledLaborCost, 8160);
  assert.equal(r.laborCostPerApproved, 136);
});

for (const [name, patch] of [
  ["low volume", { requests: 1 }], ["decimal volume", { requests: 2.5 }],
  ["full approval", { finalApprovalRate: 1 }], ["high labor", { laborCost: 250 }],
  ["zero review", { reviewCorrectionHours: 0 }],
]) test(`Quick normal case: ${name}`, () => assert.equal(calculateQuick({ ...quickSample, ...patch }).ok, true));

for (const [field, value] of [["requests", -1], ["creationHours", -0.1], ["finalApprovalRate", 1.1], ["laborCost", NaN], ["deliverablesPerRequest", undefined]]) {
  test(`Quick rejects invalid ${field}`, () => assert.equal(calculateQuick({ ...quickSample, [field]: value }).ok, false));
}

test("Quick zero attempts never returns NaN or Infinity", () => {
  const r = calculateQuick({ ...quickSample, requests: 0 });
  assert.equal(r.laborCostPerAttempt, null);
  assert.equal(r.laborCostPerApproved, null);
  assert.equal(JSON.stringify(r).includes("NaN"), false);
  assert.equal(JSON.stringify(r).includes("Infinity"), false);
});

test("Quick zero approved output has explicit state", () => {
  const r = calculateQuick({ ...quickSample, finalApprovalRate: 0 });
  assert.equal(r.laborCostPerApproved, null);
  assert.equal(r.approvedOutputState, "Not calculable — no approved deliverables");
});

test("Advanced baseline vector independently reconciles", () => {
  const r = calculateAdvanced(baselineInput);
  assert.equal(r.ok, true);
  assert.deepEqual(r.funnel, { attempted: 80, firstPassApproved: 40, notApprovedFirstPass: 40, approvedAfterCorrection: 20, failed: 20, approved: 60 });
  assert.deepEqual({ creation: r.labor.creation, standardReview: r.labor.standardReview, correction: r.labor.correction, exception: r.labor.exception, governance: r.labor.governance, total: r.labor.total }, { creation: 96, standardReview: 24, correction: 16, exception: 8, governance: 12, total: 156 });
  assert.equal(r.costs.labor, 9360);
  assert.equal(r.costs.modeledAttributableWorkflowCost, 10960);
  close(r.costs.perAttempt, 137);
  close(r.costs.perApproved, 182.66666666666666);
  close(r.capacity.approvedCapacity, 79.41176470588235);
});

test("Advanced proposed vector independently reconciles", () => {
  const input = structuredClone(proposedInput);
  input.costs.implementation = { state: "included", value: 12000 };
  const r = calculateAdvanced(input);
  assert.deepEqual(r.funnel, { attempted: 80, firstPassApproved: 60, notApprovedFirstPass: 20, approvedAfterCorrection: 12.000000000000002, failed: 7.999999999999998, approved: 72 });
  assert.equal(r.labor.total, 106);
  assert.equal(r.costs.modeledAttributableWorkflowCost, 8460);
  assert.equal(r.costs.perApproved, 117.5);
  close(r.capacity.approvedCapacity, 145.56521739130437);
});

for (const [name, patch] of [
  ["zero optional values", { costs: { technology: { state: "zero" }, external: { state: "zero" }, implementation: { state: "zero" } } }],
  ["excluded optional values", { costs: { technology: { state: "excluded" }, external: { state: "excluded" }, implementation: { state: "excluded" } } }],
  ["zero demand", { requests: 0 }], ["zero labor", { creationHours: 0, standardReviewHours: 0, correctionHours: 0, exceptionHours: 0, governanceHours: 0 }],
  ["missing capacity", { availableHours: undefined }],
]) test(`Advanced boundary: ${name}`, () => assert.equal(calculateAdvanced({ ...structuredClone(baselineInput), ...patch }).ok, true));

test("Advanced rejects first-pass above final approval", () => assert.equal(calculateAdvanced({ ...structuredClone(baselineInput), firstPassApprovalRate: 0.9 }).ok, false));
test("Advanced insufficient capacity warns", () => assert.match(calculateAdvanced({ ...structuredClone(baselineInput), availableHours: 10 }).capacity.state, /Insufficient/));
test("Advanced zero variable labor makes capacity not calculable", () => assert.match(calculateAdvanced({ ...structuredClone(baselineInput), creationHours: 0, standardReviewHours: 0, correctionHours: 0 }).capacity.state, /Not calculable/));

test("Known zero and excluded scopes remain distinct", () => {
  const zero = { technology: { state: "zero" }, external: { state: "excluded" }, implementation: { state: "excluded" } };
  const excluded = { technology: { state: "excluded" }, external: { state: "excluded" }, implementation: { state: "excluded" } };
  assert.equal(sameCostScope(zero, excluded), false);
});

test("Known zero and included values share the same comparison scope", () => {
  const zero = { technology: { state: "zero" }, external: { state: "excluded" }, implementation: { state: "excluded" } };
  const included = { technology: { state: "included", value: 1000 }, external: { state: "excluded" }, implementation: { state: "excluded" } };
  assert.equal(sameCostScope(zero, included), true);
});

test("Comparable scenarios calculate required deltas and released capacity", () => {
  const comparison = compareScenarios(calculateAdvanced(baselineInput), calculateAdvanced(proposedInput), comparableDefinitions);
  assert.equal(comparison.financialComparable, true);
  assert.equal(comparison.deltas.approved, 12);
  assert.equal(comparison.deltas.laborHours, -50);
  close(comparison.potentialCapacityReleased, 65.33333333333333);
});

test("Definition mismatch blocks all comparison", () => {
  const defs = structuredClone(comparableDefinitions);
  defs.proposed.quality = false;
  const r = compareScenarios(calculateAdvanced(baselineInput), calculateAdvanced(proposedInput), defs);
  assert.equal(r.operationalComparable, false);
  assert.match(r.reason, /approval or deliverable definitions differ/);
});

test("Cost-scope mismatch permits operational but blocks financial comparison", () => {
  const proposed = structuredClone(proposedInput);
  proposed.costs.external.state = "excluded";
  const r = compareScenarios(calculateAdvanced(baselineInput), calculateAdvanced(proposed), comparableDefinitions);
  assert.equal(r.operationalComparable, true);
  assert.equal(r.financialComparable, false);
});

test("Negative potential capacity is labeled additional hours", () => {
  const proposed = structuredClone(proposedInput);
  proposed.creationHours = 3;
  const r = compareScenarios(calculateAdvanced(baselineInput), calculateAdvanced(proposed), comparableDefinitions);
  assert.ok(r.potentialCapacityReleased < 0);
  assert.equal(r.capacityLabel, "Additional modeled hours required");
});

test("Break-even states are descriptive", () => {
  const baseline = calculateAdvanced(baselineInput);
  const proposed = calculateAdvanced(proposedInput);
  assert.notEqual(calculateBreakEven(baseline, proposed).state, "");
  const same = calculateBreakEven(baseline, baseline);
  assert.equal(same.state, "Equivalent variable economics");
});

test("Sensitivity identifies a bounded entered assumption", () => {
  const value = sensitivityCheck(proposedInput);
  assert.ok(value.input);
  assert.ok(value.movement >= 0);
});
