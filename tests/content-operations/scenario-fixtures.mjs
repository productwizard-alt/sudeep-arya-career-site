export const quickSample = {
  requests: 40,
  deliverablesPerRequest: 2,
  creationHours: 1.2,
  reviewCorrectionHours: 0.5,
  laborCost: 60,
  finalApprovalRate: 0.75,
};

export const baselineInput = {
  requests: 40, deliverablesPerRequest: 2, creationHours: 1.2,
  standardReviewHours: 0.3, correctionHours: 0.2,
  exceptionHours: 8, governanceHours: 12, laborCost: 60,
  firstPassApprovalRate: 0.5, finalApprovalRate: 0.75,
  averageReviewRounds: 2, cycleTimeDays: 6, availableHours: 200,
  specialistReviewRate: 0.5, amortizationMonths: 24,
  costs: {
    technology: { state: "included", value: 600 },
    external: { state: "included", value: 1000 },
    implementation: { state: "zero", value: 0 },
  },
};

export const proposedInput = {
  ...structuredClone(baselineInput),
  creationHours: 0.8, standardReviewHours: 0.25, correctionHours: 0.1,
  exceptionHours: 4, governanceHours: 10,
  firstPassApprovalRate: 0.75, finalApprovalRate: 0.9,
  costs: {
    technology: { state: "included", value: 1000 },
    external: { state: "included", value: 600 },
    implementation: { state: "zero", value: 0 },
  },
};

export const comparableDefinitions = {
  baseline: { approval: true, deliverable: true, quality: true, channel: true, period: true },
  proposed: { approval: true, deliverable: true, quality: true, channel: true, period: true },
};

export const readinessCases = {
  allAbsent: Object.fromEntries(["productTruth", "brandTruth", "assetControl", "workflow", "ownership", "exceptions", "approvedAIInputs", "humanApproval", "measurement", "learning"].map((key) => [key, 0])),
  allWorking: Object.fromEntries(["productTruth", "brandTruth", "assetControl", "workflow", "ownership", "exceptions", "approvedAIInputs", "humanApproval", "measurement", "learning"].map((key) => [key, 2])),
  allControlled: Object.fromEntries(["productTruth", "brandTruth", "assetControl", "workflow", "ownership", "exceptions", "approvedAIInputs", "humanApproval", "measurement", "learning"].map((key) => [key, 3])),
};
