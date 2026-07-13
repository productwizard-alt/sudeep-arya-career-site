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

## Structure

- `/` - executive homepage
- `/resume/` - crawlable HTML resume and resume download
- `/case-studies/` - structured commerce case studies
- `/case-studies/ai-economics-decision-framework/` - original AI economics research and product-design framework
- `/case-studies/small-team-bigger-output/` - content-operations publication-system case study
- `/publications/` - original research and decision-system collection
- `/publications/small-team-bigger-output/` - interactive content-operations publication
- `/tools/` - private browser-based decision-tools collection
- `/tools/ai-cost-reality-calculator/` - private, browser-based AI TCO and verified-outcome calculator
- `/tools/content-operations-readiness/` - private readiness assessment and approved-output economics planner
- `/skills/` - recruiter and search keyword index
- `/recruiters/` - quick recruiter brief
- `/audit/` - free Digital Acceleration Audit landing page
- `/engagements/` - podcast, panel, webinar, advisory, and professional discussion inquiries
- `/contact/` - contact form and scheduling paths

The AI Cost Reality Calculator uses formula version `1.1.0`. It runs entirely in the browser, does not auto-save, and does not transmit entered financial values to analytics or another service.

The Small Team Output Planner uses formula version `1.0.0`, readiness version `1.0.0`, and methodology `STBO-CONTENT-OPS-1.0`. It uses no analytics, browser storage, form submission, external AI service, or personalized result URL.
