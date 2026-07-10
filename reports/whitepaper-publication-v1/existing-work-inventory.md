# Existing whitepaper work inventory

Audited on July 10, 2026. Branch: `feature/running-before-crawling-whitepaper`. All pre-existing dirty files were whitepaper-related; no unrelated worktree changes were found. No existing changes were discarded.

| File | State | Purpose | Whitepaper work | Complete / placeholders | Conflict / action |
| --- | --- | --- | --- | --- | --- |
| `index.html` | modified | Homepage featured-publication block and CTAs | yes | substantially complete; no placeholders | update destinations and asset paths to `/insights/` |
| `case-studies/index.html` | modified | Thought-leadership publication feature and ItemList entry | yes | substantially complete; no placeholders | keep as case study context, update paper links |
| `case-studies/running-before-crawling-whitepaper/index.html` | untracked | Publication-production case study | yes | complete; disclosure and attribution present | keep; point paper links to canonical route |
| `engagements/index.html` | modified | Featured perspective / speaking CTA | yes | substantially complete; no placeholders | update paper links and approved label/copy |
| `whitepapers/index.html` | untracked | Earlier white-paper index | yes | complete but duplicate route | preserve file; convert to `noindex` redirect to `/insights/` |
| `whitepapers/running-before-crawling/index.html` | untracked | Earlier full web edition | yes | complete but duplicate route | preserve file; convert to `noindex` redirect to canonical route |
| `whitepapers/running-before-crawling/whitepaper.css` | untracked | Earlier full web-edition stylesheet | yes | complete; no placeholders | preserve as source for canonical edition |
| `whitepapers/running-before-crawling/Running_Before_Crawling_Sudeep_Arya_Whitepaper_FINAL.pdf` | untracked | Earlier copied final PDF | yes | hash matches authoritative PDF | preserve existing file; canonical public copy goes to required asset path |
| `whitepapers/running-before-crawling/assets/*.png` | untracked | Earlier copied supplied visuals | yes | eight expected visuals | preserve existing files; canonical page uses new asset directory |
| `llms.txt` | modified | Machine-readable page inventory and publication caveats | yes | substantially complete | update canonical route and PDF description |
| `sitemap.xml` | modified | Search-engine URL inventory | yes | substantially complete | replace duplicate white-paper routes with `/insights/` routes |
| `script.js` | modified | GA4 click-event delegation | yes | complete; no placeholders | preserve and extend event coverage only if required |
| `scripts/seo-audit.mjs` | modified | Metadata/SEO validation route allowlist | yes | complete for earlier routes | replace old indexable routes with `/insights/` routes |
| `scripts/validate-internal-links.mjs` | modified | Internal-link validation and `.codex-inputs` exclusion | yes | complete | preserve; required for package inputs |
| `scripts/validate-jsonld.mjs` | modified | JSON-LD validation and package exclusion | yes | complete | preserve |
| `scripts/validate-netlify-forms.mjs` | modified | Form validation and package exclusion | yes | complete | preserve |
| `styles.css` | modified | Shared landing-page and publication/case-study styles | yes | complete; no placeholders | preserve; no global-navigation addition |
| `reports/seo-aeo-geo-v1/page-inventory.csv` | modified | Generated SEO inventory | yes | generated output for earlier route set | regenerate after route consolidation |
| `reports/seo-aeo-geo-v1/structured-data-inventory.json` | modified | Generated structured-data inventory | yes | generated output for earlier route set | regenerate after route consolidation |
| `reports/whitepaper-publication-v1/*` | new | Publication evidence, source audit, and QA records | yes | created during this implementation | keep as publication record |

The old white-paper files are not deleted because the continuation instructions require preservation of existing work. They are made non-indexable and redirected so only one public publication route remains. Their assets are retained but unlinked; the canonical publication uses the approved PDF and eight visuals from the extracted final package.

