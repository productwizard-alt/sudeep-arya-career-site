#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const resolve = (relative) => path.join(root, relative);
const read = (relative) => readFileSync(resolve(relative), "utf8");

const routes = {
  hub: "publications/index.html",
  running: "publications/running-before-crawling/index.html",
  smallTeam: "publications/small-team-bigger-output/index.html",
  aiCase: "case-studies/ai-economics-decision-framework/index.html",
  contentCase: "case-studies/small-team-bigger-output/index.html",
  aiTool: "tools/ai-cost-reality-calculator/index.html",
  contentTool: "tools/content-operations-readiness/index.html",
};

const required = [
  ...Object.values(routes),
  "publications/running-before-crawling/publication.css",
  "publications/small-team-bigger-output/publication.css",
  "publications/small-team-bigger-output/publication.js",
  "tools/content-operations-readiness/content-operations-tool.js",
  "assets/running-before-crawling-cover.svg",
  "assets/publications/small-team-bigger-output-cover.svg",
  "assets/publications/small-team-bigger-output-cover.webp",
];
for (const relative of required) expect(existsSync(resolve(relative)), `missing required file: ${relative}`);

for (const retired of [
  "insights/index.html",
  "insights/running-before-crawling/index.html",
  "downloads/running-before-crawling-executive-edition.pdf",
  "assets/whitepapers/sudeep-arya-running-before-crawling.pdf",
]) {
  expect(!existsSync(resolve(retired)), `retired deployable publication asset still exists: ${retired}`);
}

const pages = Object.fromEntries(Object.entries(routes).map(([name, relative]) => [name, read(relative)]));
const home = read("index.html");
const caseHub = read("case-studies/index.html");
const redirects = read("_redirects");
const sitemap = read("sitemap.xml");
const llms = read("llms.txt");

for (const [name, html] of Object.entries(pages)) {
  expect((html.match(/<h1\b/gi) || []).length === 1, `${name} must contain exactly one H1`);
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  expect(blocks.length > 0, `${name} is missing JSON-LD`);
  for (const [, json] of blocks) {
    try { JSON.parse(json); } catch (error) { failures.push(`${name} JSON-LD is invalid: ${error.message}`); }
  }
}

const hubJson = [...pages.hub.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map(([, json]) => JSON.parse(json))
  .flatMap((schema) => schema["@graph"] || [schema]);
const itemList = hubJson.find((node) => node["@type"] === "ItemList");
const hubItems = itemList?.itemListElement || [];
expect(hubItems.length === 2, "Publications hub must expose exactly two publications");
expect(hubItems[0]?.name === "Running Before Crawling" && hubItems[0]?.url.endsWith("/publications/running-before-crawling/"), "Running Before Crawling must be the first hub publication");
expect(hubItems[1]?.name === "Small Team, Bigger Output" && hubItems[1]?.url.endsWith("/publications/small-team-bigger-output/"), "Small Team, Bigger Output must be the second hub publication");
expect(!hubItems.some(({ name }) => name === "AI Economics Decision Framework"), "AI Economics Decision Framework must not be listed as a publication");

for (const [name, html] of [["homepage", home], ["publications hub", pages.hub]]) {
  const runningIndex = html.indexOf("Running Before Crawling");
  const smallTeamIndex = html.indexOf("Small Team, Bigger Output");
  expect(runningIndex >= 0 && smallTeamIndex > runningIndex, `${name} must show Running Before Crawling before Small Team, Bigger Output`);
  expect(html.includes("/publications/running-before-crawling/"), `${name} is missing the Running Before Crawling route`);
  expect(html.includes("/publications/small-team-bigger-output/"), `${name} is missing the Small Team, Bigger Output route`);
}

expect(home.includes("AI ECONOMICS · ORIGINAL RESEARCH"), "Homepage Running Before Crawling label is incorrect");
expect(!home.includes("PRIMARY WHITE PAPER · AI ECONOMICS"), "Homepage retains the superseded Running Before Crawling label");
expect(home.includes('href="/publications/running-before-crawling/">Read the publication</a>'), "Homepage Running Before Crawling primary CTA is incorrect");

const link = (html, route) => html.includes(`href="${route}"`);
for (const [source, html, destinations] of [
  ["homepage", home, ["/publications/running-before-crawling/", "/tools/ai-cost-reality-calculator/", "/case-studies/ai-economics-decision-framework/", "/publications/small-team-bigger-output/", "/tools/content-operations-readiness/", "/case-studies/small-team-bigger-output/"]],
  ["publications hub", pages.hub, ["/publications/running-before-crawling/", "/tools/ai-cost-reality-calculator/", "/case-studies/ai-economics-decision-framework/", "/publications/small-team-bigger-output/", "/tools/content-operations-readiness/", "/case-studies/small-team-bigger-output/"]],
  ["Running Before Crawling", pages.running, ["/tools/ai-cost-reality-calculator/", "/case-studies/ai-economics-decision-framework/"]],
  ["Small Team, Bigger Output", pages.smallTeam, ["/tools/content-operations-readiness/"]],
  ["AI framework case study", pages.aiCase, ["/publications/running-before-crawling/", "/tools/ai-cost-reality-calculator/"]],
  ["content-operations case study", pages.contentCase, ["/publications/small-team-bigger-output/", "/tools/content-operations-readiness/"]],
  ["AI calculator", pages.aiTool, ["/publications/running-before-crawling/", "/case-studies/ai-economics-decision-framework/"]],
  ["Content Workflow Snapshot", pages.contentTool, ["/publications/small-team-bigger-output/"]],
]) {
  for (const destination of destinations) expect(link(html, destination), `${source} is missing ${destination}`);
}

expect((pages.running.match(/class="paper-framework/g) || []).length === 9, "Running Before Crawling HTML is missing its nine inline framework figures");
expect((pages.smallTeam.match(/<section class="publication-chapter"/g) || []).length === 4, "Small Team, Bigger Output HTML is missing its four control chapters");
expect(caseHub.includes("/case-studies/ai-economics-decision-framework/") && caseHub.includes("/case-studies/small-team-bigger-output/"), "Case-studies hub does not link both supporting case studies");

const publicationSurfaces = [
  ["homepage", home],
  ["publications hub", pages.hub],
  ["Running Before Crawling", pages.running],
  ["Small Team, Bigger Output", pages.smallTeam],
  ["sitemap.xml", sitemap],
  ["llms.txt", llms],
];
for (const [name, content] of publicationSurfaces) {
  expect(!/\.pdf\b|download\s+pdf|save\s+as\s+pdf|whitepaper_download/i.test(content), `${name} contains a public PDF reference or CTA`);
}
expect(!/href="\/insights\//i.test(Object.values(pages).join("\n") + home + caseHub), "Public HTML links to the retired Insights system");
expect(!/\/insights\/|\.pdf\b/i.test(sitemap), "Sitemap contains a retired Insights route or PDF");
expect(!/\/insights\/|running-before-crawling[^\n]*\.pdf/i.test(llms), "llms.txt contains a retired publication route or publication PDF");

for (const route of [
  "/publications/",
  "/publications/running-before-crawling/",
  "/publications/small-team-bigger-output/",
  "/case-studies/ai-economics-decision-framework/",
  "/case-studies/small-team-bigger-output/",
  "/tools/ai-cost-reality-calculator/",
  "/tools/content-operations-readiness/",
]) {
  expect(sitemap.includes(`https://sudeeparya.com${route}`), `sitemap is missing ${route}`);
  expect(llms.includes(`https://sudeeparya.com${route}`), `llms.txt is missing ${route}`);
}

for (const [legacy, destination] of [
  ["/insights/running-before-crawling/", "/publications/running-before-crawling/"],
  ["/whitepapers/running-before-crawling/", "/publications/running-before-crawling/"],
  ["/assets/whitepapers/sudeep-arya-running-before-crawling.pdf", "/publications/running-before-crawling/"],
  ["/downloads/running-before-crawling-executive-edition.pdf", "/publications/running-before-crawling/"],
]) {
  expect(redirects.includes(`${legacy} ${destination} 301!`), `targeted legacy redirect is missing: ${legacy}`);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".codex-input", ".codex-inputs", ".staging-dist", "reports", "artifacts", "node_modules", "source-assets"].includes(entry.name)) return [];
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}
const publicPdfs = walk(root)
  .filter((file) => statSync(file).isFile() && file.toLowerCase().endsWith(".pdf"))
  .map((file) => path.relative(root, file).replaceAll(path.sep, "/"))
  .filter((file) => file !== "resume/Sudeep-Arya-Amazon-DTC-Marketplace-AI-Commerce-Resume.pdf");
expect(publicPdfs.length === 0, `deployable non-resume PDF files remain: ${publicPdfs.join(", ")}`);

if (failures.length) {
  console.error(`Publication validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Publication validation passed: two ordered HTML publications, supporting case studies and tools, targeted legacy redirects, and no deployable publication PDFs.");
