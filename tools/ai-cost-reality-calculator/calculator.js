import { FORMULA_VERSION, calculateEconomics } from "./calculator-core.js";
import { buildQuickScenarios, evidenceForCore, QUICK_FIELDS } from "./quick-scenarios.js";
import { formatMetric } from "/assets/js/ai-economics/presenter.js";

const form = document.getElementById("ai-economics-form");
const errors = document.querySelector("[data-error-summary]");
const resultsSection = document.querySelector("[data-results]");
const advanced = document.querySelector("[data-advanced]");
let results = {};
let activeScenario = "central";

const templates = {
  service: "Case closed, quality requirements passed, no policy breach, and not reopened within the selected period.",
  content: "Content published, required attributes validated, and no material correction required within the selected period.",
  catalog: "Item accepted by the destination channel without a feed error or later material correction.",
  creative: "Asset approved, published, compliant, and not returned for material correction.",
  order: "Exception resolved within SLA without cancellation, chargeback, or manual reopening.",
  reporting: "Analysis delivered, accepted by the business owner, and not materially corrected after review.",
  custom: "A completed business result that meets the standard you define.",
};

const defaults = {
  baseline_verified: ["estimate", 100000], baseline_cost: ["estimate", 1000000], ai_attempts: ["estimate", 125000],
  verified_rate: ["estimate", 84], total_ai_cost: ["estimate", 600000], upfront: ["estimate", 0],
};

function evidenceControl(name, container) {
  const [type, initial] = defaults[name];
  const prefix = container.hasAttribute("data-money") ? '<span class="input-prefix">$</span>' : "";
  const suffix = container.hasAttribute("data-percent") ? '<span class="input-suffix">%</span>' : "";
  const optional = container.hasAttribute("data-optional");
  container.insertAdjacentHTML("beforeend", `<div class="compact-input-row"><div class="value-row"><div class="single-value">${prefix}<input name="${name}" type="number" min="0" ${container.hasAttribute("data-percent") ? 'max="100"' : ""} step="any" value="${initial}" ${optional ? "" : "required"}>${suffix}</div><div class="range-values" hidden><label>Low<input name="${name}_low" type="number" min="0" step="any" value="${initial}"></label><span>to</span><label>High<input name="${name}_high" type="number" min="0" step="any" value="${initial}"></label></div></div><select class="evidence-select" aria-label="Evidence type for ${name}"><option value="actual">Actual</option><option value="estimate">Estimate</option><option value="range">Range</option></select></div>`);
  setEvidenceType(container, type);
}

function setEvidenceType(container, type) {
  container.dataset.evidence = type;
  container.querySelector(".evidence-select").value = type;
  container.querySelector(".single-value").hidden = type === "range";
  container.querySelector(".range-values").hidden = type !== "range";
}

document.querySelectorAll(".evidence-field").forEach((container) => {
  evidenceControl(container.dataset.field, container);
  container.querySelector(".evidence-select").addEventListener("change", (event) => setEvidenceType(container, event.target.value));
});

const value = (name) => form.elements[name]?.value ?? "";
const number = (name) => value(name) === "" ? 0 : Number(value(name));
const checked = (name) => Boolean(form.elements[name]?.checked);
const chosenUseCase = () => value("use_case_template") || "service";

function readQuickInputs() {
  return Object.fromEntries(Object.keys(QUICK_FIELDS).map((name) => {
    const container = document.querySelector(`[data-field="${name}"]`);
    return [name, { type: container.dataset.evidence, value: value(name), low: value(`${name}_low`), high: value(`${name}_high`) }];
  }));
}

function comparisonFlags() {
  return {
    outcome_definitions_match: checked("match_outcome"), quality_thresholds_match: checked("match_quality"),
    periods_match: checked("match_period"), scope_matches: checked("match_scope"),
    verification_windows_match: checked("match_window"), volume_basis_matches: checked("match_volume"),
    fixed_variable_boundaries_match: checked("fixed_variable_boundaries_match"),
  };
}

function buildData(values, evidenceInputs) {
  const useCase = chosenUseCase();
  const templateDefinition = templates[useCase];
  const custom = value("custom_outcome").trim();
  const advancedDefinition = value("outcome_definition").trim();
  const definition = advancedDefinition || (useCase === "custom" && custom ? custom : templateDefinition);
  const detailed = ["first_pass", "reviewed_pass", "corrected", "failed"].every((name) => value(name) !== "");
  const recurringDetail = number("other_recurring");
  return {
    metadata: { formula_version: FORMULA_VERSION, currency: "USD", period: "annual", use_case_name: useCase, outcome_definition: definition, quality_threshold: value("quality_threshold"), verification_window: value("verification_window"), period_closed: detailed },
    baseline: { verified_outcomes: values.baseline_verified, process_cost: values.baseline_cost, variable_unit_cost: number("baseline_variable_unit_cost"), evidence: evidenceForCore(evidenceInputs.baseline_cost.type) },
    ai: { attempts: values.ai_attempts, verified_rate: values.verified_rate / 100, direct_model_platform_cost: values.total_ai_cost, annual_fixed_cost: number("annual_fixed_ai_cost"), variable_unit_cost: number("ai_variable_unit_cost"), evidence: evidenceForCore(evidenceInputs.total_ai_cost.type), ...(detailed ? { first_pass_verified: number("first_pass"), reviewed_pass: number("reviewed_pass"), corrected_verified: number("corrected"), failed: number("failed"), unresolved: Math.max(0, values.ai_attempts - number("first_pass") - number("reviewed_pass") - number("corrected") - number("failed")) } : {}) },
    tco: { upfront: values.upfront, transition_year_1: number("transition_year_1"), human_review: 0, rework_exception: 0, escalation: number("escalation_cost"), other_recurring: recurringDetail, refresh_annualized: number("refresh_annualized"), useful_life_years: number("useful_life"), evidence: evidenceForCore(evidenceInputs.total_ai_cost.type) },
    benefits: { hard_annual_benefit: values.baseline_cost, capacity_hours: number("capacity_hours"), loaded_hourly_rate: 0, productive_hours_per_fte: number("productive_hours_per_fte"), evidence: evidenceForCore(evidenceInputs.baseline_cost.type) },
    risk: { expected_annual_loss: number("expected_loss"), severe_loss_scenario: number("severe_loss"), events: [], evidence: "estimate" },
    finance: { discount_rate: number("discount_rate") / 100, horizon_years: number("horizon") }, comparison: comparisonFlags(),
    governance: Object.fromEntries(["quality_at_or_above_baseline", "representative_production_evidence", "failure_recovery_tested", "specialist_knowledge_retained", "named_accountable_owner", "finance_validated_hard_benefits", "control_approvals_complete"].map((name) => [name, checked(name)])),
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

function resultStatus(metric, evidenceInputs) {
  if (metric.aiCostPerVerified.status !== "valid" || metric.baselineUnitCost.status !== "valid") return "More evidence required";
  if (metric.aiCostPerVerified.value > metric.baselineUnitCost.value) return "AI cost per success is higher";
  const estimated = Object.values(evidenceInputs).some((input) => input.type !== "actual");
  return estimated ? "Lower cost per success—validate the estimates" : "Lower cost per success under current actuals";
}

function render(scenario) {
  activeScenario = scenario;
  const { metrics, data, evidenceInputs } = results[scenario];
  const outputs = {
    "baseline-cost": metrics.baselineUnitCost, "verified-cost": metrics.aiCostPerVerified, year1: metrics.year1CashTco,
    payback: metrics.payback, "attempt-cost": metrics.aiCostPerAttempt, steady: metrics.steadyStateAnnualTco,
    "unit-tco": metrics.unitEconomicsTco, "expected-loss": metrics.expectedAnnualLoss, npv: metrics.npv,
  };
  Object.entries(outputs).forEach(([name, metric]) => { document.querySelector(`[data-output="${name}"]`).textContent = format(name, metric, data.metadata.currency); });
  const failedAttempts = Math.max(0, data.ai.attempts - metrics.verifiedOutcomes);
  const failureCost = metrics.aiCostPerAttempt.status === "valid" ? metrics.aiCostPerAttempt.value * failedAttempts : null;
  document.querySelector('[data-output="failed-attempts"]').textContent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(failedAttempts);
  document.querySelector('[data-output="failure-cost"]').textContent = formatMetric(failureCost === null ? { status: "not_calculable", value: null } : { status: "valid", value: failureCost }, { currency: data.metadata.currency, digits: 0 });
  const comparable = Object.values(data.comparison).slice(0, 6).every(Boolean);
  document.querySelector('[data-output="unit-improvement"]').textContent = comparable ? formatMetric(metrics.unitCostImprovement, { style: "percent", digits: 1 }) : "Available in Advanced Analysis";
  document.querySelector('[data-output="status"]').textContent = resultStatus(metrics, evidenceInputs);
  document.querySelector('[data-output="decision-gate"]').textContent = String(metrics.decisionGate.value || "More evidence required").replaceAll("_", " ");
  document.querySelectorAll("[data-scenario]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.scenario === scenario)));
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); errors.hidden = true;
  const evidenceInputs = readQuickInputs();
  try {
    const scenarios = buildQuickScenarios(evidenceInputs);
    results = Object.fromEntries(Object.entries(scenarios).map(([name, values]) => { const data = buildData(values, evidenceInputs); return [name, { data, evidenceInputs, metrics: calculateEconomics(data) }]; }));
  } catch (error) { showErrors([error.message]); return; }
  const missing = Object.keys(QUICK_FIELDS).filter((name) => !document.querySelector(`[data-field="${name}"]`).hasAttribute("data-optional") && document.querySelector(`[data-field="${name}"]`).dataset.evidence !== "range" && value(name) === "");
  if (missing.length) { showErrors(["Complete all five required quick-estimate inputs."]); return; }
  const hasRange = Object.values(evidenceInputs).some((input) => input.type === "range");
  const low = results.favorable.metrics.aiCostPerVerified; const high = results.conservative.metrics.aiCostPerVerified;
  const summary = document.querySelector("[data-range-summary]");
  summary.hidden = !hasRange;
  if (hasRange) summary.textContent = `AI cost per verified outcome range: ${format("verified-cost", low)} – ${format("verified-cost", high)}. Central estimate: ${format("verified-cost", results.central.metrics.aiCostPerVerified)}.`;
  resultsSection.hidden = false; render("central"); resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

form.addEventListener("change", (event) => {
  if (event.target.name === "use_case_template") {
    const selected = chosenUseCase(); document.querySelector("[data-outcome-definition]").textContent = templates[selected];
    document.querySelector(".custom-outcome").hidden = selected !== "custom";
  }
});
advanced.addEventListener("toggle", () => { if (advanced.open) advanced.dispatchEvent(new CustomEvent("advanced-opened", { bubbles: true })); });
document.querySelectorAll("[data-scenario]").forEach((button) => button.addEventListener("click", () => render(button.dataset.scenario)));
document.querySelector("[data-edit]").addEventListener("click", () => document.querySelector(".inputs-section").scrollIntoView({ behavior: "smooth" }));
