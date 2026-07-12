#!/usr/bin/env node
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("../.netlify/plugins/node_modules/puppeteer");
const root = process.cwd();
const executablePath = path.join(root, ".netlify/plugins/node_modules/puppeteer/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome");
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8080/insights/running-before-crawling/", { waitUntil: "networkidle0" });
await page.pdf({ path: path.join(root, "downloads/running-before-crawling-executive-edition.pdf"), format: "Letter", printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true, margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" } });
await browser.close();
console.log("Generated corrected executive-edition PDF with browser headers and footers disabled.");
