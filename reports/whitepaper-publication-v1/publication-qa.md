# Publication QA

Status: PASS for local implementation; not deployed.

## Package and PDF

- Public PDF path exists: `assets/whitepapers/sudeep-arya-running-before-crawling.pdf`.
- Public PDF size: 2,185,893 bytes.
- Public PDF SHA-256: `822cda3ed2335704fd49458e71c813765bce80af03dacc33e6650cf03b117ee6`.
- The public copy is byte-identical to the extracted authoritative PDF and to the PDF inside `Running_Before_Crawling_Web_Deployment_FINAL.zip`.
- Ghostscript page-tree check: `gs -q -dNOSAFER -dNODISPLAY -dBATCH -dNOPAUSE -c "(assets/whitepapers/sudeep-arya-running-before-crawling.pdf) (r) file runpdfbegin pdfpagecount = quit"` → `24`.
- `pdfinfo`, `qpdf`, and Python PDF packages were unavailable in this environment; the earlier audit had independently confirmed the same authoritative PDF at 24 pages. The green-light proof separately returns 6 pages under the same Ghostscript check and is not published as the whitepaper.
- Ghostscript renders of pages 1, 12, and 24 were inspected. Page 1 is the approved cover, page 12 contains the public-case lessons and ecommerce transition, and page 24 is the final references/copyright page (the printed footer numbering reflects the designed cover/front-matter sequence).

## Structural checks

Commands run from repository root:

```text
node scripts/validate-whitepaper-publication.mjs
node scripts/validate-internal-links.mjs
node scripts/validate-jsonld.mjs
node scripts/validate-netlify-forms.mjs
node scripts/seo-audit.mjs
git diff --check
```

Results:

- Publication validator: PASS; canonical route, PDF, social image, eight visuals, required disclosure, links, content, JSON-LD, and metadata checks passed.
- Internal links: PASS; 567 local references checked.
- JSON-LD: PASS; 14 blocks parsed.
- Netlify forms: PASS; 2 forms checked.
- SEO audit: PASS; 18 HTML pages inspected.
- Git whitespace check: PASS.

## Browser checks

Static local server: `python3 -m http.server 4173`.

Routes checked at 390, 768, and 1440 CSS pixels:

- `/`
- `/insights/`
- `/insights/running-before-crawling/`
- `/case-studies/running-before-crawling-whitepaper/`
- `/engagements/`

All returned HTTP 200, had one H1, no console/page errors, no horizontal overflow, and no missing eager-loaded images. The supplied whitepaper figures use native lazy loading; a second pass explicitly scrolled each figure into view and confirmed all eight loaded at their native dimensions.

Screenshots are stored in `reports/whitepaper-publication-v1/screenshots/`. The reviewed desktop and mobile compositions retain the existing SA monogram language, strong editorial hero imagery, controlled reading width, teal/copper/purple accents, and restrained CTA system. The Insights index has no fabricated article cards.

## Content and qualification checks

- Approved title and subtitle preserved.
- Author and July 10, 2026 publication date visible.
- Approximate reading time visible.
- PDF download and Read Online jump link visible.
- AI disclosure visible near the paper introduction and in `About this paper`.
- References and endnotes remain in the web edition.
- Gartner is labeled a forecast.
- Klarna figures remain company-reported.
- Air Canada remains bounded to the British Columbia tribunal decision.
- Uber transcript retrieval limitation remains disclosed.
- No future metric is represented as an achieved result.
- No `qrcode_chatgpt.com.png`, employer logo, generated portrait, robot, or brain imagery is used.

