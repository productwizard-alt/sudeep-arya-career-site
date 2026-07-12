import { FORMULA_VERSION } from "./calculator-core.js";
import { calculateBasicEstimate } from "./basic-calculator.js";
import { formatMetric } from "/assets/js/ai-economics/presenter.js";

const form = document.getElementById("ai-economics-form");
const errorSummary = document.querySelector("[data-error-summary]");
const resultsSection = document.querySelector("[data-results]");
const fields = ["baseline_verified", "baseline_cost", "ai_attempts", "verified_rate", "total_ai_cost"];
const defaults = { baseline_verified: 100000, baseline_cost: 1000000, ai_attempts: 125000, verified_rate: 84, total_ai_cost: 600000 };
const helpText = {
  baseline_verified: "How many finished results met the required standard in a typical year? Example: 100,000 cases closed successfully—not cases started.",
  baseline_cost: "What do you spend each year to produce those successful results? Include people, vendors, software, and operations. A best estimate is fine.",
  ai_attempts: "How many times will the AI-assisted workflow run each year? Count retries, corrected work, and failed attempts too.",
  verified_rate: "What percentage of AI attempts will become usable business results? Example: enter 80 if 8 out of 10 attempts should pass.",
  total_ai_cost: "What will the AI-assisted process cost each year? Include model, platform, human review, corrections, and ongoing operations.",
};

function addNumericControl(name, container) {
  const prefix = container.hasAttribute("data-money") ? '<span class="input-prefix">$</span>' : "";
  const suffix = container.hasAttribute("data-percent") ? '<span class="input-suffix">%</span>' : "";
  const label = container.querySelector("label");
  const existingInput = container.querySelector("input");
  const inputId = `quick-${name.replaceAll("_", "-")}`;
  const tipId = `${inputId}-help`;
  label.htmlFor = inputId;
  const labelRow = document.createElement("div");
  labelRow.className = "field-label-row";
  label.before(labelRow);
  labelRow.append(label);
  labelRow.insertAdjacentHTML("beforeend", `<button class="field-help" type="button" aria-label="Help for ${label.textContent.trim()}" aria-describedby="${tipId}" aria-expanded="false">?</button><span class="field-tooltip" id="${tipId}" role="tooltip">${helpText[name]}</span>`);
  if (!existingInput) container.insertAdjacentHTML("beforeend", `<div class="value-row"><div class="single-value">${prefix}<input id="${inputId}" name="${name}" type="text" inputmode="decimal" value="${defaults[name]}" required>${suffix}</div></div>`);
  const input = container.querySelector("input");
  if (input) {
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
  }
}

document.querySelectorAll(".evidence-field").forEach((container) => addNumericControl(container.dataset.field, container));

const formatEditableNumber = (input) => {
  const cleaned = input.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [integer = "", ...decimalParts] = cleaned.split(".");
  const grouped = integer.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  input.value = decimalParts.length ? `${grouped}.${decimalParts.join("")}` : grouped;
};

form.querySelectorAll(".evidence-field input").forEach((input) => {
  formatEditableNumber(input);
  input.addEventListener("input", () => formatEditableNumber(input));
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".field-help");
  document.querySelectorAll(".field-help[aria-expanded='true']").forEach((button) => {
    if (button !== trigger) button.setAttribute("aria-expanded", "false");
  });
  if (trigger) trigger.setAttribute("aria-expanded", String(trigger.getAttribute("aria-expanded") !== "true"));
});

const value = (name) => (form.elements[name]?.value ?? "").replace(/,/g, "");
const showErrors = (messages) => {
  errorSummary.innerHTML = `<strong>Check the five inputs</strong><ul>${messages.map((message) => `<li>${message}</li>`).join("")}</ul>`;
  errorSummary.hidden = false;
  errorSummary.focus();
};

function render(result) {
  const currency = { currency: "USD", digits: 2 };
  document.querySelector('[data-output="baseline-cost"]').textContent = formatMetric(result.currentCostPerSuccess, currency);
  document.querySelector('[data-output="attempt-cost"]').textContent = formatMetric(result.aiCostPerAttempt, currency);
  document.querySelector('[data-output="verified-cost"]').textContent = formatMetric(result.aiCostPerSuccess, currency);
  document.querySelector('[data-output="failed-attempts"]').textContent = formatMetric(result.failedAttempts, { style: "number", digits: 0 });
  document.querySelector('[data-output="failure-cost"]').textContent = formatMetric(result.annualFailureCost, { currency: "USD", digits: 0 });
  document.querySelector('[data-output="status"]').textContent = result.signal;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = calculateBasicEstimate({
    annualOutcomes: value("baseline_verified"), currentAnnualCost: value("baseline_cost"), aiAttempts: value("ai_attempts"),
    successRate: value("verified_rate"), annualAiCost: value("total_ai_cost"),
  });
  if (result.status !== "valid") { showErrors(result.errors); return; }
  errorSummary.hidden = true;
  render(result);
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("[data-edit]").addEventListener("click", () => document.querySelector(".inputs-section").scrollIntoView({ behavior: "smooth" }));
document.querySelector(".result-footnote").textContent = `Formula ${FORMULA_VERSION} · Directional estimate for planning.`;
