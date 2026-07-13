const defaultCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const present = (value) => value !== "" && value !== null && value !== undefined;
const finite = (value) => present(value) && Number.isFinite(Number(value));

export function deriveUnitCostSeries(totalCost, acceptedOutcomes) {
  if (!finite(totalCost) || !finite(acceptedOutcomes)) return null;
  const cost = Number(totalCost);
  const outcomes = Number(acceptedOutcomes);
  if (cost < 0 || outcomes <= 0) return null;
  const perOne = cost / outcomes;
  if (!Number.isFinite(perOne)) return null;
  return { perOne, perHundred: perOne * 100, perThousand: perOne * 1000 };
}

export function deriveAiUnitCostSeries(totalCost, attempts, acceptedRatePercent) {
  if (!finite(attempts) || !finite(acceptedRatePercent)) return null;
  const attempted = Number(attempts);
  const rate = Number(acceptedRatePercent);
  if (attempted <= 0 || rate <= 0 || rate > 100) return null;
  const acceptedOutcomes = attempted * (rate / 100);
  const series = deriveUnitCostSeries(totalCost, acceptedOutcomes);
  return series ? { ...series, acceptedOutcomes } : null;
}

export function currencyDisplayParts(value, formatter = defaultCurrency) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) return null;
  const numericValue = Number(value);
  const parts = formatter.formatToParts(numericValue);
  return {
    formatted: parts.map(({ value: part }) => part).join(""),
    currency: parts.filter(({ type }) => type === "currency").map(({ value: part }) => part).join(""),
    whole: parts.filter(({ type }) => type === "integer" || type === "group").map(({ value: part }) => part).join(""),
    cents: parts.filter(({ type }) => type === "decimal" || type === "fraction").map(({ value: part }) => part).join(""),
    belowOne: numericValue < 1,
  };
}

export function renderDerivedCurrency(node, value, formatter = defaultCurrency) {
  const parts = currencyDisplayParts(value, formatter);
  if (!node || !parts) return false;
  const createPart = (className, text) => {
    const part = node.ownerDocument.createElement("span");
    part.className = className;
    part.textContent = text;
    return part;
  };
  node.classList.add("derived-currency");
  node.classList.toggle("derived-currency--subunit", parts.belowOne);
  node.removeAttribute("aria-label");
  node.dataset.exactValue = String(Number(value));
  node.replaceChildren(
    createPart("derived-currency-sign", parts.currency),
    createPart("derived-currency-whole", parts.whole),
    createPart("derived-currency-cents", parts.cents),
  );
  return true;
}

export function renderUnitCostSeries(root, series, formatter = defaultCurrency) {
  if (!root || !series) return false;
  const values = { "1": series.perOne, "100": series.perHundred, "1000": series.perThousand };
  for (const node of root.querySelectorAll("[data-unit-cost-value]")) {
    if (!renderDerivedCurrency(node, values[node.dataset.unitCostValue], formatter)) return false;
  }
  return true;
}
