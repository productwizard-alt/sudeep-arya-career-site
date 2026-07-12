import { FORMULA_VERSION, result, validateExpectedLossEvents, validateOutcomeCounts } from "../../../tools/ai-cost-reality-calculator/calculator-core.js";

const numeric = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

export function validateClosedPeriod({ periodClosed, attempts, firstPass, reviewedPass, corrected, failed, unresolved }) {
  return validateOutcomeCounts({ periodClosed, attempts, firstPass, reviewedPass, corrected, failed, unresolved });
}

export function validateComparison(baselineDefinition, aiDefinition) {
  if (String(baselineDefinition || "").trim() !== String(aiDefinition || "").trim()) {
    return result("not_comparable", null, "outcome_definition_mismatch");
  }
  return result("valid", true);
}

export function validateCalculation(data) {
  const errors = [];
  if (data?.metadata?.formula_version !== FORMULA_VERSION) errors.push("Formula version must be 1.1.0.");
  if (!/^[A-Z]{3}$/.test(data?.metadata?.currency || "")) errors.push("Currency must use a three-letter ISO code.");
  if (!String(data?.metadata?.outcome_definition || "").trim()) errors.push("Define the verified outcome.");
  const requiredNumbers = [
    ["Baseline verified outcomes", data?.baseline?.verified_outcomes],
    ["Baseline process cost", data?.baseline?.process_cost],
    ["AI attempts", data?.ai?.attempts],
    ["Direct model and platform cost", data?.ai?.direct_model_platform_cost],
    ["Upfront implementation cost", data?.tco?.upfront],
    ["Useful life", data?.tco?.useful_life_years],
    ["Hard annual benefit", data?.benefits?.hard_annual_benefit],
    ["Expected annual loss", data?.risk?.expected_annual_loss],
    ["Discount rate", data?.finance?.discount_rate],
    ["Horizon", data?.finance?.horizon_years],
  ];
  requiredNumbers.forEach(([label, value]) => { if (!numeric(value)) errors.push(`${label} must be zero or greater.`); });
  if (Number(data?.finance?.discount_rate) > 1) errors.push("Discount rate must be entered as a decimal fraction no greater than 1.");
  if (Number(data?.finance?.horizon_years) < 1 || Number(data?.finance?.horizon_years) > 10) errors.push("Horizon must be between 1 and 10 years.");

  const ai = data?.ai || {};
  const detailed = ["first_pass_verified", "reviewed_pass", "corrected_verified", "failed", "unresolved"].some((key) => ai[key] !== undefined && ai[key] !== "");
  if (!detailed && (!numeric(ai.verified_rate) || Number(ai.verified_rate) > 1)) errors.push("Verified outcome rate must be between 0 and 100 percent.");
  if (detailed) {
    const reconciliation = validateClosedPeriod({
      periodClosed: data.metadata.period_closed,
      attempts: ai.attempts,
      firstPass: ai.first_pass_verified,
      reviewedPass: ai.reviewed_pass,
      corrected: ai.corrected_verified,
      failed: ai.failed,
      unresolved: ai.unresolved,
    });
    if (reconciliation.status === "validation_error") errors.push("Detailed outcome counts must reconcile to total attempts for a closed period.");
  }

  if (validateExpectedLossEvents(data?.risk?.events || []).status !== "valid") errors.push("A risk event already included in observed TCO cannot also enter expected loss.");
  return errors.length ? { ...result("validation_error", null, "input_validation_failed"), errors } : result("valid", true);
}

export function validateImportedCalculation(data) {
  if (!data || typeof data !== "object") return { ...result("validation_error", null, "invalid_json_object"), errors: ["The imported file must contain a calculation object."] };
  return validateCalculation(data);
}
