// Independent arithmetic oracle. This module intentionally imports no calculator code.
const PERIODS_PER_YEAR = Object.freeze({ monthly: 12, quarterly: 4, annual: 1 });
const present = (value) => value !== "" && value !== null && value !== undefined;
const numeric = (value) => Number(value);
const nonNegative = (value) => present(value) && Number.isFinite(numeric(value)) && numeric(value) >= 0;

function pilotRate(attempts, accepted) {
  if (!nonNegative(attempts) || numeric(attempts) <= 0) return { status: "validation_error", reason: "Pilot attempts must be greater than zero." };
  if (!nonNegative(accepted)) return { status: "validation_error", reason: "Accepted pilot outcomes must be zero or greater." };
  if (numeric(accepted) > numeric(attempts)) return { status: "validation_error", reason: "Accepted pilot outcomes cannot exceed pilot attempts." };
  return { status: "valid", value: numeric(accepted) / numeric(attempts) * 100 };
}

export function referenceQuick(input, period = "annual") {
  const errors = [];
  if (!PERIODS_PER_YEAR[period]) errors.push("Select a valid analysis period.");
  for (const [key, value] of Object.entries({ currentOutcomes: input.currentOutcomes, currentCost: input.currentCost, aiAttempts: input.aiAttempts, successRate: input.successRate, aiCost: input.aiCost })) {
    if (!nonNegative(value)) errors.push(`${key} must be a finite number zero or greater.`);
  }
  if (nonNegative(input.currentOutcomes) && numeric(input.currentOutcomes) <= 0) errors.push("Accepted current-process outcomes must be greater than zero.");
  if (nonNegative(input.aiAttempts) && numeric(input.aiAttempts) <= 0) errors.push("Expected AI-assisted attempts must be greater than zero.");
  if (nonNegative(input.successRate) && numeric(input.successRate) > 100) errors.push("Accepted-outcome rate cannot exceed 100%.");
  if (errors.length) return { status: "validation_error", errors };

  const currentOutcomes = numeric(input.currentOutcomes);
  const currentCost = numeric(input.currentCost);
  const aiAttempts = numeric(input.aiAttempts);
  const successRatePct = numeric(input.successRate);
  const successRate = successRatePct / 100;
  const aiCost = numeric(input.aiCost);
  const periodsPerYear = PERIODS_PER_YEAR[period];
  const currentCostPerAccepted = currentCost / currentOutcomes;
  const acceptedAiOutcomes = aiAttempts * successRate;
  const failedAttempts = aiAttempts - acceptedAiOutcomes;
  const aiCostPerAttempt = aiCost / aiAttempts;
  const failureCost = aiCostPerAttempt * failedAttempts;
  const aiCostPerAccepted = acceptedAiOutcomes > 0 ? aiCost / acceptedAiOutcomes : null;
  const equivalentOutputAiCost = aiCostPerAccepted === null ? null : currentOutcomes * aiCostPerAccepted;
  const selectedPeriodSavings = equivalentOutputAiCost === null ? null : currentCost - equivalentOutputAiCost;
  const annualizedSavings = selectedPeriodSavings === null ? null : selectedPeriodSavings * periodsPerYear;
  const breakEvenRate = currentCostPerAccepted === 0 ? null : aiCostPerAttempt / currentCostPerAccepted;
  const breakEvenStatus = breakEvenRate === null ? "not_calculable" : breakEvenRate > 1 ? "not_achievable" : "valid";
  const breakEvenMargin = breakEvenRate === null ? null : successRate - breakEvenRate;
  let decisionSignal = "More information required";
  if (breakEvenStatus === "not_achievable") decisionSignal = "Break-even not achievable";
  else if (selectedPeriodSavings !== null) {
    const tolerance = Math.max(0.01, Math.abs(currentCost) * 1e-9);
    decisionSignal = Math.abs(selectedPeriodSavings) <= tolerance ? "Approximately break-even" : selectedPeriodSavings > 0 ? "Modeled savings" : "Modeled loss";
  }

  return {
    status: "valid", period, periodsPerYear, currentOutcomes, currentCost, aiAttempts, successRatePct, aiCost,
    currentCostPerAccepted, acceptedAiOutcomes, aiCostPerAttempt, aiCostPerAccepted, equivalentOutputAiCost,
    selectedPeriodSavings, annualizedSavings, breakEvenRate, breakEvenStatus, breakEvenMargin,
    failedAttempts, failureCost, decisionSignal,
    formulaSteps: [
      `Current unit cost = ${currentCost} ÷ ${currentOutcomes} = ${currentCostPerAccepted}`,
      `Accepted AI outcomes = ${aiAttempts} × (${successRatePct} ÷ 100) = ${acceptedAiOutcomes}`,
      `AI cost per attempt = ${aiCost} ÷ ${aiAttempts} = ${aiCostPerAttempt}`,
      `AI cost per accepted outcome = ${aiCost} ÷ ${acceptedAiOutcomes} = ${aiCostPerAccepted === null ? "not calculable" : aiCostPerAccepted}`,
      `Equivalent-output AI cost = ${currentOutcomes} × ${aiCostPerAccepted === null ? "not calculable" : aiCostPerAccepted} = ${equivalentOutputAiCost === null ? "not calculable" : equivalentOutputAiCost}`,
      `Selected-period savings/loss = ${currentCost} − ${equivalentOutputAiCost === null ? "not calculable" : equivalentOutputAiCost} = ${selectedPeriodSavings === null ? "not calculable" : selectedPeriodSavings}`,
      `Annualized savings/loss = ${selectedPeriodSavings === null ? "not calculable" : selectedPeriodSavings} × ${periodsPerYear} = ${annualizedSavings === null ? "not calculable" : annualizedSavings}`,
      `Break-even acceptance rate = (${aiCost} ÷ ${aiAttempts}) ÷ (${currentCost} ÷ ${currentOutcomes}) = ${breakEvenRate === null ? "not calculable" : breakEvenRate * 100}%`,
      `Margin to break-even = ${successRatePct}% − ${breakEvenRate === null ? "not calculable" : breakEvenRate * 100 + "%"} = ${breakEvenMargin === null ? "not calculable" : breakEvenMargin * 100 + " percentage points"}`,
      `Failed attempts = ${aiAttempts} − ${acceptedAiOutcomes} = ${failedAttempts}`,
      `Failure-cost allocation = ${aiCostPerAttempt} × ${failedAttempts} = ${failureCost}`,
    ],
  };
}

export function referenceQuickScenario(scenario) {
  const input = { ...scenario.input };
  let pilot = null;
  if (scenario.acceptanceMode === "pilot") {
    pilot = pilotRate(scenario.pilot?.attempts, scenario.pilot?.accepted);
    if (pilot.status !== "valid") return { status: "validation_error", errors: [pilot.reason], pilot };
    input.successRate = pilot.value;
  }
  return { ...referenceQuick(input, scenario.period), pilot };
}

function currentBuilderTotal(builder = {}) {
  return numeric(builder.laborHours || 0) * numeric(builder.loadedHourlyCost || 0)
    + numeric(builder.agencyCost || 0) + numeric(builder.softwareCost || 0)
    + numeric(builder.reworkCost || 0) + numeric(builder.otherCost || 0);
}

function aiBuilderTotal(builder = {}, period, aiAttempts) {
  const technologyCost = numeric(builder.technologyCost || 0);
  const implementationCost = numeric(builder.implementationCost || 0);
  const amortizationYears = numeric(builder.amortizationYears || 0);
  const annualizedImplementation = implementationCost > 0 && amortizationYears > 0 ? implementationCost / amortizationYears : 0;
  const allocatedImplementation = annualizedImplementation / PERIODS_PER_YEAR[period];
  const reviewCost = builder.reviewMethod === "calculated"
    ? numeric(aiAttempts) * (numeric(builder.reviewRate || 0) / 100) * (numeric(builder.reviewMinutes || 0) / 60) * numeric(builder.reviewHourlyCost || 0)
    : numeric(builder.knownReviewCost || 0);
  const otherOperatingCost = numeric(builder.otherOperatingCost || 0);
  return { technologyCost, implementationCost, amortizationYears, annualizedImplementation, allocatedImplementation, reviewCost, otherOperatingCost, total: technologyCost + allocatedImplementation + reviewCost + otherOperatingCost };
}

export function referenceAdvanced(input, period = input.period || "annual") {
  const currentCostMethod = input.currentCostMethod === "builder" ? "builder" : "known";
  const aiCostMethod = input.aiCostMethod === "builder" ? "builder" : "known";
  const successMethod = input.successMethod === "pilot" ? "pilot" : "direct";
  const errors = [];
  if (!PERIODS_PER_YEAR[period]) errors.push("Select a valid analysis period.");
  if (!nonNegative(input.currentOutcomes) || numeric(input.currentOutcomes) <= 0) errors.push("Accepted current-process outcomes must be greater than zero.");
  if (!nonNegative(input.aiAttempts) || numeric(input.aiAttempts) <= 0) errors.push("Expected AI-assisted attempts must be greater than zero.");

  let successRatePct = input.successRate;
  let pilot = null;
  if (successMethod === "pilot") {
    pilot = pilotRate(input.pilotAttempts, input.pilotAccepted);
    if (pilot.status !== "valid") errors.push(pilot.reason);
    else successRatePct = pilot.value;
  } else if (!nonNegative(successRatePct) || numeric(successRatePct) > 100) errors.push("Enter an accepted-outcome rate from 0% to 100%.");

  let currentCost = input.knownCurrentCost;
  if (currentCostMethod === "known") {
    if (!nonNegative(currentCost)) errors.push("Enter the known current-process cost.");
  } else {
    const active = Object.values(input.currentCostBuilder || {});
    if (active.some((value) => !nonNegative(value))) errors.push("Active current-cost builder values must be finite and nonnegative.");
    currentCost = currentBuilderTotal(input.currentCostBuilder);
  }

  let aiCost = input.knownAiCost;
  let composition = null;
  if (aiCostMethod === "known") {
    if (!nonNegative(aiCost)) errors.push("Enter the known AI-assisted cost.");
  } else {
    const builder = input.aiCostBuilder || {};
    if (!nonNegative(builder.technologyCost)) errors.push("Enter model, platform, and software cost in the AI cost builder.");
    if (!nonNegative(builder.implementationCost) || !nonNegative(builder.otherOperatingCost)) errors.push("Active AI builder values must be finite and nonnegative.");
    if (numeric(builder.implementationCost) > 0 && !nonNegative(builder.amortizationYears)) errors.push("Enter a useful life for implementation cost.");
    if (builder.amortizationYears !== "" && builder.amortizationYears !== null && builder.amortizationYears !== undefined && (numeric(builder.amortizationYears) < 1 || numeric(builder.amortizationYears) > 10)) errors.push("Amortization period must be between 1 and 10 years.");
    if (builder.reviewMethod === "calculated") {
      for (const value of [builder.reviewRate, builder.reviewMinutes, builder.reviewHourlyCost]) if (!nonNegative(value)) errors.push("Active time-derived review values must be finite and nonnegative.");
      if (nonNegative(builder.reviewRate) && numeric(builder.reviewRate) > 100) errors.push("Review percentage cannot exceed 100%.");
    } else if (!nonNegative(builder.knownReviewCost)) errors.push("Known review cost must be finite and nonnegative.");
    if (!errors.length) {
      composition = aiBuilderTotal(builder, period, input.aiAttempts);
      aiCost = composition.total;
    }
  }
  if (errors.length) return { status: "validation_error", errors, pilot };

  const quick = referenceQuick({ currentOutcomes: input.currentOutcomes, currentCost, aiAttempts: input.aiAttempts, successRate: successRatePct, aiCost }, period);
  if (quick.status !== "valid") return quick;
  const maximumBreakEvenAiCost = quick.currentCostPerAccepted * quick.aiAttempts * (quick.successRatePct / 100);
  const costThresholdDifference = maximumBreakEvenAiCost - quick.aiCost;
  const completenessNotes = [];
  if (aiCostMethod === "builder") {
    if (numeric(input.aiCostBuilder.implementationCost) === 0) completenessNotes.push("This estimate excludes implementation cost because none was entered.");
    if (composition.reviewCost === 0) completenessNotes.push("Human-review cost is included as zero. Confirm whether review or correction work should be added.");
    if (numeric(input.aiCostBuilder.otherOperatingCost) === 0) completenessNotes.push("Other AI operating cost is included as zero.");
  }
  const builderSteps = [];
  if (currentCostMethod === "builder") {
    const b = input.currentCostBuilder;
    builderSteps.push(`Built current cost = (${b.laborHours} × ${b.loadedHourlyCost}) + ${b.agencyCost} + ${b.softwareCost} + ${b.reworkCost} + ${b.otherCost} = ${currentCost}`);
  }
  if (aiCostMethod === "builder") {
    const b = input.aiCostBuilder;
    if (numeric(b.implementationCost) > 0) builderSteps.push(`Annualized implementation = ${b.implementationCost} ÷ ${b.amortizationYears} = ${composition.annualizedImplementation}`);
    builderSteps.push(`Selected-period implementation allocation = ${composition.annualizedImplementation} ÷ ${PERIODS_PER_YEAR[period]} = ${composition.allocatedImplementation}`);
    if (b.reviewMethod === "calculated") builderSteps.push(`Time-derived review = ${input.aiAttempts} × (${b.reviewRate} ÷ 100) × (${b.reviewMinutes} ÷ 60) × ${b.reviewHourlyCost} = ${composition.reviewCost}`);
    else builderSteps.push(`Direct review cost = ${b.knownReviewCost}`);
    builderSteps.push(`Built AI cost = ${composition.technologyCost} + ${composition.allocatedImplementation} + ${composition.reviewCost} + ${composition.otherOperatingCost} = ${composition.total}`);
  }
  builderSteps.push(`Maximum AI cost at break-even = ${quick.currentCostPerAccepted} × ${quick.aiAttempts} × (${quick.successRatePct} ÷ 100) = ${maximumBreakEvenAiCost}`);
  builderSteps.push(`Cost headroom / required reduction = ${maximumBreakEvenAiCost} − ${quick.aiCost} = ${costThresholdDifference}`);
  return { ...quick, pilot, currentCostMethod, aiCostMethod, successMethod, composition, maximumBreakEvenAiCost, costThresholdDifference, completenessNotes, formulaSteps: [...builderSteps, ...quick.formulaSteps] };
}

export function referenceAdvancedScenario(scenario) {
  return referenceAdvanced({ ...scenario.input, period: scenario.period }, scenario.period);
}

export const independentPilotRate = pilotRate;
