# GA4 interaction measurement plan

## Scope and decision rules

This plan covers meaningful business, navigation, content, and disclosure interactions on production-eligible pages. It deliberately excludes raw clicks, hover, focus, keystrokes, scroll motion, animation, field values, and all activity after any of the three private calculator/readiness routes loads.

Enhanced Measurement settings could not be inspected with authenticated GA4 Admin access in this environment. The implementation therefore does not manually emit the reserved automatic events `page_view`, `click`, `scroll`, `file_download`, `form_start`, or `form_submit`. Site-specific events use distinct names and controlled parameters.

Key-event recommendation: mark `generate_lead` as the primary key event only after GA4 Editor review. Consider `resume_download` as a secondary key event. No other event in this plan should be a key event by default.

## Interaction inventory

“EM” means potential GA4 Enhanced Measurement coverage that must be confirmed in Admin. “Once” means in-memory deduplication for the current page view only.

| Route | Component / visible control | Interaction | Event and parameters | EM overlap | Custom needed / dedup | Key event | Privacy risk | Test requirement |
|---|---|---|---|---|---|---|---|---|
| All eligible | Header logo and primary navigation links | Select destination | `nav_select`: `nav_type`, `destination_path`, `item_id` | None for internal links; outbound may also produce automatic `click` | Yes; one delegated event per selection | No | Low; sanitized root-relative path | Header desktop and mobile selection |
| All eligible | Mobile navigation toggle / Escape / selected link | Open or close menu | `content_expand`: `component_id`, `content_type`, `section_id`, `action_state` | None | Yes; open/close comparison intentionally retained | No | None | Open and close at 390 px |
| All eligible | Footer logo, primary links, action links | Select destination | `nav_select`; Calendly is `calendar_open` | Outbound links may also produce automatic `click` | Yes; taxonomy differs from automatic outbound click | No | Low | Footer and logo selection |
| All eligible | Breadcrumb links | Select hierarchy destination | `nav_select`: breadcrumb context | None | Yes | No | Low | Breadcrumb selection |
| All eligible | Location/travel and footer disclosure | Open detail | `content_expand`: location/travel context | None | Yes; Once | No | None | Open, close, reopen yields one open event |
| All eligible | LinkedIn links | Select profile | `cta_select`: `action_type=linkedin`, placement | Automatic outbound `click` may also occur | Yes; distinct business CTA semantics | No | No URL or visible text sent | Header/body/footer placements |
| All eligible | Calendly links | Open scheduling experience | `calendar_open`: `calendar_type`, `placement`, `source_page` | Automatic outbound `click` may also occur | Yes; one delegated event, never `generate_lead` | No | No scheduling data | Recruiter and audit/consulting links |
| All eligible | Buttons and primary/secondary CTA links | Select CTA | `cta_select`: action, placement, sanitized destination/content | None for internal links | Yes; one delegated event | No | Low | Representative CTA per route family |
| Homepage | Hero career profile, case studies, audit links | Select CTA | `cta_select` | None | Yes | No | Low | All three hero CTA types |
| Homepage | Publication/research cards and their tool/case-study paths | Select identifiable content | `select_content`: `content_type`, `item_id`, `placement` | None | Yes | No | Stable path slug only | Publication and tool selection |
| Homepage | Featured case-study links | Select case study | `select_content` | None | Yes | No | Stable path/hash only | Featured case link |
| Homepage | Capability disclosures | Open capability detail | `content_expand`: component and section context | None | Yes; Once per disclosure | No | None | Open/reopen deduplication |
| Homepage | Closing resume, contact, audit controls | Select CTA | `cta_select` | None | Yes | No | Low | Closing CTA selections |
| Publications index | Publication, tool, and supporting case-study paths | Select content | `select_content` | None | Yes | No | Stable content slug | Both publication ledger items |
| Publication detail | Hero/read links, table of contents, chapter rail, executive-summary links | Navigate within publication | `nav_select` for in-page navigation; tool/case links use `select_content` | None | Yes | No | Approved static hash only | Hero, TOC, chapter rail |
| Publication detail | Major section | At least 50% visible for at least one second | `publication_section_view`: publication/section/order | Automatic scroll records only one 90% event and is not equivalent | Yes; Once, in-memory timer and Set | No | No dwell duration sent | Threshold, delay, once behavior |
| Publication detail | Supporting, methodology, citation/reference boundary disclosures | Open detail | `content_expand` | None | Yes; Once | No | DOM IDs only | Supporting and backmatter disclosure |
| Publication detail | Interactive framework choice | Select controlled framework option | `select_content`: `content_type=capability`, deterministic option ID, placement | None | Yes | No | No visible label/detail sent | Each framework family |
| Publication detail | External citations/references | Open external evidence | No custom event | Automatic outbound `click` if enabled | No; avoid duplicate outbound event | No | No custom URL capture | Confirm no custom event |
| Publication detail | Browser print request | Print | `print_request`: content type/ID | None | Yes; Once | No | None | Repeated `beforeprint` deduplication |
| Publication detail | Share/copy-link control | Explicit share or copy, if a control exists | `share` or `copy_action` | None | Supported declaratively; no current eligible control | No | Never clipboard content | Validator and future control contract |
| Case-studies index | Featured publication/tool/case paths | Select content | `select_content` | None | Yes; annotated or delegated once | No | Stable IDs | All three content types |
| Case-studies index | “View Full Case Study” | Open full case | `case_study_expand`: case ID and placement | None | Yes; Once per case; collapse is not emitted | No | Stable DOM ID | Open/collapse/reopen |
| Case-studies index | “View More Case Studies” | Reveal additional cases | `content_expand` | None | Yes; Once | No | None | Reveal deduplication |
| Case-study detail | Methodology/system/supporting detail | Open disclosure | `content_expand` | None | Yes; Once | No | Stable section/component only | Detail disclosure |
| Case-study detail | Publication, framework, tool, contact paths | Select content or CTA | `select_content` or `cta_select` | None | Yes | No | Stable path only | Representative links |
| Engagements | Conversation topic selector or mobile topic disclosure | Select topic | `engagement_topic_select`: topic ID and placement | None | Yes; one event per deliberate selection | No | Controlled topic ID | Desktop and mobile topic choice |
| Engagements | Engagement-form CTA | Reveal inquiry form | `lead_form_open`: form/source/placement | None | Yes; Once | No | No field data | Both reveal controls deduplicate |
| Engagements | Browser Back after form reveal | Close inquiry form | `content_expand`: lead-form close state | None | Yes; explicit open/close comparison | No | None | Back/hash close behavior |
| Engagements | Valid engagement form | Submit attempt after native validity passes | `lead_form_submit_attempt`: form/source only | Form interactions may be automatic | Yes; distinct pre-submit business diagnostic | No | No values, labels, errors, or free text | Invalid emits none; valid emits one |
| Engagements | Successful Netlify redirect | Arrive on `/engagements/success/` | `generate_lead`: lead/source/placement | None | Yes; Once | Primary candidate | No submitted data | One event on success arrival |
| Engagements | Format cards and audience-fit descriptions | Read informational content | No event | N/A | No; not interactive | No | None | Confirm no false events |
| Engagements | FAQ disclosures | Open answer | `content_expand` | None | Yes; Once | No | Stable component ID | Open/reopen |
| Resume | Download Resume PDF | Select download | `resume_download`: placement/file ID | Automatic `file_download` may also occur | Yes; intentional higher-level business event with distinct name | Secondary candidate | No filename-derived user data | Resume and recruiter placements |
| Resume | Earlier experience | Expand detail | `content_expand` | None | Yes; Once | No | None | Open/reopen |
| Recruiters | Search-fit supporting detail | Expand detail | `content_expand` | None | Yes; Once | No | None | Open/reopen |
| Recruiters | Recruiter schedule / contact / LinkedIn | Select action | `calendar_open` or `cta_select` | Outbound automatic click may overlap by design, not name | Yes | No | No booking/profile data | Each action type |
| Skills | Capability/supporting detail | Expand detail | `content_expand` | None | Yes; Once | No | Stable component/section | Supporting detail |
| Skills | Publication, tool, case-study proof links | Select content | `select_content` | None | Yes | No | Stable path only | Representative proof link |
| Audit | Audit lens and methodology detail | Open disclosure | `content_expand` | None | Yes; Once | No | Stable component only | Audit disclosure |
| Audit | Calendly, contact, readiness tool | Select action/content | `calendar_open`, `cta_select`, or `select_content` | Outbound click for Calendly may also occur | Yes | No | No form/tool values | All action types |
| Contact | “Send a message” focus control | Deliberately focus/reveal form | `lead_form_open` | Form interaction may be automatic | Yes; Once | No | No field identity/value | Focus action |
| Contact | First field interaction | Begin form | No custom event | Automatic `form_start`, if enabled | No; reserved event avoided | No | Values excluded | Manual Admin confirmation |
| Contact | Valid contact form | Submit attempt after native validity passes | `lead_form_submit_attempt` | Automatic `form_submit`, if enabled | Yes; distinct site-specific diagnostic | No | Only form type/source | Invalid vs valid submit |
| Contact | Successful Netlify redirect | Arrive on `/contact/success/` | `generate_lead` | None | Yes; Once | Primary candidate | No submitted data | One event on success arrival |
| Contact | LinkedIn, engagement inquiry, Calendly | Select method | `cta_select`, `lead_form_open` on destination reveal, or `calendar_open` | Outbound click for external destinations | Yes where site-specific | No | No contact details | Each method |
| Private calculator/readiness routes | Every control, input, result, copy/export, disclosure, navigation after load | Any interaction | No event | None because GA is absent | Prohibited; loader, config, helper dispatch, attributes, cookies, and analytics storage remain inactive | No | High if tracked; fully excluded | Runtime/network/storage/input-transmission QA |

## Enhanced Measurement manual configuration checklist

In GA4 Admin, an Editor should open **Data streams → Web → Enhanced measurement → Settings** and record the current state of:

1. Page views and browser-history changes.
2. Scrolls.
3. Outbound clicks.
4. Site search, including the configured query parameters.
5. Video engagement.
6. File downloads.
7. Form interactions.

Do not change those settings as part of this code patch. Confirm that automatic outbound/file/form events remain distinguishable from the custom business events in this plan.

## GA4 Admin follow-up

After events are visible in DebugView, create event-scoped custom dimensions only where no standard dimension exists: Content type (`content_type`), Content ID (`content_id`), Placement (`placement`), Section ID (`section_id`), Component ID (`component_id`), Action type (`action_type`), Form type (`form_type`), Lead type (`lead_type`), Calendar type (`calendar_type`), Navigation type (`nav_type`), Topic ID (`topic_id`), Publication ID (`publication_id`), and Case-study ID (`case_study_id`).
