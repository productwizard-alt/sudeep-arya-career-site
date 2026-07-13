export const FORMULA_VERSION = "1.0.0";
export const METHODOLOGY_VERSION = "STBO-CONTENT-OPS-1.0";

const OPTIONAL_COSTS = ["technology", "external", "implementation"];

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function invalidNumber(errors, key, value, { min = 0, max = Infinity, required = true } = {}) {
  if (!finite(value)) {
    if (required) errors.push({ field: key, message: "Enter a number." });
    return;
  }
  if (value < min || value > max) errors.push({ field: key, message: `Enter a value from ${min} to ${max === Infinity ? "a positive amount" : max}.` });
}

function safeDivide(numerator, denominator) {
  return finite(numerator) && finite(denominator) && denominator !== 0 ? numerator / denominator : null;
}

function clean(value) {
  return Object.is(value, -0) ? 0 : value;
}

export function calculateQuick(input) {
  const errors = [];
  invalidNumber(errors, "requests", input.requests);
  invalidNumber(errors, "deliverablesPerRequest", input.deliverablesPerRequest);
  invalidNumber(errors, "creationHours", input.creationHours);
  invalidNumber(errors, "reviewCorrectionHours", input.reviewCorrectionHours);
  invalidNumber(errors, "laborCost", input.laborCost);
  invalidNumber(errors, "finalApprovalRate", input.finalApprovalRate, { min: 0, max: 1 });
  if (errors.length) return { ok: false, errors };

  const attempted = input.requests * input.deliverablesPerRequest;
  const approved = attempted * input.finalApprovalRate;
  const unapproved = attempted - approved;
  const creationHours = attempted * input.creationHours;
  const reviewCorrectionHours = attempted * input.reviewCorrectionHours;
  const laborHours = creationHours + reviewCorrectionHours;
  const reviewCorrectionBurden = safeDivide(reviewCorrectionHours, laborHours);
  const laborCost = laborHours * input.laborCost;

  return {
    ok: true,
    formulaVersion: FORMULA_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    attempted,
    approved,
    unapproved,
    creationHours,
    reviewCorrectionHours,
    laborHours,
    reviewCorrectionBurden,
    modeledLaborCost: laborCost,
    laborCostPerAttempt: safeDivide(laborCost, attempted),
    laborCostPerApproved: safeDivide(laborCost, approved),
    approvedOutputState: approved === 0 ? "Not calculable — no approved deliverables" : "calculable",
  };
}

export function normalizeCostScope(costs = {}) {
  return Object.fromEntries(OPTIONAL_COSTS.map((key) => {
    const item = costs[key] || {};
    const state = ["included", "zero", "excluded"].includes(item.state) ? item.state : "excluded";
    return [key, { state, value: state === "included" && finite(item.value) ? item.value : 0 }];
  }));
}

export function costScopeDisclosure(costs = {}) {
  const normalized = normalizeCostScope(costs);
  const labels = { technology: "Technology", external: "External/agency/freelance", implementation: "Implementation" };
  return {
    included: OPTIONAL_COSTS.filter((key) => normalized[key].state === "included").map((key) => labels[key]),
    knownZero: OPTIONAL_COSTS.filter((key) => normalized[key].state === "zero").map((key) => labels[key]),
    excluded: OPTIONAL_COSTS.filter((key) => normalized[key].state === "excluded").map((key) => labels[key]),
  };
}

export function calculateAdvanced(input) {
  const errors = [];
  const numeric = [
    ["requests", input.requests], ["deliverablesPerRequest", input.deliverablesPerRequest],
    ["creationHours", input.creationHours], ["standardReviewHours", input.standardReviewHours],
    ["correctionHours", input.correctionHours], ["exceptionHours", input.exceptionHours],
    ["governanceHours", input.governanceHours], ["laborCost", input.laborCost],
    ["firstPassApprovalRate", input.firstPassApprovalRate, 1], ["finalApprovalRate", input.finalApprovalRate, 1],
    ["averageReviewRounds", input.averageReviewRounds], ["cycleTimeDays", input.cycleTimeDays],
  ];
  numeric.forEach(([key, value, max]) => invalidNumber(errors, key, value, { max: max ?? Infinity }));
  invalidNumber(errors, "availableHours", input.availableHours, { required: false });
  invalidNumber(errors, "specialistReviewRate", input.specialistReviewRate, { min: 0, max: 1, required: false });
  if (finite(input.firstPassApprovalRate) && finite(input.finalApprovalRate) && input.firstPassApprovalRate > input.finalApprovalRate) {
    errors.push({ field: "firstPassApprovalRate", message: "First-pass approval cannot exceed final approval." });
  }

  const scope = normalizeCostScope(input.costs);
  for (const key of OPTIONAL_COSTS) {
    if (scope[key].state === "included") invalidNumber(errors, `costs.${key}`, input.costs?.[key]?.value);
  }
  if (scope.implementation.state === "included") invalidNumber(errors, "amortizationMonths", input.amortizationMonths, { min: Number.EPSILON });
  if (errors.length) return { ok: false, errors };

  const attempted = input.requests * input.deliverablesPerRequest;
  const firstPassApproved = attempted * input.firstPassApprovalRate;
  const notApprovedFirstPass = attempted - firstPassApproved;
  const approvedAfterCorrection = attempted * (input.finalApprovalRate - input.firstPassApprovalRate);
  const failed = attempted * (1 - input.finalApprovalRate);
  const approved = firstPassApproved + approvedAfterCorrection;

  const creationHours = attempted * input.creationHours;
  const standardReviewHours = attempted * input.standardReviewHours;
  const correctionHours = attempted * input.correctionHours;
  const laborHours = creationHours + standardReviewHours + correctionHours + input.exceptionHours + input.governanceHours;
  const labor = {
    creation: creationHours,
    standardReview: standardReviewHours,
    correction: correctionHours,
    exception: input.exceptionHours,
    governance: input.governanceHours,
    total: laborHours,
    reviewBurden: safeDivide(standardReviewHours, laborHours),
    reworkBurden: safeDivide(correctionHours, laborHours),
    exceptionBurden: safeDivide(input.exceptionHours, laborHours),
    governanceBurden: safeDivide(input.governanceHours, laborHours),
  };

  const technologyCost = scope.technology.state === "included" ? scope.technology.value : 0;
  const externalCost = scope.external.state === "included" ? scope.external.value : 0;
  const implementationCost = scope.implementation.state === "included" ? scope.implementation.value / input.amortizationMonths : 0;
  const laborCost = laborHours * input.laborCost;
  const modeledCost = laborCost + technologyCost + externalCost + implementationCost;
  const variableLabor = input.creationHours + input.standardReviewHours + input.correctionHours;
  const availableAfterFixed = finite(input.availableHours) ? input.availableHours - input.exceptionHours - input.governanceHours : null;
  const attemptCapacity = availableAfterFixed === null || variableLabor === 0 ? null : availableAfterFixed / variableLabor;
  const approvedCapacity = attemptCapacity === null ? null : attemptCapacity * input.finalApprovalRate;
  const fixedCost = (input.exceptionHours + input.governanceHours) * input.laborCost + technologyCost + externalCost + implementationCost;
  const variableCostPerApproved = input.finalApprovalRate === 0 ? null : variableLabor * input.laborCost / input.finalApprovalRate;

  return {
    ok: true,
    formulaVersion: FORMULA_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    attempted,
    approved,
    funnel: { attempted, firstPassApproved, notApprovedFirstPass, approvedAfterCorrection, failed, approved },
    labor,
    costs: {
      labor: laborCost,
      technology: technologyCost,
      external: externalCost,
      amortizedImplementation: implementationCost,
      modeledAttributableWorkflowCost: modeledCost,
      perAttempt: safeDivide(modeledCost, attempted),
      perApproved: safeDivide(modeledCost, approved),
      fixed: fixedCost,
      variablePerApproved: variableCostPerApproved,
    },
    capacity: {
      availableAfterFixed,
      attemptCapacity,
      approvedCapacity,
      state: !finite(input.availableHours) ? "Unavailable — available team hours not entered" : variableLabor === 0 ? "Not calculable — variable labor is zero" : availableAfterFixed < 0 ? "Insufficient capacity — fixed monthly labor exceeds available hours" : "calculable",
    },
    scope,
    scopeDisclosure: costScopeDisclosure(scope),
    approvedOutputState: approved === 0 ? "Not calculable — no approved deliverables" : "calculable",
    inputs: structuredClone(input),
  };
}

function sameDefinitions(a = {}, b = {}) {
  return ["approval", "deliverable", "quality", "channel", "period"].every((key) => a[key] === true && b[key] === true);
}

export function sameCostScope(a, b) {
  const left = normalizeCostScope(a);
  const right = normalizeCostScope(b);
  const scopeState = (item) => item.state === "excluded" ? "excluded" : "in-scope";
  return OPTIONAL_COSTS.every((key) => scopeState(left[key]) === scopeState(right[key]));
}

export function calculateBreakEven(baseline, proposed) {
  if (!baseline?.ok || !proposed?.ok || baseline.costs.variablePerApproved === null || proposed.costs.variablePerApproved === null) {
    return { state: "Not calculable", volume: null };
  }
  const fixedDelta = proposed.costs.fixed - baseline.costs.fixed;
  const variableAdvantage = baseline.costs.variablePerApproved - proposed.costs.variablePerApproved;
  if (Math.abs(variableAdvantage) < 1e-9) {
    if (Math.abs(fixedDelta) < 1e-9) return { state: "Equivalent variable economics", volume: null };
    return { state: fixedDelta < 0 ? "Proposed workflow lower-cost at all positive volumes" : "Baseline workflow lower-cost at all positive volumes", volume: null };
  }
  const volume = fixedDelta / variableAdvantage;
  if (volume <= 0) {
    const proposedLower = proposed.costs.fixed <= baseline.costs.fixed && proposed.costs.variablePerApproved < baseline.costs.variablePerApproved;
    const baselineLower = baseline.costs.fixed <= proposed.costs.fixed && baseline.costs.variablePerApproved < proposed.costs.variablePerApproved;
    return { state: proposedLower ? "Proposed workflow lower-cost at all positive volumes" : baselineLower ? "Baseline workflow lower-cost at all positive volumes" : "No modeled break-even", volume: null };
  }
  return { state: variableAdvantage > 0 ? "Proposed becomes lower-cost above the crossover" : "Proposed becomes higher-cost above the crossover", volume };
}

export function sensitivityCheck(input) {
  const original = calculateAdvanced(input);
  if (!original.ok || original.costs.perApproved === null || original.costs.perApproved === 0) return null;
  const candidates = ["requests", "deliverablesPerRequest", "creationHours", "standardReviewHours", "correctionHours", "exceptionHours", "governanceHours", "laborCost", "firstPassApprovalRate", "finalApprovalRate"];
  let winner = null;
  for (const key of candidates) {
    if (!finite(input[key]) || input[key] === 0) continue;
    for (const factor of [0.9, 1.1]) {
      const changed = structuredClone(input);
      changed[key] = input[key] * factor;
      if (key.endsWith("Rate")) changed[key] = Math.min(1, Math.max(0, changed[key]));
      if (changed.firstPassApprovalRate > changed.finalApprovalRate) continue;
      const result = calculateAdvanced(changed);
      if (!result.ok || result.costs.perApproved === null) continue;
      const movement = Math.abs((result.costs.perApproved - original.costs.perApproved) / original.costs.perApproved);
      if (!winner || movement > winner.movement) winner = { input: key, movement, direction: factor > 1 ? "+10%" : "−10%" };
    }
  }
  return winner;
}

export function compareScenarios(baseline, proposed, definitions = {}) {
  if (!baseline?.ok || !proposed?.ok) return { ok: false, reason: "Not calculable — one or both scenarios are invalid" };
  const definitionsComparable = sameDefinitions(definitions.baseline, definitions.proposed);
  const scopeComparable = sameCostScope(baseline.scope, proposed.scope);
  const operationalComparable = definitionsComparable;
  const financialComparable = definitionsComparable && scopeComparable;
  const equivalentAttempts = proposed.inputs.finalApprovalRate === 0 ? null : baseline.approved / proposed.inputs.finalApprovalRate;
  const equivalentLabor = equivalentAttempts === null ? null : equivalentAttempts * (proposed.inputs.creationHours + proposed.inputs.standardReviewHours + proposed.inputs.correctionHours) + proposed.inputs.exceptionHours + proposed.inputs.governanceHours;
  const potentialCapacityReleased = equivalentLabor === null ? null : baseline.labor.total - equivalentLabor;
  return {
    ok: true,
    operationalComparable,
    financialComparable,
    reason: !definitionsComparable ? "Not comparable — approval or deliverable definitions differ" : !scopeComparable ? "Financial comparison not comparable — cost-category scope differs" : "Comparable",
    deltas: operationalComparable ? {
      approved: clean(proposed.approved - baseline.approved),
      standardReviewHours: clean(proposed.labor.standardReview - baseline.labor.standardReview),
      correctionHours: clean(proposed.labor.correction - baseline.labor.correction),
      exceptionHours: clean(proposed.labor.exception - baseline.labor.exception),
      laborHours: clean(proposed.labor.total - baseline.labor.total),
      modeledCost: financialComparable ? clean(proposed.costs.modeledAttributableWorkflowCost - baseline.costs.modeledAttributableWorkflowCost) : null,
      costPerApproved: financialComparable && baseline.costs.perApproved !== null && proposed.costs.perApproved !== null ? clean(proposed.costs.perApproved - baseline.costs.perApproved) : null,
    } : null,
    potentialCapacityReleased,
    capacityLabel: potentialCapacityReleased !== null && potentialCapacityReleased < 0 ? "Additional modeled hours required" : "Potential capacity available for reassignment",
    breakEven: financialComparable ? calculateBreakEven(baseline, proposed) : { state: "Not calculable", volume: null },
    sensitivity: sensitivityCheck(proposed.inputs),
  };
}
