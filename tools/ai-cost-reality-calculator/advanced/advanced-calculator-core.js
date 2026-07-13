import { calculateQuickDecisionMetrics, calculatePilotRate, PERIODS_PER_YEAR, periodLabel } from "../quick-decision-metrics.js";

export const ADVANCED_MODEL_VERSION = "1.0.0";
const metric = (value, status = "valid", reason = "") => ({ status, value, reason });
const present = (value) => value !== "" && value !== null && value !== undefined;
const number = (value) => present(value) ? Number(value) : 0;
const validNonNegative = (value) => !present(value) || (Number.isFinite(Number(value)) && Number(value) >= 0);

export function buildCurrentCost(input = {}) {
  const labor = number(input.laborHours) * number(input.loadedHourlyCost);
  return labor + number(input.agencyCost) + number(input.softwareCost) + number(input.reworkCost) + number(input.otherCost);
}

export function calculateReviewCost({ aiAttempts, reviewRate, reviewMinutes, reviewHourlyCost }) {
  return number(aiAttempts) * (number(reviewRate) / 100) * (number(reviewMinutes) / 60) * number(reviewHourlyCost);
}

export function buildAiCost(input = {}, period = "annual", aiAttempts = 0) {
  const periodsPerYear = PERIODS_PER_YEAR[period];
  const implementationCost = number(input.implementationCost);
  const amortizationYears = number(input.amortizationYears);
  const annualizedImplementation = implementationCost > 0 && amortizationYears > 0 ? implementationCost / amortizationYears : 0;
  const allocatedImplementation = annualizedImplementation / periodsPerYear;
  const reviewCost = input.reviewMethod === "calculated"
    ? calculateReviewCost({ aiAttempts, reviewRate: input.reviewRate, reviewMinutes: input.reviewMinutes, reviewHourlyCost: input.reviewHourlyCost })
    : number(input.knownReviewCost);
  const technologyCost = number(input.technologyCost);
  const otherOperatingCost = number(input.otherOperatingCost);
  return {
    technologyCost,
    annualizedImplementation,
    allocatedImplementation,
    reviewCost,
    otherOperatingCost,
    total: technologyCost + allocatedImplementation + reviewCost + otherOperatingCost,
  };
}

export function calculateAdvancedEstimate(input = {}) {
  const errors = [];
  const period = input.period || "annual";
  if (!PERIODS_PER_YEAR[period]) errors.push({ field: "advanced-period", message: "Select a valid analysis period." });

  const currentCostMethod = input.currentCostMethod === "builder" ? "builder" : "known";
  const aiCostMethod = input.aiCostMethod === "builder" ? "builder" : "known";
  const successMethod = input.successMethod === "pilot" ? "pilot" : "direct";
  const numericValues = [input.currentOutcomes, input.aiAttempts];
  const currentBuilderKeys = ["laborHours", "loadedHourlyCost", "agencyCost", "softwareCost", "reworkCost", "otherCost"];
  const aiBuilderKeys = ["technologyCost", "implementationCost", "amortizationYears", "knownReviewCost", "reviewRate", "reviewMinutes", "reviewHourlyCost", "otherOperatingCost"];
  if (currentCostMethod === "builder") for (const key of currentBuilderKeys) numericValues.push(input.currentCostBuilder?.[key]);
  else numericValues.push(input.knownCurrentCost);
  if (successMethod === "pilot") numericValues.push(input.pilotAttempts, input.pilotAccepted);
  else numericValues.push(input.successRate);
  if (aiCostMethod === "builder") {
    for (const key of aiBuilderKeys.filter((key) => !["knownReviewCost", "reviewRate", "reviewMinutes", "reviewHourlyCost"].includes(key))) numericValues.push(input.aiCostBuilder?.[key]);
    if (input.aiCostBuilder?.reviewMethod === "calculated") numericValues.push(input.aiCostBuilder?.reviewRate, input.aiCostBuilder?.reviewMinutes, input.aiCostBuilder?.reviewHourlyCost);
    else numericValues.push(input.aiCostBuilder?.knownReviewCost);
  } else numericValues.push(input.knownAiCost);
  if (numericValues.some((value) => !validNonNegative(value))) errors.push({ field: "advanced-error-summary", message: "Costs, volumes, rates, and time values cannot be negative." });

  if (!present(input.currentOutcomes) || number(input.currentOutcomes) <= 0) errors.push({ field: "advanced-current-outcomes", message: "Accepted current-process outcomes must be greater than zero." });
  if (!present(input.aiAttempts) || number(input.aiAttempts) <= 0) errors.push({ field: "advanced-ai-attempts", message: "Expected AI-assisted attempts must be greater than zero." });

  let successRate = number(input.successRate);
  let successRateSource = "Entered directly";
  if (input.successMethod === "pilot") {
    const pilot = calculatePilotRate(input.pilotAttempts, input.pilotAccepted);
    if (pilot.status !== "valid") errors.push({ field: "advanced-pilot-attempts", message: pilot.reason });
    else successRate = pilot.value;
    successRateSource = "Derived from pilot sample";
  } else if (!present(input.successRate)) {
    errors.push({ field: "advanced-success-rate", message: "Enter an accepted-outcome rate." });
  }
  if (successRate > 100) errors.push({ field: "advanced-success-rate", message: "Accepted-outcome rate cannot exceed 100%." });

  const currentCost = currentCostMethod === "builder" ? buildCurrentCost(input.currentCostBuilder) : number(input.knownCurrentCost);
  if (currentCostMethod === "known" && !present(input.knownCurrentCost)) errors.push({ field: "advanced-known-current-cost", message: "Enter the known current-process cost or use the current-cost builder." });

  let composition = null;
  let aiCost;
  if (aiCostMethod === "builder") {
    if (!present(input.aiCostBuilder?.technologyCost)) errors.push({ field: "advanced-technology-cost", message: "Enter model, platform, and software cost in the AI cost builder." });
    const implementationCost = number(input.aiCostBuilder?.implementationCost);
    const years = number(input.aiCostBuilder?.amortizationYears);
    if (implementationCost > 0 && !present(input.aiCostBuilder?.amortizationYears)) errors.push({ field: "advanced-amortization-years", message: "Enter a 1–10 year useful life for the implementation cost." });
    if (present(input.aiCostBuilder?.amortizationYears) && (years < 1 || years > 10)) errors.push({ field: "advanced-amortization-years", message: "Amortization period must be between 1 and 10 years." });
    if (input.aiCostBuilder?.reviewMethod === "calculated" && number(input.aiCostBuilder?.reviewRate) > 100) errors.push({ field: "advanced-review-rate", message: "Review percentage cannot exceed 100%." });
    composition = buildAiCost(input.aiCostBuilder, period, number(input.aiAttempts));
    aiCost = composition.total;
  } else {
    aiCost = number(input.knownAiCost);
    if (!present(input.knownAiCost)) errors.push({ field: "advanced-known-ai-cost", message: "Enter the known AI-assisted cost or use the component builder." });
  }

  if (errors.length) return { status: "validation_error", errors };

  const shared = calculateQuickDecisionMetrics({ currentOutcomes: number(input.currentOutcomes), currentCost, aiAttempts: number(input.aiAttempts), successRate, aiCost, period });
  if (shared.status !== "valid") return { status: "validation_error", errors: shared.errors.map((message) => ({ field: "advanced-error-summary", message })) };

  const maximumBreakEvenAiCost = shared.currentCostPerSuccess.value * number(input.aiAttempts) * (successRate / 100);
  const costThresholdDifference = maximumBreakEvenAiCost - aiCost;
  const completenessNotes = [];
  if (aiCostMethod === "builder") {
    if (number(input.aiCostBuilder?.implementationCost) === 0) completenessNotes.push("This estimate excludes implementation cost because none was entered.");
    if (composition.reviewCost === 0) completenessNotes.push("Human-review cost is included as zero. Confirm whether review or correction work should be added.");
    if (number(input.aiCostBuilder?.otherOperatingCost) === 0) completenessNotes.push("Other AI operating cost is included as zero.");
  }

  return {
    ...shared,
    modelVersion: ADVANCED_MODEL_VERSION,
    periodLabel: periodLabel(period),
    currentCost,
    aiCost,
    currentCostMethod,
    aiCostMethod,
    successRateSource,
    composition,
    maximumBreakEvenAiCost: metric(maximumBreakEvenAiCost),
    costThresholdDifference: metric(costThresholdDifference),
    completenessNotes,
  };
}
