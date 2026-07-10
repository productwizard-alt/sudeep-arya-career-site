import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => existsSync(path.join(root, relative));

const insights = read("insights/index.html");
const paper = read("insights/running-before-crawling/index.html");
const sitemap = read("sitemap.xml");
const llms = read("llms.txt");
const redirects = read("_redirects");
const publicFiles = [insights, paper, sitemap, llms, read("index.html"), read("case-studies/index.html"), read("engagements/index.html")];

const expectedAssets = [
  "board_gate.png",
  "cost_iceberg.png",
  "cover.png",
  "crawl_walk_run_earn.png",
  "ecommerce_matrix.png",
  "evidence_snapshot.png",
  "public_lessons.png",
  "work_stack.png",
];

for (const relative of [
  "insights/index.html",
  "insights/running-before-crawling/index.html",
  "assets/whitepapers/sudeep-arya-running-before-crawling.pdf",
  "assets/whitepapers/ai-leadership-cost-crisis-social-preview.png",
  "source-assets/ai-leadership-cost-crisis-social-preview.svg",
  "_redirects",
  ...expectedAssets.map((name) => `assets/whitepapers/running-before-crawling/${name}`),
]) {
  expect(exists(relative), `missing required file: ${relative}`);
}

const png = readFileSync(path.join(root, "assets/whitepapers/ai-leadership-cost-crisis-social-preview.png"));
expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "social preview is not a PNG");
expect(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, "social preview is not 1200x630");

expect((paper.match(/<h1\b/gi) || []).length === 1, "whitepaper page must have exactly one H1");
expect((insights.match(/<h1\b/gi) || []).length === 1, "insights page must have exactly one H1");
for (const required of [
  "Running Before Crawling",
  "Why AI spending balloons when leadership buys automation before rebuilding the work.",
  "Sudeep Arya",
  "Published July 10, 2026",
  "Approx. 35-minute read",
  "Download the PDF",
  "Read Online",
  "About This Paper",
  "About Sudeep Arya",
  "References",
  "Artificial intelligence was used heavily in the research",
  "AI helped build the paper. It did not choose, own, or approve the position.",
  "Gartner forecast",
  "company-reported",
  "British Columbia tribunal",
  "Automated transcript retrieval was unavailable",
]) {
  expect(paper.includes(required), `whitepaper is missing required content: ${required}`);
}
for (const required of [
  "Ideas shaped by the work.",
  "Perspectives on ecommerce, AI, marketplaces, retail media, technology, and the leadership decisions that determine whether transformation creates value or simply creates cost.",
  "Running Before Crawling",
]) {
  expect(insights.includes(required), `insights index is missing required content: ${required}`);
}

const duplicateIds = (html) => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
};
expect(duplicateIds(paper).length === 0, `duplicate IDs on whitepaper: ${duplicateIds(paper).join(", ")}`);
expect(duplicateIds(insights).length === 0, `duplicate IDs on insights: ${duplicateIds(insights).join(", ")}`);

const anchors = new Set([...paper.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
for (const href of [...paper.matchAll(/href=["']#([^"']+)["']/gi)].map((match) => match[1])) {
  expect(anchors.has(href), `broken in-page anchor: #${href}`);
}

for (const html of [insights, paper]) {
  const jsonLd = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  expect(jsonLd.length > 0, "page is missing JSON-LD");
  for (const [, json] of jsonLd) {
    try { JSON.parse(json); } catch (error) { fail(`invalid JSON-LD: ${error.message}`); }
  }
}

const pdfLinks = [...paper.matchAll(/href=["']([^"']+\.pdf)["']/gi)].map((match) => match[1]);
expect(pdfLinks.length >= 2, "whitepaper needs visible PDF download links");
expect(pdfLinks.every((href) => href === "/assets/whitepapers/sudeep-arya-running-before-crawling.pdf"), "whitepaper contains a non-canonical PDF link");
expect(paper.includes("https://sudeeparya.com/insights/running-before-crawling/"), "whitepaper canonical/schema route is wrong");
expect(insights.includes("https://sudeeparya.com/insights/"), "insights canonical/schema route is wrong");
expect(sitemap.includes("https://sudeeparya.com/insights/"), "sitemap is missing insights index");
expect(sitemap.includes("https://sudeeparya.com/insights/running-before-crawling/"), "sitemap is missing canonical paper route");
expect(!sitemap.includes("/whitepapers/"), "sitemap still exposes obsolete whitepaper routes");
expect(llms.includes("https://sudeeparya.com/insights/"), "llms.txt is missing insights index");
expect(llms.includes("https://sudeeparya.com/insights/running-before-crawling/"), "llms.txt is missing canonical paper route");
expect(redirects.includes("/whitepapers/ /insights/ 301!"), "legacy whitepaper index redirect is missing");
expect(redirects.includes("/whitepapers/running-before-crawling/ /insights/running-before-crawling/ 301!"), "legacy paper redirect is missing");

const forbidden = [/qrcode_chatgpt\.com\.png/i, /\.codex-inputs/i, /\/home\/sudeep/i, /localhost(?::\d+)?/i, /TODO|FIXME|Lorem ipsum|PLACEHOLDER/i];
for (const [index, content] of publicFiles.entries()) {
  for (const pattern of forbidden) expect(!pattern.test(content), `forbidden or placeholder content in public file ${index}: ${pattern}`);
}

if (!process.exitCode) console.log(`PASS: whitepaper publication package validated; ${expectedAssets.length} visuals, canonical route /insights/running-before-crawling/, PDF path verified.`);
