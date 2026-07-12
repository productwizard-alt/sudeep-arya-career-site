#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputDir = process.argv[2];
if (!outputDir) {
  throw new Error("Usage: node scripts/validate-staging-output.mjs <publish-directory>");
}

const expectedRobots = `# Staging indexing is controlled by the X-Robots-Tag response header.
User-agent: *
Allow: /
`;
const requiredHeader = "X-Robots-Tag: noindex, nofollow, noarchive, nosnippet";
const requiredMeta = '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">';
const issues = [];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

const files = await filesIn(outputDir);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of files) {
  const relative = path.relative(outputDir, file).replaceAll(path.sep, "/");
  if (/(^|\/)(\.git|\.netlify|reports|screenshots|source-assets|artifacts|node_modules|tests|browser-profiles?|caches?)(\/|$)/iu.test(relative)) {
    issues.push(`${relative}: forbidden staging output path`);
  }
}

for (const file of htmlFiles) {
  const relative = path.relative(outputDir, file).replaceAll(path.sep, "/");
  const html = await readFile(file, "utf8");
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/giu)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const robotsMetaTags = [...html.matchAll(/<meta\b[^>]*\bname=["']robots["'][^>]*>/giu)];

  if (robotsMetaTags.length !== 1 || robotsMetaTags[0][0] !== requiredMeta) issues.push(`${relative}: expected exactly one staging robots meta tag`);
  if (html.split("STAGING — NOT PRODUCTION").length !== 2) issues.push(`${relative}: expected exactly one staging banner`);
  if (!/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']https:\/\/sudeeparya\.com\//iu.test(html)) {
    issues.push(`${relative}: production canonical URL missing`);
  }
  if (/G-C65RGRMMW1|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|\bgtag\s*\(/iu.test(html)) {
    issues.push(`${relative}: analytics code remains in generated HTML`);
  }
  if (/Flemington/iu.test(html)) issues.push(`${relative}: deprecated Flemington reference present`);
  if (duplicateIds.length) issues.push(`${relative}: duplicate IDs: ${duplicateIds.join(", ")}`);

  for (const match of html.matchAll(/\saria-controls=["']([^"']+)["']/giu)) {
    for (const target of match[1].trim().split(/\s+/u)) {
      if (!ids.includes(target)) issues.push(`${relative}: aria-controls target not found: ${target}`);
    }
  }

  for (const match of html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      issues.push(`${relative}: invalid JSON-LD: ${error.message}`);
    }
  }
}

const headers = await readFile(path.join(outputDir, "_headers"), "utf8");
if (!headers.includes(requiredHeader)) issues.push(`_headers: missing ${requiredHeader}`);
if (!headers.includes("Cache-Control: no-store")) issues.push("_headers: missing Cache-Control: no-store");

const robots = await readFile(path.join(outputDir, "robots.txt"), "utf8");
if (robots !== expectedRobots) issues.push("robots.txt: contents differ from the staging policy");
if (/sitemap/iu.test(robots.replace(/^#.*$/gmu, ""))) issues.push("robots.txt: sitemap is advertised");

if (issues.length) {
  console.error(`Staging output validation failed (${issues.length} issues):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Staging output validation passed: ${htmlFiles.length} HTML files hardened.`);
