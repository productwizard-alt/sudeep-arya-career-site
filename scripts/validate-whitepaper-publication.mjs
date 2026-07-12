#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const expect = (condition, message) => { if (!condition) fail(message); };
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

const required = [
  "insights/index.html", "insights/running-before-crawling/index.html", "insights/running-before-crawling/whitepaper.css",
  "tools/ai-cost-reality-calculator/index.html", "tools/ai-cost-reality-calculator/calculator-core.js", "tools/ai-cost-reality-calculator/calculator.js", "tools/ai-cost-reality-calculator/calculator.css",
  "case-studies/ai-economics-decision-framework/index.html", "downloads/running-before-crawling-executive-edition.pdf",
  "assets/running-before-crawling-cover.svg", "assets/running-before-crawling-social-preview.png", "assets/ai-economics-social-preview.png",
];
required.forEach((relative) => expect(existsSync(path.join(root, relative)), `missing required file: ${relative}`));

const paper = read("insights/running-before-crawling/index.html");
const calculator = read("tools/ai-cost-reality-calculator/index.html");
const caseStudy = read("case-studies/ai-economics-decision-framework/index.html");
const insights = read("insights/index.html");
const redirects = read("_redirects");
const sitemap = read("sitemap.xml");
const llms = read("llms.txt");

for (const [name, html] of [["paper", paper], ["calculator", calculator], ["framework case study", caseStudy], ["insights", insights]]) {
  expect((html.match(/<h1\b/gi) || []).length === 1, `${name} must contain exactly one H1`);
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  expect(blocks.length > 0, `${name} is missing JSON-LD`);
  blocks.forEach(([, json]) => { try { JSON.parse(json); } catch (error) { fail(`${name} JSON-LD is invalid: ${error.message}`); } });
}

for (const text of [
  "Why AI costs balloon when leadership automates before it understands the work",
  "Published and updated July 11, 2026", "WSJ report of unreleased KPMG survey",
  "roughly $2.8B in inventory",
  "jurisdiction-specific provincial tribunal decision", "Organization Science", "10.1287/orsc.2025.21838",
  "Footnotes", "References",
]) expect(paper.includes(text), `paper is missing corrected content: ${text}`);
expect(paper.toLowerCase().includes("company-reported work equivalent of 700 full-time agents"), "paper is missing the corrected Klarna qualification");
expect(insights.includes("13 cited sources"), "insights index is missing the source count");
expect(calculator.includes("Fully Loaded AI Cost per Verified Outcome"), "calculator is missing the controlling formula");

for (const forbidden of ["accepted business outcomes", "HEADCOUNT ASSUMPTION APPROVED", "rebuild and rehire", "24-page final PDF", "8 original visuals", "14 visible references"]) {
  expect(!paper.includes(forbidden), `paper contains obsolete or unapproved wording: ${forbidden}`);
}

expect((paper.match(/class="paper-framework/g) || []).length === 9, "paper must contain nine accessible inline framework figures plus the cover");
expect((paper.match(/class="paper-citation"/g) || []).length >= 20, "paper is missing inline citations");
expect(paper.includes("/downloads/running-before-crawling-executive-edition.pdf"), "paper does not link the corrected PDF");
expect(paper.includes("/tools/ai-cost-reality-calculator/"), "paper does not link the calculator");
expect(calculator.includes("Formula 1.1.0") && calculator.includes("Learn how the calculation was built"), "calculator is missing formula or methodology content");
expect(caseStudy.includes("Original Framework / Research and Product Design"), "case study positioning is incorrect");

expect(redirects.includes("/whitepapers/running-before-crawling/ /insights/running-before-crawling/ 301!"), "legacy whitepaper redirect is missing");
for (const route of ["/insights/", "/insights/running-before-crawling/", "/tools/ai-cost-reality-calculator/", "/case-studies/ai-economics-decision-framework/"]) {
  expect(sitemap.includes(`https://sudeeparya.com${route}`), `sitemap is missing ${route}`);
  expect(llms.includes(`https://sudeeparya.com${route}`), `llms.txt is missing ${route}`);
}
expect(!sitemap.includes("/whitepapers/"), "sitemap exposes a legacy whitepaper route");
expect(!sitemap.includes("/case-studies/running-before-crawling-whitepaper/"), "sitemap exposes an obsolete framework route");

if (!process.exitCode) console.log("PASS: corrected publication, calculator, framework case study, routes, and factual qualifiers validated.");
