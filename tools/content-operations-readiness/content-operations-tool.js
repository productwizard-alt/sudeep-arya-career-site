const snapshotForm = document.querySelector("#snapshot-form");
const controlForm = document.querySelector("#control-form");
const emptyState = document.querySelector("[data-empty-state]");
const resultState = document.querySelector("[data-result]");
const liveStatus = document.querySelector("[data-live-status]");
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const state = { baseline: null, recommendation: null };

const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
const numeric = (data, name) => {
  const raw = data.get(name);
  return raw === null || String(raw).trim() === "" ? undefined : Number(raw);
};

const RECOMMENDATIONS = {
  truth: {
    title: "Establish product and claim truth",
    explanation: "The workflow cannot become more reliable while product facts or claims lack one approved source.",
    now: "Name one owned record for facts, claims, qualifiers, and source evidence.",
    test: "Run one deliverable using only that approved record and route conflicts to its owner.",
    measure: ["Approved outputs", "Source conflicts", "Correction hours"],
    note: "Evaluate PIM capability only if repeated cross-channel product complexity continues after approved truth is established."
  },
  ownership: {
    title: "Clarify approval ownership",
    explanation: "Work will continue to circulate when nobody is clearly authorized to approve, correct, escalate, or stop it.",
    now: "Name the final approver, backup approver, and exception owner for this workflow.",
    test: "Route the next five deliverables through the same visible approval path.",
    measure: ["Approval time", "Correction rounds", "Unresolved outputs"]
  },
  workflow: {
    title: "Map one repeatable workflow",
    explanation: "Document the real request-to-approval path before optimizing or automating it.",
    now: "Record the owner, input, output, decision, and exception route for each step.",
    test: "Remove one avoidable handoff from the next repeated cycle.",
    measure: ["Cycle time", "Handoffs", "Review/correction hours"]
  },
  asset: {
    title: "Fix asset control",
    explanation: "Content work stays exposed to rework when the current approved asset, version, rights, or intended use is unclear.",
    now: "Create one visible approved-asset record with owner, version, rights, and status.",
    test: "Run the next workflow cycle from the governed asset set only.",
    measure: ["Asset search time", "Version errors", "Correction hours"],
    note: "Evaluate DAM capability only if version, rights, and distribution complexity continues after asset control is established."
  },
  approval: {
    title: "Reduce approval loss before adding AI",
    explanation: "All four controls are present, but too much attempted work still fails to become approved output.",
    now: "Review the most common reasons work is corrected, abandoned, or left unresolved.",
    test: "Change one brief, source, or approval rule that addresses the largest recurring loss.",
    measure: ["Final approval rate", "Unapproved outputs", "Correction hours"]
  },
  ai: {
    title: "Test one controlled AI-assisted step",
    explanation: "The workflow has its core controls, approval is stable, and review/correction work remains material enough to test one bounded assistive step.",
    now: "Choose one reversible preparation task and define approved inputs, human decisions, and stop conditions.",
    test: "Compare a small assisted sample with the current workflow using the same approval definition.",
    measure: ["Approved outputs", "Review/correction share", "Quality exceptions"]
  },
  simple: {
    title: "Keep the workflow simple",
    explanation: "The available evidence does not justify a larger system or AI intervention. Maintain clear ownership and improve only where repeated friction is visible.",
    now: "Keep one approved source, one visible workflow, and one accountable approver.",
    test: "Remove the smallest repeated delay or correction loop you can observe.",
    measure: ["Approved outputs", "Review/correction hours", "Unresolved outputs"]
  }
};

function readInputs() {
  const data = new FormData(snapshotForm);
  return {
    workflow: String(data.get("workflowType") || ""),
    attempted: numeric(data, "attempted"),
    creationHours: numeric(data, "creationHours"),
    reviewHours: numeric(data, "reviewHours"),
    approvalRatePercent: numeric(data, "approvalRate"),
    laborCost: numeric(data, "laborCost")
  };
}

function validate(inputs) {
  const errors = {};
  for (const key of ["attempted", "creationHours", "reviewHours"]) {
    if (inputs[key] === undefined) errors[key] = "Enter a value.";
    else if (!Number.isFinite(inputs[key]) || inputs[key] < 0) errors[key] = "Enter zero or a positive number.";
  }
  if (inputs.approvalRatePercent === undefined) errors.approvalRate = "Enter a percentage.";
  else if (!Number.isFinite(inputs.approvalRatePercent) || inputs.approvalRatePercent < 0 || inputs.approvalRatePercent > 100) errors.approvalRate = "Enter a percentage from 0 to 100.";
  if (inputs.laborCost !== undefined && (!Number.isFinite(inputs.laborCost) || inputs.laborCost < 0)) errors.laborCost = "Enter zero or a positive number.";
  return errors;
}

function showErrors(errors) {
  const nameMap = { attempted: "attempted", creationHours: "creationHours", reviewHours: "reviewHours", approvalRate: "approvalRate", laborCost: "laborCost" };
  for (const [key, name] of Object.entries(nameMap)) {
    const input = q(`[name="${name}"]`, snapshotForm);
    const error = q(`[data-error-for="${key}"]`);
    const hasValue = input?.value.trim() !== "";
    const message = errors[key] && hasValue ? errors[key] : "";
    if (error) error.textContent = message;
    if (input) input.setAttribute("aria-invalid", String(Boolean(message)));
  }
}

function calculate(inputs) {
  const attempted = inputs.attempted;
  const approvalRate = inputs.approvalRatePercent / 100;
  const approved = attempted * approvalRate;
  const unapproved = attempted - approved;
  const creationHours = attempted * inputs.creationHours;
  const reviewHours = attempted * inputs.reviewHours;
  const totalHours = creationHours + reviewHours;
  const reviewShare = totalHours > 0 ? reviewHours / totalHours : null;
  const laborCost = inputs.laborCost === undefined ? null : totalHours * inputs.laborCost;
  const costPerApproved = laborCost === null || approved <= 0 ? null : laborCost / approved;
  return { inputs, attempted, approvalRate, approved, unapproved, creationHours, reviewHours, totalHours, reviewShare, laborCost, costPerApproved };
}

function readControls() {
  const data = new FormData(controlForm);
  return Object.fromEntries(["productTruth", "approvalOwner", "assetControl", "workflowDocumented"].map((key) => [key, data.get(key)]));
}

function selectRecommendation(baseline) {
  const controls = readControls();
  const isGap = (value) => value === "no" || value === "unsure";
  if (isGap(controls.productTruth)) return RECOMMENDATIONS.truth;
  if (isGap(controls.approvalOwner)) return RECOMMENDATIONS.ownership;
  if (isGap(controls.workflowDocumented)) return RECOMMENDATIONS.workflow;
  if (isGap(controls.assetControl)) return RECOMMENDATIONS.asset;
  const allYes = Object.values(controls).every((value) => value === "yes");
  if (allYes && baseline.approvalRate < .8) return RECOMMENDATIONS.approval;
  if (allYes && baseline.approvalRate >= .8 && baseline.reviewShare !== null && baseline.reviewShare >= .25) return RECOMMENDATIONS.ai;
  return RECOMMENDATIONS.simple;
}

function renderRecommendation(recommendation) {
  state.recommendation = recommendation;
  q("[data-recommendation-title]").textContent = recommendation.title;
  q("[data-recommendation-explanation]").textContent = recommendation.explanation;
  q("[data-do-now]").textContent = recommendation.now;
  q("[data-test-next]").textContent = recommendation.test;
  q("[data-measure]").innerHTML = recommendation.measure.map((item) => `<li>${item}</li>`).join("");
  const note = q("[data-recommendation-note]");
  note.hidden = !recommendation.note;
  note.textContent = recommendation.note || "";
}

function renderBaseline(baseline) {
  state.baseline = baseline;
  emptyState.hidden = true;
  resultState.hidden = false;
  q("[data-workflow-label]").textContent = baseline.inputs.workflow || "Content workflow";
  q("[data-approved]").textContent = number.format(baseline.approved);
  q("[data-unapproved]").textContent = number.format(baseline.unapproved);
  q("[data-review-hours]").textContent = number.format(baseline.reviewHours);
  q("[data-review-share]").textContent = baseline.reviewShare === null ? "Not calculable" : percent.format(baseline.reviewShare);
  const costMetric = q("[data-cost-metric]");
  costMetric.hidden = baseline.inputs.laborCost === undefined;
  if (!costMetric.hidden) q("[data-cost-per-approved]").textContent = baseline.costPerApproved === null ? "Not calculable — no approved outputs" : money.format(baseline.costPerApproved);
  q("[data-qualification]").textContent = baseline.approved <= 0
    ? "Zero approved output makes cost per approved output explicitly not calculable. No value is converted to infinity."
    : "Directional model based only on the values entered. It is not an industry benchmark or a realized financial result.";
  renderRecommendation(selectRecommendation(baseline));
  resultState.classList.remove("is-updated");
  requestAnimationFrame(() => resultState.classList.add("is-updated"));
  liveStatus.textContent = "Workflow baseline and recommendation updated.";
}

function update() {
  const inputs = readInputs();
  const errors = validate(inputs);
  showErrors(errors);
  if (Object.keys(errors).length) {
    state.baseline = null;
    state.recommendation = null;
    emptyState.hidden = false;
    resultState.hidden = true;
    return;
  }
  renderBaseline(calculate(inputs));
}

snapshotForm?.addEventListener("input", update);
snapshotForm?.addEventListener("change", update);
controlForm?.addEventListener("change", () => { if (state.baseline) renderRecommendation(selectRecommendation(state.baseline)); });

q("[data-load-sample]")?.addEventListener("click", () => {
  const sample = { workflowType: "Product detail pages", attempted: 80, creationHours: 1.2, reviewHours: .5, approvalRate: 75, laborCost: 60 };
  for (const [name, value] of Object.entries(sample)) q(`[name="${name}"]`, snapshotForm).value = value;
  update();
  liveStatus.textContent = "Hypothetical sample loaded. Baseline and recommendation updated.";
});

function resetSnapshot() {
  snapshotForm.reset();
  controlForm.reset();
  q(".snapshot-controls")?.removeAttribute("open");
  state.baseline = null;
  state.recommendation = null;
  emptyState.hidden = false;
  resultState.hidden = true;
  qa("[data-error-for]").forEach((node) => { node.textContent = ""; });
  qa("[aria-invalid]", snapshotForm).forEach((node) => node.setAttribute("aria-invalid", "false"));
  liveStatus.textContent = "Snapshot reset.";
}

q("[data-reset]")?.addEventListener("click", resetSnapshot);
snapshotForm?.addEventListener("reset", () => setTimeout(() => {
  if (state.baseline) resetSnapshot();
  else { emptyState.hidden = false; resultState.hidden = true; }
}, 0));
q("[data-print]")?.addEventListener("click", () => window.print());

function summaryText() {
  if (!state.baseline || !state.recommendation) return "";
  const b = state.baseline;
  return [
    "Content Workflow Snapshot",
    `Workflow: ${b.inputs.workflow || "Not specified"}`,
    `Approved outputs per month: ${number.format(b.approved)}`,
    `Unapproved or unresolved outputs: ${number.format(b.unapproved)}`,
    `Monthly review/correction hours: ${number.format(b.reviewHours)}`,
    `Review/correction share: ${b.reviewShare === null ? "Not calculable" : percent.format(b.reviewShare)}`,
    ...(b.inputs.laborCost === undefined ? [] : [`Labor cost per approved output: ${b.costPerApproved === null ? "Not calculable — no approved outputs" : money.format(b.costPerApproved)}`]),
    `Recommendation: ${state.recommendation.title}`,
    `Do now: ${state.recommendation.now}`,
    `Test next: ${state.recommendation.test}`,
    `Measure: ${state.recommendation.measure.join("; ")}`,
    "Directional model based only on entered values. Not an industry benchmark or realized financial result."
  ].join("\n");
}

q("[data-copy]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(summaryText());
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = "Copy result"; }, 1400);
  } catch {
    liveStatus.textContent = "Copy was unavailable. Use Print / Save as PDF or download the local CSV.";
  }
});

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
q("[data-csv]")?.addEventListener("click", () => {
  if (!state.baseline || !state.recommendation) return;
  const b = state.baseline;
  const rows = [
    ["Metric", "Value"],
    ["Workflow", b.inputs.workflow || "Not specified"],
    ["Monthly attempted deliverables", b.attempted],
    ["Approved outputs per month", b.approved],
    ["Unapproved or unresolved outputs", b.unapproved],
    ["Monthly review/correction hours", b.reviewHours],
    ["Review/correction share", b.reviewShare === null ? "Not calculable" : b.reviewShare],
    ...(b.inputs.laborCost === undefined ? [] : [["Labor cost per approved output", b.costPerApproved === null ? "Not calculable" : b.costPerApproved]]),
    ["Recommendation", state.recommendation.title],
    ["Do now", state.recommendation.now],
    ["Test next", state.recommendation.test],
    ["Measure", state.recommendation.measure.join("; ")]
  ];
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: "content-workflow-snapshot.csv" });
  link.click();
  URL.revokeObjectURL(url);
});
