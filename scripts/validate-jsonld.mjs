#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "reports", "artifacts", "node_modules"].includes(entry.name)) return [];
      return walk(full);
    }
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
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

const issues = [];
const idIndex = new Map();
let blockCount = 0;

for (const file of walk(root)) {
  const html = readFileSync(file, "utf8");
  const blocks = jsonLdBlocks(html);
  blocks.forEach((block, index) => {
    blockCount += 1;
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (error) {
      issues.push(`${rel(file)} block ${index + 1}: JSON parse failed: ${error.message}`);
      return;
    }

    for (const node of nodesFromSchema(parsed)) {
      const id = node["@id"];
      if (!id) continue;
      const type = Array.isArray(node["@type"]) ? node["@type"].join(",") : node["@type"] || "";
      const signature = `${type}|${node.name || node.headline || node.url || ""}`;
      const previous = idIndex.get(id);
      if (previous && previous.signature !== signature) {
        const compatiblePerson = type === "Person" && previous.type === "Person" && node.name === "Sudeep Arya";
        const compatibleWebsite = type === "WebSite" && previous.type === "WebSite";
        if (!compatiblePerson && !compatibleWebsite) {
          issues.push(`${rel(file)}: @id ${id} conflicts with ${previous.file}`);
        }
      } else if (!previous) {
        idIndex.set(id, { signature, type, file: rel(file) });
      }
    }
  });
}

if (issues.length) {
  console.error(`JSON-LD validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`JSON-LD validation passed: ${blockCount} block${blockCount === 1 ? "" : "s"} parsed.`);
