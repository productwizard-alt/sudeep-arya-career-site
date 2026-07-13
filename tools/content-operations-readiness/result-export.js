import { FORMULA_VERSION, METHODOLOGY_VERSION } from "./economics-model.js";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function buildCsv({ scenario = "Current workflow", rows = [], scope = {}, limitations = [] } = {}) {
  const output = [["Scenario", scenario], ...rows, ["Included cost categories", (scope.included || []).join("; ") || "None"], ["Known-zero cost categories", (scope.knownZero || []).join("; ") || "None"], ["Excluded or not estimated", (scope.excluded || []).join("; ") || "None"], ["Formula version", FORMULA_VERSION], ["Methodology version", METHODOLOGY_VERSION], ["Limitations", limitations.join("; ")]];
  return output.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function buildExecutiveSummary({ title, metrics = [], recommendation, qualification } = {}) {
  return [title, ...metrics.map(([label, value]) => `${label}: ${value}`), recommendation ? `Recommended next action: ${recommendation}` : "", qualification || "", `Methodology ${METHODOLOGY_VERSION}; formula ${FORMULA_VERSION}.`].filter(Boolean).join("\n");
}

export function downloadCsv(csv, filename = "content-operations-results.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
