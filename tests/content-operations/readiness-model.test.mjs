import assert from "node:assert/strict";
import test from "node:test";
import { assessReadiness, QUESTIONS } from "../../tools/content-operations-readiness/readiness-model.js";
import { readinessCases } from "./scenario-fixtures.mjs";

test("Readiness requires all ten answers", () => assert.equal(assessReadiness({}).ok, false));
test("All absent is Scattered with product truth bottleneck", () => {
  const r = assessReadiness(readinessCases.allAbsent);
  assert.equal(r.stage, "Scattered");
  assert.equal(r.primaryBottleneck, "Product truth");
  assert.equal(r.score, 0);
});
test("All working is Connected because agent and measured gates apply", () => {
  const r = assessReadiness(readinessCases.allWorking);
  assert.equal(r.rawStage, "Connected");
  assert.equal(r.stage, "Connected");
});
test("All controlled is Measured", () => assert.equal(assessReadiness(readinessCases.allControlled).stage, "Measured"));
test("Critical zero caps a high raw score at Documented", () => {
  const answers = { ...readinessCases.allControlled, humanApproval: 0 };
  const r = assessReadiness(answers);
  assert.equal(r.stage, "Documented");
  assert.equal(r.gateApplied, true);
});
test("Critical score below working caps at Connected", () => {
  const answers = { ...readinessCases.allControlled, workflow: 1 };
  assert.equal(assessReadiness(answers).stage, "Connected");
});
test("Exception below controlled prevents Agent-enabled", () => {
  const answers = { ...readinessCases.allControlled, exceptions: 2 };
  assert.equal(assessReadiness(answers).stage, "AI-assisted");
});
test("Measurement below controlled prevents Measured", () => {
  const answers = { ...readinessCases.allControlled, measurement: 2 };
  assert.equal(assessReadiness(answers).stage, "Agent-enabled");
});
test("Primary bottleneck tie follows dependency order", () => {
  const answers = { ...readinessCases.allControlled, assetControl: 1, ownership: 1 };
  assert.equal(assessReadiness(answers).primaryBottleneck, "Ownership");
});
test("Every bottleneck has a deterministic 30/60/90 plan", () => {
  for (const question of QUESTIONS) {
    const answers = { ...readinessCases.allControlled, [question.key]: 0 };
    const plan = assessReadiness(answers).plan;
    assert.ok(plan.day30 && plan.day60 && plan.day90);
  }
});
