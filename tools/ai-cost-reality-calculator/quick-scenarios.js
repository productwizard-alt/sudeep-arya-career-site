export const QUICK_FIELDS = {
  baseline_verified: "benefit",
  baseline_cost: "cost",
  ai_attempts: "benefit",
  verified_rate: "rate",
  total_ai_cost: "cost",
  upfront: "cost",
};

export const SCENARIOS = ["conservative", "central", "favorable"];

export function resolveEvidenceInput(input, role) {
  const type = input.type || "estimate";
  const single = Number(input.value);
  if (type !== "range") {
    if (input.value === "" || input.value === null || input.value === undefined) throw new Error("Enter a value for every required quick input.");
    if (!Number.isFinite(single) || single < 0) throw new Error("Enter a value of zero or greater.");
    if (role === "rate" && single > 100) throw new Error("Verified outcome rate cannot exceed 100%.");
    return { conservative: single, central: single, favorable: single };
  }
  const low = Number(input.low);
  const high = Number(input.high);
  if (![low, high].every(Number.isFinite) || low < 0 || high < 0) throw new Error("Enter valid low and high values.");
  if (low > high) throw new Error("Low value must be less than or equal to high value.");
  if (role === "rate" && high > 100) throw new Error("Verified outcome rate cannot exceed 100%.");
  const midpoint = (low + high) / 2;
  const inverse = role === "cost" || role === "loss";
  return {
    conservative: inverse ? high : low,
    central: midpoint,
    favorable: inverse ? low : high,
  };
}

export function buildQuickScenarios(inputs) {
  const resolved = Object.fromEntries(Object.entries(QUICK_FIELDS).map(([name, role]) => [name, resolveEvidenceInput(inputs[name], role)]));
  return Object.fromEntries(SCENARIOS.map((scenario) => [scenario, Object.fromEntries(Object.entries(resolved).map(([name, values]) => [name, values[scenario]]))]));
}

export function evidenceForCore(type) {
  return type === "actual" ? "actual_reconciled" : "estimate";
}
