import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../tools/ai-cost-reality-calculator/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../../tools/ai-cost-reality-calculator/calculator.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../tools/ai-cost-reality-calculator/calculator.css", import.meta.url), "utf8");

test("quick calculator has five required logical inputs", () => {
  assert.equal((html.match(/class="evidence-field"/g) || []).length, 5);
  assert.match(html, /Enter your operating assumptions/);
});

test("quick calculator has no evidence or range dropdowns", () => {
  assert.doesNotMatch(html, /evidence-select|data-type|data-scenario/);
  assert.doesNotMatch(js, /evidence-select|data-scenario|buildQuickScenarios/);
});

test("every basic numeric input has accessible plain-language help", () => {
  for (const name of ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost"]) assert.match(js, new RegExp(`${name}: \\"`));
  assert.match(js, /role="tooltip"/);
  assert.match(js, /aria-expanded="false"/);
});

test("basic calculator has no use-case dropdown", () => {
  assert.doesNotMatch(html, /name="use_case_template"/);
  assert.match(html, /Count only completed outcomes that meet the same business standard/);
});

test("public calculator has no advanced-analysis form", () => {
  assert.doesNotMatch(html, /data-advanced|Advanced analysis|name="outcome_definition"/);
  assert.doesNotMatch(html, /Token and model economics|Governance/);
});

test("results focus on success and failure cost", () => {
  for (const label of ["Current cost per successful outcome", "AI cost per attempt", "AI cost per successful outcome", "Expected failed attempts", "Estimated cost allocated to failed attempts", "Directional signal"]) assert.match(html, new RegExp(label));
  assert.equal((html.match(/<article(?:\s|>)/g) || []).length, 6);
});

test("mobile stylesheet contains a 390px-compatible single-column layout", () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.quick-grid,.primary-results,.detail-grid\{grid-template-columns:1fr\}/);
});
