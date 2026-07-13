import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../tools/ai-cost-reality-calculator/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../../tools/ai-cost-reality-calculator/calculator.js", import.meta.url), "utf8");
const css = await readFile(new URL("../../tools/ai-cost-reality-calculator/calculator.css", import.meta.url), "utf8");

test("quick calculator has five required logical inputs", () => {
  assert.equal((html.match(/class="evidence-field"/g) || []).length, 5);
  assert.equal((html.match(/class="evidence-field"[^>]*>[\s\S]*?<input[^>]* required/g) || []).length, 5);
  assert.match(html, /Five inputs\. One equivalent-output comparison\./);
});

test("quick calculator has no evidence or range dropdowns", () => {
  assert.doesNotMatch(html, /evidence-select|data-type|data-scenario/);
  assert.doesNotMatch(js, /evidence-select|data-scenario|buildQuickScenarios/);
});

test("every basic numeric input has accessible plain-language help", () => {
  for (const name of ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost"]) {
    assert.match(html, new RegExp(`name="${name}"[^>]*aria-describedby="[^"]+"[^>]*required`));
  }
  assert.equal((html.match(/class="field-help"/g) || []).length, 5);
  assert.match(html, /Where to get this number/);
  assert.match(html, /How to estimate this/);
});

test("basic calculator has no use-case dropdown", () => {
  assert.doesNotMatch(html, /name="use_case_template"/);
  assert.match(html, /same acceptance standard as the current process/);
});

test("public calculator has no advanced-analysis form", () => {
  assert.doesNotMatch(html, /data-advanced|Advanced analysis|name="outcome_definition"/);
  assert.doesNotMatch(html, /Token and model economics|Governance/);
});

test("results preserve unit economics and add decision metrics", () => {
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const label of ["Current cost per accepted outcome", "AI cost per attempt", "AI cost per accepted outcome", "Expected failed or unusable attempts", "Cost allocated to failed attempts", "Break-even accepted AI-assisted rate", "AI cost for current accepted outcomes", "Selected-period savings or loss"]) assert.match(visibleText, new RegExp(label));
  assert.equal((html.match(/data-output="baseline-cost"/g) || []).length, 1);
  assert.equal((html.match(/data-output="failure-cost"/g) || []).length, 1);
});

test("mobile stylesheet contains a 390px-compatible single-column layout", () => {
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /\.quick-grid,\.quick-grid--ai,\.helper-grid \{ grid-template-columns:1fr;/);
});
