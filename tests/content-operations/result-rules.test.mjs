import assert from "node:assert/strict";
import test from "node:test";
import { buildCsv, buildExecutiveSummary } from "../../tools/content-operations-readiness/result-export.js";
import { recommendNextAction } from "../../tools/content-operations-readiness/recommendation-rules.js";

test("CSV includes visible rows, scope, and versions", () => {
  const csv = buildCsv({ rows: [["Approved output", "60"]], scope: { included: ["Technology"], knownZero: ["External"], excluded: ["Implementation"] }, limitations: ["Modeled estimate"] });
  assert.match(csv, /Approved output/);
  assert.match(csv, /Formula version/);
  assert.doesNotMatch(csv, /browser|analytics identifier|hidden state/i);
});
test("Copy summary includes qualification and methodology", () => {
  const value = buildExecutiveSummary({ title: "Readiness result", metrics: [["Stage", "Connected"]], qualification: "Not an industry benchmark." });
  assert.match(value, /Connected/);
  assert.match(value, /Not an industry benchmark/);
  assert.match(value, /Methodology/);
});
test("Recommendation rules never recommend headcount reduction", () => {
  const recommendation = recommendNextAction({});
  assert.doesNotMatch(recommendation, /headcount|layoff|staff reduction/i);
});
