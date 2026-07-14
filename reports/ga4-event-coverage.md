# GA4 event coverage

## Route coverage

Eligible route families are the homepage, 404, audit, case-study index/details, contact and contact success, engagements and engagement success, publications index/details, recruiters, resume, skills, thank-you, and tools index. The AI cost calculator, advanced AI cost calculator, and content-operations readiness routes are hard-excluded before the GA loader, data layer, event helper, or runtime annotations can activate.

## Controlled taxonomy

Recommended events: `select_content`, `share`, and `generate_lead`.

Custom events: `nav_select`, `cta_select`, `content_expand`, `publication_section_view`, `case_study_expand`, `engagement_topic_select`, `lead_form_open`, `lead_form_submit_attempt`, `calendar_open`, `print_request`, `copy_action`, and `resume_download`.

Reserved automatic names are not manually emitted. Event names are lowercase snake case, stable, and no longer than 40 characters. One delegated capture-phase click listener handles links/buttons; stateful component handlers use the same centralized helper. Disclosure, publication-section, success, and other once-only events use an in-memory Set. No storage, polling, global MutationObserver, dependency, or navigation delay was added.

## Parameter dictionary

The helper accepts only: `content_type`, `content_id`, `item_id`, `placement`, `section_id`, `component_id`, `action_type`, `action_state`, `destination_path`, `nav_type`, `form_type`, `lead_type`, `calendar_type`, `method`, `source_page`, `publication_id`, `case_study_id`, `topic_id`, `section_order`, and `file_id`.

Unknown keys and empty values are dropped. Identifiers are restricted to lowercase letters, numbers, underscores, and hyphens. Destination/source paths must resolve to the current origin, have query strings removed, and may retain only a short static hash. Values are capped at 100 characters.

## Enhanced Measurement overlap

Authenticated GA4 configuration access was unavailable during implementation, so the enabled state of scrolls, outbound clicks, site search, video engagement, file downloads, and form interactions is not claimed. The patch preserves Enhanced Measurement and avoids manually sending its reserved event names. Ordinary outbound citations remain custom-event-free. `resume_download` is intentionally distinct from a possible automatic `file_download`; `lead_form_submit_attempt` is intentionally distinct from automatic form events and never means a completed lead.

## Custom dimensions and key events

Manual GA4 Admin work after DebugView validation:

1. Create event-scoped dimensions for content type/ID, placement, section/component ID, action/form/lead/calendar/navigation type, topic ID, publication ID, and case-study ID only where GA4 has no standard equivalent.
2. Mark `generate_lead` as the primary key event after confirming it appears only on the two approved success pages.
3. Optionally mark `resume_download` as a secondary key event.
4. Do not mark navigation, CTA, disclosure, section-view, topic, form-open, submit-attempt, Calendly, or content-selection events as key events by default.

## Privacy exclusions

No event can include names, email, telephone, company, message/free text, field values, validation text, calculator/readiness inputs or results, financial/operational values, recommendations, CSV/clipboard content, query parameters, exact addresses, user/session IDs, or behavioral fingerprints. No user properties, advertising personalization, Signals, or remarketing were added.

Clicks leading from an eligible page to a private tool may emit `select_content` before navigation. Once the private route loads, the GA loader/config/helper dispatch is inactive and there are no analytics requests, cookies, analytics storage, input transmission, or result transmission.

## Untracked meaningful candidates and rationale

- Ordinary outbound evidence/citation links: left to Enhanced Measurement to prevent a duplicate custom outbound event.
- Scroll depth: left to Enhanced Measurement; raw scroll movement is not tracked.
- First form field interaction: left to Enhanced Measurement form interaction if enabled; field events and values are not reproduced manually.
- Engagement format/audience cards: informational, not selectable controls.
- Passive reading time, hover, focus, keystrokes, animations, and visual changes: not meaningful approved business events.
- Share/copy URL: the taxonomy and declarative contract exist, but no eligible publication currently exposes such a control.
- Calculator/readiness interactions: prohibited regardless of business meaning.

## Validation and performance

`scripts/validate-ga4-events.mjs` validates the event/parameter schemas, annotations, naming/length rules, calculator exclusions, single loader/config/init, reserved-event avoidance, success deduplication, parameter sanitation, and staging analytics stripping.

`scripts/qa-ga4-events.mjs` covers header/footer navigation, mobile menu states, publication/tool/case-study selection, case-study and location expansion deduplication, publication section visibility, outbound-link non-duplication, print deduplication, engagement topic/form flows, contact submit attempt, success leads, Calendly, resume download, and all three calculator exclusions using a production-host simulation with the external GA script blocked. It passes 60 browser checks, including zero requests and zero analytics/storage state after sample input/result interactions on every excluded route.

Lighthouse 13.4.0 final homepage results are 100 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO on both desktop and mobile. Desktop LCP is 422.2234 ms versus a 363.9842 ms exact-baseline run (+58.2392 ms), with TBT 0 ms and CLS 0 before and after. Five alternating mobile samples produced a baseline median LCP of 1652.5584 ms and final median of 1652.2729 ms (-0.2855 ms), with median TBT 0 ms, CLS 0, and Performance 100. The implementation therefore stays within the one-point Performance, 100 ms LCP, 20 ms TBT, and zero-CLS regression limits.

The complete repository run passes 243 unit tests, 166 event-schema checks, 499 broad browser checks across 22 routes and two primary viewports, 24 calculator scenarios with 420 independent checks, 709 internal references, 18 JSON-LD blocks, 22-page SEO validation, all six discovered forms, staging-output safeguards, and source/built-output tag-manager absence scans.

## Realtime and DebugView limitation

No authenticated GA4 Realtime, DebugView, or Data Stream Admin session was available. Browser network and queued-event evidence are used locally. An authorized Editor should use the manual checklist in `ga4-interaction-measurement-plan.md`, then validate one production-approved smoke session in DebugView without submitting a real form.
