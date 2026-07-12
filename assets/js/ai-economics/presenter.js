const unavailable = {
  not_calculable: "Not calculable",
  not_comparable: "Not comparable",
  no_payback: "No payback",
  no_break_even: "No break-even",
  insufficient_evidence: "More evidence required",
  more_evidence_required: "More evidence required",
  validation_error: "Check inputs",
};

export function formatMetric(metric, { style = "currency", currency = "USD", digits = 0 } = {}) {
  if (!metric || metric.status !== "valid") return unavailable[metric?.status] || "Not available";
  if (style === "percent") return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: digits || 1 }).format(metric.value);
  if (style === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(metric.value);
  if (style === "months") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(metric.value)} months`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(metric.value);
}

export function metricReason(metric) {
  const reasons = {
    verified_outcomes_zero: "Enter verified outcomes greater than zero.",
    attempts_zero: "Enter attempts greater than zero.",
    baseline_verified_outcomes_zero: "Enter baseline verified outcomes greater than zero.",
    monthly_net_benefit_non_positive: "Recurring cost and expected loss are not covered by hard benefit.",
    no_payback_within_horizon: "Cumulative cash flow remains negative within the selected horizon.",
    fixed_variable_or_outcome_boundary_mismatch: "Confirm matching outcome and fixed/variable cost boundaries.",
    unit_contribution_non_positive: "AI variable unit cost does not improve on the baseline.",
    detailed_counts_not_entered: "Use detailed counts to calculate this rate.",
  };
  return reasons[metric?.reason] || "";
}
