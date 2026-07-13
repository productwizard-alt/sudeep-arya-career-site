import { calculatePilotRate, calculateQuickDecisionMetrics, periodLabel } from "./quick-decision-metrics.js";

const form = document.querySelector("#ai-economics-form");
const results = document.querySelector("[data-results]");
const errorSummary = document.querySelector("[data-error-summary]");
const output = (name) => document.querySelector(`[data-output="${name}"]`);
const field = (name) => form.elements.namedItem(name);

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

function formatMetric(metric, formatter, fallback = "Not calculable") {
  return metric?.status === "valid" && Number.isFinite(metric.value) ? formatter.format(metric.value) : fallback;
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
  output("baseline-cost").textContent = formatMetric(result.currentCostPerSuccess, currency);
  output("attempt-cost").textContent = formatMetric(result.aiCostPerAttempt, currency);
  output("verified-cost").textContent = formatMetric(result.aiCostPerSuccess, currency);
  output("accepted-outcomes").textContent = formatMetric(result.successfulAiOutcomes, number);
  output("failed-attempts").textContent = formatMetric(result.failedAttempts, number);
  output("failure-cost").textContent = formatMetric(result.annualFailureCost, currency);
  output("visual-current-cost").textContent = formatMetric(result.currentCostPerSuccess, currency);
  output("visual-ai-cost").textContent = formatMetric(result.aiCostPerSuccess, currency);
  output("visual-break-even").textContent = result.breakEvenRate.status === "not_achievable" ? ">100%" : formatMetric(result.breakEvenRate, percentage);
  output("visual-entered").textContent = formatMetric(result.enteredSuccessRate, percentage);
  output("result-footnote").textContent = `Quick Model 1.2.0 · ${selectedPeriod} inputs · Directional planning estimate.`;

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

for (const radio of document.querySelectorAll('input[name="period"]')) {
  radio.addEventListener("change", () => {
    const label = periodLabel(radio.value).toLowerCase();
    document.querySelectorAll("[data-period-word]").forEach((node) => { node.textContent = label; });
  });
}
