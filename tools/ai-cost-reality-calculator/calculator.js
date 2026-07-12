import { FORMULA_VERSION, calculateEconomics } from "./calculator-core.js";
import { formatMetric } from "/assets/js/ai-economics/presenter.js";

const form = document.getElementById("ai-economics-form");
const errors = document.querySelector("[data-error-summary]");
const resultsSection = document.querySelector("[data-results]");
let latestResult = null;

const defaults = {
  baseline_verified: 100000, baseline_cost: 1000000, ai_attempts: 125000,
  verified_rate: 84, total_ai_cost: 600000, upfront: 0,
};

const helpText = {
  baseline_verified: "How many finished results met the required standard in a typical year? Example: 100,000 cases closed successfully—not cases started.",
  baseline_cost: "What do you spend each year to produce those successful results? Include people, vendors, software, and operations. A best estimate is fine.",
  ai_attempts: "How many times will the AI-assisted workflow run each year? Count retries, corrected work, and failed attempts too.",
  verified_rate: "What percentage of AI attempts will become usable business results? Example: enter 80 if 8 out of 10 attempts should pass.",
  total_ai_cost: "What will the AI-assisted process cost each year? Include model, platform, human review, corrections, and ongoing operations. Exclude one-time setup.",
  upfront: "What will you spend once to launch the process? Include implementation, integration, training, and initial setup. Leave at zero if unknown.",
};

function numericControl(name, container) {
  const initial = defaults[name];
  const prefix = container.hasAttribute("data-money") ? '<span class="input-prefix">$</span>' : "";
  const suffix = container.hasAttribute("data-percent") ? '<span class="input-suffix">%</span>' : "";
  const optional = container.hasAttribute("data-optional");
  const label = container.querySelector("label");
  const inputId = `quick-${name.replaceAll("_", "-")}`;
  const tipId = `${inputId}-help`;
  label.htmlFor = inputId;
  const labelRow = document.createElement("div");
  labelRow.className = "field-label-row";
  label.before(labelRow);
  labelRow.append(label);
  labelRow.insertAdjacentHTML("beforeend", `<button class="field-help" type="button" aria-label="Help for ${label.textContent.trim()}" aria-describedby="${tipId}" aria-expanded="false">?</button><span class="field-tooltip" id="${tipId}" role="tooltip">${helpText[name]}</span>`);
  container.insertAdjacentHTML("beforeend", `<div class="value-row"><div class="single-value">${prefix}<input id="${inputId}" name="${name}" type="number" min="0" ${container.hasAttribute("data-percent") ? 'max="100"' : ""} step="any" value="${initial}" ${optional ? "" : "required"}>${suffix}</div></div>`);
}

document.querySelectorAll(".evidence-field").forEach((container) => {
  numericControl(container.dataset.field, container);
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".field-help");
  document.querySelectorAll(".field-help[aria-expanded='true']").forEach((button) => {
    if (button !== trigger) button.setAttribute("aria-expanded", "false");
  });
  if (trigger) trigger.setAttribute("aria-expanded", String(trigger.getAttribute("aria-expanded") !== "true"));
});

const value = (name) => form.elements[name]?.value ?? "";
const number = (name) => value(name) === "" ? 0 : Number(value(name));
const quickFields = ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost", "upfront"];

function buildData(values) {
  return {
    metadata: { formula_version: FORMULA_VERSION, currency: "USD", period: "annual", use_case_name: "basic_estimate", outcome_definition: "A completed business result that met the required standard.", period_closed: false },
    baseline: { verified_outcomes: values.baseline_verified, process_cost: values.baseline_cost, evidence: "estimate" },
    ai: { attempts: values.ai_attempts, verified_rate: values.verified_rate / 100, direct_model_platform_cost: values.total_ai_cost, evidence: "estimate" },
    tco: { upfront: values.upfront, transition_year_1: 0, human_review: 0, rework_exception: 0, escalation: 0, other_recurring: 0, refresh_annualized: 0, useful_life_years: 3, evidence: "estimate" },
    benefits: { hard_annual_benefit: values.baseline_cost, capacity_hours: 0, loaded_hourly_rate: 0, productive_hours_per_fte: 2080, evidence: "estimate" },
    risk: { expected_annual_loss: 0, severe_loss_scenario: 0, events: [], evidence: "estimate" },
    finance: { discount_rate: 0.08, horizon_years: 3 },
    comparison: { outcome_definitions_match: false, quality_thresholds_match: false, periods_match: false, scope_matches: false, verification_windows_match: false, volume_basis_matches: false, fixed_variable_boundaries_match: false },
    governance: {},
  };
}

function showErrors(messages) {
  errors.innerHTML = `<strong>Check the highlighted inputs</strong><ul>${messages.map((message) => `<li>${message}</li>`).join("")}</ul>`;
  errors.hidden = false; errors.focus();
}

function format(name, metric, currency = "USD") {
  const options = name === "payback" ? { style: "months" } : name === "break-even" || name === "capacity-hours" ? { style: "number", digits: 0 } : { currency, digits: 2 };
  return formatMetric(metric, options);
}

function resultStatus(metric) {
  if (metric.aiCostPerVerified.status !== "valid" || metric.baselineUnitCost.status !== "valid") return "More evidence required";
  if (metric.aiCostPerVerified.value > metric.baselineUnitCost.value) return "AI cost per success is higher";
  return "Lower cost per success under this estimate";
}

function render(result) {
  const { metrics, data } = result;
  const outputs = {
    "baseline-cost": metrics.baselineUnitCost, "verified-cost": metrics.aiCostPerVerified, "attempt-cost": metrics.aiCostPerAttempt,
  };
  Object.entries(outputs).forEach(([name, metric]) => { document.querySelector(`[data-output="${name}"]`).textContent = format(name, metric, data.metadata.currency); });
  const failedAttempts = Math.max(0, data.ai.attempts - metrics.verifiedOutcomes);
  const failureCost = metrics.aiCostPerAttempt.status === "valid" ? metrics.aiCostPerAttempt.value * failedAttempts : null;
  document.querySelector('[data-output="failed-attempts"]').textContent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(failedAttempts);
  document.querySelector('[data-output="failure-cost"]').textContent = formatMetric(failureCost === null ? { status: "not_calculable", value: null } : { status: "valid", value: failureCost }, { currency: data.metadata.currency, digits: 0 });
  document.querySelector('[data-output="status"]').textContent = resultStatus(metrics);
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); errors.hidden = true;
  const missing = quickFields.filter((name) => !document.querySelector(`[data-field="${name}"]`).hasAttribute("data-optional") && value(name) === "");
  if (missing.length) { showErrors(["Complete all five required quick-estimate inputs."]); return; }
  if (number("verified_rate") > 100) { showErrors(["Expected success rate cannot exceed 100%."]); return; }
  const values = Object.fromEntries(quickFields.map((name) => [name, number(name)]));
  const data = buildData(values);
  latestResult = { data, metrics: calculateEconomics(data) };
  resultsSection.hidden = false; render(latestResult); resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("[data-edit]").addEventListener("click", () => document.querySelector(".inputs-section").scrollIntoView({ behavior: "smooth" }));
