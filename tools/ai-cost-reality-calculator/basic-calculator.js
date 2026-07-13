const validNumber = (value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;
const metric = (value, status = "valid", reason = "") => ({ status, value, reason });

export function calculateBasicEstimate(input) {
  const values = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Number(value)]));
  const required = ["annualOutcomes", "currentAnnualCost", "aiAttempts", "successRate", "annualAiCost"];
  const invalid = required.filter((key) => !validNumber(input[key]));
  if (invalid.length) return { status: "validation_error", errors: invalid.map((key) => `${key} must be zero or greater.`) };
  if (values.annualOutcomes <= 0) return { status: "validation_error", errors: ["Annual outcomes completed today must be greater than zero."] };
  if (values.aiAttempts <= 0) return { status: "validation_error", errors: ["Expected AI-assisted attempts must be greater than zero."] };
  if (values.successRate > 100) return { status: "validation_error", errors: ["Expected success rate cannot exceed 100%."] };

  const successRate = values.successRate / 100;
  const successfulAiOutcomes = values.aiAttempts * successRate;
  const failedAttempts = values.aiAttempts - successfulAiOutcomes;
  const currentCostPerSuccess = values.currentAnnualCost / values.annualOutcomes;
  const aiCostPerAttempt = values.annualAiCost / values.aiAttempts;
  const aiCostPerSuccess = successfulAiOutcomes > 0
    ? metric(values.annualAiCost / successfulAiOutcomes)
    : metric(null, "not_calculable", "no_successful_ai_outcomes");
  const annualFailureCost = aiCostPerAttempt * failedAttempts;

  let signal;
  if (aiCostPerSuccess.status !== "valid") signal = "No successful AI outcomes under this estimate";
  else if (Math.abs(aiCostPerSuccess.value - currentCostPerSuccess) < 1e-9) signal = "Cost per success is approximately the same";
  else if (aiCostPerSuccess.value < currentCostPerSuccess) signal = "Lower cost per success under this estimate";
  else signal = "Higher cost per success under this estimate";

  return {
    status: "valid",
    currentCostPerSuccess: metric(currentCostPerSuccess),
    aiCostPerAttempt: metric(aiCostPerAttempt),
    aiCostPerSuccess,
    successfulAiOutcomes: metric(successfulAiOutcomes),
    failedAttempts: metric(failedAttempts),
    annualFailureCost: metric(annualFailureCost),
    signal,
  };
}
