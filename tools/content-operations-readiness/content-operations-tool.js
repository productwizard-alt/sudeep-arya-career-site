import { calculateAdvanced, calculateQuick, compareScenarios, FORMULA_VERSION, METHODOLOGY_VERSION } from "./economics-model.js";
import { ANSWERS, assessReadiness, QUESTIONS } from "./readiness-model.js";
import { recommendNextAction } from "./recommendation-rules.js";
import { buildCsv, buildExecutiveSummary, downloadCsv } from "./result-export.js";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const state = { quick: null, advanced: null, readiness: null, activePanel: null, step: 0, assessmentIndex: 0, assessmentAnswers: {} };

const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
const numeric = (formData, key) => {
  const raw = formData.get(key);
  return raw === null || String(raw).trim() === "" ? undefined : Number(raw);
};

function openPanel(name, focus = true) {
  qa("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  qa("[data-open-panel]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.openPanel === name)));
  state.activePanel = name;
  const panel = q(`[data-panel="${name}"]`);
  if (focus) panel?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

qa("[data-open-panel]").forEach((button) => button.addEventListener("click", () => openPanel(button.dataset.openPanel)));

function readQuick() {
  const data = new FormData(q("#quick-form"));
  return { requests: numeric(data, "requests"), deliverablesPerRequest: numeric(data, "deliverablesPerRequest"), creationHours: numeric(data, "creationHours"), reviewCorrectionHours: numeric(data, "reviewCorrectionHours"), laborCost: numeric(data, "laborCost"), finalApprovalRate: numeric(data, "finalApprovalRate") === undefined ? undefined : numeric(data, "finalApprovalRate") / 100 };
}

function showErrors(kind, errors) {
  const summary = q(`[data-${kind}-errors]`);
  if (!summary) return;
  qa("[data-error-for]").forEach((node) => { node.textContent = ""; });
  const list = q("ul", summary);
  list.innerHTML = errors.map((error) => `<li>${error.message}</li>`).join("");
  for (const error of errors) {
    const field = error.field.replace(/^costs\./, "");
    const inline = q(`[data-error-for="${field}"]`);
    if (inline) inline.textContent = error.message;
  }
  summary.hidden = false;
  summary.focus();
  const first = errors[0]?.field.replace(/^costs\./, "");
  q(`[name="${first}"]`)?.focus();
}

function clearErrors(kind) {
  const summary = q(`[data-${kind}-errors]`);
  if (summary) summary.hidden = true;
  qa("[data-error-for]").forEach((node) => { node.textContent = ""; });
}

function renderKpis(target, rows) {
  target.innerHTML = rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function quickRows(result) {
  return [
    ["Attempted deliverables", number.format(result.attempted)],
    ["Approved deliverables", number.format(result.approved)],
    ["Monthly labor hours", number.format(result.laborHours)],
    ["Review + correction burden", result.reviewCorrectionBurden === null ? "Not calculable" : percent.format(result.reviewCorrectionBurden)],
    ["Monthly modeled labor cost", money.format(result.modeledLaborCost)],
    ["Labor cost per approved deliverable", result.laborCostPerApproved === null ? result.approvedOutputState : money.format(result.laborCostPerApproved)],
  ];
}

q("#quick-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = calculateQuick(readQuick());
  if (!result.ok) return showErrors("quick", result.errors);
  clearErrors("quick");
  state.quick = result;
  const results = q("[data-quick-results]");
  renderKpis(q("[data-quick-kpis]"), quickRows(result));
  q("[data-quick-summary]").textContent = `Your workflow attempts ${number.format(result.attempted)} deliverables per month and produces approximately ${number.format(result.approved)} approved outputs. Review and correction consume about ${result.reviewCorrectionBurden === null ? "an uncalculable share of" : percent.format(result.reviewCorrectionBurden)} modeled labor time.`;
  results.hidden = false;
  q("#quick-results-title").focus();
  q("[data-quick-live]").textContent = "Quick estimate calculated.";
});

q("[data-load-sample]")?.addEventListener("click", () => {
  const values = { requests: 40, deliverablesPerRequest: 2, creationHours: 1.2, reviewCorrectionHours: .5, laborCost: 60, finalApprovalRate: 75 };
  for (const [key, value] of Object.entries(values)) q(`#quick-form [name="${key}"]`).value = value;
  q("[data-quick-live]").textContent = "Hypothetical sample loaded.";
});

function carryQuickToAdvanced() {
  if (!state.quick) return;
  const quick = readQuick();
  const values = { requests: quick.requests, deliverablesPerRequest: quick.deliverablesPerRequest, creationHours: quick.creationHours, standardReviewHours: quick.reviewCorrectionHours, correctionHours: 0, exceptionHours: 0, governanceHours: 0, laborCost: quick.laborCost, firstPassApprovalRate: quick.finalApprovalRate * 100, finalApprovalRate: quick.finalApprovalRate * 100, averageReviewRounds: 1, cycleTimeDays: 1 };
  for (const [key, value] of Object.entries(values)) {
    const input = q(`#advanced-form [name="${key}"]`);
    if (input) input.value = value;
  }
  setStep(0);
  openPanel("advanced");
}
q("[data-continue-advanced]")?.addEventListener("click", carryQuickToAdvanced);

function setStep(index) {
  state.step = Math.max(0, Math.min(3, index));
  qa("[data-step]").forEach((step) => { step.hidden = Number(step.dataset.step) !== state.step; });
  qa(".step-progress span").forEach((item, itemIndex) => item.classList.toggle("active", itemIndex <= state.step));
  q("[data-step-back]").hidden = state.step === 0;
  q("[data-step-next]").hidden = state.step === 3;
  q("[data-advanced-submit]").hidden = state.step !== 3;
}
q("[data-step-next]")?.addEventListener("click", () => setStep(state.step + 1));
q("[data-step-back]")?.addEventListener("click", () => setStep(state.step - 1));

qa("select[name$='State']").forEach((select) => {
  const sync = () => {
    const base = select.name.replace("State", "");
    const value = q(`[name="${base}Value"]`);
    if (value) value.disabled = select.value !== "included";
    if (base === "implementation") q("[name='amortizationMonths']").disabled = select.value !== "included";
  };
  select.addEventListener("change", sync);
  sync();
});

function readAdvanced() {
  const data = new FormData(q("#advanced-form"));
  return {
    requests: numeric(data, "requests"), deliverablesPerRequest: numeric(data, "deliverablesPerRequest"),
    firstPassApprovalRate: numeric(data, "firstPassApprovalRate") === undefined ? undefined : numeric(data, "firstPassApprovalRate") / 100,
    finalApprovalRate: numeric(data, "finalApprovalRate") === undefined ? undefined : numeric(data, "finalApprovalRate") / 100,
    averageReviewRounds: numeric(data, "averageReviewRounds"), cycleTimeDays: numeric(data, "cycleTimeDays"),
    creationHours: numeric(data, "creationHours"), standardReviewHours: numeric(data, "standardReviewHours"), correctionHours: numeric(data, "correctionHours"),
    exceptionHours: numeric(data, "exceptionHours"), governanceHours: numeric(data, "governanceHours"), laborCost: numeric(data, "laborCost"),
    availableHours: numeric(data, "availableHours"), specialistReviewRate: numeric(data, "specialistReviewRate") === undefined ? undefined : numeric(data, "specialistReviewRate") / 100,
    amortizationMonths: numeric(data, "amortizationMonths"),
    costs: {
      technology: { state: data.get("technologyState"), value: numeric(data, "technologyValue") },
      external: { state: data.get("externalState"), value: numeric(data, "externalValue") },
      implementation: { state: data.get("implementationState"), value: numeric(data, "implementationValue") },
    },
  };
}

q("[data-compare-pilot]")?.addEventListener("click", () => {
  const current = readAdvanced();
  const values = {
    pilotCreationHours: current.creationHours,
    pilotStandardReviewHours: current.standardReviewHours,
    pilotCorrectionHours: current.correctionHours,
    pilotFirstPassApprovalRate: finiteRate(current.firstPassApprovalRate),
    pilotFinalApprovalRate: finiteRate(current.finalApprovalRate),
    pilotExceptionHours: current.exceptionHours,
    pilotGovernanceHours: current.governanceHours,
    pilotTechnologyValue: current.costs.technology.value ?? 0,
    pilotExternalValue: current.costs.external.value ?? 0,
    pilotImplementationValue: current.costs.implementation.value ?? 0,
    pilotAmortizationMonths: q("[name='amortizationMonths']")?.value || 24,
  };
  for (const [key, value] of Object.entries(values)) q(`[name="${key}"]`).value = value;
  q("[data-pilot-panel]").hidden = false;
});
const finiteRate = (value) => Number.isFinite(value) ? value * 100 : "";

function readProposed(baselineInput) {
  const data = new FormData(q("#advanced-form"));
  const proposed = structuredClone(baselineInput);
  proposed.creationHours = numeric(data, "pilotCreationHours");
  proposed.standardReviewHours = numeric(data, "pilotStandardReviewHours");
  proposed.correctionHours = numeric(data, "pilotCorrectionHours");
  proposed.firstPassApprovalRate = numeric(data, "pilotFirstPassApprovalRate") / 100;
  proposed.finalApprovalRate = numeric(data, "pilotFinalApprovalRate") / 100;
  proposed.exceptionHours = numeric(data, "pilotExceptionHours");
  proposed.governanceHours = numeric(data, "pilotGovernanceHours");
  const tech = numeric(data, "pilotTechnologyValue");
  const external = numeric(data, "pilotExternalValue");
  const implementation = numeric(data, "pilotImplementationValue");
  proposed.amortizationMonths = numeric(data, "pilotAmortizationMonths");
  proposed.costs.technology = { state: baselineInput.costs.technology.state === "excluded" && tech === 0 ? "excluded" : tech === 0 ? "zero" : "included", value: tech };
  proposed.costs.external = { state: baselineInput.costs.external.state === "excluded" && external === 0 ? "excluded" : external === 0 ? "zero" : "included", value: external };
  proposed.costs.implementation = { state: baselineInput.costs.implementation.state === "excluded" && implementation === 0 ? "excluded" : implementation === 0 ? "zero" : "included", value: implementation };
  return proposed;
}

function renderTable(target, rows) { target.innerHTML = rows.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`).join(""); }

q("#advanced-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = readAdvanced();
  const baseline = calculateAdvanced(input);
  if (!baseline.ok) { setStep(0); return showErrors("advanced", baseline.errors); }
  clearErrors("advanced");
  let proposed = null;
  let comparison = null;
  if (!q("[data-pilot-panel]").hidden) {
    proposed = calculateAdvanced(readProposed(input));
    if (!proposed.ok) return showErrors("advanced", proposed.errors);
    const data = new FormData(q("#advanced-form"));
    const definition = { approval: data.has("definitionApproval"), deliverable: data.has("definitionDeliverable"), quality: data.has("definitionQuality"), channel: data.has("definitionChannel"), period: data.has("definitionPeriod") };
    comparison = compareScenarios(baseline, proposed, { baseline: definition, proposed: definition });
  }
  const readiness = state.readiness?.result;
  const recommendation = recommendNextAction({ readiness, baseline, proposed, comparison });
  state.advanced = { baseline, proposed, comparison, recommendation };
  const rows = [
    ["Monthly approved output", number.format(baseline.approved)], ["Cost per approved deliverable", baseline.costs.perApproved === null ? baseline.approvedOutputState : money.format(baseline.costs.perApproved)],
    ["First-pass approval rate", percent.format(input.firstPassApprovalRate)], ["Standard review hours", number.format(baseline.labor.standardReview)],
    ["Correction/rework hours", number.format(baseline.labor.correction)], ["Rework burden", baseline.labor.reworkBurden === null ? "Not calculable" : percent.format(baseline.labor.reworkBurden)],
    ["Primary bottleneck", baseline.labor.correction > baseline.labor.standardReview ? "Correction/rework" : baseline.inputs.averageReviewRounds > 1 ? "Review flow" : "No single dominant labor bottleneck"],
  ];
  renderKpis(q("[data-advanced-kpis]"), rows);
  q("[data-advanced-summary]").textContent = `${comparison?.reason || "Current workflow snapshot calculated."} Recommended next action: ${recommendation}`;
  renderTable(q("[data-funnel-table]"), [["Attempted", number.format(baseline.funnel.attempted)], ["Approved on first pass", number.format(baseline.funnel.firstPassApproved)], ["Not approved on first pass", number.format(baseline.funnel.notApprovedFirstPass)], ["Approved after correction", number.format(baseline.funnel.approvedAfterCorrection)], ["Failed/abandoned/unresolved", number.format(baseline.funnel.failed)], ["Total finally approved", number.format(baseline.funnel.approved)]]);
  renderTable(q("[data-labor-table]"), [["Creation", number.format(baseline.labor.creation)], ["Standard review", number.format(baseline.labor.standardReview)], ["Correction/rework", number.format(baseline.labor.correction)], ["Exception resolution", number.format(baseline.labor.exception)], ["Governance/administration", number.format(baseline.labor.governance)], ["Total modeled labor", number.format(baseline.labor.total)]]);
  renderTable(q("[data-cost-table]"), [["Labor", money.format(baseline.costs.labor)], ["Technology", money.format(baseline.costs.technology)], ["External", money.format(baseline.costs.external)], ["Amortized implementation", money.format(baseline.costs.amortizedImplementation)], ["Modeled attributable workflow cost", money.format(baseline.costs.modeledAttributableWorkflowCost)]]);
  const scope = baseline.scopeDisclosure;
  q("[data-comparison-detail]").innerHTML = `<p><strong>Current approved capacity:</strong> ${baseline.capacity.approvedCapacity === null ? baseline.capacity.state : `${number.format(baseline.capacity.approvedCapacity)} approved outputs`}</p>${comparison ? `<p><strong>Comparison:</strong> ${comparison.reason}</p>${comparison.operationalComparable ? `<table class="data-table"><thead><tr><th>Comparable KPI</th><th>Current → proposed</th></tr></thead><tbody><tr><th>Approved output</th><td>${number.format(baseline.approved)} → ${number.format(proposed.approved)} (${comparison.deltas.approved >= 0 ? "+" : ""}${number.format(comparison.deltas.approved)})</td></tr><tr><th>Total labor hours</th><td>${number.format(baseline.labor.total)} → ${number.format(proposed.labor.total)} (${number.format(comparison.deltas.laborHours)})</td></tr><tr><th>Cost per approved</th><td>${comparison.financialComparable ? `${money.format(baseline.costs.perApproved)} → ${money.format(proposed.costs.perApproved)} (${money.format(comparison.deltas.costPerApproved)})` : "Not comparable"}</td></tr><tr><th>Modeled attributable cost</th><td>${comparison.financialComparable ? `${money.format(baseline.costs.modeledAttributableWorkflowCost)} → ${money.format(proposed.costs.modeledAttributableWorkflowCost)} (${money.format(comparison.deltas.modeledCost)})` : "Not comparable"}</td></tr></tbody></table>` : ""}<p><strong>${comparison.capacityLabel}:</strong> ${comparison.potentialCapacityReleased === null ? "Not calculable" : `${number.format(Math.abs(comparison.potentialCapacityReleased))} hours`}. Potential capacity is not realized cash savings.</p><p><strong>Break-even:</strong> ${comparison.breakEven.state}${comparison.breakEven.volume === null ? "" : ` at ${number.format(comparison.breakEven.volume)} approved outputs per month`}.</p><p><strong>Most influential entered assumption:</strong> ${comparison.sensitivity ? `${comparison.sensitivity.input} (${comparison.sensitivity.direction} test)` : "Not calculable"}.</p>` : ""}<p><strong>Included:</strong> ${scope.included.join(", ") || "None"}<br><strong>Known zero:</strong> ${scope.knownZero.join(", ") || "None"}<br><strong>Excluded or not estimated:</strong> ${scope.excluded.join(", ") || "None"}</p><p><small>Formula ${FORMULA_VERSION} · Methodology ${METHODOLOGY_VERSION}</small></p>`;
  q("[data-advanced-results]").hidden = false;
  q("#advanced-results-title").focus();
  q("[data-advanced-live]").textContent = "Full workflow result calculated.";
});

function renderAssessment() {
  const question = QUESTIONS[state.assessmentIndex];
  const selected = state.assessmentAnswers[question.key];
  q("[data-assessment-stage]").innerHTML = `<p class="assessment-progress">Question ${state.assessmentIndex + 1} of ${QUESTIONS.length}</p><fieldset><legend class="assessment-question">${question.text}</legend><p>${question.label} · ${question.domain}</p><div class="assessment-answers">${ANSWERS.map((answer) => `<label class="assessment-answer"><input type="radio" name="assessment-${question.key}" value="${answer.score}" ${selected === answer.score ? "checked" : ""}> <span>${answer.label}</span></label>`).join("")}</div></fieldset>`;
  q("[data-assessment-back]").hidden = state.assessmentIndex === 0;
  q("[data-assessment-next]").textContent = state.assessmentIndex === QUESTIONS.length - 1 ? "See readiness result" : "Next";
}
renderAssessment();
q("[data-assessment-back]")?.addEventListener("click", () => { state.assessmentIndex--; renderAssessment(); });
q("[data-assessment-next]")?.addEventListener("click", () => {
  const question = QUESTIONS[state.assessmentIndex];
  const checked = q(`[name="assessment-${question.key}"]:checked`);
  if (!checked) { q("[data-assessment-stage] fieldset").insertAdjacentHTML("afterbegin", '<p class="field-error" role="alert">Choose the answer that best describes the current workflow.</p>'); return; }
  state.assessmentAnswers[question.key] = Number(checked.value);
  if (state.assessmentIndex < QUESTIONS.length - 1) { state.assessmentIndex++; renderAssessment(); return; }
  const result = assessReadiness(state.assessmentAnswers);
  state.readiness = { result };
  renderKpis(q("[data-readiness-kpis]"), [["Readiness stage", result.stage], ["Primary bottleneck", result.primaryBottleneck], ["Recommended first action", result.recommendation]]);
  q("[data-readiness-summary]").textContent = result.qualification;
  q("[data-readiness-detail]").innerHTML = `<h4>Why this stage was assigned</h4><p>${result.gateExplanation}</p><h4>Domain breakdown</h4><table class="data-table"><tbody>${Object.entries(result.domains).map(([label, value]) => `<tr><th>${label}</th><td>${number.format(value)} of 3</td></tr>`).join("")}</tbody></table><p><strong>Secondary bottleneck:</strong> ${result.secondaryBottleneck}</p><h4>30 / 60 / 90 days</h4><ol><li><strong>30 days:</strong> ${result.plan.day30}</li><li><strong>60 days:</strong> ${result.plan.day60}</li><li><strong>90 days:</strong> ${result.plan.day90}</li></ol><p><strong>Relevant publication chapters:</strong> ${result.relevantChapters.join(", ")}</p>`;
  q("[data-readiness-results]").hidden = false;
  q("#readiness-results-title").focus();
  q("[data-readiness-live]").textContent = "Readiness result calculated.";
});

function currentRows(kind) {
  if (kind === "quick" && state.quick) return quickRows(state.quick);
  if (kind === "advanced" && state.advanced) return qa("[data-advanced-kpis] div").map((node) => [q("span", node).textContent, q("strong", node).textContent]);
  if (kind === "readiness" && state.readiness) return qa("[data-readiness-kpis] div").map((node) => [q("span", node).textContent, q("strong", node).textContent]);
  return [];
}

async function copyText(value, live) {
  await navigator.clipboard.writeText(value);
  if (live) live.textContent = "Copied to clipboard.";
}

qa("[data-copy-summary]").forEach((button) => button.addEventListener("click", async () => {
  const kind = button.dataset.copySummary;
  const qualification = kind === "readiness" ? state.readiness?.result.qualification : "Modeled estimate. Potential capacity is not realized cash savings.";
  const recommendation = kind === "advanced" ? state.advanced?.recommendation : kind === "readiness" ? state.readiness?.result.recommendation : "Continue to Full Workflow Analysis to separate review, rework, capacity, and cost scope.";
  await copyText(buildExecutiveSummary({ title: "Small Team Output Planner", metrics: currentRows(kind), recommendation, qualification }), q(`[data-${kind}-live]`));
}));
qa("[data-copy-kpis]").forEach((button) => button.addEventListener("click", () => copyText(currentRows(button.dataset.copyKpis).map(([label, value]) => `${label}\t${value}`).join("\n"), q(`[data-${button.dataset.copyKpis}-live]`))));
qa("[data-csv]").forEach((button) => button.addEventListener("click", () => {
  const kind = button.dataset.csv;
  const scope = kind === "advanced" ? state.advanced?.baseline.scopeDisclosure : { included: ["Labor"], knownZero: [], excluded: ["Exception resolution", "Governance", "Technology", "External", "Implementation"] };
  downloadCsv(buildCsv({ scenario: kind === "quick" ? "Quick labor-only estimate" : "Current workflow", rows: currentRows(kind), scope, limitations: ["Modeled estimate", "Potential capacity is not realized cash savings"] }));
}));
qa("[data-print]").forEach((button) => button.addEventListener("click", () => window.print()));
q("[data-edit-quick]")?.addEventListener("click", () => q("#quick-requests").focus());
q("[data-edit-advanced]")?.addEventListener("click", () => { setStep(0); q("#adv-requests").focus(); });
qa("[data-restart]").forEach((button) => button.addEventListener("click", () => {
  const kind = button.dataset.restart;
  if (kind === "quick") { q("#quick-form").reset(); q("[data-quick-results]").hidden = true; state.quick = null; }
  if (kind === "advanced") { q("#advanced-form").reset(); qa("select[name$='State']").forEach((select) => select.dispatchEvent(new Event("change"))); q("[data-advanced-results]").hidden = true; q("[data-pilot-panel]").hidden = true; state.advanced = null; setStep(0); }
  if (kind === "readiness") { state.assessmentIndex = 0; state.assessmentAnswers = {}; state.readiness = null; q("[data-readiness-results]").hidden = true; renderAssessment(); }
}));
