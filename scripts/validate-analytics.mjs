#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const excludedPages = new Set([
  "tools/ai-cost-reality-calculator/index.html",
  "tools/ai-cost-reality-calculator/advanced/index.html",
  "tools/content-operations-readiness/index.html",
]);
const skippedDirectories = new Set([
  ".git",
  ".netlify",
  ".staging-dist",
  "artifacts",
  "node_modules",
  "reports",
  "screenshots",
  "source-assets",
  "tests",
]);
const issues = [];

const headSnippet = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-N2MVP44C');</script>
<!-- End Google Tag Manager -->`;

const bodySnippet = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-N2MVP44C"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

async function filesIn(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(absolute, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

const occurrences = (content, value) => content.split(value).length - 1;
const directGaPattern = /googletagmanager\.com\/gtag\/js|\bgtag\s*\(\s*['"](?:config|event|js)['"]|window\.gtag/iu;
const analyticsDispatchPattern = /\bdataLayer\.push\s*\(|\bgtag\s*\(/iu;
const gtmPattern = /GTM-N2MVP44C|googletagmanager\.com\/(?:gtm\.js|ns\.html)/iu;

const files = await filesIn(root);
const htmlFiles = files.filter((file) => file.endsWith(".html")).sort();
const eligiblePages = htmlFiles.filter((file) => !excludedPages.has(file));

for (const expected of excludedPages) {
  if (!htmlFiles.includes(expected)) issues.push(`${expected}: excluded calculator page is missing`);
}

for (const file of htmlFiles) {
  const html = await readFile(path.join(root, file), "utf8");
  const withoutApprovedGtm = html.replace(headSnippet, "").replace(bodySnippet, "");

  if (directGaPattern.test(html)) issues.push(`${file}: direct GA4 or gtag initialization remains`);
  if (analyticsDispatchPattern.test(withoutApprovedGtm)) issues.push(`${file}: analytics event dispatch remains outside the approved GTM bootstrap`);

  if (excludedPages.has(file)) {
    if (gtmPattern.test(html)) issues.push(`${file}: excluded calculator page contains GTM`);
    if (occurrences(html, headSnippet) || occurrences(html, bodySnippet)) issues.push(`${file}: excluded calculator page contains an approved GTM snippet`);
    continue;
  }

  if (occurrences(html, headSnippet) !== 1) issues.push(`${file}: expected exactly one exact GTM head snippet`);
  if (occurrences(html, bodySnippet) !== 1) issues.push(`${file}: expected exactly one exact GTM noscript snippet`);
  if (occurrences(html, "GTM-N2MVP44C") !== 2) issues.push(`${file}: expected exactly two container-ID references, one per supplied snippet`);

  const headIndex = html.indexOf("<head>");
  const gtmHeadIndex = html.indexOf(headSnippet);
  const headEndIndex = html.indexOf("</head>");
  if (headIndex < 0 || gtmHeadIndex !== headIndex + "<head>\n".length || gtmHeadIndex > headEndIndex) {
    issues.push(`${file}: GTM head snippet is not immediately after <head>`);
  }

  const bodyMatch = html.match(/<body\b[^>]*>/u);
  if (!bodyMatch || html.slice((bodyMatch.index || 0) + bodyMatch[0].length, (bodyMatch.index || 0) + bodyMatch[0].length + bodySnippet.length + 1) !== `\n${bodySnippet}`) {
    issues.push(`${file}: GTM noscript snippet is not immediately after the opening <body> tag`);
  }
}

for (const file of files.filter((candidate) => candidate.endsWith(".js") && !candidate.startsWith("scripts/"))) {
  const source = await readFile(path.join(root, file), "utf8");
  if (directGaPattern.test(source) || analyticsDispatchPattern.test(source) || gtmPattern.test(source) || source.includes("G-C65RGRMMW1")) {
    issues.push(`${file}: deployable JavaScript contains analytics loading or dispatch code`);
  }
}

if (issues.length) {
  console.error(`Analytics validation failed (${issues.length} issues):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Analytics validation passed: ${eligiblePages.length} eligible pages contain exact GTM snippets; ${excludedPages.size} calculator pages and all deployable JavaScript remain analytics-free.`);
