# Sudeep Arya Career Site

Premium static career website for Sudeep Arya, built for recruiter discovery, Google indexing, AI search tools, and fast Netlify hosting.

## Preview locally

Open `index.html` directly in a browser, or run a simple static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Netlify settings

- Build command: leave blank
- Publish directory: `.`
- Runtime: static HTML, CSS, and vanilla JavaScript
- Netlify Forms: keep form detection enabled. Validate form markup with `node scripts/validate-netlify-forms.mjs` before deploying.

## Artifact Packaging

Generate future ZIP handoffs with:

```bash
./scripts/package-artifacts.sh
```

The script creates a timestamped ZIP in `artifacts/` and copies it to `/mnt/c/Users/sudee/Downloads/sudeep-career-site-artifacts/` for easy Windows access.

## Deployment notes

- Production canonical domain: `https://sudeeparya.com/`
- Canonical URLs, Open Graph URLs, `sitemap.xml`, `robots.txt`, and `llms.txt` should stay on the custom domain above unless production hosting changes.
- Replace `resume/Sudeep-Arya-Amazon-DTC-Marketplace-AI-Commerce-Resume.pdf` with the final resume PDF using that exact filename.
- Hard content rule: forbidden prior-employer terms from the project brief must not appear anywhere in this repository.

## Analytics

- Eligible production HTML uses Google Tag Manager container `GTM-N2MVP44C`; direct `gtag.js` loading and direct GA4 event dispatch are prohibited.
- The native Google Tag in that container must use GA4 measurement ID `G-C65RGRMMW1`. Do not deploy GA4 through Custom HTML.
- The quick and advanced AI Cost Reality Calculator pages and the Content Workflow Snapshot remain entirely analytics-free.
- The permanent staging build strips GTM and validates the complete publish output for GTM, GA4, and analytics dispatch code.
- Custom GTM events are not active in this release. Existing `data-ga-event` attributes are inert placeholders for a separately approved future migration.

Run `node scripts/validate-analytics.mjs` before a production release. The permanent staging build runs the same source validator before creating analytics-free output.

## Structure

- `/` - executive homepage
- `/resume/` - crawlable HTML resume and resume download
- `/case-studies/` - structured commerce case studies
- `/case-studies/ai-economics-decision-framework/` - original AI economics research and product-design framework
- `/publications/` - original publication library
- `/publications/running-before-crawling/` - canonical Running Before Crawling HTML publication
- `/publications/small-team-bigger-output/` - canonical Small Team, Bigger Output HTML publication
- `/case-studies/small-team-bigger-output/` - supporting content-operations case study
- `/tools/` - browser-based decision-tool library
- `/tools/ai-cost-reality-calculator/` - private, browser-based AI TCO and verified-outcome calculator
- `/tools/content-operations-readiness/` - private, browser-based Content Workflow Snapshot
- `/skills/` - recruiter and search keyword index
- `/recruiters/` - quick recruiter brief
- `/audit/` - free Digital Acceleration Audit landing page
- `/engagements/` - podcast, panel, webinar, advisory, and professional discussion inquiries
- `/contact/` - contact form and scheduling paths

The AI Cost Reality Calculator uses formula version `1.1.0`. It runs entirely in the browser, does not auto-save, and does not transmit entered financial values to analytics or another service.
