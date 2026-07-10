import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const sitemapPath = path.join(rootDir, "sitemap.xml");
const sitemap = existsSync(sitemapPath) ? readFileSync(sitemapPath, "utf8") : "";
const htmlFiles = [];
const jsSubmitInterceptions = [];
const formIdCounts = new Map();
const netlifyFormNameCounts = new Map();

const skipDirs = new Set([".git", "reports", "artifacts", ".netlify", "node_modules"]);

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.endsWith(".html")) htmlFiles.push(fullPath);
  }
}

function rel(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function parseAttrs(source) {
  const attrs = {};
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrPattern.exec(source))) {
    const [, rawName, doubleValue, singleValue, bareValue] = match;
    attrs[rawName.toLowerCase()] = doubleValue ?? singleValue ?? bareValue ?? "";
  }
  return attrs;
}

function attrValue(attrs, name) {
  return attrs[name.toLowerCase()];
}

function hasAttr(attrs, name) {
  return Object.prototype.hasOwnProperty.call(attrs, name.toLowerCase());
}

function routeForFile(filePath) {
  const relative = rel(filePath);
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

function localFileForAction(action, sourceFile) {
  if (!action) return null;
  let parsed;
  try {
    parsed = new URL(action, "https://sudeeparya.com");
  } catch {
    return null;
  }
  if (parsed.origin !== "https://sudeeparya.com") return null;
  let pathname = decodeURIComponent(parsed.pathname);
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.endsWith("/")) pathname = `${pathname}index.html`;
  else if (!path.extname(pathname)) pathname = `${pathname}/index.html`;
  return path.join(rootDir, pathname);
}

function normalizedRoute(action) {
  try {
    const parsed = new URL(action || "/", "https://sudeeparya.com");
    let pathname = parsed.pathname;
    if (!pathname.endsWith("/") && !path.extname(pathname)) pathname = `${pathname}/`;
    return pathname;
  } catch {
    return action || "";
  }
}

function controlsInForm(formHtml) {
  const controls = [];
  const controlPattern = /<(input|select|textarea|button)\b([^>]*)>/gi;
  let match;
  while ((match = controlPattern.exec(formHtml))) {
    controls.push({
      tag: match[1].toLowerCase(),
      attrs: parseAttrs(match[2]),
      html: match[0],
    });
  }
  return controls;
}

function isSubmittableControl(control) {
  if (hasAttr(control.attrs, "disabled")) return false;
  if (control.tag === "button") return false;
  const type = (attrValue(control.attrs, "type") || "").toLowerCase();
  return !["submit", "button", "reset", "image"].includes(type);
}

function findHtmlForms(filePath) {
  const html = readFileSync(filePath, "utf8");
  const forms = [];
  const formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let match;
  while ((match = formPattern.exec(html))) {
    const attrs = parseAttrs(match[1]);
    forms.push({
      filePath,
      file: rel(filePath),
      route: routeForFile(filePath),
      attrs,
      body: match[2],
      fullHtml: match[0],
    });
  }
  return forms;
}

function discoverSubmitInterceptions() {
  const files = [];
  function walkScripts(dir) {
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue;
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkScripts(fullPath);
      } else if (entry.endsWith(".js") || entry.endsWith(".html")) {
        files.push(fullPath);
      }
    }
  }
  walkScripts(rootDir);

  for (const filePath of files) {
    const text = readFileSync(filePath, "utf8");
    const patterns = [/addEventListener\s*\(\s*["']submit["']/g, /\bonsubmit\s*=/g];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        const line = text.slice(0, match.index).split("\n").length;
        jsSubmitInterceptions.push(`${rel(filePath)}:${line}`);
      }
    }
  }
}

walk(rootDir);
discoverSubmitInterceptions();

const forms = htmlFiles.flatMap(findHtmlForms);

for (const form of forms) {
  const id = attrValue(form.attrs, "id");
  const name = attrValue(form.attrs, "name");
  const isNetlify = hasAttr(form.attrs, "data-netlify") || hasAttr(form.attrs, "netlify");
  if (id) formIdCounts.set(id, (formIdCounts.get(id) || 0) + 1);
  if (isNetlify && name) netlifyFormNameCounts.set(name, (netlifyFormNameCounts.get(name) || 0) + 1);
}

let failures = 0;

console.log(`Netlify form validation\n`);
console.log(`Discovered ${forms.length} HTML form(s).`);
console.log(`JavaScript submit interception: ${jsSubmitInterceptions.length ? jsSubmitInterceptions.join(", ") : "none"}\n`);

for (const form of forms) {
  const issues = [];
  const warnings = [];
  const controls = controlsInForm(form.fullHtml);
  const isNetlify = hasAttr(form.attrs, "data-netlify") || hasAttr(form.attrs, "netlify");
  const name = attrValue(form.attrs, "name") || "";
  const id = attrValue(form.attrs, "id") || "";
  const method = (attrValue(form.attrs, "method") || "").toUpperCase();
  const action = attrValue(form.attrs, "action") || "";
  const route = normalizedRoute(action);
  const actionFile = localFileForAction(action, form.filePath);
  const hiddenFormNames = controls.filter((control) => {
    return control.tag === "input" &&
      (attrValue(control.attrs, "type") || "").toLowerCase() === "hidden" &&
      attrValue(control.attrs, "name") === "form-name";
  });
  const submitButtons = controls.filter((control) => {
    const type = (attrValue(control.attrs, "type") || "").toLowerCase();
    return control.tag === "button" && (!type || type === "submit");
  });

  if (!isNetlify) warnings.push("not Netlify-managed");
  if (form.fullHtml.slice(6).match(/<form\b/i)) issues.push("nested form tag found");
  if (id && formIdCounts.get(id) > 1) issues.push(`duplicate form id: ${id}`);

  if (isNetlify) {
    if (!name) issues.push("missing form name");
    if (name && netlifyFormNameCounts.get(name) > 1) issues.push(`duplicate Netlify form name: ${name}`);
    if (method !== "POST") issues.push(`method must be POST, found ${method || "missing"}`);
    if (!hasAttr(form.attrs, "data-netlify") && !hasAttr(form.attrs, "netlify")) issues.push("missing data-netlify or netlify attribute");
    if (!action) issues.push("missing action");
    if (!actionFile || !existsSync(actionFile)) issues.push(`action does not map to an existing local file: ${action || "missing"}`);

    if (hiddenFormNames.length !== 1) {
      issues.push(`expected exactly one hidden form-name, found ${hiddenFormNames.length}`);
    } else if (attrValue(hiddenFormNames[0].attrs, "value") !== name) {
      issues.push(`hidden form-name value does not match form name: ${attrValue(hiddenFormNames[0].attrs, "value") || "missing"} !== ${name}`);
    }

    if (!submitButtons.length) issues.push("missing submit button");

    const dataNetlifyValue = attrValue(form.attrs, "data-netlify");
    if (hasAttr(form.attrs, "data-netlify") && dataNetlifyValue && dataNetlifyValue.toLowerCase() !== "true") {
      issues.push(`data-netlify should be true, found ${dataNetlifyValue}`);
    }

    const honeypotName = attrValue(form.attrs, "netlify-honeypot");
    if (honeypotName) {
      const honeypotFields = controls.filter((control) => attrValue(control.attrs, "name") === honeypotName);
      if (!honeypotFields.length) {
        issues.push(`honeypot field missing: ${honeypotName}`);
      } else if (honeypotFields.some((control) => hasAttr(control.attrs, "required"))) {
        issues.push(`honeypot field must not be required: ${honeypotName}`);
      }
    }

    for (const control of controls) {
      if (!isSubmittableControl(control)) {
        if (hasAttr(control.attrs, "disabled") && hasAttr(control.attrs, "required")) {
          issues.push(`disabled required field found: ${control.html}`);
        }
        continue;
      }
      if (!attrValue(control.attrs, "name")) issues.push(`submitted ${control.tag} is missing name: ${control.html}`);
    }

    const seenFieldNames = new Map();
    for (const control of controls.filter(isSubmittableControl)) {
      const fieldName = attrValue(control.attrs, "name");
      if (!fieldName) continue;
      seenFieldNames.set(fieldName, (seenFieldNames.get(fieldName) || 0) + 1);
    }
    for (const [fieldName, count] of seenFieldNames) {
      if (count > 1) issues.push(`duplicate submitted field name: ${fieldName}`);
    }

    if (actionFile && existsSync(actionFile)) {
      const successHtml = readFileSync(actionFile, "utf8");
      const hasNoindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(successHtml) ||
        /<meta\b[^>]*content=["'][^"']*\bnoindex\b[^"']*["'][^>]*name=["']robots["']/i.test(successHtml);
      if (!hasNoindex) issues.push(`success page is missing noindex: ${rel(actionFile)}`);
      if (sitemap.includes(`https://sudeeparya.com${route}`) || sitemap.includes(`<loc>${route}</loc>`)) {
        issues.push(`success route appears in sitemap: ${route}`);
      }
    }
  }

  const status = issues.length ? "FAIL" : "PASS";
  if (issues.length) failures += 1;

  console.log(`${status}: ${form.file} (${form.route})`);
  console.log(`  name: ${name || "missing"}`);
  console.log(`  id: ${id || "none"}`);
  console.log(`  action: ${action || "missing"}`);
  console.log(`  Netlify-managed: ${isNetlify ? "yes" : "no"}`);
  if (warnings.length) console.log(`  warnings: ${warnings.join("; ")}`);
  if (issues.length) console.log(`  issues: ${issues.join("; ")}`);
}

if (failures) {
  console.error(`\n${failures} form(s) failed validation.`);
  process.exit(1);
}

console.log("\nAll discovered forms passed required Netlify checks.");
