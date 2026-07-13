export function recommendNextAction({ readiness, baseline, proposed, comparison } = {}) {
  if (readiness?.ok && ["Product truth", "Ownership", "Human approval", "Approved AI inputs"].includes(readiness.primaryBottleneck)) {
    return readiness.recommendation;
  }
  if (baseline?.ok && baseline.inputs.standardReviewHours > baseline.inputs.creationHours) {
    return "Fix review criteria and approval authority before optimizing drafting speed.";
  }
  if (baseline?.ok && baseline.inputs.averageReviewRounds > 1) {
    return "Clarify review criteria and approval authority before adding workflow complexity.";
  }
  if (comparison?.financialComparable && comparison.breakEven?.volume > baseline.approved && proposed.costs.perApproved > baseline.costs.perApproved) {
    return "Keep the workflow simple or narrow the proposed pilot.";
  }
  if (comparison?.financialComparable && proposed?.costs.perApproved !== null && baseline?.costs.perApproved !== null) {
    const improvement = (baseline.costs.perApproved - proposed.costs.perApproved) / baseline.costs.perApproved;
    const controlsReady = readiness?.ok && !["Scattered", "Documented"].includes(readiness.stage);
    if (controlsReady && proposed.inputs.finalApprovalRate >= baseline.inputs.finalApprovalRate && improvement > 0.05) {
      return "The modeled assumptions support a controlled pilot with defined approval and stop conditions.";
    }
  }
  return "Map one repeatable workflow, establish a baseline, and test the smallest reversible change.";
}
