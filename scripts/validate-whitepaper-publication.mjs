import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const exists = (relative) => existsSync(path.join(root, relative));
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

const removedPaths = [
  "insights/index.html",
  "insights/running-before-crawling/index.html",
  "insights/running-before-crawling/whitepaper.css",
  "case-studies/running-before-crawling-whitepaper/index.html",
  "whitepapers/index.html",
  "whitepapers/running-before-crawling/index.html",
  "whitepapers/running-before-crawling/whitepaper.css",
  "assets/whitepapers/sudeep-arya-running-before-crawling.pdf",
  "assets/whitepapers/ai-leadership-cost-crisis-social-preview.png",
  "source-assets/ai-leadership-cost-crisis-social-preview.svg",
];
for (const relative of removedPaths) expect(!exists(relative), `removed public file still exists: ${relative}`);

const removedAssets = [
  "board_gate.png",
  "cost_iceberg.png",
  "cover.png",
  "crawl_walk_run_earn.png",
  "ecommerce_matrix.png",
  "evidence_snapshot.png",
  "public_lessons.png",
  "work_stack.png",
];
for (const name of removedAssets) {
  expect(!exists(`assets/whitepapers/running-before-crawling/${name}`), `public publication asset still exists: ${name}`);
  expect(!exists(`whitepapers/running-before-crawling/assets/${name}`), `legacy publication asset still exists: ${name}`);
}

const redirects = read("_redirects");
for (const route of [
  "/insights/",
  "/insights/running-before-crawling/",
  "/assets/whitepapers/sudeep-arya-running-before-crawling.pdf",
  "/whitepapers/",
  "/whitepapers/running-before-crawling/",
  "/case-studies/running-before-crawling-whitepaper/",
]) {
  expect(redirects.includes(`${route} /404.html 410!`), `missing exact 410 redirect: ${route}`);
}
expect(!redirects.includes("301"), "legacy publication redirect still returns 301");

const publicFiles = [];
const skipDirs = new Set([".git", ".codex-inputs", "reports", "artifacts", "node_modules", "scripts"]);
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(full);
      continue;
    }
    if (/\.(html|css|js|xml|txt)$/i.test(entry.name) && entry.name !== "_redirects") publicFiles.push(full);
  }
};
walk(root);

const forbiddenPublicReferences = [
  /running-before-crawling/i,
  /Running Before Crawling/i,
  /sudeep-arya-running-before-crawling\.pdf/i,
  /\/whitepapers\//i,
];
for (const file of publicFiles) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenPublicReferences) {
    if (pattern.test(content)) failures.push(`public reference remains in ${path.relative(root, file)}: ${pattern}`);
  }
}

const sitemap = read("sitemap.xml");
const llms = read("llms.txt");
for (const contentName of ["sitemap.xml", "llms.txt"]) {
  const content = contentName === "sitemap.xml" ? sitemap : llms;
  for (const pattern of forbiddenPublicReferences) expect(!pattern.test(content), `${contentName} still references removed publication: ${pattern}`);
}

if (failures.length) {
  console.error(`Whitepaper removal validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Whitepaper removal validation passed: public routes, assets, links, and metadata are removed; exact 410 redirects are present.");
