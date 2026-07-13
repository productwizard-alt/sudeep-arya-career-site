import { calculateBasicEstimate } from "./basic-calculator.js";

export const QUICK_MODEL_VERSION = "1.2.0";
export const PERIODS_PER_YEAR = Object.freeze({ monthly: 12, quarterly: 4, annual: 1 });

const metric = (value, status = "valid", reason = "") => ({ status, value, reason });
const finiteNonNegative = (value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;

export function periodLabel(period) {
  return ({ monthly: "Monthly", quarterly: "Quarterly", annual: "Annual" })[period] || "Annual";
}

export function calculatePilotRate(attempts, acceptedOutcomes) {
  if (!finiteNonNegative(attempts) || Number(attempts) <= 0) {
    return metric(null, "validation_error", "Pilot attempts must be greater than zero.");
  }
  if (!finiteNonNegative(acceptedOutcomes)) {
    return metric(null, "validation_error", "Accepted pilot outcomes must be zero or greater.");
  }
  if (Number(acceptedOutcomes) > Number(attempts)) {
    return metric(null, "validation_error", "Accepted pilot outcomes cannot exceed pilot attempts.");
  }
  return metric((Number(acceptedOutcomes) / Number(attempts)) * 100);
}

export function calculateQuickDecisionMetrics(input) {
  const period = input.period || "annual";
  if (!PERIODS_PER_YEAR[period]) {
    return { status: "validation_error", errors: ["Select a valid analysis period."] };
  }

  const basic = calculateBasicEstimate({
    annualOutcomes: input.currentOutcomes,
    currentAnnualCost: input.currentCost,
    aiAttempts: input.aiAttempts,
    successRate: input.successRate,
    annualAiCost: input.aiCost,
  });
  if (basic.status !== "valid") return basic;

  const currentCost = Number(input.currentCost);
  const currentOutcomes = Number(input.currentOutcomes);
  const successRate = Number(input.successRate) / 100;
  const periodsPerYear = PERIODS_PER_YEAR[period];
  const currentUnitCost = basic.currentCostPerSuccess.value;
  const aiAttemptCost = basic.aiCostPerAttempt.value;

  let breakEvenRate;
  if (currentUnitCost === 0) {
    breakEvenRate = metric(null, "not_calculable", "Current cost per accepted outcome is zero.");
  } else {
    const value = aiAttemptCost / currentUnitCost;
    breakEvenRate = value > 1
      ? metric(value, "not_achievable", "The required accepted-outcome rate exceeds 100%.")
      : metric(value);
  }

  const breakEvenMargin = breakEvenRate.value === null
    ? metric(null, "not_calculable", breakEvenRate.reason)
    : metric(successRate - breakEvenRate.value);

  const equivalentOutputAiCost = basic.aiCostPerSuccess.status === "valid"
    ? metric(currentOutcomes * basic.aiCostPerSuccess.value)
    : metric(null, "not_calculable", "No accepted AI outcomes are modeled.");
  const selectedPeriodSavings = equivalentOutputAiCost.status === "valid"
    ? metric(currentCost - equivalentOutputAiCost.value)
    : metric(null, "not_calculable", equivalentOutputAiCost.reason);
  const annualizedSavings = selectedPeriodSavings.status === "valid"
    ? metric(selectedPeriodSavings.value * periodsPerYear)
    : metric(null, "not_calculable", selectedPeriodSavings.reason);

  let decisionSignal = "More information required";
  if (breakEvenRate.status === "not_achievable") decisionSignal = "Break-even not achievable";
  else if (selectedPeriodSavings.status === "valid") {
    const tolerance = Math.max(0.01, Math.abs(currentCost) * 1e-9);
    if (Math.abs(selectedPeriodSavings.value) <= tolerance) decisionSignal = "Approximately break-even";
    else if (selectedPeriodSavings.value > 0) decisionSignal = "Modeled savings";
    else decisionSignal = "Modeled loss";
  }

  return {
    ...basic,
    modelVersion: QUICK_MODEL_VERSION,
    period,
    periodLabel: periodLabel(period),
    periodsPerYear,
    breakEvenRate,
    enteredSuccessRate: metric(successRate),
    breakEvenMargin,
    equivalentOutputAiCost,
    selectedPeriodSavings,
    annualizedSavings,
    decisionSignal,
  };
}
