import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CALCULATOR_EXAMPLES, unitTerms } from "../../tools/ai-cost-reality-calculator/calculator-examples.js";
import { calculateQuickDecisionMetrics } from "../../tools/ai-cost-reality-calculator/quick-decision-metrics.js";
import { calculateAdvancedEstimate } from "../../tools/ai-cost-reality-calculator/advanced/advanced-calculator-core.js";
import { referenceAdvanced, referenceQuickScenario } from "./independent-scenario-oracle.mjs";

const quickHtml = readFileSync("tools/ai-cost-reality-calculator/index.html", "utf8");
const advancedHtml = readFileSync("tools/ai-cost-reality-calculator/advanced/index.html", "utf8");
const quickController = readFileSync("tools/ai-cost-reality-calculator/calculator.js", "utf8");
const advancedController = readFileSync("tools/ai-cost-reality-calculator/advanced/advanced-calculator.js", "utf8");
const dialogController = readFileSync("tools/ai-cost-reality-calculator/calculator-example-dialog.js", "utf8");
const publicationHtml = readFileSync("publications/running-before-crawling/index.html", "utf8");
const caseStudyHtml = readFileSync("case-studies/ai-economics-decision-framework/index.html", "utf8");
const caseStudiesIndex = readFileSync("case-studies/index.html", "utf8");
const tolerance = (expected) => Math.max(1e-8, Math.abs(expected || 0) * 1e-10);
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= tolerance(expected), `${label}: ${actual} !== ${expected}`);

test("Quick and Advanced numeric inputs start blank", () => {
  for (const [mode, html] of [["Quick", quickHtml], ["Advanced", advancedHtml]]) {
    const numericInputs = [...html.matchAll(/<input\b[^>]*type="number"[^>]*>/gi)].map(([markup]) => markup);
    assert.ok(numericInputs.length > 0, `${mode} numeric inputs found`);
    assert.equal(numericInputs.some((markup) => /\svalue=/i.test(markup)), false, `${mode} has no numeric value defaults`);
  }
});

test("example library has three contextualized business examples", () => {
  assert.deepEqual(CALCULATOR_EXAMPLES.map(({ id }) => id), ["ecommerce-content", "customer-service", "invoice-processing"]);
  for (const example of CALCULATOR_EXAMPLES) {
    assert.ok(example.name && example.quickName && example.advancedName && example.quickContext && example.advancedContext);
    assert.ok(example.unitLabel && example.source && example.plausibility);
    assert.ok(["monthly", "quarterly", "annual"].includes(example.quick.period));
    assert.ok(["monthly", "quarterly", "annual"].includes(example.advanced.period));
  }
  assert.equal((quickHtml.match(/data-example="/g) || []).length, 3);
  assert.equal((advancedHtml.match(/data-example="/g) || []).length, 3);
});

test("example library uses an accessible dialog instead of an inline page-length disclosure", () => {
  for (const [mode, html] of [["Quick", quickHtml], ["Advanced", advancedHtml]]) {
    assert.match(html, /data-example-open[^>]*aria-haspopup="dialog"[^>]*aria-controls=/);
    assert.match(html, /<dialog\b[^>]*data-example-dialog[^>]*aria-modal="true"[^>]*aria-labelledby=[^>]*aria-describedby=/);
    assert.match(html, /Explore a realistic scenario, then adjust the numbers for your own workflow\./);
    assert.equal((html.match(/>Use this example<\/button>/g) || []).length, 3, `${mode} has three example actions`);
    assert.equal((html.match(/class="example-card"/g) || []).length, 3, `${mode} has three scenario cards`);
    assert.match(html, /Where values come from/);
    assert.match(html, /Why plausible/);
    assert.match(html, /Illustrative example loaded/);
    assert.match(html, />Start over<\/button>/);
    assert.doesNotMatch(html, /example-picker|data-example-details/);
  }
  assert.match(dialogController, /showModal\(\)/);
  assert.match(dialogController, /event\.key !== "Tab"/);
  assert.match(dialogController, /addEventListener\("cancel"/);
  assert.match(dialogController, /returnFocus/);
});

test("recommended example methods and builders are activated by their data", () => {
  const [content, service, documents] = CALCULATOR_EXAMPLES;
  assert.equal(content.advanced.currentCostMethod, "builder");
  assert.equal(content.advanced.aiCostMethod, "builder");
  assert.equal(service.quick.acceptanceMode, "pilot");
  assert.equal(service.advanced.successMethod, "pilot");
  assert.equal(service.advanced.aiCostBuilder.reviewMethod, "calculated");
  assert.equal(documents.advanced.aiCostMethod, "builder");
  assert.ok(documents.advanced.aiCostBuilder.implementationCost > 0);
  assert.ok(documents.advanced.aiCostBuilder.amortizationYears > 0);
});

test("calculator example interactions are local-only and ephemeral", () => {
  const clientCode = `${quickController}\n${advancedController}\n${dialogController}`;
  assert.doesNotMatch(clientCode, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
});

test("unit-of-work terms are safe, concise, and dynamically usable", () => {
  assert.deepEqual(unitTerms("  approved   PDP "), { singular: "approved PDP", plural: "approved PDPs" });
  assert.deepEqual(unitTerms("processed invoice"), { singular: "processed invoice", plural: "processed invoices" });
  assert.deepEqual(unitTerms(""), { singular: "accepted outcome", plural: "accepted outcomes" });
  for (const html of [quickHtml, advancedHtml]) {
    assert.match(html, /name="outcome_label"/);
    assert.match(html, /data-unit-singular/);
    assert.match(html, /data-unit-plural/);
  }
});

for (const example of CALCULATOR_EXAMPLES) {
  test(`${example.name} Quick example matches the independent oracle`, () => {
    const input = example.quick;
    const oracle = referenceQuickScenario({
      period: input.period,
      acceptanceMode: input.acceptanceMode,
      pilot: input.acceptanceMode === "pilot" ? { attempts: input.pilotAttempts, accepted: input.pilotAccepted } : undefined,
      input: { currentOutcomes: input.currentOutcomes, currentCost: input.currentCost, aiAttempts: input.aiAttempts, successRate: input.successRate, aiCost: input.aiCost },
    });
    const actual = calculateQuickDecisionMetrics(input);
    assert.equal(actual.status, "valid");
    assert.equal(actual.decisionSignal, oracle.decisionSignal);
    const checks = [
      [actual.currentCostPerSuccess.value, oracle.currentCostPerAccepted, "current cost per accepted"],
      [actual.successfulAiOutcomes.value, oracle.acceptedAiOutcomes, "accepted AI outcomes"],
      [actual.aiCostPerAttempt.value, oracle.aiCostPerAttempt, "AI cost per attempt"],
      [actual.aiCostPerSuccess.value, oracle.aiCostPerAccepted, "AI cost per accepted"],
      [actual.equivalentOutputAiCost.value, oracle.equivalentOutputAiCost, "equivalent-output cost"],
      [actual.selectedPeriodSavings.value, oracle.selectedPeriodSavings, "selected-period savings"],
      [actual.annualizedSavings.value, oracle.annualizedSavings, "annualized savings"],
      [actual.breakEvenRate.value, oracle.breakEvenRate, "break-even rate"],
      [actual.failedAttempts.value, oracle.failedAttempts, "failed attempts"],
      [actual.annualFailureCost.value, oracle.failureCost, "failure cost"],
    ];
    for (const [actualValue, expectedValue, label] of checks) close(actualValue, expectedValue, label);
  });

  test(`${example.name} Advanced example matches the independent oracle`, () => {
    const input = { ...example.advanced, period: example.advanced.period };
    const oracle = referenceAdvanced(input, input.period);
    const actual = calculateAdvancedEstimate(input);
    assert.equal(oracle.status, "valid", JSON.stringify(oracle.errors));
    assert.equal(actual.status, "valid", JSON.stringify(actual.errors));
    assert.equal(actual.decisionSignal, oracle.decisionSignal);
    const checks = [
      [actual.currentCost, oracle.currentCost, "built current cost"],
      [actual.aiCost, oracle.aiCost, "built AI cost"],
      [actual.currentCostPerSuccess.value, oracle.currentCostPerAccepted, "current cost per accepted"],
      [actual.successfulAiOutcomes.value, oracle.acceptedAiOutcomes, "accepted AI outcomes"],
      [actual.aiCostPerSuccess.value, oracle.aiCostPerAccepted, "AI cost per accepted"],
      [actual.equivalentOutputAiCost.value, oracle.equivalentOutputAiCost, "equivalent-output cost"],
      [actual.selectedPeriodSavings.value, oracle.selectedPeriodSavings, "selected-period savings"],
      [actual.annualizedSavings.value, oracle.annualizedSavings, "annualized savings"],
      [actual.breakEvenRate.value, oracle.breakEvenRate, "break-even rate"],
      [actual.maximumBreakEvenAiCost.value, oracle.maximumBreakEvenAiCost, "maximum break-even cost"],
      [actual.costThresholdDifference.value, oracle.costThresholdDifference, "cost threshold difference"],
    ];
    for (const [actualValue, expectedValue, label] of checks) close(actualValue, expectedValue, label);
    if (actual.composition) {
      close(actual.composition.allocatedImplementation, oracle.composition.allocatedImplementation, "implementation allocation");
      close(actual.composition.reviewCost, oracle.composition.reviewCost, "review cost");
    }
  });
}

test("outcome and attempt definitions are explicit in both modes", () => {
  for (const html of [quickHtml, advancedHtml]) {
    assert.match(html, /Exclude drafts, attempts, corrected-but-not-approved work, rejected work, failed work, and incomplete work/);
    assert.match(html, /accepted, corrected, rejected, failed, and unusable/);
    assert.match(html, /Only the accepted share becomes accepted AI-assisted outcomes/);
  }
});

test("framework case study and reciprocal links are complete", () => {
  const caseStudyRoute = "/case-studies/ai-economics-decision-framework/";
  const publicationRoute = "/publications/running-before-crawling/";
  const calculatorRoute = "/tools/ai-cost-reality-calculator/";
  assert.match(caseStudiesIndex, new RegExp(`href="${publicationRoute}"[^>]*>Read the Publication`));
  assert.match(caseStudiesIndex, new RegExp(`href="${calculatorRoute}"[^>]*>Use the Calculator`));
  assert.match(caseStudiesIndex, new RegExp(`href="${caseStudyRoute}"[^>]*>View the Case Study`));
  assert.ok((quickHtml.match(new RegExp(caseStudyRoute, "g")) || []).length >= 2);
  assert.ok((advancedHtml.match(new RegExp(caseStudyRoute, "g")) || []).length >= 2);
  assert.match(quickHtml, new RegExp(`href="${publicationRoute}"`));
  assert.match(advancedHtml, new RegExp(`href="${publicationRoute}"`));
  assert.match(publicationHtml, new RegExp(`href="${caseStudyRoute}"`));
  assert.match(publicationHtml, new RegExp(`href="${calculatorRoute}"`));
  for (const phrase of ["The problem", "The framework", "Governing formulas", "Illustrative worked example", "Interpretation and limitations", "Quick versus Advanced"]) assert.match(caseStudyHtml, new RegExp(phrase, "i"));
  assert.match(caseStudyHtml, /not a client engagement, benchmark, forecast, or claimed result/i);
  assert.match(caseStudyHtml, new RegExp(`href="${publicationRoute}"`));
  assert.match(caseStudyHtml, /href="\/tools\/ai-cost-reality-calculator\/"/);
  assert.match(caseStudyHtml, /href="\/tools\/ai-cost-reality-calculator\/advanced\/"/);
});

test("implementation cost requires an explicit useful life", () => {
  const example = structuredClone(CALCULATOR_EXAMPLES[1].advanced);
  example.aiCostBuilder.amortizationYears = "";
  const result = calculateAdvancedEstimate(example);
  assert.equal(result.status, "validation_error");
  assert.ok(result.errors.some(({ field }) => field === "advanced-amortization-years"));
});
