import { calculatePilotRate, calculateQuickDecisionMetrics, periodLabel } from "./quick-decision-metrics.js";
import { calculatorExample, unitTerms } from "./calculator-examples.js";
import { createExampleDialog } from "./calculator-example-dialog.js";
import { deriveUnitCostSeries, renderDerivedCurrency, renderUnitCostSeries } from "./unit-cost-reference.js";

const form = document.querySelector("#ai-economics-form");
const results = document.querySelector("[data-results]");
const errorSummary = document.querySelector("[data-error-summary]");
const output = (name) => document.querySelector(`[data-output="${name}"]`);
const field = (name) => form.elements.namedItem(name);
let activeExample = null;
let currentReferenceAnnouncementTimer;

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

function formatMetric(metric, formatter, fallback = "Not calculable") {
  return metric?.status === "valid" && Number.isFinite(metric.value) ? formatter.format(metric.value) : fallback;
}

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
    period: field("period").value,
    currentOutcomes: field("baseline_verified").value,
    currentCost: field("baseline_cost").value,
    aiAttempts: field("ai_attempts").value,
    successRate: field("verified_rate").value,
    aiCost: field("total_ai_cost").value,
  };
}

function updateUnitCopy() {
  const terms = unitTerms(field("outcome_label").value);
  for (const node of document.querySelectorAll("[data-unit-singular]")) node.textContent = terms.singular;
  for (const node of document.querySelectorAll("[data-unit-plural]")) node.textContent = terms.plural;
}

function updatePeriodCopy(period) {
  const label = periodLabel(period).toLowerCase();
  for (const node of document.querySelectorAll("[data-period-word]")) node.textContent = label;
}

function updateCurrentUnitReference() {
  const reference = document.querySelector("[data-current-unit-reference]");
  const announcement = document.querySelector("[data-current-unit-reference-announcement]");
  const series = deriveUnitCostSeries(field("baseline_cost").value, field("baseline_verified").value);
  clearTimeout(currentReferenceAnnouncementTimer);
  if (!series || !renderUnitCostSeries(reference, series, currency)) {
    reference.hidden = true;
    announcement.textContent = "";
    return;
  }
  reference.hidden = false;
  const terms = unitTerms(field("outcome_label").value);
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

function showExampleContext(example) {
  const selected = example.quick;
  const status = document.querySelector("[data-active-example]");
  document.querySelector("[data-active-example-state]").textContent = "Illustrative example loaded";
  document.querySelector("[data-active-example-name]").textContent = example.quickName;
  document.querySelector("[data-active-example-period]").textContent = periodLabel(selected.period);
  document.querySelector("[data-active-example-unit]").textContent = example.unitLabel;
  status.hidden = false;
  for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", String(button.dataset.example === example.id));
}

function loadExample(id) {
  const example = calculatorExample(id);
  if (!example) return;
  const input = example.quick;
  form.reset();
  field("outcome_label").value = example.unitLabel;
  document.querySelector(`input[name="period"][value="${input.period}"]`).checked = true;
  field("baseline_verified").value = input.currentOutcomes;
  field("baseline_cost").value = input.currentCost;
  field("ai_attempts").value = input.aiAttempts;
  field("verified_rate").value = input.successRate;
  field("total_ai_cost").value = input.aiCost;
  const pilotDetails = document.querySelector(".pilot-helper");
  const pilotAttempts = document.querySelector("#quick-pilot-attempts");
  const pilotAccepted = document.querySelector("#quick-pilot-accepted");
  const pilotMessage = document.querySelector("[data-pilot-message]");
  pilotAttempts.value = input.pilotAttempts ?? "";
  pilotAccepted.value = input.pilotAccepted ?? "";
  pilotDetails.open = input.acceptanceMode === "pilot";
  pilotMessage.textContent = input.acceptanceMode === "pilot" ? `${input.successRate}% accepted AI-assisted rate loaded from this illustrative pilot.` : "";
  activeExample = example;
  results.hidden = true;
  showErrors([]);
  for (const control of form.querySelectorAll("[aria-invalid]")) control.setAttribute("aria-invalid", "false");
  updateUnitCopy();
  updateCurrentUnitReference();
  updatePeriodCopy(input.period);
  showExampleContext(example);
}

function clearExample() {
  form.reset();
  document.querySelector("#quick-pilot-attempts").value = "";
  document.querySelector("#quick-pilot-accepted").value = "";
  document.querySelector("[data-pilot-message]").textContent = "";
  document.querySelector(".pilot-helper").open = false;
  document.querySelector("[data-active-example]").hidden = true;
  for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", "false");
  for (const control of form.querySelectorAll("[aria-invalid]")) control.setAttribute("aria-invalid", "false");
  activeExample = null;
  results.hidden = true;
  showErrors([]);
  updateUnitCopy();
  updateCurrentUnitReference();
  updatePeriodCopy(field("period").value);
}

function validate(input) {
  const errors = [];
  const checks = [
    ["baseline_verified", "Enter accepted current-process outcomes greater than zero.", (value) => value !== "" && Number(value) > 0],
    ["baseline_cost", "Enter a current-process cost of zero or greater.", (value) => value !== "" && Number(value) >= 0],
    ["ai_attempts", "Enter expected AI-assisted attempts greater than zero.", (value) => value !== "" && Number(value) > 0],
    ["verified_rate", "Enter an accepted-outcome rate from 0% to 100%.", (value) => value !== "" && Number(value) >= 0 && Number(value) <= 100],
    ["total_ai_cost", "Enter a total AI-assisted cost of zero or greater.", (value) => value !== "" && Number(value) >= 0],
  ];
  for (const [name, message, valid] of checks) {
    const control = field(name);
    const okay = Number.isFinite(Number(control.value)) && valid(control.value);
    control.setAttribute("aria-invalid", String(!okay));
    if (!okay) errors.push({ id: control.id, message });
  }
  return errors;
}

function showErrors(errors) {
  if (!errors.length) {
    errorSummary.hidden = true;
    errorSummary.innerHTML = "";
    return;
  }
  errorSummary.innerHTML = `<strong>Check ${errors.length === 1 ? "this input" : "these inputs"}</strong><ul>${errors.map(({ id, message }) => `<li><a href="#${id}">${message}</a></li>`).join("")}</ul>`;
  errorSummary.hidden = false;
  errorSummary.focus();
}

function marginCopy(result) {
  if (result.breakEvenRate.status === "not_achievable") return "The required accepted-outcome rate exceeds 100% under the current cost assumptions.";
  if (result.breakEvenMargin.status !== "valid") return "Break-even cannot be calculated because the current cost per accepted outcome is zero.";
  const points = Math.abs(result.breakEvenMargin.value * 100).toFixed(1);
  if (Math.abs(result.breakEvenMargin.value) < 0.0005) return "Expected accepted-outcome rate is approximately equal to break-even.";
  return `Expected accepted-outcome rate is ${points} percentage points ${result.breakEvenMargin.value > 0 ? "above" : "below"} break-even.`;
}

function render(result) {
  const selectedPeriod = result.periodLabel;
  output("decision-period").textContent = `${selectedPeriod} analysis · annualized decision view`;
  output("decision-signal").textContent = result.decisionSignal;
  output("annual-savings").textContent = result.annualizedSavings.status === "valid" ? wholeCurrency.format(Math.abs(result.annualizedSavings.value)) : "More information required";
  output("margin-copy").textContent = marginCopy(result);
  output("period-savings").textContent = formatMetric(result.selectedPeriodSavings, currency);
  output("equivalent-cost").textContent = formatMetric(result.equivalentOutputAiCost, currency);
  output("entered-rate").textContent = formatMetric(result.enteredSuccessRate, percentage);
  output("break-even-rate").textContent = result.breakEvenRate.status === "not_achievable" ? "Not achievable under current assumptions" : formatMetric(result.breakEvenRate, percentage);
  renderUnitCostMetric("baseline-cost", result.currentCostPerSuccess);
  renderUnitCostMetric("attempt-cost", result.aiCostPerAttempt);
  renderUnitCostMetric("verified-cost", result.aiCostPerSuccess);
  output("accepted-outcomes").textContent = formatMetric(result.successfulAiOutcomes, number);
  output("failed-attempts").textContent = formatMetric(result.failedAttempts, number);
  output("failure-cost").textContent = formatMetric(result.annualFailureCost, currency);
  renderUnitCostMetric("visual-current-cost", result.currentCostPerSuccess);
  renderUnitCostMetric("visual-ai-cost", result.aiCostPerSuccess);
  output("visual-break-even").textContent = result.breakEvenRate.status === "not_achievable" ? ">100%" : formatMetric(result.breakEvenRate, percentage);
  output("visual-entered").textContent = formatMetric(result.enteredSuccessRate, percentage);
  output("result-footnote").textContent = `Quick Model 1.2.0 · ${selectedPeriod} inputs · ${activeExample ? `Illustrative ${activeExample.name.toLowerCase()} example · ` : ""}Directional planning estimate.`;
  updateUnitCostComparison(result);

  const current = result.currentCostPerSuccess.value || 0;
  const ai = result.aiCostPerSuccess.status === "valid" ? result.aiCostPerSuccess.value : 0;
  const max = Math.max(current, ai, 1);
  document.querySelector('[data-bar="current-cost"]').style.width = `${Math.max(3, current / max * 100)}%`;
  document.querySelector('[data-bar="ai-cost"]').style.width = `${Math.max(3, ai / max * 100)}%`;
  document.querySelector('[data-rate-marker="entered"]').style.left = `${Math.min(100, result.enteredSuccessRate.value * 100)}%`;
  document.querySelector('[data-rate-marker="break-even"]').style.left = `${Math.min(100, Math.max(0, (result.breakEvenRate.value || 0) * 100))}%`;
  results.dataset.signal = result.decisionSignal.toLowerCase().replaceAll(" ", "-");
  results.hidden = false;
  results.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = readInput();
  const errors = validate(input);
  showErrors(errors);
  if (errors.length) { results.hidden = true; return; }
  const result = calculateQuickDecisionMetrics(input);
  if (result.status !== "valid") { showErrors(result.errors.map((message) => ({ id: "quick-error-summary", message }))); return; }
  render(result);
});

form.addEventListener("focusout", (event) => {
  if (event.target.matches("input[aria-invalid='true']")) validate(readInput());
});

form.addEventListener("input", (event) => {
  if (event.target === field("outcome_label")) updateUnitCopy();
  updateCurrentUnitReference();
  if (activeExample && event.isTrusted) {
    activeExample = null;
    for (const button of document.querySelectorAll("[data-example]")) button.setAttribute("aria-pressed", "false");
    document.querySelector("[data-active-example-state]").textContent = "Illustrative example modified";
    document.querySelector("[data-active-example-name]").textContent += " · values changed";
  }
});

document.querySelector("[data-edit]").addEventListener("click", () => {
  form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  field("baseline_verified").focus({ preventScroll: true });
});

document.querySelector("[data-pilot-calculate]").addEventListener("click", () => {
  const attempts = document.querySelector("#quick-pilot-attempts");
  const accepted = document.querySelector("#quick-pilot-accepted");
  const message = document.querySelector("[data-pilot-message]");
  const pilot = calculatePilotRate(attempts.value, accepted.value);
  if (pilot.status !== "valid") { message.textContent = pilot.reason; return; }
  field("verified_rate").value = Number(pilot.value.toFixed(2));
  field("verified_rate").setAttribute("aria-invalid", "false");
  message.textContent = `${field("verified_rate").value}% accepted-outcome rate applied from this pilot sample.`;
});

createExampleDialog({ dialog: document.querySelector("[data-example-dialog]"), trigger: document.querySelector("[data-example-open]"), onSelect: loadExample });
document.querySelector("[data-clear-example]").addEventListener("click", clearExample);

for (const radio of document.querySelectorAll('input[name="period"]')) {
  radio.addEventListener("change", () => {
    updatePeriodCopy(radio.value);
  });
}

updateUnitCopy();
updateCurrentUnitReference();
