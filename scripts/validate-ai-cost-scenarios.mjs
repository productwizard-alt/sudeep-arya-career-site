#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { quickScenarios, advancedScenarios } from "../tests/ai-economics/scenario-fixtures.mjs";
import { referenceQuickScenario, referenceAdvancedScenario } from "../tests/ai-economics/independent-scenario-oracle.mjs";
import { calculatePilotRate, calculateQuickDecisionMetrics } from "../tools/ai-cost-reality-calculator/quick-decision-metrics.js";
import { calculateAdvancedEstimate } from "../tools/ai-cost-reality-calculator/advanced/advanced-calculator-core.js";

const outputDir = path.join(process.cwd(), "artifacts/ai-cost-calculator-upgrade-v1/local/scenario-validation");
await mkdir(path.join(outputDir, "screenshots"), { recursive: true });
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const generatedAt = new Date().toISOString();
const disclaimer = "Illustrative planning examples only—not financial advice, audited benchmarks, or claims about any named company.";
const toleranceFor = (value) => Math.max(1e-8, Math.abs(value || 0) * 1e-10);

function actualQuickScenario(scenario) {
  const input = { ...scenario.input };
  if (scenario.acceptanceMode === "pilot") input.successRate = calculatePilotRate(scenario.pilot.attempts, scenario.pilot.accepted).value;
  return calculateQuickDecisionMetrics({ ...input, period: scenario.period });
}

function normalizeQuick(result) {
  return {
    currentCostPerAccepted: result.currentCostPerSuccess.value,
    acceptedAiOutcomes: result.successfulAiOutcomes.value,
    aiCostPerAttempt: result.aiCostPerAttempt.value,
    aiCostPerAccepted: result.aiCostPerSuccess.value,
    equivalentOutputAiCost: result.equivalentOutputAiCost.value,
    selectedPeriodSavings: result.selectedPeriodSavings.value,
    annualizedSavings: result.annualizedSavings.value,
    breakEvenRate: result.breakEvenRate.value,
    breakEvenStatus: result.breakEvenRate.status,
    breakEvenMargin: result.breakEvenMargin.value,
    failedAttempts: result.failedAttempts.value,
    failureCost: result.annualFailureCost.value,
    decisionSignal: result.decisionSignal,
  };
}

function normalizeExpected(result) {
  return {
    currentCostPerAccepted: result.currentCostPerAccepted,
    acceptedAiOutcomes: result.acceptedAiOutcomes,
    aiCostPerAttempt: result.aiCostPerAttempt,
    aiCostPerAccepted: result.aiCostPerAccepted,
    equivalentOutputAiCost: result.equivalentOutputAiCost,
    selectedPeriodSavings: result.selectedPeriodSavings,
    annualizedSavings: result.annualizedSavings,
    breakEvenRate: result.breakEvenRate,
    breakEvenStatus: result.breakEvenStatus,
    breakEvenMargin: result.breakEvenMargin,
    failedAttempts: result.failedAttempts,
    failureCost: result.failureCost,
    decisionSignal: result.decisionSignal,
  };
}

const outputDefinitions = [
  ["currentCostPerAccepted", "Current cost per accepted outcome", "currency"],
  ["acceptedAiOutcomes", "Expected accepted AI outcomes", "number"],
  ["aiCostPerAttempt", "AI cost per attempt", "currency"],
  ["aiCostPerAccepted", "AI cost per accepted outcome", "currency"],
  ["equivalentOutputAiCost", "Equivalent-output AI cost", "currency"],
  ["selectedPeriodSavings", "Selected-period savings or loss", "currency"],
  ["annualizedSavings", "Annualized savings or loss", "currency0"],
  ["breakEvenRate", "Break-even acceptance rate", "percent"],
  ["breakEvenMargin", "Margin to break-even", "points"],
  ["failedAttempts", "Failed or unusable attempts", "number"],
  ["failureCost", "Cost allocated to failed attempts", "currency"],
  ["decisionSignal", "Executive decision signal", "text"],
];

const advancedDefinitions = [
  ["currentCost", "Built or active current-process total", "currency"],
  ["aiCost", "Built or active AI-assisted total", "currency"],
  ["maximumBreakEvenAiCost", "Maximum AI cost at break-even", "currency"],
  ["costThresholdDifference", "Cost headroom or required reduction", "currency"],
  ["technologyCost", "Technology cost", "currency"],
  ["annualizedImplementation", "Annualized implementation", "currency"],
  ["allocatedImplementation", "Selected-period implementation allocation", "currency"],
  ["reviewCost", "Human-review cost", "currency"],
  ["otherOperatingCost", "Other operating cost", "currency"],
  ["compositionTotal", "Cost-composition total", "currency"],
];

function format(value, type) {
  if (value === null) return "Not calculable";
  if (type === "currency") return currency.format(value);
  if (type === "currency0") return wholeCurrency.format(value);
  if (type === "number") return number.format(value);
  if (type === "percent") return percent.format(value);
  if (type === "points") return `${number.format(value * 100)} percentage points`;
  return String(value);
}

function flatten(value, prefix = "") {
  const rows = [];
  for (const [key, item] of Object.entries(value || {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) rows.push(...flatten(item, name));
    else rows.push([name, item]);
  }
  return rows;
}

function sourceFor(scenario, key) {
  const short = key.split(".").at(-1);
  if (scenario.sources[short]) return scenario.sources[short];
  if (key.endsWith("Method") || key === "successRate") return "Operator selects the active method or enters the documented planning assumption.";
  if ((scenario.input.currentCostMethod === "known" && key.startsWith("currentCostBuilder.")) || (scenario.input.currentCostMethod === "builder" && key === "knownCurrentCost") || (scenario.input.aiCostMethod === "known" && key.startsWith("aiCostBuilder.")) || (scenario.input.aiCostMethod === "builder" && key === "knownAiCost")) return "Retained inactive-method value; excluded from calculation.";
  if (key.includes("review") && scenario.input.aiCostBuilder?.reviewMethod === "known" && ["reviewRate", "reviewMinutes", "reviewHourlyCost"].includes(short)) return "Retained inactive time-builder value; excluded from calculation.";
  if (key.endsWith("pilotAttempts") || key.endsWith("pilotAccepted")) return scenario.input.successMethod === "pilot" ? "Pilot log." : "Inactive pilot field; excluded from calculation.";
  return "Operating, finance, workflow, or pilot record appropriate to this input.";
}

function actualAdvancedFlat(result) {
  return {
    currentCost: result.currentCost,
    aiCost: result.aiCost,
    maximumBreakEvenAiCost: result.maximumBreakEvenAiCost.value,
    costThresholdDifference: result.costThresholdDifference.value,
    technologyCost: result.composition?.technologyCost ?? 0,
    annualizedImplementation: result.composition?.annualizedImplementation ?? 0,
    allocatedImplementation: result.composition?.allocatedImplementation ?? 0,
    reviewCost: result.composition?.reviewCost ?? 0,
    otherOperatingCost: result.composition?.otherOperatingCost ?? 0,
    compositionTotal: result.composition?.total ?? result.aiCost,
  };
}

function expectedAdvancedFlat(result) {
  return {
    currentCost: result.currentCost,
    aiCost: result.aiCost,
    maximumBreakEvenAiCost: result.maximumBreakEvenAiCost,
    costThresholdDifference: result.costThresholdDifference,
    technologyCost: result.composition?.technologyCost ?? 0,
    annualizedImplementation: result.composition?.annualizedImplementation ?? 0,
    allocatedImplementation: result.composition?.allocatedImplementation ?? 0,
    reviewCost: result.composition?.reviewCost ?? 0,
    otherOperatingCost: result.composition?.otherOperatingCost ?? 0,
    compositionTotal: result.composition?.total ?? result.aiCost,
  };
}

function comparisons(expected, actual, definitions) {
  return Object.fromEntries(definitions.map(([key, label, type]) => {
    const expectedValue = expected[key];
    const actualValue = actual[key];
    const numericPair = typeof expectedValue === "number" && typeof actualValue === "number";
    const tolerance = numericPair ? toleranceFor(expectedValue) : 0;
    const variance = numericPair ? Math.abs(actualValue - expectedValue) : expectedValue === actualValue ? 0 : null;
    return [key, { label, type, expected: expectedValue, actual: actualValue, absoluteVariance: variance, tolerance, pass: numericPair ? variance <= tolerance : expectedValue === actualValue }];
  }));
}

const records = [];
for (const scenario of quickScenarios) {
  const oracle = referenceQuickScenario(scenario);
  const actualResult = actualQuickScenario(scenario);
  const expected = normalizeExpected(oracle);
  const actual = normalizeQuick(actualResult);
  const checks = comparisons(expected, actual, outputDefinitions);
  records.push({ mode: "Quick", ...scenario, inputModes: { acceptance: scenario.acceptanceMode }, expected, actual, checks, formulaSteps: oracle.formulaSteps, completenessNotes: [], pass: Object.values(checks).every(({ pass }) => pass) && actual.decisionSignal === scenario.expectedDecision });
}
for (const scenario of advancedScenarios) {
  const oracle = referenceAdvancedScenario(scenario);
  const actualResult = calculateAdvancedEstimate({ ...scenario.input, period: scenario.period });
  const expected = { ...normalizeExpected(oracle), ...expectedAdvancedFlat(oracle) };
  const actual = { ...normalizeQuick(actualResult), ...actualAdvancedFlat(actualResult) };
  const checks = comparisons(expected, actual, [...outputDefinitions, ...advancedDefinitions]);
  const completenessPass = JSON.stringify(actualResult.completenessNotes) === JSON.stringify(oracle.completenessNotes);
  records.push({ mode: "Advanced", ...scenario, inputModes: { currentCost: scenario.input.currentCostMethod, acceptance: scenario.input.successMethod, aiCost: scenario.input.aiCostMethod, review: scenario.input.aiCostBuilder.reviewMethod }, expected, actual, checks, formulaSteps: oracle.formulaSteps, completenessNotes: oracle.completenessNotes, completenessPass, pass: Object.values(checks).every(({ pass }) => pass) && completenessPass && actual.decisionSignal === scenario.expectedDecision });
}

const calculationChecks = records.reduce((sum, record) => sum + Object.keys(record.checks).length + (record.mode === "Advanced" ? 1 : 0), 0);
const failures = records.flatMap((record) => Object.entries(record.checks).filter(([, check]) => !check.pass).map(([key, check]) => ({ scenarioId: record.id, key, ...check })));

function scenarioMarkdown(record) {
  const inputRows = [...flatten(record.input)];
  if (record.pilot) inputRows.push(["pilot.attempts", record.pilot.attempts], ["pilot.accepted", record.pilot.accepted]);
  const entries = inputRows.map(([key, value]) => `| ${key} | ${value} | ${sourceFor(record, key)} |`).join("\n");
  const outputs = Object.values(record.checks).map((check) => `| ${check.label} | ${format(check.expected, check.type)} | ${format(check.actual, check.type)} | ${typeof check.expected === "number" ? check.expected : "—"} | ${check.absoluteVariance ?? "—"} | ${check.pass ? "PASS" : "FAIL"} |`).join("\n");
  const methods = Object.entries(record.inputModes).map(([key, value]) => `${key}: ${value}`).join("; ");
  const completeness = record.completenessNotes.length ? record.completenessNotes.join(" ") : "No builder completeness caution is expected for this scenario.";
  return `## ${record.id} — ${record.name}\n\n- **Business context:** ${record.context}\n- **Category:** ${record.category}\n- **Selected period:** ${record.period}\n- **Active input methods:** ${methods}\n- **Expected outcome:** ${record.expectedDecision}\n- **Executive decision signal:** ${record.actual.decisionSignal}\n- **Business interpretation:** ${record.interpretation}\n- **Completeness expectation:** ${completeness}\n- **Rounding:** calculations retain full JavaScript number precision; currency displays at 2 decimals (annual decision headline at 0), counts at 2 decimals, rates at 1 decimal, and percentage-point margin at 1–2 decimals.\n\n### Entered values and reasonable sources\n\n| Input | Value entered | Where a real user could obtain it |\n|---|---:|---|\n${entries}\n\n### Expected versus actual calculator outputs\n\n| Output | Expected display | Actual display | Expected full precision | Absolute variance | Result |\n|---|---:|---:|---:|---:|---|\n${outputs}\n\n### Independent arithmetic\n\n${record.formulaSteps.map((step) => `1. ${step}`).join("\n")}\n\n**Scenario result:** ${record.pass ? "PASS" : "FAIL"}. ${record.interpretation}\n`;
}

function reportFor(mode) {
  const subset = records.filter((record) => record.mode === mode);
  return `# ${mode} Estimate — Real-world scenario validation\n\nGenerated ${generatedAt}. ${disclaimer}\n\nThis report uses a separately written arithmetic oracle that imports and calls none of the production calculator modules. Each scenario compares full-precision oracle results with production output before applying documented display rounding.\n\n**Scenarios:** ${subset.length}. **Result:** ${subset.every(({ pass }) => pass) ? "PASS" : "FAIL"}.\n\n${subset.map(scenarioMarkdown).join("\n---\n\n")}`;
}

const csvHeaders = ["calculator_mode", "scenario_id", "scenario_name", "period", "primary_inputs", "active_builder_methods", "expected_outputs", "actual_outputs", "maximum_absolute_variance", "pass_fail", "decision_signal"];
const csvEscape = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csvRows = records.map((record) => [record.mode, record.id, record.name, record.period, JSON.stringify(record.input), JSON.stringify(record.inputModes), JSON.stringify(record.expected), JSON.stringify(record.actual), Math.max(...Object.values(record.checks).map(({ absoluteVariance }) => absoluteVariance ?? 0)), record.pass ? "PASS" : "FAIL", record.actual.decisionSignal].map(csvEscape).join(","));

const formulaReport = `# Formula validation report\n\nGenerated ${generatedAt}. ${disclaimer}\n\n## Outcome\n\n- Scenarios: ${records.length} (${quickScenarios.length} Quick, ${advancedScenarios.length} Advanced)\n- Independently compared calculation and completeness checks: ${calculationChecks}\n- Passing scenarios: ${records.filter(({ pass }) => pass).length}\n- Formula discrepancies: ${failures.length}\n- Governing formula corrections: none\n- Validation corrections found during this pass: blank Quick required values now fail the model contract; blank Advanced builder technology cost now fails; inactive time-derived review values no longer invalidate the active known-review method.\n\n## Independent method\n\nThe oracle in \`tests/ai-economics/independent-scenario-oracle.mjs\` is a transparent, separately written implementation. It has no imports and does not call \`calculator-core.js\`, \`basic-calculator.js\`, \`quick-decision-metrics.js\`, \`advanced-calculator-core.js\`, either browser controller, or any other calculator implementation. Tests compare the oracle with production using a tolerance of \`max(1e-8, |expected| × 1e-10)\`.\n\n## Governing formulas\n\n1. Current unit cost = current selected-period cost ÷ accepted current outcomes.\n2. Accepted AI outcomes = AI attempts × accepted-outcome rate.\n3. AI cost per attempt = selected-period AI cost ÷ attempts.\n4. AI cost per accepted outcome = selected-period AI cost ÷ accepted AI outcomes.\n5. Equivalent-output AI cost = accepted current outcomes × AI cost per accepted outcome.\n6. Selected-period savings/loss = current cost − equivalent-output AI cost.\n7. Annualized savings/loss = selected-period savings/loss × 12 monthly, × 4 quarterly, or × 1 annual.\n8. Break-even accepted-outcome rate = AI cost per attempt ÷ current unit cost.\n9. Failed attempts = attempts − accepted outcomes; allocated failure cost = AI cost per attempt × failed attempts.\n10. Built current cost = labor hours × loaded hourly cost + active direct components.\n11. Implementation allocation = one-time implementation ÷ useful-life years ÷ selected periods per year.\n12. Time-derived review = attempts × review rate × review minutes ÷ 60 × loaded hourly cost.\n13. Built AI cost = technology + allocated implementation + active review + other operations.\n14. Maximum break-even AI cost = current unit cost × AI attempts × accepted rate.\n15. Cost headroom / required reduction = maximum break-even AI cost − active AI cost.\n\n## Edge and contract coverage\n\nThe automated suite covers 0% and 100% acceptance, near-zero positive values, decimals, large plausible values, comma-formatted display, negative/blank/malformed input, pilot accepted greater than attempts, zero attempts, inactive values, all method switches, period changes after entry, completeness notes, and non-finite rendered-value checks in browser QA.\n\n## Discrepancies\n\n${failures.length ? failures.map((failure) => `- ${failure.scenarioId} ${failure.key}: expected ${failure.expected}, actual ${failure.actual}, variance ${failure.absoluteVariance}.`).join("\n") : "No mathematical discrepancies were found across the 24 business scenarios."}\n`;

const machine = { status: failures.length || records.some(({ pass }) => !pass) ? "FAIL" : "PASS", generatedAt, oracle: "tests/ai-economics/independent-scenario-oracle.mjs", tolerance: "max(1e-8, abs(expected) * 1e-10)", scenarioCount: records.length, quickCount: quickScenarios.length, advancedCount: advancedScenarios.length, calculationChecks, passedScenarios: records.filter(({ pass }) => pass).length, failedScenarios: records.filter(({ pass }) => !pass).map(({ id }) => id), discrepancies: failures };
const validationJson = { generatedAt, disclaimer, independentOracle: { file: "tests/ai-economics/independent-scenario-oracle.mjs", importsProductionCode: false, tolerance: machine.tolerance }, summary: machine, scenarios: records };

await Promise.all([
  writeFile(path.join(outputDir, "quick-real-world-scenarios.md"), reportFor("Quick")),
  writeFile(path.join(outputDir, "advanced-real-world-scenarios.md"), reportFor("Advanced")),
  writeFile(path.join(outputDir, "scenario-results.csv"), `${csvHeaders.join(",")}\n${csvRows.join("\n")}\n`),
  writeFile(path.join(outputDir, "scenario-validation.json"), `${JSON.stringify(validationJson, null, 2)}\n`),
  writeFile(path.join(outputDir, "formula-validation-report.md"), formulaReport),
  writeFile(path.join(outputDir, "machine-readable-test-results.json"), `${JSON.stringify(machine, null, 2)}\n`),
]);

console.log(`${machine.status}: ${records.length} scenarios, ${calculationChecks} independent checks, ${failures.length} discrepancies.`);
if (machine.status !== "PASS") process.exit(1);
