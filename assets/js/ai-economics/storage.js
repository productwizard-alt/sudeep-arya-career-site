import { FORMULA_VERSION } from "../../../tools/ai-cost-reality-calculator/calculator-core.js";
import { validateImportedCalculation } from "./validation.js";

export function exportCalculation(data) {
  const payload = {
    ...data,
    metadata: { ...data.metadata, formula_version: FORMULA_VERSION, exported_at: new Date().toISOString() },
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-economics-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importCalculation(file) {
  const data = JSON.parse(await file.text());
  const validation = validateImportedCalculation(data);
  if (validation.status !== "valid") throw new Error(validation.errors.join(" "));
  return data;
}
