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

## Deployment notes

- Temporary canonical domain: `https://rococo-speculoos-7d6380.netlify.app/`
- Replace the temporary Netlify URL with the custom domain in every canonical URL, Open Graph URL, `sitemap.xml`, and `robots.txt` when the custom domain is ready.
- Replace `resume/Sudeep-Arya-Amazon-DTC-Marketplace-AI-Commerce-Resume.pdf` with the final resume PDF using that exact filename.
- Hard content rule: forbidden prior-employer terms from the project brief must not appear anywhere in this repository.

## Structure

- `/` - executive homepage
- `/resume/` - crawlable HTML resume and resume download
- `/case-studies/` - structured commerce case studies
- `/skills/` - recruiter and search keyword index
- `/recruiters/` - quick recruiter brief
- `/audit/` - free Digital Acceleration Audit landing page
