#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = ["publications/index.html", "publications/small-team-bigger-output/index.html", "case-studies/small-team-bigger-output/index.html", "tools/index.html", "tools/content-operations-readiness/index.html"];
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

for (const route of routes) {
  const file = path.join(root, route);
  await stat(file);
  const html = await readFile(file, "utf8");
  check((html.match(/<h1\b/gi) || []).length === 1, `${route}: expected one H1`);
  check(/class="skip-link"/i.test(html), `${route}: missing skip link`);
  check(/rel="canonical"/i.test(html), `${route}: missing canonical`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
  check(ids.length === new Set(ids).size, `${route}: duplicate IDs`);
  for (const control of html.matchAll(/\baria-controls="([^"]+)"/gi)) check(ids.includes(control[1]), `${route}: aria-controls target ${control[1]} missing`);
  for (const script of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(script[1]); } catch { failures.push(`${route}: invalid JSON-LD`); }
  }
}

const publication = await readFile(path.join(root, "publications/small-team-bigger-output/index.html"), "utf8");
check((publication.match(/class="publication-chapter"/g) || []).length === 10, "Publication must contain ten chapters");
check((publication.match(/data-framework=/g) || []).length >= 8, "Publication must contain eight interactive frameworks");
check(publication.includes("docs.n8n.io/advanced-ai/human-in-the-loop-tools/"), "Corrected n8n source missing");
check(publication.includes("www.canva.com/pro/brand-kit/"), "Stable Canva Brand Kit source missing");
check(!/download(?:able)?\s+(?:white\s*paper|publication)|download\s+pdf/i.test(publication), "Publication contains prohibited PDF/download language");
check(!/datePublished|July 13, 2026.*publication/i.test(publication), "Publication invents a public launch date");

const tool = await readFile(path.join(root, "tools/content-operations-readiness/index.html"), "utf8");
check((tool.match(/id="quick-[^"]+"[^>]*\brequired/g) || []).length === 6, "Quick Mode must have exactly six required inputs");
check(!/googletagmanager|G-C65RGRMMW1|data-netlify|netlify-honeypot/i.test(tool), "New calculator must remain analytics- and Netlify-Forms-free");
check(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/i.test(tool), "New calculator page contains prohibited transmission/storage API");
const toolJs = await readFile(path.join(root, "tools/content-operations-readiness/content-operations-tool.js"), "utf8");
check(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|gtag\(/i.test(toolJs), "Tool interface contains prohibited transmission/storage/analytics API");
check(!/location\.(?:hash|search)|URLSearchParams/i.test(toolJs), "Tool places state in URL");

const redirects = await readFile(path.join(root, "_redirects"), "utf8");
for (const route of ["/insights/", "/whitepapers/"]) check(new RegExp(`^${route.replaceAll("/", "\\/")} .*410!$`, "m").test(redirects), `Deleted route ${route} must retain 410`);
const htmlFiles = (await (await import("node:fs/promises")).readdir(root, { recursive: true })).filter((file) => file.endsWith(".html"));
const allHtml = await Promise.all(htmlFiles.map((file) => readFile(path.join(root, file), "utf8")));
check(allHtml.every((html) => !html.includes('href="/tools/ai-cost-reality-calculator/">AI Cost Calculator')), "Legacy primary navigation label remains");
check(allHtml.every((html) => !/Flemington/i.test(html)), "Forbidden location term found");

if (failures.length) {
  console.error(`Content operations validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
assert.equal(failures.length, 0);
console.log(`Content operations validation passed: ${routes.length} new routes, 10 chapters, 8+ frameworks, privacy and source controls verified.`);
