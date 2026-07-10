#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalOrigin = "https://sudeeparya.com";
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

function fileForPath(urlPath) {
  const clean = decodeURI(urlPath).split("?")[0];
  if (clean === "/") return path.join(root, "index.html");
  if (clean.endsWith("/")) return path.join(root, clean, "index.html");
  return path.join(root, clean);
}

function anchorsFor(html) {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const names = [...html.matchAll(/\sname=["']([^"']+)["']/gi)].map((match) => match[1]);
  return new Set([...ids, ...names]);
}

function isExternal(value) {
  return /^(mailto:|tel:|https?:\/\/(?!sudeeparya\.com\/)|\/\/)/i.test(value);
}

const htmlFiles = walk(root, (file) => file.endsWith(".html"));
const routeAnchors = new Map();

for (const file of htmlFiles) {
  routeAnchors.set(routeForFile(file), anchorsFor(readFileSync(file, "utf8")));
}

const issues = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const attributes = [...html.matchAll(/\s(?:href|src|action)=["']([^"']+)["']/gi)].map((match) => match[1]);

  for (const raw of attributes) {
    if (!raw || raw.startsWith("data:") || raw.startsWith("#") || isExternal(raw)) continue;
    checked += 1;

    let value = raw;
    if (value.startsWith(canonicalOrigin)) value = value.slice(canonicalOrigin.length) || "/";
    if (/^https?:\/\//i.test(value)) continue;

    const [pathname, hash] = value.split("#");
    const base = pathname || routeForFile(file);
    const currentRoute = routeForFile(file);
    const currentDirectory = currentRoute.endsWith("/")
      ? currentRoute
      : `${path.posix.dirname(currentRoute)}/`;
    const resolvedPath = base.startsWith("/")
      ? base
      : path.posix.normalize(`${currentDirectory}${base}`);
    const candidate = fileForPath(resolvedPath);

    if (!existsSync(candidate)) {
      issues.push(`${rel(file)}: missing target ${raw}`);
      continue;
    }

    if (hash) {
      const targetFile = statSync(candidate).isDirectory() ? path.join(candidate, "index.html") : candidate;
      const targetRoute = routeForFile(targetFile);
      const anchors = routeAnchors.get(targetRoute) || anchorsFor(readFileSync(targetFile, "utf8"));
      if (!anchors.has(hash)) issues.push(`${rel(file)}: missing anchor ${raw}`);
    }
  }
}

if (issues.length) {
  console.error(`Internal link validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Internal link validation passed: ${checked} local reference${checked === 1 ? "" : "s"} checked.`);
