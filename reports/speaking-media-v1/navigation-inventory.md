# Speaking & Media Navigation Inventory

## Scope Reviewed

- HTML routes reviewed: `/`, `/resume/`, `/case-studies/`, `/case-studies/banfield-subscription-commerce/`, `/skills/`, `/recruiters/`, `/audit/`, `/contact/`, `/contact/success/`, `/engagements/`, `/engagements/success/`, `/thank-you/`, and `/404.html`.
- Shared behavior reviewed: `script.js`, `styles.css`, `sitemap.xml`, and `llms.txt`.

## Header Navigation Pattern

- The site is a static HTML implementation. Each page includes duplicated header markup rather than a shared server-side include.
- Desktop and mobile navigation use the same `.nav-menu` element per page.
- Current header order before edits: `Resume`, `Case Studies`, `Skills`, `Recruiters`, `Audit`, `Contact`.
- The mobile menu is controlled by `script.js` through `.nav-toggle`, `.nav-menu.open`, and `aria-expanded`.
- Active navigation is applied in `script.js` by comparing each `.nav-menu a` `href` to `window.location.pathname`.

## Footer Navigation Pattern

- Each page includes duplicated footer markup.
- Most footer navs currently include `Recruiters`, `Engagements`, `Book Free Audit`, `Schedule Recruiter Call`, `LinkedIn`, and `Use contact form`.
- Some utility pages have a shorter footer but still include `Recruiters` and `Engagements`.
- Recruiters can remain indexable and discoverable through footer links without staying in the global header.

## Current `/recruiters/` References

- Header nav: present on every HTML page.
- Footer nav: present on every HTML page.
- Homepage: prominent recruiter/audit band links to `/recruiters/`.
- Sitemap: `/recruiters/` is included.
- Structured data: `/recruiters/` contains its own ProfilePage, FAQPage, and breadcrumb schema.
- Calendly recruiter link: present on recruiter page and several footers as `https://calendly.com/zsudeepharya/30min`.

## Current `/engagements/` References

- Header nav: not present before edits.
- Footer nav: present as `Engagements`.
- Sitemap: `/engagements/` is included.
- `llms.txt`: describes the page as speaking, panel, webinar, advisory, and professional discussion inquiries.
- Structured data: `/engagements/` has WebPage, Service, OfferCatalog, and BreadcrumbList schema.
- Form route: `engagement-inquiry` posts to `/engagements/success/`.

## Engagements Page Notes

- Existing route is `/engagements/`; no competing route is needed.
- Existing success route is `/engagements/success/` and is `noindex, follow`.
- Existing form plumbing includes:
  - `name="engagement-inquiry"`
  - `data-netlify="true"`
  - hidden `form-name`
  - `netlify-honeypot="bot-field"`
  - `action="/engagements/success/"`
- The page currently uses broad booking language and includes recruiter/hiring-team discussion as an engagement type. The rebuild should focus on speaking, podcasts, media, editorial, and event contributions.

## Edit Implications

- Update every duplicated header `.nav-menu` instance.
- Keep the `.nav-menu` exact-path active logic intact by linking `Speaking & Media` to `/engagements/`.
- Rename footer `/recruiters/` links to `For Recruiters`.
- Rename footer `/engagements/` links to `Speaking & Media`.
- Keep `/recruiters/` in `sitemap.xml` and leave recruiter page schema/direct route intact.
- Update homepage prominent recruiter/audit band so Recruiters is no longer a top-level promotional navigation item.
