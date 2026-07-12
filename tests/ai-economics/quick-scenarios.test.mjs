import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildQuickScenarios, resolveEvidenceInput } from "../../tools/ai-cost-reality-calculator/quick-scenarios.js";

const actual = (value) => ({ type: "actual", value });
const estimate = (value) => ({ type: "estimate", value });
const range = (low, high) => ({ type: "range", low, high });
const base = {
  baseline_verified: actual(100), baseline_cost: actual(1000), ai_attempts: estimate(120), verified_rate: estimate(80),
  total_ai_cost: estimate(300), upfront: estimate(0),
};

test("actual-only inputs remain identical across scenarios", () => {
  const scenarios = buildQuickScenarios(Object.fromEntries(Object.entries(base).map(([key, input]) => [key, actual(input.value ?? 10)])));
  assert.deepEqual(scenarios.conservative, scenarios.central); assert.deepEqual(scenarios.central, scenarios.favorable);
});

test("estimate-only and mixed actual/estimate inputs remain deterministic", () => {
  const estimateOnly = buildQuickScenarios(Object.fromEntries(Object.keys(base).map((key) => [key, estimate(10)])));
  assert.deepEqual(estimateOnly.conservative, estimateOnly.favorable);
  assert.equal(buildQuickScenarios(base).central.baseline_cost, 1000);
});

test("single and multiple ranged costs use high, midpoint, low", () => {
  const one = buildQuickScenarios({ ...base, total_ai_cost: range(90, 140) });
  assert.deepEqual([one.conservative.total_ai_cost, one.central.total_ai_cost, one.favorable.total_ai_cost], [140, 115, 90]);
  const many = buildQuickScenarios({ ...base, total_ai_cost: range(90, 140), upfront: range(200, 400) });
  assert.deepEqual([many.conservative.upfront, many.central.upfront, many.favorable.upfront], [400, 300, 200]);
});

test("ranged volume and verified rate use low, midpoint, high", () => {
  const scenarios = buildQuickScenarios({ ...base, baseline_verified: range(60, 100), verified_rate: range(70, 90) });
  assert.deepEqual([scenarios.conservative.baseline_verified, scenarios.central.baseline_verified, scenarios.favorable.baseline_verified], [60, 80, 100]);
  assert.deepEqual([scenarios.conservative.verified_rate, scenarios.central.verified_rate, scenarios.favorable.verified_rate], [70, 80, 90]);
});

test("low greater than high is rejected", () => assert.throws(() => resolveEvidenceInput(range(20, 10), "cost"), /Low value/));

test("missing required quick input is rejected", () => {
  assert.throws(() => buildQuickScenarios({ ...base, total_ai_cost: estimate("") }), /Enter a value/);
});

test("verified rate cannot exceed 100 percent", () => {
  assert.throws(() => buildQuickScenarios({ ...base, verified_rate: range(80, 110) }), /cannot exceed 100/);
});

test("quick UI has five required inputs, optional custom outcome, and collapsed advanced analysis", async () => {
  const html = await readFile(new URL("../../tools/ai-cost-reality-calculator/index.html", import.meta.url), "utf8");
  assert.match(html, /data-advanced/); assert.doesNotMatch(html, /<details class="advanced-analysis"[^>]* open/);
  assert.match(html, /name="custom_outcome"[^>]*placeholder=/);
  assert.equal((html.match(/data-field="/g) || []).length - (html.match(/data-optional/g) || []).length, 5);
  assert.match(html, /value="reporting"/); assert.doesNotMatch(html, /custom_outcome"[^>]*required/);
});

test("mobile stylesheet contains a 520px single-column layout covering 390px", async () => {
  const css = await readFile(new URL("../../tools/ai-cost-reality-calculator/calculator.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:520px\)/); assert.match(css, /\.quick-grid,.primary-results,.detail-grid\{grid-template-columns:1fr\}/);
});
