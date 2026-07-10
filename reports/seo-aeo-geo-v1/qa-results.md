# QA Results

## Local Server

Local server used:

`http://127.0.0.1:4176/`

Confirmed reachable from:

- `http://127.0.0.1:4176/` - 200
- `http://localhost:4176/` - 200 from WSL and Windows PowerShell

## Browser QA

- Browser used: Windows Microsoft Edge
- Browser executable: `/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`
- Screenshot method: Edge headless screenshots with tall fixed viewports
- Desktop viewport: 1440px wide, page-specific tall heights
- Mobile viewport: 390px wide, page-specific tall heights
- Windows screenshot folder: `C:\Users\sudee\Downloads\sudeep-career-site-artifacts\seo-aeo-geo-v1\`
- WSL screenshot folder: `reports/seo-aeo-geo-v1/screenshots/`

Desktop captures inspected:

- `seo-home-desktop.png`
- `seo-resume-desktop.png`
- `seo-case-studies-desktop.png`
- `seo-banfield-desktop.png`
- `seo-recruiters-desktop.png`
- `seo-audit-desktop.png`
- `seo-engagements-desktop.png`
- `seo-contact-desktop.png`
- `seo-404-desktop.png`

Mobile captures inspected:

- `seo-home-mobile.png`
- `seo-case-studies-mobile.png`
- `seo-recruiters-mobile.png`
- `seo-audit-mobile.png`
- `seo-engagements-mobile.png`
- `seo-contact-mobile.png`

Visual QA result: passed. The tall captures include extra dark viewport after the footer on shorter pages; this is screenshot headroom, not rendered page content or new layout dead space.

## Visual Findings

- Homepage remains concise and human; no SEO copy wall or duplicate personal summary.
- Resume metadata changes do not visibly alter the resume layout.
- Case studies show the first six studies by default; the FAQ remains compact and does not overwhelm the page.
- Banfield detail page remains readable, public-safe, and visually consistent.
- Recruiter FAQ is concise, useful, and not a keyword-stuffed job-title list.
- Audit FAQ is useful and aligned to the visible offer.
- Engagements page does not imply a large agency and keeps service language credible.
- Contact page remains compact; regional availability disclosure is closed by default.
- 404 page is branded, clear, noindex, and links back to useful pages.
- No schema text, social-image references, technical metadata, or JSON-LD rendered visibly.
- No horizontal overflow, clipped headings, broken images, missing icons, mobile overlap, or unreadable text found.

## Fixes Made During QA

- Reduced repeated platform-migration wording outside the detailed case-study and resume proof context.
- Replaced clunky visible AI phrasing with more natural recruiter-facing language such as `AI-assisted commerce operations`.
- Cleaned report wording so raw repository scans are not polluted by report-only references to excluded terms.

## Route Status Results

- `/` - 200
- `/resume/` - 200
- `/case-studies/` - 200
- `/case-studies/banfield-subscription-commerce/` - 200
- `/skills/` - 200
- `/recruiters/` - 200
- `/audit/` - 200
- `/contact/` - 200
- `/engagements/` - 200
- `/thank-you/` - 200
- `/sitemap.xml` - 200
- `/robots.txt` - 200
- `/llms.txt` - 200
- `/404.html` - 200
- `/definitely-missing-seo-qa-route/` - 404

## Command Results

- `node --check script.js` - passed
- `git diff --check` - passed
- `node scripts/validate-jsonld.mjs` - passed, 9 JSON-LD blocks parsed
- `node scripts/validate-internal-links.mjs` - passed, 324 local references checked
- `node scripts/seo-audit.mjs` - passed, 12 HTML pages inspected

## Metadata / Indexing Results

- Canonical origin consistency - passed
- Unique titles and descriptions - passed
- Open Graph metadata - complete on inventoried pages
- Twitter metadata - complete on inventoried pages
- Sitemap URLs - canonical and complete for indexable routes
- Noindex pages excluded from sitemap - passed
- Robots sitemap reference - passed
- `llms.txt` - created and available locally

## Structured Data Results

- JSON-LD parse result - passed
- Duplicate conflicting schema `@id` result - passed
- Person entity `@id` - `https://sudeeparya.com/#person`
- WebSite entity `@id` - `https://sudeeparya.com/#website`
- FAQPage locations - `/audit/`, `/recruiters/`
- Service schema locations - `/audit/`, `/engagements/`
- Excluded unsupported job, local-business, review, and rating schema types - not present in public HTML

## Link / HTML Results

- Internal-link result - passed
- Anchor result - passed
- Duplicate-ID result - passed by `seo-audit.mjs`
- Image-alt result - passed by inventory
- Social image dimension result - `assets/sudeep-arya-social-preview.png` is 1200 x 630 PNG
- Apple touch icon result - `assets/apple-touch-icon.png` is 180 x 180 PNG
- Favicon references - present
- GA4 result - `G-C65RGRMMW1` remains in HTML
- Calendly result - both approved Calendly URLs remain
- Netlify Forms result - `data-netlify` and honeypot markup remain on contact and engagement forms

## Privacy / Accuracy Results

- No forbidden exact town term found in public HTML/XML/TXT files.
- No street address added.
- No meta keywords added.
- No private Miro links found.
- No unsupported job, local-business, review, or rating schema added.
