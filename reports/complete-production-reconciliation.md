# Complete production reconciliation

Release branch: `release/complete-site-production-v1`

Base: `d0d24a343400b7ed45072dc52c25af1196eff378`

Preserved sources:

- Engagements integration: `rescue/engagements-integration-final-20260713` at `44c6e08c28f38827ec5e31b87b7ea8d4bc08c3e5`
- Publication correction: `rescue/primary-publication-correction-final-20260713` at `0b1a0a9c8d3f22e914287c0b046ac110dbeb3fa4`

## Reconciliation policy

The engagements rescue supplies the final engagement experience, maps, forms, calculator behavior, accessibility, performance, centralized analytics, and staging safeguards. The publication rescue supplies the authoritative two-publication routes, labels, CTAs, metadata, sitemap, `llms.txt`, targeted redirects, HTML-only PDF policy, and publication validators. Centralized production-only GA4 loading from the engagements source wins over inline analytics from the publication source; both calculator routes remain excluded.

## Overlap decisions

| Overlapping path | Final decision |
|---|---|
| `404.html` | Keep engagements accessibility/footer version; add Publications to the no-JS navigation. |
| `_redirects` | Publication correction wins, including targeted legacy publication and PDF redirects to HTML. |
| `assets/running-before-crawling-social-preview.png` | Publication correction wins. |
| `audit/index.html` | Keep engagements integration; add Publications to navigation/footer. |
| `case-studies/ai-economics-decision-framework/index.html` | Publication correction wins for the Running Before Crawling relationship, route, and CTA; remove inline analytics in favor of the centralized loader. |
| `case-studies/banfield-subscription-commerce/index.html` | Keep engagements integration; add Publications to navigation/footer. |
| `case-studies/index.html` | Publication correction wins for the two-publication presentation and supporting relationships; remove inline analytics. |
| `case-studies/small-team-bigger-output/index.html` | Keep the engagements-hardened case study; preserve the corrected publication relationship and Publications navigation. |
| `contact/index.html` | Engagements integration wins so the location maps and travel presentation remain; add Publications navigation. |
| `contact/success/index.html` | Engagements form/success hardening wins; add Publications navigation. |
| `downloads/running-before-crawling-executive-edition.pdf` | Excluded and deleted from deployable source. Legacy URL redirects to the HTML publication. |
| `engagements/index.html` | Engagements integration wins in full; add Publications navigation. |
| `engagements/success/index.html` | Engagements integration wins; add Publications navigation. |
| `index.html` | Publication correction wins for card order, labels, CTAs, and supporting links; remove inline analytics and retain the integrated site shell. |
| `insights/index.html` | Excluded; no physical Insights tree is published. |
| `llms.txt` | Publication correction wins. |
| `publications/index.html` | Publication correction wins; remove inline analytics. |
| `publications/small-team-bigger-output/index.html` | Publication correction wins for the approved HTML route and supporting links; remove inline analytics. |
| `recruiters/index.html` | Engagements sitewide hardening wins; add Publications navigation. |
| `resume/index.html` | Engagements sitewide hardening wins; add Publications navigation. |
| `script.js` | Engagements integration wins for maps, forms, accessibility, and centralized production-only GA4; add Publications to the generated footer. |
| `scripts/build-staging.sh` | Publication correction wins so old content trees and publication PDFs are excluded; existing staging transformation and validation remain. |
| `scripts/qa-content-operations-tool.mjs` | Publication correction wins for the approved publication routes. |
| `scripts/seo-audit.mjs` | Publication correction wins for the route inventory; manually retain centralized analytics validation from the engagements integration. |
| `scripts/validate-content-operations-tool.mjs` | Publication correction wins for the two-publication relationships and redirect policy. |
| `scripts/validate-whitepaper-publication.mjs` | Removed and replaced by `scripts/validate-publications.mjs`. |
| `sitemap.xml` | Publication correction wins. |
| `skills/index.html` | Engagements sitewide hardening wins; add Publications navigation. |
| `source-assets/running-before-crawling-social-preview.svg` | Publication correction wins. |
| `styles.css` | Engagements integration wins to retain the approved layout, maps, forms, accessibility, and responsive work; publication-specific CSS remains route-local. |
| `tests/ai-economics/calculator-context-examples.test.mjs` | Publication correction wins for the HTML publication route and CTA assertions. |
| `thank-you/index.html` | Engagements sitewide hardening wins; add Publications navigation. |
| `tools/ai-cost-reality-calculator/advanced/index.html` | Publication correction wins for publication links and navigation; engagements calculator JavaScript/CSS enhancements remain. |
| `tools/ai-cost-reality-calculator/index.html` | Publication correction wins for publication links and navigation; engagements calculator JavaScript/CSS enhancements remain. |
| `tools/index.html` | Publication correction wins for Publications navigation; centralized analytics replaces inline analytics. |

## Deliberate exclusions

- Deployable publication PDFs
- Physical `insights/` and `whitepapers/` trees
- Engagements rescue screenshots and Lighthouse JSON
- The local inclusion-audit scratch report
- Generated staging output, browser profiles, caches, temporary files, and review packages
