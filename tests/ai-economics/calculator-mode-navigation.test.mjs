import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quick = readFileSync(new URL("../../tools/ai-cost-reality-calculator/index.html", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../../tools/ai-cost-reality-calculator/advanced/index.html", import.meta.url), "utf8");
const sharedCss = readFileSync(new URL("../../tools/ai-cost-reality-calculator/calculator-mode.css", import.meta.url), "utf8");

const ids = (html) => [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const controls = (html) => [...html.matchAll(/\baria-controls="([^"]+)"/g)].map((match) => match[1]);

test("Quick links to Advanced", () => assert.match(quick, /href="\/tools\/ai-cost-reality-calculator\/advanced\/"/));
test("Advanced links to Quick", () => assert.match(advanced, /href="\/tools\/ai-cost-reality-calculator\/"/));
test("Quick has correct aria-current", () => assert.match(quick, /href="\/tools\/ai-cost-reality-calculator\/" aria-current="page"/));
test("Advanced has correct aria-current", () => assert.match(advanced, /href="\/tools\/ai-cost-reality-calculator\/advanced\/" aria-current="page"/));
test("visible mode descriptions exist", () => { for (const html of [quick, advanced]) { assert.match(html, /5 inputs · About 1 minute/); assert.match(html, /Detailed cost model · About 3–5 minutes/); } });
test("mode links are ordinary keyboard-reachable links", () => { for (const html of [quick, advanced]) { const nav = html.match(/<nav class="calculator-mode-nav" aria-label="Calculator mode">([\s\S]*?)<\/nav>/)?.[0] || ""; assert.ok(nav); assert.doesNotMatch(nav, /tabindex="-1"/); assert.equal((nav.match(/<a href=/g) || []).length, 2); } });
test("no ARIA tab misuse", () => { for (const html of [quick, advanced]) assert.doesNotMatch(html, /role="tab(?:list|panel)?"/); });
test("every aria-controls target exists", () => { for (const html of [quick, advanced]) { const allIds = new Set(ids(html)); for (const target of controls(html)) assert.ok(allIds.has(target), `Missing aria-controls target: ${target}`); } });
test("no duplicate IDs", () => { for (const html of [quick, advanced]) { const all = ids(html); assert.equal(new Set(all).size, all.length); } });
test("error summaries receive programmatic focus", () => { for (const html of [quick, advanced]) assert.match(html, /data-error-summary[^>]*tabindex="-1"/); });
test("help controls use keyboard-native details and summaries", () => { for (const html of [quick, advanced]) { assert.match(html, /class="field-help"/); assert.match(html, /<summary>/); } });
test("progressive disclosures are independent", () => { assert.ok((advanced.match(/<details/g) || []).length >= 8); assert.ok((quick.match(/<details/g) || []).length >= 8); });
test("reduced motion support is present", () => assert.match(sharedCss, /prefers-reduced-motion:reduce/));
