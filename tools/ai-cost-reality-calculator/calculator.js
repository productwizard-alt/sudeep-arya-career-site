import { FORMULA_VERSION, calculateEconomics, escalationCost, expectedLossForEvent, humanReviewCost, humanReworkCost, sumCostComponents } from "./calculator-core.js";
import { formatMetric, metricReason } from "/assets/js/ai-economics/presenter.js";
import { exportCalculation, importCalculation } from "/assets/js/ai-economics/storage.js";
import { validateCalculation } from "/assets/js/ai-economics/validation.js";

const form = document.getElementById("ai-economics-form");
const steps = Array.from(document.querySelectorAll("[data-step]"));
const stepButtons = Array.from(document.querySelectorAll("[data-step-button]"));
const previousButton = document.querySelector("[data-previous]");
const nextButton = document.querySelector("[data-next]");
const calculateButton = document.querySelector("[data-calculate]");
const errorSummary = document.querySelector("[data-error-summary]");
let currentStep = 0;
let latestData = null;
let started = false;
let activeScenario = "operating_plan";
const scenarioStore = new Map();

document.documentElement.classList.add("calculator-enhanced");

const safeTrack = (eventName, parameters = {}) => {
  if (typeof window.gtag !== "function") return;
  const allowed = ["page", "step_name", "mode", "placement", "asset_type"];
  const safe = Object.fromEntries(Object.entries(parameters).filter(([key]) => allowed.includes(key)));
  window.gtag("event", eventName, safe);
};

const value = (name) => form.elements[name]?.value ?? "";
const number = (name) => value(name) === "" ? 0 : Number(value(name));
const checked = (name) => Boolean(form.elements[name]?.checked);

function collectData() {
  const detailed = !form.elements.first_pass.disabled;
  return {
    metadata: {
      formula_version: FORMULA_VERSION,
      pricing_snapshot_id: "manual-entry-1.1.0",
      currency: value("currency"),
      period: "annual",
      calculation_date: new Date().toISOString().slice(0, 10),
      use_case_name: value("use_case_template"),
      outcome_definition: value("outcome_definition").trim(),
      quality_threshold: value("quality_threshold").trim(),
      verification_window: value("verification_window").trim(),
      period_closed: detailed ? checked("period_closed") : false,
    },
    baseline: {
      verified_outcomes: number("baseline_verified"),
      process_cost: number("baseline_cost"),
      variable_unit_cost: number("baseline_variable_unit_cost"),
      evidence: value("baseline_evidence"),
    },
    ai: {
      attempts: number("ai_attempts"),
      verified_rate: number("verified_rate") / 100,
      direct_model_platform_cost: number("direct_ai_cost"),
      annual_fixed_cost: number("annual_fixed_ai_cost"),
      variable_unit_cost: number("ai_variable_unit_cost"),
      evidence: value("ai_evidence"),
      ...(detailed ? {
        first_pass_verified: number("first_pass"),
        reviewed_pass: number("reviewed_pass"),
        corrected_verified: number("corrected"),
        failed: number("failed"),
        unresolved: number("unresolved"),
      } : {}),
    },
    tco: {
      upfront: number("upfront"),
      transition_year_1: 0,
      human_review: number("human_review"),
      rework_exception: number("rework_exception"),
      escalation: number("escalation_cost"),
      other_recurring: number("other_recurring"),
      refresh_annualized: 0,
      useful_life_years: number("useful_life"),
      evidence: value("ai_evidence"),
    },
    benefits: {
      hard_annual_benefit: number("hard_benefit"),
      capacity_hours: number("capacity_hours"),
      loaded_hourly_rate: number("loaded_hourly_rate"),
      productive_hours_per_fte: number("productive_hours_per_fte"),
      evidence: value("benefit_evidence"),
    },
    risk: {
      expected_annual_loss: number("expected_loss"),
      severe_loss_scenario: number("severe_loss"),
      events: [],
      evidence: value("risk_evidence"),
    },
    finance: { discount_rate: number("discount_rate") / 100, horizon_years: number("horizon") },
    comparison: {
      outcome_definitions_match: true,
      quality_thresholds_match: true,
      periods_match: true,
      scope_matches: true,
      verification_windows_match: true,
      volume_basis_matches: true,
      fixed_variable_boundaries_match: checked("fixed_variable_boundaries_match"),
    },
    governance: {
      quality_at_or_above_baseline: checked("quality_at_or_above_baseline"),
      representative_production_evidence: checked("representative_production_evidence"),
      failure_recovery_tested: checked("failure_recovery_tested"),
      specialist_knowledge_retained: checked("specialist_knowledge_retained"),
      named_accountable_owner: checked("named_accountable_owner"),
      finance_validated_hard_benefits: checked("finance_validated_hard_benefits"),
      control_approvals_complete: checked("control_approvals_complete"),
    },
    evidence_labels: {
      metadata: value("metadata_evidence"), baseline: value("baseline_evidence"), ai: value("ai_evidence"), benefits: value("benefit_evidence"), risk: value("risk_evidence"),
    },
  };
}

function showStep(index, { focus = true } = {}) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
  stepButtons.forEach((button, stepIndex) => {
    button.toggleAttribute("aria-current", stepIndex === currentStep);
    if (stepIndex === currentStep) button.setAttribute("aria-current", "step");
    button.classList.toggle("is-complete", stepIndex < currentStep);
  });
  previousButton.hidden = currentStep === 0 || currentStep === steps.length - 1;
  nextButton.hidden = currentStep >= steps.length - 2;
  calculateButton.hidden = currentStep !== steps.length - 2;
  if (focus) steps[currentStep].querySelector("legend,h2")?.focus?.({ preventScroll: true });
}

function validateCurrentStep() {
  const controls = Array.from(steps[currentStep].querySelectorAll("input,select,textarea")).filter((control) => !control.disabled);
  const invalid = controls.filter((control) => !control.checkValidity());
  if (currentStep === 4 && !checked("risk_not_double_counted")) invalid.push(form.elements.risk_not_double_counted);
  controls.forEach((control) => {
    const isInvalid = invalid.includes(control);
    control.setAttribute("aria-invalid", String(isInvalid));
    if (isInvalid) control.setAttribute("aria-errormessage", "calculator-error-summary");
    else control.removeAttribute("aria-errormessage");
  });
  if (invalid.length) {
    showErrors(["Complete the required fields in this step and correct any values outside the allowed range."]);
    invalid[0].focus();
    return false;
  }
  hideErrors();
  return true;
}

function showErrors(errors) {
  errorSummary.innerHTML = `<h3>Check the calculation inputs</h3><ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
  errorSummary.hidden = false;
  errorSummary.focus();
}

function hideErrors() { errorSummary.hidden = true; errorSummary.textContent = ""; }

function setOutput(name, metric, options) {
  const target = document.querySelector(`[data-output="${name}"]`);
  if (target) target.textContent = formatMetric(metric, options);
  const reason = document.querySelector(`[data-reason="${name}"]`);
  if (reason) reason.textContent = metricReason(metric);
}

function renderResults(data) {
  const metrics = calculateEconomics(data);
  const currency = data.metadata.currency;
  setOutput("year1", metrics.year1CashTco, { currency });
  setOutput("steady", metrics.steadyStateAnnualTco, { currency });
  setOutput("verified-cost", metrics.aiCostPerVerified, { currency, digits: 2 });
  setOutput("baseline-cost", metrics.baselineUnitCost, { currency, digits: 2 });
  setOutput("risk-roi", metrics.riskAdjustedRoi, { style: "percent", digits: 1 });
  setOutput("payback", metrics.payback, { style: "months" });
  setOutput("attempt-cost", metrics.aiCostPerAttempt, { currency, digits: 2 });
  setOutput("risk-cost", metrics.riskAdjustedCostPerVerified, { currency, digits: 2 });
  setOutput("unit-tco", metrics.unitEconomicsTco, { currency });
  setOutput("unit-improvement", metrics.unitCostImprovement, { style: "percent", digits: 1 });
  setOutput("final-yield", metrics.finalVerifiedYield, { style: "percent", digits: 1 });
  setOutput("first-yield", metrics.firstPassYield, { style: "percent", digits: 1 });
  setOutput("reviewed-rate", metrics.reviewedPassRate, { style: "percent", digits: 1 });
  setOutput("corrected-rate", metrics.correctedRate, { style: "percent", digits: 1 });
  setOutput("failure-rate", metrics.failureRate, { style: "percent", digits: 1 });
  setOutput("human-share", metrics.humanReviewReworkShare, { style: "percent", digits: 1 });
  setOutput("model-share", metrics.modelInfrastructureShare, { style: "percent", digits: 1 });
  setOutput("hard-benefit", metrics.hardAnnualBenefit, { currency });
  setOutput("review-cost", metrics.humanReviewCost, { currency });
  setOutput("rework-cost", metrics.reworkEscalationCost, { currency });
  setOutput("capacity-value", metrics.grossCapacityValue, { currency });
  setOutput("capacity-hours", metrics.capacityHours, { style: "number", digits: 0 });
  setOutput("capacity-fte", metrics.capacityEquivalentFte, { style: "number", digits: 2 });
  setOutput("expected-loss", metrics.expectedAnnualLoss, { currency });
  setOutput("severe-loss", metrics.severeLossScenario, { currency });
  setOutput("break-even", metrics.breakEven, { style: "number", digits: 0 });
  setOutput("npv", metrics.npv, { currency });
  setOutput("net-hard-value", metrics.netAnnualHardValue, { currency });
  setOutput("risk-net-value", metrics.riskAdjustedNetAnnualValue, { currency });
  setOutput("hard-roi", metrics.hardRoi, { style: "percent", digits: 1 });
  setOutput("cost-coverage", metrics.measuredCostCoverage, { style: "percent", digits: 0 });
  setOutput("benefit-coverage", metrics.measuredBenefitCoverage, { style: "percent", digits: 0 });

  const modelShare = metrics.modelInfrastructureShare.status === "valid" ? formatMetric(metrics.modelInfrastructureShare, { style: "percent", digits: 0 }) : "an uncalculated share";
  const unitCost = formatMetric(metrics.aiCostPerVerified, { currency, digits: 2 });
  const baseline = formatMetric(metrics.baselineUnitCost, { currency, digits: 2 });
  document.querySelector("[data-narrative]").textContent = `The model and platform invoice represents ${modelShare} of recurring TCO. The current assumptions produce a cost of ${unitCost} per verified outcome compared with ${baseline} for the baseline process. Capacity remains separate from hard benefit.`;
  const decisionLabels = {
    replacement_economics_supportable_for_separate_leadership_review: "Replacement economics appear supportable for separate leadership review. The calculator does not recommend eliminating people.",
    controlled_automation_expansion_supported: "Controlled automation expansion supported.",
    enhancement_case_supported: "Enhancement case supported.",
    replacement_case_not_proven: "Replacement case not proven.",
    more_evidence_required: "More evidence required.",
  };
  document.querySelector("[data-decision-gate]").textContent = decisionLabels[metrics.decisionGate.value] || "More evidence required.";
  document.querySelector("[data-calculation-breakdown]").innerHTML = `<dl><div><dt>Unit-economics TCO</dt><dd>${formatMetric(metrics.unitEconomicsTco, { currency })}: recurring TCO ${formatMetric({ status: "valid", value: metrics.recurringTco }, { currency })} + annualized implementation ${formatMetric(metrics.annualizedImplementation, { currency })}.</dd></div><div><dt>Verified outcomes</dt><dd>${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(metrics.verifiedOutcomes)} from ${new Intl.NumberFormat("en-US").format(data.ai.attempts)} attempts.</dd></div><div><dt>Principal unit cost</dt><dd>${formatMetric(metrics.unitEconomicsTco, { currency })} ÷ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(metrics.verifiedOutcomes)} = ${formatMetric(metrics.aiCostPerVerified, { currency, digits: 2 })}.</dd></div><div><dt>Risk adjustment</dt><dd>Expected annual loss ${formatMetric(metrics.expectedAnnualLoss, { currency })} is added once to unit cost and subtracted once in risk-adjusted value.</dd></div><div><dt>Hard benefit</dt><dd>${formatMetric(metrics.hardAnnualBenefit, { currency })}; capacity remains separate at ${formatMetric(metrics.grossCapacityValue, { currency })}.</dd></div><div><dt>Payback</dt><dd>Upfront cost divided by monthly hard benefit after recurring TCO and expected loss: ${formatMetric(metrics.payback, { style: "months" })}.</dd></div><div><dt>NPV</dt><dd>${formatMetric(metrics.npv, { currency })} over ${data.finance.horizon_years} years at ${(data.finance.discount_rate * 100).toLocaleString()}%.</dd></div><div><dt>Evidence</dt><dd>Cost coverage ${formatMetric(metrics.measuredCostCoverage, { style: "percent", digits: 0 })}; benefit coverage ${formatMetric(metrics.measuredBenefitCoverage, { style: "percent", digits: 0 })}.</dd></div><div><dt>Formula version</dt><dd>${FORMULA_VERSION}</dd></div></dl>`;
  document.querySelector("[data-result-status]").textContent = `Calculated locally with formula ${FORMULA_VERSION}. All displayed values can be reproduced from the exported JSON.`;
  latestData = data;
}

nextButton.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  safeTrack("calculator_step_complete", { page: "ai_cost_reality_calculator", step_name: String(currentStep + 1), mode: "mvp" });
  showStep(currentStep + 1);
});
previousButton.addEventListener("click", () => showStep(currentStep - 1));
stepButtons.forEach((button) => button.addEventListener("click", () => {
  const target = Number(button.dataset.stepButton);
  if (target <= currentStep || target === steps.length - 1 && latestData) showStep(target);
}));

form.addEventListener("input", () => {
  if (!started) { safeTrack("calculator_start", { page: "ai_cost_reality_calculator", mode: "mvp" }); started = true; }
  const activeButton = document.querySelector(`[data-scenario="${activeScenario}"] small`);
  if (activeButton) activeButton.textContent = "Edited";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;
  const data = collectData();
  const validation = validateCalculation(data);
  if (validation.status !== "valid") { showErrors(validation.errors); return; }
  renderResults(data);
  hideErrors();
  showStep(5);
  safeTrack("calculator_results_view", { page: "ai_cost_reality_calculator", mode: "mvp" });
});

document.querySelector("[data-detailed-counts]").addEventListener("toggle", (event) => {
  const enabled = event.currentTarget.open;
  ["first_pass", "reviewed_pass", "corrected", "failed", "unresolved", "period_closed"].forEach((name) => { form.elements[name].disabled = !enabled; });
  document.querySelector("[data-rate-field]").hidden = enabled;
  form.elements.verified_rate.disabled = enabled;
});

document.querySelector("[data-apply-human-costs]").addEventListener("click", () => {
  const review = humanReviewCost(number("reviewed_outputs"), number("review_minutes"), number("reviewer_rate"));
  const rework = humanReworkCost(number("corrected_outputs"), number("correction_minutes"), number("correction_rate"), number("external_remediation"));
  const escalation = escalationCost(number("escalations"), number("escalation_unit_cost"));
  if ([review, rework, escalation].some((metric) => metric.status !== "valid")) { showErrors(["Human-cost activity inputs must be zero or greater."]); return; }
  form.elements.human_review.value = review.value;
  form.elements.rework_exception.value = rework.value;
  form.elements.escalation_cost.value = escalation.value;
});

document.querySelector("[data-apply-recurring-costs]").addEventListener("click", () => {
  const total = sumCostComponents(Object.fromEntries(["cost_hosting_compute", "cost_data_infrastructure", "cost_software", "cost_monitoring", "cost_controls", "cost_maintenance", "cost_incident_vendor", "cost_cross_functional", "cost_exit_reserve"].map((name) => [name, number(name)])));
  if (total.status !== "valid") { showErrors(["Detailed recurring costs must be zero or greater."]); return; }
  form.elements.other_recurring.value = total.value;
});

document.querySelector("[data-apply-risk-event]").addEventListener("click", () => {
  if (checked("risk_event_in_tco")) { showErrors(["This event is already included in TCO and cannot also enter expected loss."]); return; }
  const loss = expectedLossForEvent({ annualExposures: number("risk_exposures"), probabilityOfEvent: number("risk_probability") / 100, averageFinancialImpact: number("risk_impact") });
  if (loss.status !== "valid") { showErrors(["Risk exposure, probability, and impact must be valid non-negative values."]); return; }
  form.elements.expected_loss.value = loss.value;
});

const snapshotForm = () => Object.fromEntries(Array.from(form.elements).filter((control) => control.name).map((control) => [control.name, control.type === "checkbox" ? control.checked : control.value]));
const restoreForm = (snapshot) => Object.entries(snapshot).forEach(([name, nextValue]) => { const control = form.elements[name]; if (!control) return; if (control.type === "checkbox") control.checked = Boolean(nextValue); else control.value = nextValue; });
scenarioStore.set("operating_plan", snapshotForm());
document.querySelectorAll("[data-scenario]").forEach((button) => button.addEventListener("click", () => {
  const nextScenario = button.dataset.scenario;
  if (nextScenario === activeScenario) return;
  scenarioStore.set(activeScenario, snapshotForm());
  const copied = !scenarioStore.has(nextScenario);
  if (copied) scenarioStore.set(nextScenario, structuredClone(scenarioStore.get(activeScenario)));
  restoreForm(scenarioStore.get(nextScenario));
  activeScenario = nextScenario;
  document.querySelectorAll("[data-scenario]").forEach((item) => { const active = item.dataset.scenario === activeScenario; item.setAttribute("aria-pressed", String(active)); item.querySelector("small").textContent = active ? "Active" : scenarioStore.has(item.dataset.scenario) ? "Saved in this session" : "Not set"; });
  document.querySelector("[data-scenario-status]").textContent = copied ? `${button.textContent.trim().replace(/Active|Not set|Saved in this session/g, "").trim()} copied every visible field from the prior scenario. No edits yet.` : `${button.textContent.trim()} restored from this browser session.`;
  safeTrack("calculator_scenario_changed", { page: "ai_cost_reality_calculator", mode: nextScenario });
}));

document.querySelector("[data-methodology]").addEventListener("toggle", (event) => { if (event.currentTarget.open) safeTrack("calculator_methodology_opened", { page: "ai_cost_reality_calculator" }); });
document.querySelector("[data-formula-disclosure]").addEventListener("toggle", (event) => { if (event.currentTarget.open) safeTrack("calculator_formula_opened", { page: "ai_cost_reality_calculator" }); });

document.querySelector("[data-export]").addEventListener("click", () => {
  if (!latestData) return;
  exportCalculation(latestData);
  safeTrack("calculator_export_json", { page: "ai_cost_reality_calculator", asset_type: "json", mode: "mvp" });
});
document.querySelector("[data-print]").addEventListener("click", () => { safeTrack("calculator_print", { page: "ai_cost_reality_calculator", asset_type: "snapshot", mode: "mvp" }); window.print(); });
document.querySelector("[data-clear]").addEventListener("click", () => { form.reset(); latestData = null; hideErrors(); showStep(0); });
document.querySelector("[data-import]").addEventListener("change", async (event) => {
  try {
    const data = await importCalculation(event.target.files[0]);
    const mapping = {
      outcome_definition: data.metadata.outcome_definition, quality_threshold: data.metadata.quality_threshold, verification_window: data.metadata.verification_window, currency: data.metadata.currency,
      baseline_verified: data.baseline.verified_outcomes, baseline_cost: data.baseline.process_cost, baseline_evidence: data.baseline.evidence,
      ai_attempts: data.ai.attempts, verified_rate: Number(data.ai.verified_rate || 0) * 100, direct_ai_cost: data.ai.direct_model_platform_cost, ai_evidence: data.ai.evidence,
      human_review: data.tco.human_review, rework_exception: data.tco.rework_exception, other_recurring: data.tco.other_recurring, upfront: data.tco.upfront, useful_life: data.tco.useful_life_years,
      hard_benefit: data.benefits.hard_annual_benefit, capacity_hours: data.benefits.capacity_hours, loaded_hourly_rate: data.benefits.loaded_hourly_rate, benefit_evidence: data.benefits.evidence,
      expected_loss: data.risk.expected_annual_loss, severe_loss: data.risk.severe_loss_scenario, risk_evidence: data.risk.evidence, horizon: data.finance.horizon_years, discount_rate: data.finance.discount_rate * 100,
    };
    Object.entries(mapping).forEach(([name, nextValue]) => { if (form.elements[name] && nextValue !== undefined) form.elements[name].value = nextValue; });
    form.elements.risk_not_double_counted.checked = true;
    renderResults(data);
    showStep(5);
  } catch (error) { showErrors([error.message || "The JSON file could not be imported."]); }
  event.target.value = "";
});

form.elements.use_case_template.addEventListener("change", (event) => {
  const templates = {
    service: ["Case closed, QA passed, no policy breach, and not reopened within the defined period", "Meets documented service quality and policy requirements", "7 days after closure"],
    content: ["Product page published, required attributes validated, and no material correction within the defined period", "Meets product truth, channel policy, and required attribute rules", "30 days after publication"],
    order: ["Order exception resolved before SLA with no cancellation, chargeback, or manual reopening", "Meets order policy, customer, and financial requirements", "14 days after resolution"],
    catalog: ["Item accepted by the destination channel without feed error or later material correction", "Passes destination schema, policy, and product-truth validation", "30 days after acceptance"],
    creative: ["Asset approved, published, compliant, and not returned for material correction", "Passes brand, claims, accessibility, and channel review", "30 days after publication"],
  };
  const template = templates[event.target.value];
  if (template) ["outcome_definition", "quality_threshold", "verification_window"].forEach((name, index) => { form.elements[name].value = template[index]; });
});

showStep(0, { focus: false });
