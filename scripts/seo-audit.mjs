#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, "reports", "seo-aeo-geo-v1");
const canonicalOrigin = "https://sudeeparya.com";
const indexableRoutes = new Set([
  "/",
  "/resume/",
  "/case-studies/",
  "/case-studies/banfield-subscription-commerce/",
  "/case-studies/running-before-crawling-whitepaper/",
  "/insights/",
  "/insights/running-before-crawling/",
  "/skills/",
  "/recruiters/",
  "/audit/",
  "/contact/",
  "/engagements/",
]);
const requiredOg = ["og:type", "og:title", "og:description", "og:url", "og:image", "og:image:width", "og:image:height", "og:image:alt"];
const requiredTwitter = ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"];
const skipDirs = new Set([".git", ".codex-inputs", "reports", "artifacts", "node_modules"]);

function walk(dir, predicate) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) return [];
      return walk(full, predicate);
    }
    return entry.isFile() && predicate(full) ? [full] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function routeForFile(file) {
  const relative = rel(file);
  if (relative === "index.html") return "/";
  if (relative === "404.html") return "/404.html";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function text(html, selector) {
  const patterns = {
    title: /<title>([\s\S]*?)<\/title>/i,
    h1: /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  };
  const match = html.match(patterns[selector]);
  return match ? strip(match[1]) : "";
}

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)=["']${escaped}["']\\s+content=["']([^"']*)["'][^>]*>`, "i"));
  return match ? match[1] : "";
}

function link(html, relValue) {
  const escaped = relValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<link\\s+rel=["']${escaped}["']\\s+href=["']([^"']+)["'][^>]*>`, "i"));
  return match ? match[1] : "";
}

function strip(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function csv(value) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
}

function nodesFromSchema(schema) {
  if (Array.isArray(schema)) return schema.flatMap(nodesFromSchema);
  if (!schema || typeof schema !== "object") return [];
  if (Array.isArray(schema["@graph"])) return schema["@graph"].flatMap(nodesFromSchema);
  return [schema];
}

function attrs(html, attr) {
  return [...html.matchAll(new RegExp(`\\s${attr}=["']([^"']*)["']`, "gi"))].map((match) => match[1]);
}

function hrefs(html) {
  return attrs(html, "href").filter((value) => value && !value.startsWith("#"));
}

function isInternal(value) {
  return value.startsWith("/") || value.startsWith(canonicalOrigin);
}

function fileForPath(urlPath) {
  const clean = decodeURI(urlPath).split("?")[0];
  if (clean === "/") return path.join(root, "index.html");
  if (clean.endsWith("/")) return path.join(root, clean, "index.html");
  return path.join(root, clean);
}

function anchorsFor(html) {
  return new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
}

function localTarget(raw, currentRoute) {
  let value = raw.startsWith(canonicalOrigin) ? raw.slice(canonicalOrigin.length) || "/" : raw;
  const [pathname, hash] = value.split("#");
  const base = pathname || currentRoute;
  const resolved = base.startsWith("/") ? base : path.posix.normalize(`${path.posix.dirname(currentRoute)}/${base}`);
  return { pathname: resolved, hash };
}

const htmlFiles = walk(root, (file) => file.endsWith(".html")).sort((a, b) => routeForFile(a).localeCompare(routeForFile(b)));
const pages = htmlFiles.map((file) => ({ file, route: routeForFile(file), html: readFileSync(file, "utf8") }));
const byRoute = new Map(pages.map((page) => [page.route, page]));
const inbound = new Map(pages.map((page) => [page.route, 0]));
const issues = [];
const structuredInventory = [];

for (const page of pages) {
  for (const raw of hrefs(page.html).filter(isInternal)) {
    const { pathname } = localTarget(raw, page.route);
    const targetFile = fileForPath(pathname);
    if (existsSync(targetFile)) {
      const targetRoute = targetFile.endsWith("index.html") ? routeForFile(targetFile) : pathname;
      if (inbound.has(targetRoute)) inbound.set(targetRoute, inbound.get(targetRoute) + 1);
    }
  }
}

const inventoryRows = [];
for (const page of pages) {
  const isIndexable = indexableRoutes.has(page.route);
  const title = text(page.html, "title");
  const description = meta(page.html, "description");
  const canonical = link(page.html, "canonical");
  const h1s = [...page.html.matchAll(/<h1[\s>]/gi)].length;
  const robots = meta(page.html, "robots") || "none";
  const ogMissing = requiredOg.filter((name) => !meta(page.html, name));
  const twitterMissing = requiredTwitter.filter((name) => !meta(page.html, name));
  const ids = attrs(page.html, "id");
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const emptyLinks = [...page.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter((match) => !strip(match[2]) && !/aria-label=/i.test(match[1]));
  const imageAltIssues = [...page.html.matchAll(/<img\b([^>]*)>/gi)].filter((match) => !/\salt=["'][^"']*["']/i.test(match[1])).length;
  const jsonTypes = [];
  for (const [index, block] of jsonLdBlocks(page.html).entries()) {
    try {
      const parsed = JSON.parse(block);
      const nodes = nodesFromSchema(parsed);
      const types = nodes.map((node) => Array.isArray(node["@type"]) ? node["@type"].join(",") : node["@type"]).filter(Boolean);
      jsonTypes.push(...types);
      structuredInventory.push({
        page: page.route,
        schemaType: types.join(", "),
        "@id": nodes.map((node) => node["@id"]).filter(Boolean).join(", "),
        primaryEntity: nodes.find((node) => node.mainEntity)?.mainEntity?.["@id"] || nodes.find((node) => node.about)?.about?.["@id"] || "",
        validationStatus: "valid",
        issues: [],
        changesMade: "Audited and normalized during SEO/AEO/GEO implementation."
      });
    } catch (error) {
      structuredInventory.push({
        page: page.route,
        schemaType: "",
        "@id": "",
        primaryEntity: "",
        validationStatus: "invalid",
        issues: [error.message],
        changesMade: ""
      });
      issues.push(`${page.route}: invalid JSON-LD block ${index + 1}`);
    }
  }

  const broken = [];
  for (const raw of [...hrefs(page.html), ...attrs(page.html, "src"), ...attrs(page.html, "action")].filter(isInternal)) {
    const { pathname, hash } = localTarget(raw, page.route);
    const target = fileForPath(pathname);
    if (!existsSync(target)) {
      broken.push(raw);
      continue;
    }
    if (hash) {
      const htmlTarget = statSync(target).isDirectory() ? path.join(target, "index.html") : target;
      if (htmlTarget.endsWith(".html") && !anchorsFor(readFileSync(htmlTarget, "utf8")).has(hash)) broken.push(raw);
    }
  }

  if (isIndexable && !canonical.startsWith(`${canonicalOrigin}/`)) issues.push(`${page.route}: missing canonical origin`);
  if (isIndexable && h1s !== 1) issues.push(`${page.route}: expected one H1, found ${h1s}`);
  if (duplicateIds.length) issues.push(`${page.route}: duplicate IDs ${[...new Set(duplicateIds)].join(", ")}`);
  if (emptyLinks.length) issues.push(`${page.route}: empty links found`);
  if (broken.length) issues.push(`${page.route}: broken local references ${broken.join(", ")}`);
  if (isIndexable && (ogMissing.length || twitterMissing.length)) issues.push(`${page.route}: social metadata missing`);

  inventoryRows.push({
    route: page.route,
    file: rel(page.file),
    indexable: isIndexable ? "yes" : "no",
    title,
    "meta description": description,
    canonical,
    H1: text(page.html, "h1"),
    "robots directive": robots,
    "Open Graph status": ogMissing.length ? `missing ${ogMissing.join("; ")}` : "complete",
    "Twitter metadata status": twitterMissing.length ? `missing ${twitterMissing.join("; ")}` : "complete",
    "JSON-LD types": [...new Set(jsonTypes)].join("; "),
    "internal inbound links": inbound.get(page.route) || 0,
    "internal outbound links": hrefs(page.html).filter(isInternal).length,
    "broken links": broken.join("; "),
    "image-alt issues": imageAltIssues,
    notes: duplicateIds.length ? `Duplicate IDs: ${[...new Set(duplicateIds)].join("; ")}` : ""
  });
}

const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const route of indexableRoutes) {
  const url = `${canonicalOrigin}${route}`;
  if (!sitemapUrls.includes(url)) issues.push(`sitemap.xml: missing ${url}`);
}
for (const url of sitemapUrls) {
  if (!url.startsWith(canonicalOrigin)) issues.push(`sitemap.xml: non-canonical host ${url}`);
  const route = url.slice(canonicalOrigin.length) || "/";
  if (!indexableRoutes.has(route)) issues.push(`sitemap.xml: includes non-indexable route ${url}`);
}
const robots = readFileSync(path.join(root, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`)) issues.push("robots.txt: sitemap reference missing or inconsistent");
if (readFileSync(path.join(root, "script.js"), "utf8").includes("G-C65RGRMMW1")) {
  issues.push("script.js: GA4 ID should remain in HTML, not script.js");
}

mkdirSync(reportDir, { recursive: true });
const columns = [
  "route",
  "file",
  "indexable",
  "title",
  "meta description",
  "canonical",
  "H1",
  "robots directive",
  "Open Graph status",
  "Twitter metadata status",
  "JSON-LD types",
  "internal inbound links",
  "internal outbound links",
  "broken links",
  "image-alt issues",
  "notes",
];
writeFileSync(
  path.join(reportDir, "page-inventory.csv"),
  [columns.join(","), ...inventoryRows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n"
);
writeFileSync(path.join(reportDir, "structured-data-inventory.json"), JSON.stringify(structuredInventory, null, 2) + "\n");

if (issues.length) {
  console.error(`SEO audit failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${pages.length} HTML page${pages.length === 1 ? "" : "s"} inspected.`);
console.log(`Reports written to ${path.relative(root, reportDir)}/`);
