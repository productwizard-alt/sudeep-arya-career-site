#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.GA4_QA_BASE_URL || "http://sudeeparya.com:8080";
const executablePath = process.env.CHROME_PATH;
const checks = [];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP sudeeparya.com 127.0.0.1"],
});

const openPage = async (route, viewport = { width: 1440, height: 1000 }) => {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/googletagmanager\.com\/gtag\/js/iu, (request) => request.abort());
  const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);
  assert(response?.status() === 200, `${route}: loaded successfully`);
  assert(errors.length === 0, `${route}: no page errors`);
  return page;
};

const events = (page, eventName) => page.evaluate((name) => (window.dataLayer || [])
  .map((entry) => Array.from(entry))
  .filter((entry) => entry[0] === "event" && (!name || entry[1] === name))
  .map((entry) => ({ name: entry[1], parameters: entry[2] || {} })), eventName);

const stopElementAction = (page, selector) => page.locator(selector).first().evaluate((element) => {
  element.addEventListener("click", (event) => event.preventDefault(), { once: true });
});

const stopElementActionImmediately = (page, selector) => page.locator(selector).first().evaluate((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true, once: true });
});

const submitValidForm = async (page, selector) => {
  await page.locator(selector).evaluate((form) => {
    form.querySelectorAll("[required]").forEach((field) => {
      if (field instanceof HTMLSelectElement) {
        field.selectedIndex = Math.min(1, field.options.length - 1);
      } else if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) {
        field.checked = true;
      } else if (field instanceof HTMLInputElement) {
        field.value = field.type === "email" ? "qa@example.com" : field.type === "url" ? "https://example.com" : "QA";
      } else if (field instanceof HTMLTextAreaElement) {
        field.value = "QA validation message";
      }
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    form.addEventListener("submit", (event) => event.preventDefault(), { once: true });
    form.requestSubmit();
  });
  await page.waitForTimeout(50);
};

try {
  {
    const page = await openPage("/");
    await stopElementAction(page, '.nav-menu a[href="/resume/"]');
    await page.locator('.nav-menu a[href="/resume/"]').click();
    const header = await events(page, "nav_select");
    assert(header.length === 1 && header[0].parameters.nav_type === "header", "Header navigation emits one nav_select");

    await stopElementAction(page, '.site-footer .footer-primary-nav a[href="/resume/"]');
    await page.locator('.site-footer .footer-primary-nav a[href="/resume/"]').click();
    const navigation = await events(page, "nav_select");
    assert(navigation.length === 2 && navigation[1].parameters.nav_type === "footer", "Footer navigation emits one nav_select");

    await stopElementAction(page, ".research-card nav .button");
    await page.locator(".research-card nav .button").first().click();
    const publication = await events(page, "select_content");
    assert(publication.length === 1 && publication[0].parameters.content_type === "publication", "Homepage publication selection emits select_content");

    await stopElementAction(page, ".case-row a");
    await page.locator(".case-row a").first().click();
    const contentSelections = await events(page, "select_content");
    assert(contentSelections.length === 2 && contentSelections[1].parameters.content_type === "case_study" && contentSelections[1].parameters.item_id === "amazon-marketplace-growth", "Homepage hash-target case-study selection emits select_content");

    const locationToggle = page.locator(".site-footer [data-regional-toggle]").first();
    await locationToggle.click();
    await locationToggle.click();
    await locationToggle.click();
    const locationEvents = (await events(page, "content_expand")).filter((event) => event.parameters.content_type === "location_travel");
    assert(locationEvents.length === 1, "Location/travel expansion is deduplicated per page view");
    assert((await events(page, "nav_select")).length === 2, "Location/travel disclosure does not emit a spurious nav_select");

    await stopElementAction(page, '.command-profile a[href*="linkedin.com"]');
    await page.locator('.command-profile a[href*="linkedin.com"]').click();
    const linkedIn = await events(page, "cta_select");
    assert(linkedIn.length === 1 && linkedIn[0].parameters.action_type === "linkedin", "LinkedIn selection emits one privacy-safe cta_select");
    await page.close();
  }

  {
    const page = await openPage("/", { width: 390, height: 844 });
    await page.locator(".nav-toggle").click();
    await page.locator(".nav-toggle").click();
    const menuEvents = (await events(page, "content_expand")).filter((event) => event.parameters.component_id === "mobile_navigation");
    assert(menuEvents.length === 2 && menuEvents[0].parameters.action_state === "open" && menuEvents[1].parameters.action_state === "close", "Mobile navigation open and close emit controlled content_expand states");
    assert((await events(page, "nav_select")).length === 0, "Mobile navigation toggle does not emit a spurious nav_select");
    await page.close();
  }

  {
    const page = await openPage("/tools/");
    await stopElementAction(page, ".tool-index-actions .button");
    await page.locator(".tool-index-actions .button").first().click();
    const selected = await events(page, "select_content");
    assert(selected.length === 1 && selected[0].parameters.content_type === "tool", "Tool-card selection emits select_content");
    await page.close();
  }

  {
    const page = await openPage("/case-studies/");
    const toggle = page.locator(".case-disclosure-toggle").first();
    await toggle.click();
    await toggle.click();
    await toggle.click();
    const expanded = await events(page, "case_study_expand");
    assert(expanded.length === 1 && expanded[0].parameters.case_study_id, "Case-study expansion emits one deduplicated case_study_expand");
    await page.close();
  }

  {
    const page = await openPage("/publications/small-team-bigger-output/", { width: 1440, height: 1200 });
    await page.locator("#control-source").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1250);
    const sectionViews = await events(page, "publication_section_view");
    assert(sectionViews.some((event) => event.parameters.section_id === "control-source" && event.parameters.section_order > 0), "Publication section visibility emits after 50% visibility for one second");

    await stopElementAction(page, ".reference-list a");
    const beforeOutbound = (await events(page)).length;
    await page.locator(".reference-list a").first().click();
    const afterOutbound = (await events(page)).length;
    assert(afterOutbound === beforeOutbound, "Ordinary outbound reference links remain delegated to Enhanced Measurement");

    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    assert((await events(page, "print_request")).length === 1, "Publication print request is deduplicated per page view");
    await page.close();
  }

  {
    const page = await openPage("/engagements/");
    await page.locator(".topic-selector").nth(1).click();
    const topicEvents = await events(page, "engagement_topic_select");
    assert(topicEvents.length === 1 && topicEvents[0].parameters.topic_id === "dtc", "Engagement topic selection emits engagement_topic_select");
    await page.locator("[data-inquiry-toggle]").first().click();
    await page.locator("[data-inquiry-toggle]").last().click();
    assert((await events(page, "lead_form_open")).length === 1, "Engagement form reveal emits one lead_form_open");
    await submitValidForm(page, "#engagement-inquiry-form");
    assert((await events(page, "lead_form_submit_attempt")).length === 1, "Valid engagement form submit emits one submit attempt without field data");
    await page.close();
  }

  {
    const page = await openPage("/contact/");
    await page.locator("[data-contact-focus]").click();
    assert((await events(page, "lead_form_open")).length === 1, "Contact form focus action emits one lead_form_open");
    await submitValidForm(page, "#contact-form");
    const attempts = await events(page, "lead_form_submit_attempt");
    assert(attempts.length === 1 && Object.keys(attempts[0].parameters).every((name) => ["form_type", "source_page"].includes(name)), "Contact submit attempt contains only approved non-PII context");
    await page.close();
  }

  for (const [route, leadType] of [["/contact/success/", "contact"], ["/engagements/success/", "engagement"]]) {
    const page = await openPage(route);
    const leads = await events(page, "generate_lead");
    assert(leads.length === 1 && leads[0].parameters.lead_type === leadType, `${route}: success arrival emits one generate_lead`);
    await page.close();
  }

  {
    const page = await openPage("/recruiters/");
    await stopElementActionImmediately(page, 'a[href^="https://calendly.com/"]');
    await page.locator('a[href^="https://calendly.com/"]').first().click();
    const calendar = await events(page, "calendar_open");
    assert(calendar.length === 1 && calendar[0].parameters.calendar_type === "recruiter", "Recruiter Calendly opening emits calendar_open, not a lead");
    assert((await events(page, "generate_lead")).length === 0, "Calendly opening does not emit generate_lead");

    await stopElementAction(page, 'a[download][href$=".pdf"]');
    await page.locator('a[download][href$=".pdf"]').first().click();
    assert((await events(page, "resume_download")).length === 1, "Resume PDF selection emits resume_download");
    await page.close();
  }

  for (const route of [
    "/tools/ai-cost-reality-calculator/",
    "/tools/ai-cost-reality-calculator/advanced/",
    "/tools/content-operations-readiness/",
  ]) {
    const page = await openPage(route);
    const interactionRequests = [];
    let interactionStarted = false;
    page.on("request", (request) => {
      if (interactionStarted) interactionRequests.push({ method: request.method(), url: request.url(), postData: request.postData() || "" });
    });
    const state = await page.evaluate(() => ({
      allowed: window.siteAnalytics?.allowed,
      dataLayer: typeof window.dataLayer,
      gtag: typeof window.gtag,
      annotations: document.querySelectorAll("[data-ga-event], [data-copy-action]").length,
      cookies: document.cookie,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
    }));
    assert(state.allowed === false && state.dataLayer === "undefined" && state.gtag === "undefined", `${route}: analytics dispatch is disabled`);
    assert(state.annotations === 0 && !state.cookies && state.localStorage.length === 0 && state.sessionStorage.length === 0, `${route}: no tracking annotations, cookies, or analytics storage`);

    interactionStarted = true;
    if (route.includes("ai-cost-reality-calculator")) {
      await page.locator("[data-example-open]").click();
      await page.locator("[data-example]").first().click();
      await page.locator('button[type="submit"]').click();
    } else {
      await page.locator("[data-load-sample]").click();
    }
    await page.waitForTimeout(150);
    const afterInteraction = await page.evaluate(() => ({
      cookies: document.cookie,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      dataLayer: typeof window.dataLayer,
      gtag: typeof window.gtag,
    }));
    assert(interactionRequests.length === 0, `${route}: sample input/result interaction transmits no request`);
    assert(!afterInteraction.cookies && afterInteraction.localStorage.length === 0 && afterInteraction.sessionStorage.length === 0 && afterInteraction.dataLayer === "undefined" && afterInteraction.gtag === "undefined", `${route}: sample input/result interaction creates no analytics state`);
    await page.close();
  }

  console.log(`GA4 browser QA passed (${checks.length} checks).`);
} finally {
  await browser.close();
}
