import { buildAiCost, buildCurrentCost, calculateAdvancedEstimate } from "./advanced-calculator-core.js";
import { calculatePilotRate, periodLabel } from "../quick-decision-metrics.js";
import { calculatorExample, unitTerms } from "../calculator-examples.js";
import { createExampleDialog } from "../calculator-example-dialog.js";
import { deriveUnitCostSeries, renderDerivedCurrency, renderUnitCostSeries } from "../unit-cost-reference.js";

const form = document.querySelector("#advanced-calculator-form");
const results = document.querySelector("[data-results]");
const errorSummary = document.querySelector("[data-error-summary]");
const output = (name) => document.querySelector(`[data-output="${name}"]`);
const field = (name) => form.elements.namedItem(name);
const value = (name) => field(name)?.value ?? "";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
let activeExample = null;
let currentReferenceAnnouncementTimer;

const formatMetric = (metric, formatter, fallback = "Not calculable") => metric?.status === "valid" && Number.isFinite(metric.value) ? formatter.format(metric.value) : fallback;

function renderUnitCostMetric(name, metric) {
  const node = output(name);
  if (metric?.status === "valid" && Number.isFinite(metric.value)) {
    renderDerivedCurrency(node, metric.value, currency);
    return;
  }
  node.classList.remove("derived-currency", "derived-currency--subunit");
  node.removeAttribute("aria-label");
  node.removeAttribute("data-exact-value");
  node.textContent = "Not calculable";
}

function readInput() {
  return {
    period: value("period"), currentOutcomes: value("current_outcomes"), currentCostMethod: value("current_cost_method"), knownCurrentCost: value("known_current_cost"),
    currentCostBuilder: { laborHours: value("current_labor_hours"), loadedHourlyCost: value("current_loaded_hourly_cost"), agencyCost: value("current_agency_cost"), softwareCost: value("current_software_cost"), reworkCost: value("current_rework_cost"), otherCost: value("current_other_cost") },
    aiAttempts: value("ai_attempts"), successMethod: value("success_method"), successRate: value("success_rate"), pilotAttempts: value("pilot_attempts"), pilotAccepted: value("pilot_accepted"),
    aiCostMethod: value("ai_cost_method"), knownAiCost: value("known_ai_cost"), aiCostBuilder: { technologyCost: value("technology_cost"), implementationCost: value("implementation_cost"), amortizationYears: value("amortization_years"), reviewMethod: value("review_method"), knownReviewCost: value("known_review_cost"), reviewRate: value("review_rate"), reviewMinutes: value("review_minutes"), reviewHourlyCost: value("review_hourly_cost"), otherOperatingCost: value("other_ai_cost") },
  };
}

function setValue(name, nextValue) {
  const control = field(name);
  if (control) control.value = nextValue ?? "";
}

function setRadio(name, nextValue) {
  const control = document.querySelector(`input[name="${name}"][value="${nextValue}"]`);
  if (control) control.checked = true;
}

function updateUnitCopy() {
  const terms = unitTerms(value("outcome_label"));
  for (const node of document.querySelectorAll("[data-unit-singular]")) node.textContent = terms.singular;
  for (const node of document.querySelectorAll("[data-unit-plural]")) node.textContent = terms.plural;
}

function showExampleContext(example) {
  const status = document.querySelector("[data-active-example]");
  document.querySelector("[data-active-example-state]").textContent = "Illustrative example loaded";
  document.querySelector("[data-active-example-name]").textContent = example.advancedName;
  document.querySelector("[data-active-example-period]").textContent = periodLabel(example.advanced.period);
  document.querySelector("[data-active-example-unit]").textContent = example.unitLabel;
  status.hidden = false;
  for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", String(button.dataset.example === example.id));
}

function loadExample(id) {
  const example = calculatorExample(id);
  if (!example) return;
  const input = example.advanced;
  form.reset();
  setValue("outcome_label", example.unitLabel);
  setRadio("period", input.period);
  setValue("current_outcomes", input.currentOutcomes);
  setRadio("current_cost_method", input.currentCostMethod);
  setValue("known_current_cost", input.knownCurrentCost);
  for (const [name, nextValue] of Object.entries({ current_labor_hours: input.currentCostBuilder.laborHours, current_loaded_hourly_cost: input.currentCostBuilder.loadedHourlyCost, current_agency_cost: input.currentCostBuilder.agencyCost, current_software_cost: input.currentCostBuilder.softwareCost, current_rework_cost: input.currentCostBuilder.reworkCost, current_other_cost: input.currentCostBuilder.otherCost })) setValue(name, nextValue);
  setValue("ai_attempts", input.aiAttempts);
  setRadio("success_method", input.successMethod);
  setValue("success_rate", input.successRate);
  setValue("pilot_attempts", input.pilotAttempts);
  setValue("pilot_accepted", input.pilotAccepted);
  setRadio("ai_cost_method", input.aiCostMethod);
  setValue("known_ai_cost", input.knownAiCost);
  setRadio("review_method", input.aiCostBuilder.reviewMethod);
  for (const [name, nextValue] of Object.entries({ technology_cost: input.aiCostBuilder.technologyCost, implementation_cost: input.aiCostBuilder.implementationCost, amortization_years: input.aiCostBuilder.amortizationYears, known_review_cost: input.aiCostBuilder.knownReviewCost, review_rate: input.aiCostBuilder.reviewRate, review_minutes: input.aiCostBuilder.reviewMinutes, review_hourly_cost: input.aiCostBuilder.reviewHourlyCost, other_ai_cost: input.aiCostBuilder.otherOperatingCost })) setValue(name, nextValue);
  document.querySelector("#implementation-builder").open = Number(input.aiCostBuilder.implementationCost) > 0;
  document.querySelector("#review-builder").open = input.aiCostBuilder.reviewMethod === "calculated" || Number(input.aiCostBuilder.knownReviewCost) > 0;
  activeExample = example;
  results.hidden = true;
  showErrors([]);
  updateUnitCopy();
  updatePilotRate();
  updateLiveSummary();
  showExampleContext(example);
}

function clearExample() {
  form.reset();
  document.querySelector("#implementation-builder").open = false;
  document.querySelector("#review-builder").open = false;
  document.querySelector("[data-active-example]").hidden = true;
  for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", "false");
  activeExample = null;
  results.hidden = true;
  showErrors([]);
  updateUnitCopy();
  updatePilotRate();
  updateLiveSummary();
}

function togglePanels() {
  const active = {
    "current-known": value("current_cost_method") === "known", "current-builder": value("current_cost_method") === "builder",
    "success-direct": value("success_method") === "direct", "success-pilot": value("success_method") === "pilot",
    "ai-known": value("ai_cost_method") === "known", "ai-builder": value("ai_cost_method") === "builder",
    "review-known": value("review_method") === "known", "review-calculated": value("review_method") === "calculated",
  };
  for (const panel of document.querySelectorAll("[data-method-panel]")) {
    const isActive = active[panel.dataset.methodPanel];
    panel.hidden = !isActive;
    panel.querySelectorAll("input").forEach((input) => { input.disabled = !isActive || Boolean(panel.closest("[data-method-panel][hidden]")); });
  }
}

function showErrors(errors) {
  document.querySelectorAll("[aria-invalid='true']").forEach((node) => node.setAttribute("aria-invalid", "false"));
  if (!errors.length) { errorSummary.hidden = true; errorSummary.innerHTML = ""; return; }
  for (const error of errors) document.querySelector(`#${CSS.escape(error.field)}`)?.setAttribute("aria-invalid", "true");
  errorSummary.innerHTML = `<strong>Check ${errors.length === 1 ? "this input" : "these inputs"}</strong><ul>${errors.map(({ field: id, message }) => `<li><a href="#${id}">${message}</a></li>`).join("")}</ul>`;
  errorSummary.hidden = false;
  errorSummary.focus();
}

function currentCostSeries(input) {
  if (input.currentCostMethod === "known") return deriveUnitCostSeries(input.knownCurrentCost, input.currentOutcomes);
  const builder = input.currentCostBuilder;
  const present = (nextValue) => nextValue !== "" && nextValue !== null && nextValue !== undefined;
  const valid = (nextValue) => !present(nextValue) || (Number.isFinite(Number(nextValue)) && Number(nextValue) >= 0);
  if (!Object.values(builder).every(valid)) return null;
  const laborHoursPresent = present(builder.laborHours);
  const laborRatePresent = present(builder.loadedHourlyCost);
  if (laborHoursPresent !== laborRatePresent) return null;
  const hasCompleteValue = (laborHoursPresent && laborRatePresent) || [builder.agencyCost, builder.softwareCost, builder.reworkCost, builder.otherCost].some(present);
  return hasCompleteValue ? deriveUnitCostSeries(buildCurrentCost(builder), input.currentOutcomes) : null;
}

function updateCurrentUnitReference(input = readInput()) {
  const reference = document.querySelector("[data-current-unit-reference]");
  const announcement = document.querySelector("[data-current-unit-reference-announcement]");
  const series = currentCostSeries(input);
  clearTimeout(currentReferenceAnnouncementTimer);
  if (!series || !renderUnitCostSeries(reference, series, currency)) {
    reference.hidden = true;
    announcement.textContent = "";
    return;
  }
  reference.hidden = false;
  const terms = unitTerms(value("outcome_label"));
  currentReferenceAnnouncementTimer = setTimeout(() => {
    announcement.textContent = `Current process cost: ${currency.format(series.perOne)} per ${terms.singular}, ${currency.format(series.perHundred)} per 100 ${terms.plural}, and ${currency.format(series.perThousand)} per 1,000 ${terms.plural}.`;
  }, 450);
}

function updateUnitCostComparison(result) {
  const comparison = document.querySelector("[data-unit-cost-comparison]");
  const current = result.currentCostPerSuccess?.status === "valid" ? deriveUnitCostSeries(result.currentCostPerSuccess.value, 1) : null;
  const ai = result.aiCostPerSuccess?.status === "valid" ? deriveUnitCostSeries(result.aiCostPerSuccess.value, 1) : null;
  if (!current || !ai) {
    comparison.hidden = true;
    return;
  }
  const currentRendered = renderUnitCostSeries(comparison.querySelector('[data-unit-cost-series="current"]'), current, currency);
  const aiRendered = renderUnitCostSeries(comparison.querySelector('[data-unit-cost-series="ai"]'), ai, currency);
  comparison.hidden = !(currentRendered && aiRendered);
}

function updateLiveSummary() {
  togglePanels();
  const input = readInput();
  document.querySelector(".live-cost-summary").dataset.costMode = input.aiCostMethod;
  const currentTotal = buildCurrentCost(input.currentCostBuilder);
  document.querySelector("[data-live-current-total]").textContent = currency.format(currentTotal);
  updateCurrentUnitReference(input);
  document.querySelector("[data-live-period]").textContent = `${periodLabel(input.period)} selected period`;
  if (input.aiCostMethod === "known") {
    document.querySelector("[data-live-ai-total]").textContent = input.knownAiCost === "" ? "More information required" : currency.format(Number(input.knownAiCost));
    document.querySelector("[data-live-technology]").textContent = "Included in known total";
    for (const selector of ["[data-live-implementation]", "[data-live-review]", "[data-live-other]"]) document.querySelector(selector).textContent = "—";
    document.querySelector("[data-live-completeness]").textContent = "Use the builder to see component detail.";
    return;
  }
  const composition = buildAiCost(input.aiCostBuilder, input.period, input.aiAttempts);
  const missingRequiredBuilderValue = input.aiCostBuilder.technologyCost === "" || (Number(input.aiCostBuilder.implementationCost) > 0 && input.aiCostBuilder.amortizationYears === "");
  document.querySelector("[data-live-ai-total]").textContent = missingRequiredBuilderValue ? "More information required" : currency.format(composition.total);
  document.querySelector("[data-live-technology]").textContent = currency.format(composition.technologyCost);
  document.querySelector("[data-live-implementation]").textContent = currency.format(composition.allocatedImplementation);
  document.querySelector("[data-live-review]").textContent = currency.format(composition.reviewCost);
  document.querySelector("[data-live-other]").textContent = currency.format(composition.otherOperatingCost);
  document.querySelector("[data-live-completeness]").textContent = missingRequiredBuilderValue ? "Complete the required builder values." : composition.allocatedImplementation === 0 || composition.reviewCost === 0 ? "Blank or zero optional values will be noted in the result." : "Component total is ready for comparison.";
}

function marginCopy(result) {
  if (result.breakEvenRate.status === "not_achievable") return "Break-even is not achievable because the required accepted-outcome rate exceeds 100%.";
  if (result.breakEvenMargin.status !== "valid") return "Break-even cannot be calculated because the current cost per accepted outcome is zero.";
  if (Math.abs(result.breakEvenMargin.value) < 0.0005) return "Entered accepted-outcome rate is approximately equal to break-even.";
  return `Entered accepted-outcome rate is ${Math.abs(result.breakEvenMargin.value * 100).toFixed(1)} percentage points ${result.breakEvenMargin.value > 0 ? "above" : "below"} break-even.`;
}

function render(result) {
  output("decision-period").textContent = `${result.periodLabel} analysis · annualized decision view`;
  output("decision-signal").textContent = result.decisionSignal;
  output("annual-savings").textContent = result.annualizedSavings.status === "valid" ? wholeCurrency.format(Math.abs(result.annualizedSavings.value)) : "More information required";
  output("margin-copy").textContent = marginCopy(result);
  output("period-savings").textContent = formatMetric(result.selectedPeriodSavings, currency);
  output("maximum-ai-cost").textContent = formatMetric(result.maximumBreakEvenAiCost, currency);
  output("threshold-label").textContent = result.costThresholdDifference.value >= 0 ? "Cost headroom before break-even" : "Cost reduction required to reach break-even";
  output("threshold-difference").textContent = currency.format(Math.abs(result.costThresholdDifference.value));
  output("break-even-rate").textContent = result.breakEvenRate.status === "not_achievable" ? "Not achievable under current assumptions" : formatMetric(result.breakEvenRate, percentage);
  renderUnitCostMetric("baseline-cost", result.currentCostPerSuccess);
  renderUnitCostMetric("attempt-cost", result.aiCostPerAttempt);
  renderUnitCostMetric("verified-cost", result.aiCostPerSuccess);
  output("equivalent-cost").textContent = formatMetric(result.equivalentOutputAiCost, currency);
  output("accepted-outcomes").textContent = formatMetric(result.successfulAiOutcomes, number);
  output("failed-attempts").textContent = formatMetric(result.failedAttempts, number);
  output("failure-cost").textContent = formatMetric(result.annualFailureCost, currency);
  renderUnitCostMetric("visual-current-cost", result.currentCostPerSuccess);
  renderUnitCostMetric("visual-ai-cost", result.aiCostPerSuccess);
  output("visual-break-even").textContent = result.breakEvenRate.status === "not_achievable" ? ">100%" : formatMetric(result.breakEvenRate, percentage);
  output("visual-entered").textContent = formatMetric(result.enteredSuccessRate, percentage);
  updateUnitCostComparison(result);

  const current = result.currentCostPerSuccess.value || 0;
  const ai = result.aiCostPerSuccess.status === "valid" ? result.aiCostPerSuccess.value : 0;
  const maxUnit = Math.max(current, ai, 1);
  document.querySelector('[data-bar="current-cost"]').style.width = `${Math.max(3, current / maxUnit * 100)}%`;
  document.querySelector('[data-bar="ai-cost"]').style.width = `${Math.max(3, ai / maxUnit * 100)}%`;
  document.querySelector('[data-rate-marker="entered"]').style.left = `${Math.min(100, result.enteredSuccessRate.value * 100)}%`;
  document.querySelector('[data-rate-marker="break-even"]').style.left = `${Math.min(100, Math.max(0, (result.breakEvenRate.value || 0) * 100))}%`;

  const compositionSection = document.querySelector("[data-cost-composition]");
  compositionSection.hidden = result.aiCostMethod !== "builder";
  if (result.composition) {
    const parts = { technology: result.composition.technologyCost, implementation: result.composition.allocatedImplementation, review: result.composition.reviewCost, other: result.composition.otherOperatingCost };
    for (const [name, amount] of Object.entries(parts)) {
      output(`component-${name}`).textContent = currency.format(amount);
      document.querySelector(`[data-component="${name}"]`).style.width = `${result.composition.total > 0 ? amount / result.composition.total * 100 : 0}%`;
    }
    output("component-total").textContent = currency.format(result.composition.total);
  }

  const assumptions = [
    `Analysis period: ${result.periodLabel}.`, `Unit of work: ${unitTerms(value("outcome_label")).singular}.`, `Accepted AI-assisted rate: ${result.successRateSource}.`,
    `Current process cost: ${result.currentCostMethod === "builder" ? "built from direct components" : "known total"}.`,
    `AI-assisted cost: ${result.aiCostMethod === "builder" ? "built from direct components" : "known total"}.`,
    ...(activeExample ? [`Illustrative example: ${activeExample.name}; not a benchmark or client result.`] : []), ...result.completenessNotes, `Model version: Advanced ${result.modelVersion}.`,
  ];
  output("assumptions-list").replaceChildren(...assumptions.map((item) => { const node = document.createElement("li"); node.textContent = item; return node; }));
  results.dataset.signal = result.decisionSignal.toLowerCase().replaceAll(" ", "-");
  results.hidden = false;
  results.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = calculateAdvancedEstimate(readInput());
  if (result.status !== "valid") { results.hidden = true; showErrors(result.errors); return; }
  showErrors([]); render(result);
});

form.addEventListener("input", (event) => {
  updateLiveSummary();
  if (event.target === field("outcome_label")) updateUnitCopy();
  if (activeExample && event.isTrusted) {
    activeExample = null;
    for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", "false");
    document.querySelector("[data-active-example-state]").textContent = "Illustrative example modified";
    document.querySelector("[data-active-example-name]").textContent += " · values changed";
  }
});
form.addEventListener("change", updateLiveSummary);
form.addEventListener("focusout", (event) => {
  if (!event.target.matches("[aria-invalid='true']")) return;
  const result = calculateAdvancedEstimate(readInput());
  if (result.status !== "valid") showErrors(result.errors);
});

document.querySelector("[data-edit]").addEventListener("click", () => {
  form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  field("current_outcomes").focus({ preventScroll: true });
});

function updatePilotRate() {
  const target = document.querySelector("[data-live-pilot-rate]");
  const pilot = calculatePilotRate(value("pilot_attempts"), value("pilot_accepted"));
  target.textContent = pilot.status === "valid" ? `${pilot.value.toFixed(1)}%` : "More information required";
}
field("pilot_attempts").addEventListener("input", updatePilotRate);
field("pilot_accepted").addEventListener("input", updatePilotRate);
createExampleDialog({ dialog: document.querySelector("[data-example-dialog]"), trigger: document.querySelector("[data-example-open]"), onSelect: loadExample });
document.querySelector("[data-clear-example]").addEventListener("click", clearExample);
updateUnitCopy();
updateLiveSummary();
