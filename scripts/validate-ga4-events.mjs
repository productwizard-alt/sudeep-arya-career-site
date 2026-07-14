#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const root = new URL("../", import.meta.url).pathname;
const issues = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) issues.push(message);
};

const expectedEvents = new Set([
  "calendar_open",
  "case_study_expand",
  "content_expand",
  "copy_action",
  "cta_select",
  "engagement_topic_select",
  "generate_lead",
  "lead_form_open",
  "lead_form_submit_attempt",
  "nav_select",
  "print_request",
  "publication_section_view",
  "resume_download",
  "select_content",
  "share",
]);

const expectedParameters = new Set([
  "action_state",
  "action_type",
  "calendar_type",
  "case_study_id",
  "component_id",
  "content_id",
  "content_type",
  "destination_path",
  "file_id",
  "form_type",
  "item_id",
  "lead_type",
  "method",
  "nav_type",
  "placement",
  "publication_id",
  "section_id",
  "section_order",
  "source_page",
  "topic_id",
]);

const reservedManualEvents = new Set(["click", "file_download", "form_start", "form_submit", "page_view", "scroll"]);
const excludedRoutes = [
  "tools/ai-cost-reality-calculator/index.html",
  "tools/ai-cost-reality-calculator/advanced/index.html",
  "tools/content-operations-readiness/index.html",
];
const excludedScripts = [
  "tools/ai-cost-reality-calculator/calculator.js",
  "tools/ai-cost-reality-calculator/basic-calculator.js",
  "tools/ai-cost-reality-calculator/advanced/advanced-calculator.js",
  "tools/content-operations-readiness/content-operations-tool.js",
];

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", ".netlify", ".staging-dist", "node_modules", "artifacts"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
};

const script = await readFile(join(root, "script.js"), "utf8");
const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html") && !file.includes("/reports/"));

const extractSet = (name) => {
  const body = script.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`, "u"))?.[1] || "";
  return new Set([...body.matchAll(/"([a-z0-9_]+)"/gu)].map((match) => match[1]));
};

const sameSet = (left, right) => left.size === right.size && [...left].every((value) => right.has(value));
check(sameSet(extractSet("approvedAnalyticsEvents"), expectedEvents), "script.js approved event allowlist differs from the validated schema");
check(sameSet(extractSet("approvedAnalyticsParameters"), expectedParameters), "script.js approved parameter allowlist differs from the validated schema");

for (const eventName of expectedEvents) {
  check(/^[a-z][a-z0-9_]*$/u.test(eventName), `Invalid event name: ${eventName}`);
  check(eventName.length <= 40, `Event name exceeds 40 characters: ${eventName}`);
  check(!eventName.startsWith("firebase_") && !eventName.startsWith("ga_") && !eventName.startsWith("google_") && !reservedManualEvents.has(eventName), `Reserved event name: ${eventName}`);
}

for (const parameterName of expectedParameters) {
  check(/^[a-z][a-z0-9_]*$/u.test(parameterName), `Invalid parameter name: ${parameterName}`);
  check(parameterName.length <= 40, `Parameter name exceeds 40 characters: ${parameterName}`);
  check(!/(email|name|phone|telephone|company|message|address|query|referrer|user_id|session_id)/iu.test(parameterName), `PII-like parameter name: ${parameterName}`);
}

const emittedEvents = new Set();
for (const match of script.matchAll(/(?:^|[^A-Za-z])trackEvent\(\s*"([a-z0-9_]+)"/gmu)) emittedEvents.add(match[1]);
for (const match of script.matchAll(/trackOnce\([^,]+,\s*"([a-z0-9_]+)"/gu)) emittedEvents.add(match[1]);
for (const path of ["engagements/engagements.js", "publications/small-team-bigger-output/publication.js"]) {
  const source = await readFile(join(root, path), "utf8");
  for (const match of source.matchAll(/\.trackEvent\(\s*"([a-z0-9_]+)"/gu)) emittedEvents.add(match[1]);
  for (const match of source.matchAll(/\.trackOnce\([^,]+,\s*"([a-z0-9_]+)"/gu)) emittedEvents.add(match[1]);
}
for (const eventName of emittedEvents) check(expectedEvents.has(eventName), `Non-allowlisted event emitted: ${eventName}`);

for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  const label = relative(root, file);
  for (const match of source.matchAll(/data-ga-event="([^"]+)"/gu)) {
    const eventName = match[1];
    check(expectedEvents.has(eventName), `${label}: annotated event is not allowlisted: ${eventName}`);
    check(eventName.length <= 40, `${label}: annotated event exceeds 40 characters: ${eventName}`);
  }
  for (const match of source.matchAll(/data-([a-z0-9-]+)="([^"]*)"/gu)) {
    if (!match[1].startsWith("ga-") && !expectedParameters.has(match[1].replace(/-/gu, "_")) && match[1] !== "destination") continue;
    check(match[2].length <= 100, `${label}: analytics annotation exceeds 100 characters: data-${match[1]}`);
    if (match[1] === "destination") check(!match[2].includes("?"), `${label}: destination annotation contains a query string: ${match[2]}`);
  }
}

for (const path of excludedRoutes) {
  const source = await readFile(join(root, path), "utf8");
  check(!/data-ga-|data-copy-action|data-share-method/iu.test(source), `${path}: calculator/privacy route contains tracking annotations`);
}

for (const path of excludedScripts) {
  const source = await readFile(join(root, path), "utf8");
  check(!/\bgtag\s*\(|siteAnalytics|google-analytics|googletagmanager/iu.test(source), `${path}: calculator/privacy script contains analytics dispatch code`);
}

check((script.match(/window\.gtag\("config",\s*"G-C65RGRMMW1"\)/gu) || []).length === 1, "Expected exactly one direct GA4 configuration");
check((script.match(/googletagmanager\.com\/gtag\/js\?id=G-C65RGRMMW1/gu) || []).length === 1, "Expected exactly one direct GA4 loader");
check((script.match(/window\.gtag\("js",\s*new Date\(\)\)/gu) || []).length === 1, "Expected exactly one GA4 initialization");
check(!/(case_study_slug|publication_slug|asset_type|cta_type|\bdestination\s*:)/u.test(script), "Legacy or non-allowlisted analytics parameter remains in script.js");
check(!/trackEvent\(\s*"(?:click|scroll|file_download|form_start|form_submit|page_view)"/u.test(script), "Reserved Enhanced Measurement event is emitted manually");
check(script.includes("trackOnce(`lead_success_${successLead}`"), "Success-page lead event is not protected by once-per-page deduplication");
check(script.includes("!analyticsAllowed") && script.includes("analyticsBlockedRoutes"), "Production-host or calculator-route event gating is missing");
check(script.includes("document.addEventListener(\"click\"") && script.includes("}, true);"), "Delegated capture-phase interaction listener is missing");
check(script.includes("sanitizeDestinationPath") && script.includes("approvedAnalyticsParameters.has(name)"), "Parameter sanitation is missing");

const stagingTransform = await readFile(join(root, "scripts/transform-staging.mjs"), "utf8");
const stagingValidator = await readFile(join(root, "scripts/validate-staging-output.mjs"), "utf8");
check(stagingTransform.includes("G-C65RGRMMW1") && /window\\\.gtag|\\bgtag/u.test(stagingTransform), "Staging transform does not strip inline direct GA4");
check(stagingValidator.includes("G-C65RGRMMW1") && stagingValidator.includes("analytics code remains"), "Staging validator does not reject analytics");

if (issues.length) {
  console.error(`GA4 event validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`GA4 event validation passed (${checks} checks, ${htmlFiles.length} eligible/source HTML files scanned).`);
