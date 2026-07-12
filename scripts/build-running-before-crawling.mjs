#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, ".codex-input/running-before-crawling/01_WHITEPAPER_PUBLICATION_SOURCE_CORRECTED.md");
const outputPath = path.join(root, "insights/running-before-crawling/index.html");
const source = readFileSync(sourcePath, "utf8").replaceAll("\r\n", "\n");

const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const slugCounts = new Map();
const slug = (value) => {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  const count = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
};

const noteDefinitions = new Map();
const noteOccurrences = new Map();
const allLines = source.split("\n");
for (const line of allLines) {
  const match = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
  if (match) noteDefinitions.set(match[1], match[2]);
}

function inline(raw) {
  let value = escapeHtml(raw);
  value = value.replace(/\[\^([^\]]+)\]/g, (_, id) => {
    const occurrence = (noteOccurrences.get(id) || 0) + 1;
    noteOccurrences.set(id, occurrence);
    return `<sup class="paper-citation" id="cite-${id}-${occurrence}"><a href="#note-${id}" aria-label="Footnote ${escapeHtml(id)}">${escapeHtml(id.replace(/^fn-p/, "").replaceAll("-", "."))}</a></sup>`;
  });
  value = value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*(.+?)\*/g, "<em>$1</em>");
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/(https:\/\/[^\s<]+)/g, (url) => `<a href="${url.replace(/[.,;:]$/, "")}" rel="noopener">${url}</a>`);
  return value;
}

const graphics = {
  "boardroom_shortcut.png": `
    <figure class="paper-framework framework-shortcut" aria-labelledby="shortcut-caption">
      <div class="framework-title"><span>Common failure pattern</span><strong>The shortest plan usually creates the longest repair bill.</strong></div>
      <ol><li><b>01</b><span>Announce<small>AI ambition</small></span></li><li><b>02</b><span>Count<small>roles to remove</small></span></li><li><b>03</b><span>Buy<small>tools and vendors</small></span></li><li><b>04</b><span>Meet<small>the exceptions</small></span></li><li><b>05</b><span>Repair / Rebuild<small>the operating model</small></span></li></ol>
      <figcaption id="shortcut-caption"><strong>Figure 1. The boardroom shortcut.</strong> A common failure pattern, not a universal result. Original operating framework by Sudeep Arya.</figcaption>
    </figure>`,
  "evidence_gap_v3.png": `
    <figure class="paper-framework framework-evidence" aria-labelledby="evidence-caption">
      <div class="framework-title"><span>The line-of-sight gap</span><strong>Adoption is broad. Economics are not.</strong></div>
      <div class="evidence-stats"><article><strong>88%</strong><span>Regular AI use</span><small>At least one business function · McKinsey 2025</small></article><article><strong>39%</strong><span>Any EBIT impact</span><small>Reported at enterprise level · McKinsey 2025</small></article><article><strong>26%</strong><span>Full cost view</span><small>WSJ report of unreleased KPMG survey · 2026</small></article></div>
      <p><strong>Gartner forecast:</strong> More than 40% of agentic-AI projects could be canceled by the end of 2027 because of escalating cost, unclear value, or inadequate risk controls. A forecast, not a measured failure rate.</p>
      <figcaption id="evidence-caption"><strong>Figure 2. Adoption, enterprise impact, cost visibility, and Gartner's forecast.</strong> Sources: McKinsey, The Wall Street Journal reporting on an unreleased KPMG survey, and Gartner.</figcaption>
    </figure>`,
  "executive_receipts_v3.png": `
    <figure class="paper-framework framework-receipts" aria-labelledby="receipts-caption">
      <div class="framework-title"><span>Three executive receipts</span><strong>The public record is already giving boards clues.</strong></div>
      <div class="receipt-list"><article><span>Uber</span><strong>4 months</strong><p>Reported annual AI budget exhausted in four months; value link not yet visible.</p></article><article><span>Klarna</span><strong>700</strong><p>Company-reported work equivalent of 700 full-time agents; later course correction.</p></article><article><span>Zillow</span><strong>~$2.8B inventory</strong><p>About 7,000 homes representing roughly $2.8B in inventory at shutdown.</p></article></div>
      <figcaption id="receipts-caption"><strong>Figure 3. Publicly reported events.</strong> Company figures remain company-reported. Zillow was an algorithmic operating model, not generative AI.</figcaption>
    </figure>`,
  "full_ai_bill.png": `
    <figure class="paper-framework framework-bill" aria-labelledby="bill-caption">
      <div class="framework-title"><span>The full AI bill</span><strong>The license is the cover charge.</strong></div>
      <div class="bill-equation"><div><span>Visible</span><b>Licenses + model usage</b></div><i>+</i><div><span>Operating system</span><b>Data + integration + people + governance / compliance + review + rework</b></div><i>÷</i><div><span>Business result</span><b>Verified outcomes</b></div></div>
      <figcaption id="bill-caption"><strong>Figure 4. The full AI bill.</strong> Illustrative cost categories in an original framework by Sudeep Arya.</figcaption>
    </figure>`,
  "specialist_system.png": `
    <figure class="paper-framework framework-specialist" aria-labelledby="specialist-caption">
      <div class="framework-title"><span>The specialist was the system</span><strong>The task was visible. The prevention was not.</strong></div>
      <div class="specialist-stack"><span>Visible task<small>Answer the customer. Fix the listing. Launch the campaign.</small></span><span>Exceptions<small>What breaks the normal path</small></span><span>Policy memory<small>Which rule applied and when</small></span><span>System workarounds<small>What the platform does not document</small></span><span>Vendor behavior<small>Who responds and what actually works</small></span><span>Judgment<small>When technically right is commercially wrong</small></span></div>
      <p class="framework-note">Not all tacit judgment can be fully documented or automated.</p>
      <figcaption id="specialist-caption"><strong>Figure 5. The visible task and hidden operating knowledge.</strong> Original framework by Sudeep Arya.</figcaption>
    </figure>`,
  "ecommerce_exception_factory.png": `
    <figure class="paper-framework framework-commerce" aria-labelledby="commerce-caption">
      <div class="framework-title"><span>Ecommerce is an exception factory</span><strong>The output is connected to the business.</strong></div>
      <div class="commerce-table-wrap"><table><thead><tr><th>Work</th><th>AI can assist</th><th>Human must own</th><th>Board metric</th></tr></thead><tbody><tr><th>PDP content</th><td>Draft, classify</td><td>Truth, claims, channel rules</td><td>Conversion rate / return rate</td></tr><tr><th>Customer service</th><td>Retrieve, route, summarize</td><td>Ambiguity, emotion, policy conflict</td><td>Verified resolution</td></tr><tr><th>Marketplace data</th><td>Map, detect, prioritize</td><td>Source of truth, escalation</td><td>Listing uptime</td></tr><tr><th>Retail media</th><td>Mine, pace, recommend</td><td>Incrementality, margin, inventory</td><td>Incremental contribution or margin</td></tr><tr><th>Merchandising</th><td>Rank, segment, personalize</td><td>Assortment, seasonality, brand</td><td>Margin and lifetime value</td></tr><tr><th>Pricing / promotion</th><td>Forecast, model scenarios</td><td>Contracts, channel conflict, trust</td><td>Realized margin</td></tr></tbody></table></div>
      <figcaption id="commerce-caption"><strong>Figure 6. Ecommerce AI: assistance, ownership, and measurement.</strong> Original framework by Sudeep Arya. The table becomes stacked rows on small screens.</figcaption>
    </figure>`,
  "operating_spine.png": `
    <figure class="paper-framework framework-spine" aria-labelledby="spine-caption">
      <div class="framework-title"><span>The AI operating spine</span><strong>Build from truth upward.</strong></div>
      <ol><li><b>01</b><span>Outcome + decision rights<small>What result? Who owns it?</small></span></li><li><b>02</b><span>Workflow + exceptions<small>How does the work really branch?</small></span></li><li><b>03</b><span>Source of truth<small>Which data, policy, and product facts win?</small></span></li><li><b>04</b><span>Capability + tool routing<small>Which capability handles which task?</small></span></li><li><b>05</b><span>Human gate + escalation<small>Who approves, overrides, and stops?</small></span></li><li><b>06</b><span>Evaluation + economics<small>What did a verified outcome cost?</small></span></li></ol>
      <figcaption id="spine-caption"><strong>Figure 7. The AI operating spine.</strong> Original framework by Sudeep Arya, aligned to lifecycle controls in NIST AI 600-1.</figcaption>
    </figure>`,
  "crawl_walk_run_earn.png": `
    <figure class="paper-framework framework-sequence" aria-labelledby="sequence-caption">
      <div class="framework-title"><span>The implementation sequence</span><strong>Crawl. Walk. Run. Earn.</strong></div>
      <ol><li><b>Crawl</b><span>Map work<small>Exit: baseline + exceptions</small></span></li><li><b>Walk</b><span>Assist experts<small>Exit: corrections + evidence</small></span></li><li><b>Run</b><span>Automate proof<small>Exit: controls + rollback</small></span></li><li><b>Earn</b><span>Prove and scale value<small>Exit: verified economics + realized benefit</small></span></li></ol>
      <figcaption id="sequence-caption"><strong>Figure 8. Crawl. Walk. Run. Earn.</strong> Speed compounds only after each gate is real. Original framework by Sudeep Arya.</figcaption>
    </figure>`,
  "board_gate.png": `
    <figure class="paper-framework framework-gate" aria-labelledby="gate-caption">
      <div class="framework-title"><span>The board approval gate</span><strong>Prove before you remove.</strong></div>
      <div class="gate-center"><strong>Workforce case supported for separate leadership review?</strong><ol><li>Outcome verified</li><li>Baseline measured</li><li>Workflow mapped</li><li>Truth owned</li><li>Human gate defined</li><li>Cost complete</li><li>Risk bounded</li><li>Rollback tested</li><li>Capacity measured and use identified</li></ol></div>
      <figcaption id="gate-caption"><strong>Figure 9. The board approval gate.</strong> One no means narrow, repair, test, or stop. The framework does not approve layoffs.</figcaption>
    </figure>`,
};

const contentStart = allLines.findIndex((line) => line.trim() === "**READ THIS FIRST**");
const lines = allLines.slice(contentStart).filter((line) => !/^\[\^[^\]]+\]:/.test(line));
const toc = [];
const html = [];

for (let index = 0; index < lines.length;) {
  const line = lines[index].trim();
  if (!line) { index += 1; continue; }

  const image = line.match(/^!\[[^\]]*\]\(assets\/([^\)]+)\)/);
  if (image) {
    html.push(graphics[image[1]] || "");
    index += 1;
    while (!(lines[index] || "").trim() && index < lines.length) index += 1;
    if (/^\*Figure/.test((lines[index] || "").trim())) index += 1;
    continue;
  }

  if (line.startsWith("# ")) {
    const text = line.slice(2).trim();
    const id = slug(text);
    toc.push({ id, text });
    html.push(`<h2 id="${id}">${inline(text)}</h2>`);
    index += 1;
    continue;
  }
  if (line.startsWith("## ")) { const text = line.slice(3).trim(); html.push(`<h3 id="${slug(text)}">${inline(text)}</h3>`); index += 1; continue; }
  if (line.startsWith("### ")) { const text = line.slice(4).trim(); html.push(`<h4 id="${slug(text)}">${inline(text)}</h4>`); index += 1; continue; }

  if (line.startsWith("|")) {
    const tableLines = [];
    while ((lines[index] || "").trim().startsWith("|")) { tableLines.push(lines[index].trim()); index += 1; }
    const rows = tableLines.filter((row) => !/^\|?\s*:?-+/.test(row.replaceAll("|", "").trim())).map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()));
    const [head, ...body] = rows;
    html.push(`<div class="paper-table-wrap"><table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell, cellIndex) => `<${cellIndex === 0 ? "th" : "td"}>${inline(cell)}</${cellIndex === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    continue;
  }

  if (line.startsWith(">")) {
    const quote = [];
    while ((lines[index] || "").trim().startsWith(">")) { quote.push(lines[index].trim().replace(/^>\s?/, "")); index += 1; }
    html.push(`<blockquote>${quote.map((part) => `<p>${inline(part)}</p>`).join("")}</blockquote>`);
    continue;
  }

  if (/^-\s+/.test(line)) {
    const items = [];
    while (/^-\s+/.test((lines[index] || "").trim())) { items.push((lines[index] || "").trim().replace(/^-\s+/, "")); index += 1; while (!(lines[index] || "").trim()) index += 1; }
    html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    continue;
  }

  if (/^\d+\.\s+/.test(line)) {
    const start = Number(line.match(/^(\d+)\./)[1]);
    const items = [];
    while (index < lines.length && /^\d+\.\s+/.test((lines[index] || "").trim())) {
      let item = lines[index].trim().replace(/^\d+\.\s+/, "");
      index += 1;
      while (index < lines.length && (lines[index] || "").trim() && !/^\d+\.\s+/.test((lines[index] || "").trim()) && !/^(#|>|-|\||!\[)/.test((lines[index] || "").trim())) { item += ` ${(lines[index] || "").trim()}`; index += 1; }
      items.push(item);
      while (!(lines[index] || "").trim() && index < lines.length) index += 1;
    }
    html.push(`<ol${start !== 1 ? ` start="${start}"` : ""}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
    continue;
  }

  if (/^\*\*[^*]+\*\*$/.test(line)) { html.push(`<p class="paper-kicker">${inline(line)}</p>`); index += 1; continue; }

  let paragraph = line;
  index += 1;
  while (index < lines.length && (lines[index] || "").trim() && !/^(#|>|-|\d+\.\s|\||!\[|\*\*[^*]+\*\*$)/.test((lines[index] || "").trim())) {
    paragraph += ` ${(lines[index] || "").trim()}`;
    index += 1;
  }
  html.push(`<p>${inline(paragraph)}</p>`);
}

const notes = [...noteDefinitions.entries()].map(([id, content]) => {
  const backlinks = Array.from({ length: noteOccurrences.get(id) || 1 }, (_, index) => `<a class="footnote-back" href="#cite-${id}-${index + 1}" aria-label="Back to citation ${index + 1}">↩</a>`).join(" ");
  return `<li id="note-${id}">${inline(content)} ${backlinks}</li>`;
}).join("");

const citations = [
  "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  "https://www.wsj.com/cfo-journal/the-metric-cfos-struggle-to-track-ai-usage-3b30c10c",
  "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027",
  "https://www.theverge.com/transportation/937116/uber-ai-investment-hard-to-justify",
  "https://www.reuters.com/technology/klarna-using-genai-cut-marketing-costs-by-10-mln-annually-2024-05-28/",
  "https://www.reuters.com/business/swedens-klarna-shifts-ai-focus-cost-cuts-growth-2025-09-10/",
  "https://www.axios.com/2021/11/02/zillow-abandon-home-flipping-algorithm",
  "https://www.wired.com/story/zillow-ibuyer-real-estate/",
  "https://www.nber.org/papers/w31161",
  "https://doi.org/10.1287/orsc.2025.21838",
  "https://doi.org/10.6028/NIST.AI.600-1",
  "https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html",
  "https://sudeeparya.com/"
];

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#06101b">
  <title>Running Before Crawling | AI Economics Executive Paper | Sudeep Arya</title>
  <meta name="description" content="A board and C-suite executive paper on AI economics, workflow design, specialist knowledge, verified outcomes, and ecommerce.">
  <meta name="author" content="Sudeep Arya"><meta name="robots" content="index, follow">
  <link rel="canonical" href="https://sudeeparya.com/insights/running-before-crawling/">
  <meta property="og:title" content="Running Before Crawling"><meta property="og:description" content="Why AI costs balloon when leadership automates before it understands the work."><meta property="og:type" content="article"><meta property="og:url" content="https://sudeeparya.com/insights/running-before-crawling/"><meta property="og:image" content="https://sudeeparya.com/assets/running-before-crawling-social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Running Before Crawling by Sudeep Arya"><meta property="article:published_time" content="2026-07-11"><meta property="article:modified_time" content="2026-07-11">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Running Before Crawling"><meta name="twitter:description" content="Why AI costs balloon when leadership automates before it understands the work."><meta name="twitter:image" content="https://sudeeparya.com/assets/running-before-crawling-social-preview.png"><meta name="twitter:image:alt" content="Running Before Crawling by Sudeep Arya">
  <link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="whitepaper.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": "https://sudeeparya.com/insights/running-before-crawling/#article", headline: "Running Before Crawling", alternativeHeadline: "Why AI costs balloon when leadership automates before it understands the work", description: "A board and C-suite executive paper on AI economics, workflow design, specialist knowledge, and ecommerce.", datePublished: "2026-07-11", dateModified: "2026-07-11", author: { "@id": "https://sudeeparya.com/#person" }, publisher: { "@id": "https://sudeeparya.com/#person" }, mainEntityOfPage: { "@id": "https://sudeeparya.com/insights/running-before-crawling/#webpage" }, image: "https://sudeeparya.com/assets/running-before-crawling-social-preview.png", about: ["AI economics", "Total cost of ownership", "Verified outcomes", "Workflow design", "Ecommerce"], citation: citations, hasPart: { "@id": "https://sudeeparya.com/tools/ai-cost-reality-calculator/#app" }, isAccessibleForFree: true, inLanguage: "en-US" },
      { "@type": "WebPage", "@id": "https://sudeeparya.com/insights/running-before-crawling/#webpage", url: "https://sudeeparya.com/insights/running-before-crawling/", name: "Running Before Crawling | Sudeep Arya", isPartOf: { "@id": "https://sudeeparya.com/#website" }, breadcrumb: { "@id": "https://sudeeparya.com/insights/running-before-crawling/#breadcrumb" } },
      { "@type": "BreadcrumbList", "@id": "https://sudeeparya.com/insights/running-before-crawling/#breadcrumb", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://sudeeparya.com/" }, { "@type": "ListItem", position: 2, name: "Insights", item: "https://sudeeparya.com/insights/" }, { "@type": "ListItem", position: 3, name: "Running Before Crawling", item: "https://sudeeparya.com/insights/running-before-crawling/" }] }
    ]
  })}</script>
  <!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-C65RGRMMW1"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-C65RGRMMW1');</script>
</head>
<body class="paper-page">
  <a class="skip-link" href="#paper">Skip to paper</a><div class="scroll-progress" aria-hidden="true"></div>
  <header class="site-header" data-header><nav class="nav" aria-label="Primary navigation"><a class="brand" href="/" aria-label="Sudeep Arya home"><span>SA</span>Sudeep Arya</a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu"><span class="sr-only">Toggle navigation</span><span></span><span></span></button><div class="nav-menu" id="nav-menu"><a href="/resume/">Resume</a><a href="/case-studies/">Case Studies</a><a href="/insights/">Insights</a><a href="/skills/">Skills</a><a href="/engagements/">Speaking &amp; Media</a><a class="nav-audit" href="/audit/">Audit</a><a class="nav-contact" href="/contact/">Contact</a></div></nav></header>
  <main>
    <section class="paper-hero"><div class="paper-hero-inner"><div class="paper-hero-copy reveal"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/insights/">Insights</a><span>/</span><span>Running Before Crawling</span></nav><p class="eyebrow">Board and C-Suite Executive Edition · July 2026</p><h1>Running Before Crawling</h1><p class="paper-deck">Why AI costs balloon when leadership automates before it understands the work.</p><div class="paper-byline"><strong>Sudeep Arya</strong><span>Published and updated July 11, 2026 · Approx. 18-minute read · Research checked through July 11, 2026</span></div><div class="paper-actions"><a class="button primary" href="#paper">Read the paper</a><a class="button secondary" data-ga-event="calculator_start" data-placement="paper-hero" data-destination="/tools/ai-cost-reality-calculator/" href="/tools/ai-cost-reality-calculator/">Use the calculator</a><a class="button secondary" data-ga-event="whitepaper_download" data-whitepaper-slug="running-before-crawling" data-asset-type="pdf" data-placement="paper-hero" href="/downloads/running-before-crawling-executive-edition.pdf" download>Download PDF</a></div></div><figure class="paper-cover reveal"><img src="/assets/running-before-crawling-cover.svg" width="850" height="1100" alt="Running Before Crawling executive edition cover by Sudeep Arya"></figure></div></section>
    <section class="paper-layout" id="paper"><aside class="paper-toc"><p>In this paper</p><nav aria-label="Table of contents">${toc.map((item) => `<a href="#${item.id}">${escapeHtml(item.text)}</a>`).join("")}</nav><a class="paper-tool-link" href="/tools/ai-cost-reality-calculator/">Calculate your cost per verified outcome →</a></aside><article class="paper-content">${html.join("\n")}<section class="paper-footnotes" aria-labelledby="footnotes-title"><h2 id="footnotes-title">Footnotes</h2><ol>${notes}</ol></section><aside class="paper-related"><p class="eyebrow">Turn the argument into a calculation</p><h2>What does your AI outcome actually cost?</h2><p>Use the private browser-based calculator to separate model activity, fully loaded TCO, verified outcomes, hard benefit, capacity, and expected loss.</p><div class="paper-actions"><a class="button primary" href="/tools/ai-cost-reality-calculator/">Use the calculator</a><a class="button secondary" href="/case-studies/ai-economics-decision-framework/">View the framework case study</a></div></aside></article></section>
  </main>
  <footer class="site-footer"><div class="footer-profile"><a class="brand footer-brand" href="/"><span>SA</span><span class="footer-brand-copy"><strong>Sudeep Arya</strong><small>Commerce leadership that connects marketplaces, DTC, retail media, data, and operations.</small></span></a></div><div class="footer-link-stack"><nav class="footer-primary-nav" aria-label="Footer navigation"><a href="/engagements/">Speaking &amp; Media</a><a href="/insights/">Insights</a><a href="/case-studies/">Case Studies</a><a href="/audit/">Audit</a><a href="/contact/">Contact</a></nav><nav class="footer-action-nav" aria-label="Footer actions"><a href="/tools/ai-cost-reality-calculator/">Use the AI Cost Calculator</a><a href="/downloads/running-before-crawling-executive-edition.pdf">Download the Executive Edition</a></nav></div></footer>
  <script defer src="/script.js"></script><script>window.addEventListener('load',()=>{if(typeof window.gtag==='function')window.gtag('event','insight_view',{page:'running_before_crawling'});});</script>
</body></html>`;

writeFileSync(outputPath, page);
console.log(`Built ${path.relative(root, outputPath)} from corrected manuscript.`);
