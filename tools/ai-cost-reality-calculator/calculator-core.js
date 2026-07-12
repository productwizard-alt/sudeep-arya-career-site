export const FORMULA_VERSION = "1.1.0";

export const result = (status, value = null, reason = "") => ({ status, value, reason });

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function safeDivide(numerator, denominator, reason = "denominator_zero") {
  const divisor = Number(denominator);
  if (!Number.isFinite(divisor) || divisor === 0) return result("not_calculable", null, reason);
  return result("valid", Number(numerator) / divisor);
}

export function validateOutcomeCounts({ periodClosed = true, attempts, firstPass = 0, reviewedPass = 0, corrected = 0, failed = 0, unresolved = 0 }) {
  const count = Number(attempts);
  const categories = [firstPass, reviewedPass, corrected, failed, unresolved].map(Number);
  if (![count, ...categories].every(Number.isFinite) || [count, ...categories].some((value) => value < 0)) {
    return result("validation_error", null, "outcome_counts_invalid");
  }
  const total = categories.reduce((sum, value) => sum + value, 0);
  const verified = Number(firstPass) + Number(reviewedPass) + Number(corrected);
  if (verified > count) return result("validation_error", null, "verified_outcomes_exceed_attempts");
  if (periodClosed && total !== count) return { ...result("validation_error", null, "attempt_categories_do_not_reconcile"), difference: count - total };
  if (!periodClosed && total > count) return { ...result("validation_error", null, "attempt_categories_exceed_attempts"), difference: count - total };
  return { ...result("valid", verified), difference: count - total };
}

export function unitCostImprovement({ baselineDefinition, aiDefinition, baselineUnitCost: baselineCost, aiUnitCost }) {
  if (String(baselineDefinition || "").trim() !== String(aiDefinition || "").trim()) {
    return result("not_comparable", null, "outcome_definition_mismatch");
  }
  if (Number(baselineCost) === 0) return result("not_calculable", null, "baseline_unit_cost_zero");
  return result("valid", (Number(baselineCost) - Number(aiUnitCost)) / Number(baselineCost));
}

export function validateExpectedLossEvents(events = []) {
  const duplicated = events.some((event) => event?.included_in_observed_tco && Number(event?.expected_loss) > 0);
  return duplicated
    ? result("validation_error", null, "expected_loss_already_in_observed_tco")
    : result("valid", events.reduce((sum, event) => sum + Number(event?.expected_loss || 0), 0));
}

export function evidenceState(hasRequiredEvidence) {
  return hasRequiredEvidence ? result("valid", true) : result("more_evidence_required", null, "required_operating_evidence_missing");
}

export function validateNonNegativeInputs(values = {}) {
  const invalid = Object.entries(values).filter(([, value]) => !Number.isFinite(Number(value)) || Number(value) < 0).map(([key]) => key);
  return invalid.length
    ? { ...result("validation_error", null, "negative_or_invalid_input"), fields: invalid }
    : result("valid", true);
}

export function humanReviewCost(outputsReviewed, averageReviewMinutes, loadedReviewerHourlyRate) {
  const validation = validateNonNegativeInputs({ outputsReviewed, averageReviewMinutes, loadedReviewerHourlyRate });
  if (validation.status !== "valid") return validation;
  return result("valid", Number(outputsReviewed) * Number(averageReviewMinutes) / 60 * Number(loadedReviewerHourlyRate));
}

export function humanReworkCost(outputsRequiringCorrection, averageCorrectionMinutes, loadedCorrectionHourlyRate, externalRemediationCost = 0) {
  const validation = validateNonNegativeInputs({ outputsRequiringCorrection, averageCorrectionMinutes, loadedCorrectionHourlyRate, externalRemediationCost });
  if (validation.status !== "valid") return validation;
  return result("valid", Number(outputsRequiringCorrection) * Number(averageCorrectionMinutes) / 60 * Number(loadedCorrectionHourlyRate) + Number(externalRemediationCost));
}

export function escalationCost(numberOfEscalations, averageLoadedCostPerEscalation) {
  const validation = validateNonNegativeInputs({ numberOfEscalations, averageLoadedCostPerEscalation });
  if (validation.status !== "valid") return validation;
  return result("valid", Number(numberOfEscalations) * Number(averageLoadedCostPerEscalation));
}

export function expectedLossForEvent({ annualExposures, probabilityOfEvent, averageFinancialImpact, annualProbability, financialImpact }) {
  const exposureModel = annualExposures !== undefined || probabilityOfEvent !== undefined || averageFinancialImpact !== undefined;
  const values = exposureModel ? { annualExposures, probabilityOfEvent, averageFinancialImpact } : { annualProbability, financialImpact };
  const validation = validateNonNegativeInputs(values);
  if (validation.status !== "valid") return validation;
  const probability = Number(exposureModel ? probabilityOfEvent : annualProbability);
  if (probability > 1) return result("validation_error", null, "probability_above_one");
  return result("valid", exposureModel ? Number(annualExposures) * probability * Number(averageFinancialImpact) : probability * Number(financialImpact));
}

export function evidenceCoverage(items = []) {
  const total = items.reduce((sum, item) => sum + Number(item?.value || 0), 0);
  if (total === 0) return result("not_calculable", null, "entered_value_zero");
  const measured = items.reduce((sum, item) => sum + (["actual_reconciled", "measured"].includes(item?.evidence) ? Number(item?.value || 0) : 0), 0);
  return result("valid", measured / total);
}

export const annualToMonthly = (annualValue) => result("valid", Number(annualValue) / 12);
export const monthlyToAnnual = (monthlyValue) => result("valid", Number(monthlyValue) * 12);

export function sumCostComponents(components = {}) {
  const validation = validateNonNegativeInputs(components);
  if (validation.status !== "valid") return validation;
  return result("valid", Object.values(components).reduce((sum, value) => sum + Number(value), 0));
}

export function evaluateDecisionGate(conditions = {}) {
  const required = ["comparableBaseline", "qualityAtOrAboveBaseline", "lowerCostPerVerifiedOutcome", "positiveRiskAdjustedNpv", "representativeProductionEvidence", "failureRecoveryTested", "specialistKnowledgeRetained", "namedAccountableOwner", "financeValidatedHardBenefits", "controlApprovalsComplete"];
  const met = required.filter((key) => conditions[key] === true).length;
  if (met === required.length) return result("valid", "replacement_economics_supportable_for_separate_leadership_review");
  if (!conditions.comparableBaseline || !conditions.qualityAtOrAboveBaseline || !conditions.lowerCostPerVerifiedOutcome) return result("more_evidence_required", "replacement_case_not_proven", "economic_or_quality_gate_not_met");
  if (conditions.positiveRiskAdjustedNpv && conditions.representativeProductionEvidence && conditions.failureRecoveryTested) return result("valid", "controlled_automation_expansion_supported");
  if (conditions.positiveRiskAdjustedNpv) return result("valid", "enhancement_case_supported");
  return result("more_evidence_required", "more_evidence_required", "required_operating_evidence_missing");
}

export function calculateScenarios(scenarios = {}) {
  return Object.fromEntries(["conservative", "operating_plan", "proven_case"].map((name) => {
    const scenario = scenarios[name];
    return [name, scenario ? calculateEconomics(structuredClone(scenario)) : result("more_evidence_required", null, "scenario_missing")];
  }));
}

export function baselineUnitCost(cost, verified) {
  return safeDivide(cost, verified, "baseline_verified_outcomes_zero");
}

export function costPerAttempt(tco, attempts) {
  return safeDivide(tco, attempts, "attempts_zero");
}

export function costPerVerified(tco, verified) {
  return safeDivide(tco, verified, "verified_outcomes_zero");
}

export function riskAdjustedRoi(hardBenefit, steadyStateTco, expectedLoss) {
  const denominator = finite(steadyStateTco) + finite(expectedLoss);
  return safeDivide(
    finite(hardBenefit) - finite(steadyStateTco) - finite(expectedLoss),
    denominator,
    "risk_adjusted_cost_zero"
  );
}

export function simplePayback(upfront, monthlyNetHardBenefit) {
  if (finite(monthlyNetHardBenefit) <= 0) return result("no_payback", null, "monthly_net_benefit_non_positive");
  return result("valid", finite(upfront) / finite(monthlyNetHardBenefit));
}

export function paybackFromCashFlows(initialInvestment, monthlyCashFlows = []) {
  let cumulative = -finite(initialInvestment);
  for (let index = 0; index < monthlyCashFlows.length; index += 1) {
    cumulative += finite(monthlyCashFlows[index]);
    if (cumulative >= 0) return result("valid", index + 1);
  }
  return result("no_payback", null, "no_payback_within_horizon");
}

export function breakEvenVolume(annualFixedAiCost, baselineVariableUnitCost, aiVariableUnitCost) {
  const contribution = finite(baselineVariableUnitCost) - finite(aiVariableUnitCost);
  if (contribution <= 0) return result("no_break_even", null, "unit_contribution_non_positive");
  return result("valid", finite(annualFixedAiCost) / contribution);
}

export function calculateNpv({ initialInvestment, annualBenefit, annualRecurringTco, annualExpectedLoss, discountRate, horizonYears, transitionByYear = [], exitByYear = [] }) {
  const rate = Number(discountRate);
  const horizon = Number(horizonYears);
  if (!Number.isFinite(rate) || rate < 0 || !Number.isInteger(horizon) || horizon < 1) {
    return result("validation_error", null, "invalid_discount_rate_or_horizon");
  }
  let value = -finite(initialInvestment);
  for (let year = 1; year <= horizon; year += 1) {
    const cashFlow = finite(annualBenefit)
      - finite(annualRecurringTco)
      - finite(annualExpectedLoss)
      - finite(transitionByYear[year - 1])
      - finite(exitByYear[year - 1]);
    value += cashFlow / ((1 + rate) ** year);
  }
  return result("valid", value);
}

export function cacheEconomics({ normalInputRate, writeAllInRate, cacheReadRate, repeatedTokens, reads }) {
  const inputRate = finite(normalInputRate);
  const writeRate = finite(writeAllInRate);
  const readRate = finite(cacheReadRate);
  const tokens = finite(repeatedTokens);
  const readCount = finite(reads);
  const noCacheCost = (readCount + 1) * tokens * inputRate;
  const cacheCost = tokens * writeRate + readCount * tokens * readRate;
  const breakEven = inputRate <= readRate
    ? result("no_break_even", null, "no_read_side_break_even")
    : result("valid", Math.ceil(Math.max(0, (writeRate - inputRate) / (inputRate - readRate))));
  return { noCacheCost, cacheCost, cacheSavings: noCacheCost - cacheCost, minimumWholeReads: breakEven };
}

export function calculateEconomics(input) {
  const baseline = input.baseline || {};
  const ai = input.ai || {};
  const tco = input.tco || {};
  const benefits = input.benefits || {};
  const risk = input.risk || {};
  const finance = input.finance || {};

  const attempts = finite(ai.attempts);
  const hasDetailedCounts = ["first_pass_verified", "reviewed_pass", "corrected_verified"].some((key) => ai[key] !== undefined && ai[key] !== "");
  const verifiedOutcomes = hasDetailedCounts
    ? finite(ai.first_pass_verified) + finite(ai.reviewed_pass) + finite(ai.corrected_verified)
    : attempts * finite(ai.verified_rate);

  const directAi = finite(ai.direct_model_platform_cost);
  const reviewCost = finite(tco.human_review);
  const reworkCost = finite(tco.rework_exception);
  const escalation = finite(tco.escalation);
  const otherRecurring = finite(tco.other_recurring);
  const recurringTco = directAi + reviewCost + reworkCost + escalation + otherRecurring;
  const usefulLife = finite(tco.useful_life_years);
  const annualizedImplementationMetric = usefulLife > 0
    ? result("valid", finite(tco.upfront) / usefulLife)
    : result("not_calculable", null, "useful_life_zero");
  const annualizedImplementation = annualizedImplementationMetric.status === "valid" ? annualizedImplementationMetric.value : null;
  const annualizedRefresh = finite(tco.refresh_annualized);
  const year1CashTco = finite(tco.upfront) + recurringTco + finite(tco.transition_year_1);
  const steadyStateAnnualTco = recurringTco + annualizedRefresh;
  const unitEconomicsTco = annualizedImplementation === null ? null : recurringTco + annualizedImplementation + annualizedRefresh;
  const componentHardBenefit = finite(benefits.realized_cash_savings) + finite(benefits.incremental_contribution_margin) + finite(benefits.finance_validated_cost_avoidance) + finite(benefits.measured_loss_avoided);
  const hardBenefit = benefits.hard_annual_benefit === undefined ? componentHardBenefit : finite(benefits.hard_annual_benefit);
  const expectedLoss = finite(risk.expected_annual_loss);
  const monthlyNetHardBenefit = (hardBenefit - recurringTco - expectedLoss) / 12;
  const calculatedCapacityHours = finite(benefits.baseline_hours_for_comparable_volume) - finite(benefits.review_hours) - finite(benefits.rework_hours) - finite(benefits.escalation_hours) - finite(benefits.maintenance_hours);
  const capacityHours = Math.max(0, benefits.capacity_hours === undefined ? calculatedCapacityHours : finite(benefits.capacity_hours));
  const grossCapacityValue = capacityHours * finite(benefits.loaded_hourly_rate);
  const capacityEquivalentFte = finite(benefits.productive_hours_per_fte) > 0 ? capacityHours / finite(benefits.productive_hours_per_fte) : null;

  const npv = calculateNpv({
    initialInvestment: tco.upfront,
    annualBenefit: hardBenefit,
    annualRecurringTco: recurringTco,
    annualExpectedLoss: expectedLoss,
    discountRate: finance.discount_rate,
    horizonYears: finance.horizon_years,
    transitionByYear: [finite(tco.transition_year_1)],
    exitByYear: Array.from({ length: finite(finance.horizon_years) }, (_, index) => index === finite(finance.horizon_years) - 1 ? finite(tco.exit_cost) : 0),
  });

  const comparisonFlags = ["outcome_definitions_match", "quality_thresholds_match", "periods_match", "scope_matches", "verification_windows_match", "volume_basis_matches"];
  const baselineComparable = comparisonFlags.every((key) => input.comparison?.[key] !== false);
  const fixedVariableComparable = Boolean(input.comparison?.fixed_variable_boundaries_match && baselineComparable);
  const breakEven = fixedVariableComparable
    ? breakEvenVolume(ai.annual_fixed_cost, baseline.variable_unit_cost, ai.variable_unit_cost)
    : result("not_comparable", null, "fixed_variable_or_outcome_boundary_mismatch");

  const aiCostPerVerified = unitEconomicsTco === null
    ? result("not_calculable", null, "useful_life_zero")
    : costPerVerified(unitEconomicsTco, verifiedOutcomes);
  const baselineCostPerVerified = baselineUnitCost(baseline.process_cost, baseline.verified_outcomes);
  const unitImprovement = baselineComparable && baselineCostPerVerified.status === "valid" && aiCostPerVerified.status === "valid"
    ? unitCostImprovement({ baselineDefinition: input.metadata?.outcome_definition, aiDefinition: input.metadata?.outcome_definition, baselineUnitCost: baselineCostPerVerified.value, aiUnitCost: aiCostPerVerified.value })
    : result("not_comparable", null, "comparison_boundary_mismatch");
  const costCoverage = evidenceCoverage([
    { value: directAi, evidence: ai.evidence },
    { value: reviewCost + reworkCost + escalation + otherRecurring, evidence: tco.evidence },
    { value: finite(tco.upfront), evidence: tco.evidence },
  ]);
  const benefitCoverage = evidenceCoverage([{ value: hardBenefit, evidence: benefits.evidence }]);
  const decisionGate = evaluateDecisionGate({
    comparableBaseline: baselineComparable,
    qualityAtOrAboveBaseline: Boolean(input.governance?.quality_at_or_above_baseline),
    lowerCostPerVerifiedOutcome: aiCostPerVerified.status === "valid" && baselineCostPerVerified.status === "valid" && aiCostPerVerified.value < baselineCostPerVerified.value,
    positiveRiskAdjustedNpv: npv.status === "valid" && npv.value > 0,
    representativeProductionEvidence: Boolean(input.governance?.representative_production_evidence),
    failureRecoveryTested: Boolean(input.governance?.failure_recovery_tested),
    specialistKnowledgeRetained: Boolean(input.governance?.specialist_knowledge_retained),
    namedAccountableOwner: Boolean(input.governance?.named_accountable_owner),
    financeValidatedHardBenefits: Boolean(input.governance?.finance_validated_hard_benefits),
    controlApprovalsComplete: Boolean(input.governance?.control_approvals_complete),
  });

  return {
    formulaVersion: FORMULA_VERSION,
    verifiedOutcomes,
    recurringTco,
    annualizedImplementation: annualizedImplementationMetric,
    year1CashTco: result("valid", year1CashTco),
    steadyStateAnnualTco: result("valid", steadyStateAnnualTco),
    unitEconomicsTco: unitEconomicsTco === null ? result("not_calculable", null, "useful_life_zero") : result("valid", unitEconomicsTco),
    baselineUnitCost: baselineCostPerVerified,
    aiCostPerAttempt: unitEconomicsTco === null ? result("not_calculable", null, "useful_life_zero") : costPerAttempt(unitEconomicsTco, attempts),
    aiCostPerVerified,
    riskAdjustedCostPerVerified: unitEconomicsTco === null ? result("not_calculable", null, "useful_life_zero") : costPerVerified(unitEconomicsTco + expectedLoss, verifiedOutcomes),
    unitCostImprovement: unitImprovement,
    hardRoi: safeDivide(hardBenefit - steadyStateAnnualTco, steadyStateAnnualTco, "steady_state_tco_zero"),
    riskAdjustedRoi: riskAdjustedRoi(hardBenefit, steadyStateAnnualTco, expectedLoss),
    netAnnualHardValue: result("valid", hardBenefit - steadyStateAnnualTco),
    riskAdjustedNetAnnualValue: result("valid", hardBenefit - steadyStateAnnualTco - expectedLoss),
    payback: simplePayback(tco.upfront, monthlyNetHardBenefit),
    npv,
    breakEven,
    firstPassYield: hasDetailedCounts ? safeDivide(ai.first_pass_verified, attempts, "attempts_zero") : result("not_calculable", null, "detailed_counts_not_entered"),
    reviewedPassRate: hasDetailedCounts ? safeDivide(ai.reviewed_pass, attempts, "attempts_zero") : result("not_calculable", null, "detailed_counts_not_entered"),
    correctedRate: hasDetailedCounts ? safeDivide(ai.corrected_verified, attempts, "attempts_zero") : result("not_calculable", null, "detailed_counts_not_entered"),
    reworkRate: hasDetailedCounts ? safeDivide(ai.corrected_verified, attempts, "attempts_zero") : result("not_calculable", null, "detailed_counts_not_entered"),
    failureRate: hasDetailedCounts ? safeDivide(finite(ai.failed) + finite(ai.reopened) + finite(ai.reversed) + finite(ai.abandoned), attempts, "attempts_zero") : result("not_calculable", null, "detailed_counts_not_entered"),
    finalVerifiedYield: safeDivide(verifiedOutcomes, attempts, "attempts_zero"),
    humanReviewCost: result("valid", reviewCost),
    reworkEscalationCost: result("valid", reworkCost + escalation),
    humanReviewReworkShare: safeDivide(reviewCost + reworkCost + escalation, recurringTco, "recurring_tco_zero"),
    hardAnnualBenefit: result("valid", hardBenefit),
    expectedAnnualLoss: result("valid", expectedLoss),
    severeLossScenario: result("valid", finite(risk.severe_loss_scenario)),
    grossCapacityValue: result("valid", grossCapacityValue),
    capacityHours: result("valid", capacityHours),
    capacityEquivalentFte: capacityEquivalentFte === null ? result("not_calculable", null, "productive_hours_per_fte_zero") : result("valid", capacityEquivalentFte),
    measuredCostCoverage: costCoverage,
    measuredBenefitCoverage: benefitCoverage,
    decisionGate,
    modelInfrastructureShare: safeDivide(directAi, recurringTco, "recurring_tco_zero"),
  };
}
