#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = [
  "publications/index.html",
  "publications/small-team-bigger-output/index.html",
  "case-studies/small-team-bigger-output/index.html",
  "tools/index.html",
  "tools/content-operations-readiness/index.html",
];
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (relative) => readFile(path.join(root, relative), "utf8");

for (const route of routes) {
  await stat(path.join(root, route));
  const html = await read(route);
  check((html.match(/<h1\b/gi) || []).length === 1, `${route}: expected one H1`);
  check(/class="skip-link"/i.test(html), `${route}: missing skip link`);
  check(/rel="canonical"/i.test(html), `${route}: missing canonical`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
  check(ids.length === new Set(ids).size, `${route}: duplicate IDs`);
  for (const control of html.matchAll(/\baria-controls="([^"]+)"/gi)) {
    check(ids.includes(control[1]), `${route}: aria-controls target ${control[1]} missing`);
  }
  for (const script of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(script[1]); } catch { failures.push(`${route}: invalid JSON-LD`); }
  }
}

const publication = await read("publications/small-team-bigger-output/index.html");
check((publication.match(/<section class="publication-chapter"/g) || []).length === 4, "Publication must contain exactly four visible control chapters");
check((publication.match(/<section class="framework\b/g) || []).length === 4, "Publication must contain exactly four major operating frameworks");
for (const id of ["control-source", "control-flow", "control-ai", "control-outcome"]) {
  check(publication.includes(`id="${id}"`), `Publication is missing ${id}`);
}
check(publication.includes("Small teams win by turning approved product truth into approved channel content"), "Controlling publication thesis is missing");
check(publication.includes("small-team-bigger-output-cover.webp"), "Publication cover is missing");
check(publication.includes("docs.n8n.io/advanced-ai/human-in-the-loop-tools/"), "Corrected n8n source missing");
check(!/download(?:able)?\s+(?:white\s*paper|publication)|download\s+pdf/i.test(publication), "Small Team publication contains prohibited PDF/download language");
check(!/datePublished|July 13, 2026.*publication/i.test(publication), "Small Team publication invents a public launch date");
check(!/eight interactive frameworks|ten substantive chapters|30\s*\/\s*60\s*\/\s*90|maturity score/i.test(publication), "Rejected V2 publication language remains");

const caseStudy = await read("case-studies/small-team-bigger-output/index.html");
check((caseStudy.match(/<section id="(?:problem|thesis|built|diagnostic|validated|demonstrates)"/g) || []).length === 6, "Case study must contain exactly six narrative sections");

const tool = await read("tools/content-operations-readiness/index.html");
const form = tool.match(/<form id="snapshot-form"[\s\S]*?<\/form>/i)?.[0] || "";
check(tool.includes("Content Workflow Snapshot"), "Visible tool name is missing");
check(tool.includes("<h1>See what one content workflow is costing you.</h1>"), "Required outcome-led H1 is missing");
check(tool.includes("Enter four workflow estimates. Add labor cost only if you want a cost-per-approved-output calculation."), "Required support copy is missing");
check((form.match(/<input\b[^>]*\brequired\b[^>]*>/gi) || []).length === 4, "Snapshot must have exactly four required numeric inputs");
check((form.match(/<input\b[^>]*type="number"/gi) || []).length === 5, "Snapshot must have four required numbers and one optional labor-cost number");
check((form.match(/<select\b/gi) || []).length === 1 && /Workflow <span>optional<\/span>/.test(form), "Snapshot must have one optional workflow selector");
check((tool.match(/<fieldset><legend>/g) || []).length === 4, "Snapshot must have exactly four optional operating-control questions");
for (const name of ["productTruth", "approvalOwner", "assetControl", "workflowDocumented"]) {
  check((tool.match(new RegExp(`name="${name}"`, "g")) || []).length === 3, `${name} must offer Yes, No, and Not sure`);
}
for (const action of ["Do now", "Test next", "Measure", "Copy result", "Print / Save as PDF", "Download local CSV", "Reset"]) {
  check(tool.includes(action), `Snapshot output is missing ${action}`);
}
check(tool.includes("Missing information stays missing—it is never treated as zero."), "Missing-data boundary is absent");
check(tool.includes("Zero approved output returns an explicit not-calculable state."), "Zero-approved boundary is absent");
check(!/>\s*(?:Advanced|Full Workflow|Readiness score|Maturity stage|30\s*\/\s*60\s*\/\s*90)\b/i.test(tool), "Rejected V2 interface language remains visible");
check(!/googletagmanager|G-C65RGRMMW1|data-netlify|netlify-honeypot/i.test(tool), "Snapshot must remain analytics- and Netlify-Forms-free");

const toolJs = await read("tools/content-operations-readiness/content-operations-tool.js");
check(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|gtag\(/i.test(toolJs), "Snapshot contains prohibited transmission, storage, or analytics API");
check(!/location\.(?:hash|search)|URLSearchParams/i.test(toolJs), "Snapshot places state in the URL");
for (const title of ["Establish product and claim truth", "Clarify approval ownership", "Map one repeatable workflow", "Fix asset control", "Reduce approval loss before adding AI", "Test one controlled AI-assisted step", "Keep the workflow simple"]) {
  check(toolJs.includes(title), `Recommendation branch is missing: ${title}`);
}
check(toolJs.includes("baseline.approvalRate < .8"), "Approval-loss threshold must remain explicit at 80%");
check(toolJs.includes("baseline.reviewShare >= .25"), "Controlled-AI threshold must remain explicit at 25% review share");
check(toolJs.includes("Not calculable — no approved outputs"), "Zero-approved cost state is missing");
check((toolJs.match(/Evaluate (?:PIM|DAM) capability/g) || []).length === 2, "PIM and DAM must appear only as conditional secondary notes");

const cover = await read("assets/publications/small-team-bigger-output-cover.svg");
const coverTerms = ["APPROVED", "PRODUCT", "TRUTH", "ASSETS", "CREATE", "+ ADAPT", "HUMAN", "REVIEW", "OUTPUT"];
for (const term of coverTerms) check(cover.includes(term), `Cover workflow is missing ${term}`);

const redirects = await read("_redirects");
for (const route of [
  "/insights/",
  "/insights/running-before-crawling/",
  "/whitepapers/",
  "/whitepapers/running-before-crawling/",
  "/assets/whitepapers/sudeep-arya-running-before-crawling.pdf",
  "/case-studies/running-before-crawling-whitepaper/",
]) {
  check(redirects.includes(`${route} /404.html 410!`), `Deleted route ${route} must retain 410`);
}

const home = await read("index.html");
const caseHub = await read("case-studies/index.html");
const pubHub = await read("publications/index.html");
for (const [name, html] of [["homepage", home], ["case-studies hub", caseHub], ["publications hub", pubHub]]) {
  check(html.includes("/publications/small-team-bigger-output/"), `${name} is missing the Small Team publication link`);
  check(!/Running Before Crawling|running-before-crawling|href="\/insights\//i.test(html), `${name} restores prohibited legacy publication content`);
}

const htmlFiles = (await readdir(root, { recursive: true })).filter((file) => file.endsWith(".html"));
const allHtml = await Promise.all(htmlFiles.map((file) => read(file)));
check(allHtml.every((html) => !/Flemington/i.test(html)), "Forbidden location term found");

if (failures.length) {
  console.error(`Content operations validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
assert.equal(failures.length, 0);
console.log(`Content operations validation passed: ${routes.length} routes, four publication controls, one-page snapshot, six-section case study, privacy, deleted-route 410s, and source controls verified.`);
