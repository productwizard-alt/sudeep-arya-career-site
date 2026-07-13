#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputDir = process.argv[2];
if (!outputDir) {
  throw new Error("Usage: node scripts/transform-staging.mjs <publish-directory>");
}

const robotsMeta = '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">';
const bannerStyles = `<style id="staging-environment-styles">
  :root { --staging-banner-height: 34px; }
  body { margin-top: var(--staging-banner-height) !important; }
  .staging-environment-banner {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 2147483647;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    height: var(--staging-banner-height);
    padding: 0 0.75rem;
    overflow: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    background: #7f1d1d;
    color: #fff;
    font: 700 0.75rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
  }
  .staging-environment-banner span { opacity: 0.82; font-weight: 600; }
  @media (max-width: 420px) {
    .staging-environment-banner { gap: 0.45rem; padding-inline: 0.5rem; font-size: 0.68rem; }
  }
</style>`;
const banner = '<aside class="staging-environment-banner" aria-label="Staging environment: not production; branch staging"><strong>STAGING — NOT PRODUCTION</strong> <span>Branch: staging</span></aside>';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }

  return files;
}

function removeAnalytics(html) {
  return html
    .replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->\s*/gu, "")
    .replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->\s*/gu, "")
    .replace(/<noscript>\s*<iframe\b[^>]*\bsrc=(['"])[^'"]*googletagmanager\.com\/ns\.html[^'"]*\1[^>]*>\s*<\/iframe>\s*<\/noscript>/giu, "")
    .replace(/<script\b[^>]*\bsrc=(['"])[^'"]*googletagmanager\.com\/(?:gtm\.js|gtag\/js)[^'"]*\1[^>]*>\s*<\/script>/giu, "")
    .replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/giu, (script) =>
      /GTM-N2MVP44C|googletagmanager\.com\/(?:gtm\.js|ns\.html|gtag\/js)|G-C65RGRMMW1|\bgtag\s*\(|window\.gtag|\bdataLayer\.push\s*\(/iu.test(script) ? "" : script
    );
}

for (const file of await htmlFiles(outputDir)) {
  let html = await readFile(file, "utf8");
  html = removeAnalytics(html);
  html = html.replace(/<meta\b[^>]*\bname=(['"])robots\1[^>]*>\s*/giu, "");

  if (!/<\/head\s*>/iu.test(html) || !/<body\b[^>]*>/iu.test(html)) {
    throw new Error(`Cannot inject staging safeguards into malformed HTML: ${file}`);
  }

  html = html.replace(/<\/head\s*>/iu, `  ${robotsMeta}\n  ${bannerStyles}\n</head>`);
  html = html.replace(/<body\b[^>]*>/iu, (openingBody) => `${openingBody}\n  ${banner}`);
  await writeFile(file, html);
}

console.log(`Hardened ${String((await htmlFiles(outputDir)).length)} HTML files for staging.`);
