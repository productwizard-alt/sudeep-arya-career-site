#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = (await readdir(root, { recursive: true })).filter((file) =>
  file.endsWith(".html") &&
  !/(^|\/)(?:\.codex-inputs?|\.staging-dist|reports|artifacts|node_modules)(?:\/|$)/.test(file)
);
const errors = [];
let references = 0;
for (const file of files) {
  const html = await readFile(path.join(root, file), "utf8");
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (!target || target === "/") continue;
    if (["/insights/", "/whitepapers/"].includes(target)) { errors.push(`${file}: links to deleted route ${target}`); continue; }
    const candidate = path.join(root, target.replace(/^\//, ""));
    const options = path.extname(candidate) ? [candidate] : [candidate, path.join(candidate, "index.html")];
    let found = false;
    for (const option of options) { try { await readFile(option); found = true; break; } catch {} }
    references++;
    if (!found) errors.push(`${file}: missing local target ${target}`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Content operations route QA passed: ${files.length} HTML pages, ${references} root-relative references resolved.`);
