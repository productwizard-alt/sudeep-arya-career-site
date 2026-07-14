(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const progress = document.querySelector(".scroll-progress");
  const header = document.querySelector("[data-header]");
  const calendlyLinks = document.querySelectorAll('a[href^="https://calendly.com/"]');
  const caseMoreButton = document.querySelector("[data-case-more]");
  const extraCaseStudyGroup = document.getElementById("additional-case-studies");
  const extraCaseStudies = Array.from(document.querySelectorAll(".case-study-list .case-study")).slice(3);
  let regionalToggles;
  const contactFocusButton = document.querySelector("[data-contact-focus]");
  let calendlyLoadPromise;
  extraCaseStudies.forEach((study) => study.setAttribute("data-case-extra", ""));

  const analyticsBlockedRoutes = [
    "/tools/ai-cost-reality-calculator/",
    "/tools/content-operations-readiness/",
  ];
  const isProductionHost = ["sudeeparya.com", "www.sudeeparya.com"].includes(window.location.hostname);
  const analyticsAllowed = isProductionHost && !analyticsBlockedRoutes.some((route) => window.location.pathname.startsWith(route));
  const approvedAnalyticsEvents = new Set([
    "calendar_open",
    "case_study_expand",
    "content_expand",
    "copy_action",
    "cta_select",
    "engagement_topic_select",
    "generate_lead",
    "lead_form_open",
    "lead_form_submit_attempt",
    "nav_select",
    "print_request",
    "publication_section_view",
    "resume_download",
    "select_content",
    "share",
  ]);
  const approvedAnalyticsParameters = new Set([
    "action_state",
    "action_type",
    "calendar_type",
    "case_study_id",
    "component_id",
    "content_id",
    "content_type",
    "destination_path",
    "file_id",
    "form_type",
    "item_id",
    "lead_type",
    "method",
    "nav_type",
    "placement",
    "publication_id",
    "section_id",
    "section_order",
    "source_page",
    "topic_id",
  ]);
  const oncePerPageEvents = new Set();
  const publicationSectionTimers = new Map();

  const sanitizeIdentifier = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  const sanitizeDestinationPath = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return "";
      const safeHash = /^#[a-z0-9][a-z0-9-]{0,63}$/i.test(url.hash) ? url.hash : "";
      return `${url.pathname}${safeHash}`.slice(0, 100);
    } catch (error) {
      return "";
    }
  };

  const sanitizeAnalyticsParameters = (parameters = {}) => Object.fromEntries(
    Object.entries(parameters).flatMap(([name, rawValue]) => {
      if (!approvedAnalyticsParameters.has(name) || rawValue === undefined || rawValue === null || rawValue === "") return [];
      const value = name === "destination_path" || name === "source_page"
        ? sanitizeDestinationPath(rawValue)
        : name === "section_order" && Number.isFinite(Number(rawValue))
          ? Number(rawValue)
          : sanitizeIdentifier(rawValue);
      return value === "" ? [] : [[name, value]];
    })
  );

  const trackEvent = (eventName, parameters = {}) => {
    if (!analyticsAllowed || !approvedAnalyticsEvents.has(eventName) || typeof window.gtag !== "function") return false;
    try {
      window.gtag("event", eventName, sanitizeAnalyticsParameters(parameters));
      return true;
    } catch (error) {
      return false;
    }
  };

  const trackOnce = (deduplicationKey, eventName, parameters = {}) => {
    const key = `${eventName}:${sanitizeIdentifier(deduplicationKey)}`;
    if (oncePerPageEvents.has(key)) return false;
    const sent = trackEvent(eventName, parameters);
    if (sent) oncePerPageEvents.add(key);
    return sent;
  };

  window.siteAnalytics = Object.freeze({
    allowed: analyticsAllowed,
    trackEvent,
    trackOnce,
  });

  if (analyticsAllowed) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "G-C65RGRMMW1");
    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src = "https://www.googletagmanager.com/gtag/js?id=G-C65RGRMMW1";
    document.head.appendChild(analyticsScript);
  }

  const locationTravelContent = () => `<div class="location-travel__layout"><div class="location-opportunity__intro"><p class="regional-eyebrow">Speaking, advisory &amp; travel</p><h3>Central New Jersey is the base. The right audience can be anywhere.</h3><p>Available for select panels, podcasts, trade-show programs, executive briefings, workshops, and advisory engagements across the Northeast, throughout the United States, and internationally.</p><p class="location-opportunity__support">Each engagement is considered based on the audience, subject matter, format, and scope, with travel planned around the needs of the program.</p></div><figure class="location-map-card location-map-card--regional"><figcaption><h4>Northeast access</h4><p>Convenient access to Washington, DC, Wilmington, Philadelphia, New York City, Bridgeport, and the broader Northeast event corridor.</p></figcaption><div class="location-map-card__visual"><div class="location-map-card__media"><img class="location-map-card__image" src="/assets/location/northeast-access.webp" width="2000" height="1400" loading="lazy" decoding="async" alt="Editorial corridor map showing Washington, DC, Wilmington, Philadelphia, Central New Jersey, New York City, and Bridgeport."></div></div></figure><figure class="location-map-card location-map-card--global"><figcaption><h4>U.S. and international engagements</h4><p>Available for select domestic and international programs when the audience, subject, and format are the right fit.</p></figcaption><div class="location-map-card__visual location-map-card__visual--global"><div class="location-map-card__media"><img class="location-map-card__image" src="/assets/location/global-engagements.webp" width="2200" height="1200" loading="lazy" decoding="async" alt="Global engagement map showing Central New Jersey as the base for select U.S. and international programs."></div><ul class="location-map-legend" aria-label="Map legend"><li><span class="location-map-legend__domestic" aria-hidden="true"></span>United States availability</li><li><span class="location-map-legend__international" aria-hidden="true"></span>Select international engagements</li></ul></div></figure></div>`;

  const compactLocationOpportunity = (panelId) => `<div class="location-opportunity location-opportunity--compact" aria-label="Speaking, advisory, and travel"><div class="location-opportunity__summary"><p class="regional-eyebrow">Speaking, advisory &amp; travel</p><strong>Central New Jersey</strong><span>Northeast access. Select U.S. and international engagements.</span></div><button class="regional-toggle regional-toggle--footer" type="button" aria-expanded="false" aria-controls="${panelId}" data-regional-toggle data-closed-label="View Speaking, Advisory &amp; Travel" data-open-label="Hide Speaking, Advisory &amp; Travel">View Speaking, Advisory &amp; Travel</button><div class="location-opportunity__drawer location-opportunity__surface" id="${panelId}" data-regional-panel hidden>${locationTravelContent()}</div></div>`;

  document.querySelectorAll(".site-footer").forEach((footer, footerIndex) => {
    footer.classList.add("editorial-footer");
    let profile = footer.querySelector(".footer-profile");
    if (!profile) {
      profile = document.createElement("div");
      profile.className = "footer-profile";
      footer.prepend(profile);
    }
    if (!profile.querySelector(".footer-brand")) {
      profile.insertAdjacentHTML("afterbegin", '<a class="brand footer-brand" href="/"><span>SA</span><span class="footer-brand-copy"><strong>Sudeep Arya</strong><small>Commerce leadership across channels, platforms, data, and operations.</small></span></a>');
    }
    const pathKey = (window.location.pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home").toLowerCase();
    const mount = profile.querySelector("[data-location-opportunity-mount]");
    const panelId = mount?.dataset.panelId || `footer-location-opportunity-${pathKey}-${footerIndex + 1}`;
    const existingAvailability = profile.querySelector(".footer-regional, .home-availability, .location-opportunity--compact");
    if (mount) mount.outerHTML = compactLocationOpportunity(panelId);
    else if (existingAvailability) existingAvailability.outerHTML = compactLocationOpportunity(panelId);
    else profile.insertAdjacentHTML("beforeend", compactLocationOpportunity(panelId));
    let links = footer.querySelector(".footer-link-stack");
    if (!links) {
      links = document.createElement("div");
      links.className = "footer-link-stack";
      footer.append(links);
    }
    links.innerHTML = '<nav class="footer-primary-nav" aria-label="Footer navigation"><a href="/resume/">Resume</a><a href="/case-studies/">Case Studies</a><a href="/publications/">Publications</a><a href="/tools/">Tools</a><a href="/skills/">Skills</a><a href="/engagements/">Speaking &amp; Media</a><a href="/audit/">Audit</a><a href="/contact/">Contact</a></nav><nav class="footer-action-nav" aria-label="Footer actions"><a href="https://calendly.com/zsudeepharya/new-meeting" target="_blank" rel="noopener">Book Free Audit</a><a href="https://www.linkedin.com/in/sudeep-arya/" target="_blank" rel="me noopener">LinkedIn</a></nav>';
  });

  regionalToggles = document.querySelectorAll("[data-regional-toggle]");

  const contentDetailsFromHref = (href) => {
    const destinationPath = sanitizeDestinationPath(href);
    const match = destinationPath.match(/^\/(publications|case-studies|tools)\/(?:([^/#]+))?(?:#([a-z0-9-]+))?/i);
    const itemId = match?.[2] || match?.[3];
    if (!match || !itemId) return null;
    return {
      contentType: match[1] === "case-studies" ? "case_study" : match[1].slice(0, -1),
      itemId: sanitizeIdentifier(itemId),
      destinationPath,
    };
  };

  const interactionPlacement = (element) => {
    const placements = [
      [".executive-hero", "homepage_hero"],
      [".research-showcase", "homepage_research"],
      [".featured-work", "homepage_case_studies"],
      [".capability-system", "capability_system"],
      [".closing-section", "closing_cta"],
      [".publication-ledger", "publication_collection"],
      [".tool-index-card", "tool_collection"],
      [".featured-publication-card", "case_study_feature"],
      [".case-study-list", "case_study_index"],
      [".paper-hero", "publication_hero"],
      [".publication-hero", "publication_hero"],
      [".paper-content", "publication_body"],
      [".publication-content", "publication_body"],
      [".resume-section", "resume_body"],
      [".recruiter-brief-section", "recruiter_body"],
      [".engagements-hero", "engagements_hero"],
      [".engagement-inquiry-section", "engagement_form"],
      [".contact-section", "contact_body"],
    ];
    return placements.find(([selector]) => element.closest(selector))?.[1] || "page_body";
  };

  const annotatedParameters = (element) => ({
    action_state: element.dataset.actionState,
    action_type: element.dataset.actionType,
    calendar_type: element.dataset.calendarType,
    case_study_id: element.dataset.caseStudyId,
    component_id: element.dataset.componentId,
    content_id: element.dataset.contentId,
    content_type: element.dataset.contentType,
    destination_path: element.dataset.destination || element.getAttribute("href"),
    file_id: element.dataset.fileId,
    form_type: element.dataset.formType,
    item_id: element.dataset.itemId,
    lead_type: element.dataset.leadType,
    method: element.dataset.method,
    nav_type: element.dataset.navType,
    placement: element.dataset.placement,
    publication_id: element.dataset.publicationId,
    section_id: element.dataset.sectionId,
    section_order: element.dataset.sectionOrder,
    source_page: element.dataset.sourcePage,
    topic_id: element.dataset.topicId,
  });

  const getInteractionEvent = (element) => {
    if (element.dataset.gaEvent) return { eventName: element.dataset.gaEvent, parameters: annotatedParameters(element) };

    const href = element.getAttribute("href") || "";
    const currentSourcePage = sanitizeDestinationPath(window.location.pathname);
    const destinationPath = sanitizeDestinationPath(href);

    if (href.startsWith("https://calendly.com/")) {
      return {
        eventName: "calendar_open",
        parameters: {
          calendar_type: href.includes("/30min") ? "recruiter" : "audit_consulting",
          placement: element.closest(".site-footer") ? "footer" : interactionPlacement(element),
          source_page: currentSourcePage,
        },
      };
    }

    if (/\/resume\/[^/]+\.pdf(?:$|[?#])/i.test(href)) {
      return {
        eventName: "resume_download",
        parameters: {
          placement: interactionPlacement(element),
          file_id: "sudeep_arya_resume_pdf",
        },
      };
    }

    if (element.matches("a[href]") && element.closest(".site-header")) {
      return {
        eventName: "nav_select",
        parameters: { nav_type: element.matches(".brand") ? "header_logo" : "header", destination_path: destinationPath, item_id: destinationPath || "home" },
      };
    }

    if (element.matches("a[href]") && element.closest(".site-footer")) {
      return {
        eventName: "nav_select",
        parameters: {
          nav_type: element.matches(".footer-brand") ? "footer_logo" : "footer",
          destination_path: destinationPath,
          item_id: href.includes("linkedin.com") ? "linkedin" : destinationPath || "external",
        },
      };
    }

    if (element.closest(".breadcrumbs")) {
      return { eventName: "nav_select", parameters: { nav_type: "breadcrumb", destination_path: destinationPath, item_id: destinationPath || "home" } };
    }

    if (element.matches("[data-copy-action]")) {
      return {
        eventName: element.dataset.shareMethod ? "share" : "copy_action",
        parameters: {
          method: element.dataset.shareMethod,
          content_type: element.dataset.contentType,
          content_id: element.dataset.contentId,
          item_id: element.dataset.itemId,
          action_type: element.dataset.actionType || "copy_link",
        },
      };
    }

    if (element.matches("[data-inquiry-toggle], [data-contact-focus]")) return null;

    const content = contentDetailsFromHref(href);
    const isContentSelection = content && (
      element.closest(".research-card, .case-row, .publication-ledger-item, .tool-index-card, .featured-publication-card")
      || (!element.classList.contains("button") && element.closest("main"))
    );
    if (isContentSelection) {
      return {
        eventName: "select_content",
        parameters: {
          content_type: content.contentType,
          item_id: content.itemId,
          placement: interactionPlacement(element),
        },
      };
    }

    if (href.startsWith("#") && href.length > 1) {
      return {
        eventName: "nav_select",
        parameters: { nav_type: "in_page", destination_path: destinationPath, item_id: sanitizeIdentifier(href.slice(1)) },
      };
    }

    if (element.matches(".button, [class*='-action'], [class*='cta']") || /linkedin\.com/i.test(href)) {
      const actionType = /linkedin\.com/i.test(href) ? "linkedin" : content?.contentType || "page_cta";
      return {
        eventName: "cta_select",
        parameters: {
          action_type: actionType,
          placement: interactionPlacement(element),
          destination_path: destinationPath,
          content_id: content?.itemId,
        },
      };
    }

    return null;
  };

  document.addEventListener("click", (event) => {
    if (!analyticsAllowed || !(event.target instanceof Element)) return;
    const element = event.target.closest("a, button");
    if (!(element instanceof HTMLElement)) return;
    const interaction = getInteractionEvent(element);
    if (interaction) trackEvent(interaction.eventName, interaction.parameters);
  }, true);

  if (analyticsAllowed) {
    document.querySelectorAll("details").forEach((detail, index) => {
      detail.dataset.gaComponentId ||= detail.id || `details_${index + 1}`;
    });
    document.addEventListener("toggle", (event) => {
      const detail = event.target;
      if (!(detail instanceof HTMLDetailsElement) || !detail.open || detail.matches("[data-topic]")) return;
      const componentId = detail.dataset.gaComponentId || detail.id;
      trackOnce(`content_expand_${componentId}`, "content_expand", {
        component_id: componentId,
        content_type: detail.closest(".publication-content, .paper-content") ? "publication_detail" : "supporting_detail",
        section_id: detail.closest("[id]")?.id,
        action_state: "open",
      });
    }, true);

    const publicationMatch = window.location.pathname.match(/^\/publications\/([^/]+)\//);
    if (publicationMatch && "IntersectionObserver" in window) {
      const publicationId = sanitizeIdentifier(publicationMatch[1]);
      const sections = Array.from(document.querySelectorAll(
        ".publication-content > .executive-brief, .publication-content > .publication-chapter, .publication-content > .publication-backmatter, .paper-content > h2[id]"
      ));
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const section = entry.target;
          const existingTimer = publicationSectionTimers.get(section);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !existingTimer) {
            const timer = window.setTimeout(() => {
              const order = sections.indexOf(section) + 1;
              trackOnce(`publication_section_${publicationId}_${section.id}`, "publication_section_view", {
                publication_id: publicationId,
                section_id: section.id,
                section_order: order,
              });
              publicationSectionTimers.delete(section);
            }, 1000);
            publicationSectionTimers.set(section, timer);
          } else if ((!entry.isIntersecting || entry.intersectionRatio < 0.5) && existingTimer) {
            window.clearTimeout(existingTimer);
            publicationSectionTimers.delete(section);
          }
        });
      }, { threshold: [0, 0.5, 1] });
      sections.forEach((section) => sectionObserver.observe(section));
    }

    const printableContent = window.location.pathname.match(/^\/(publications\/([^/]+)|resume)\/?/);
    if (printableContent) {
      window.addEventListener("beforeprint", () => {
        const publicationId = printableContent[2] ? sanitizeIdentifier(printableContent[2]) : "resume";
        trackOnce(`print_${publicationId}`, "print_request", {
          content_type: printableContent[2] ? "publication" : "resume",
          content_id: publicationId,
        });
      });
    }

    const successLead = {
      "/contact/success/": "contact",
      "/engagements/success/": "engagement",
    }[window.location.pathname];
    if (successLead) {
      trackOnce(`lead_success_${successLead}`, "generate_lead", {
        lead_type: successLead,
        source_page: `/${successLead === "contact" ? "contact" : "engagements"}/`,
        placement: "success_page",
      });
    }
  }

  if (navToggle && navMenu) {
    const menuLinks = Array.from(navMenu.querySelectorAll("a"));
    const closeMenu = (restoreFocus = false, recordInteraction = false) => {
      const wasOpen = navMenu.classList.contains("open");
      navMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      if (wasOpen && recordInteraction) {
        trackEvent("content_expand", {
          component_id: "mobile_navigation",
          content_type: "navigation",
          section_id: "header",
          action_state: "close",
        });
      }
      if (restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
      trackEvent("content_expand", {
        component_id: "mobile_navigation",
        content_type: "navigation",
        section_id: "header",
        action_state: isOpen ? "open" : "close",
      });
      if (isOpen && menuLinks[0]) menuLinks[0].focus();
    });

    navMenu.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        closeMenu(false, true);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!navMenu.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true, true);
        return;
      }
      if (event.key !== "Tab" || !menuLinks.length) return;
      const first = menuLinks[0];
      const last = menuLinks[menuLinks.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        navToggle.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        navToggle.focus();
      } else if (!event.shiftKey && document.activeElement === navToggle) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const currentPath = window.location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  const loadCalendly = () => {
    if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
      return Promise.resolve();
    }

    if (calendlyLoadPromise) return calendlyLoadPromise;

    calendlyLoadPromise = new Promise((resolve, reject) => {
      const existingCss = document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]');
      if (!existingCss) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://assets.calendly.com/assets/external/widget.css";
        document.head.appendChild(css);
      }

      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return calendlyLoadPromise;
  };

  calendlyLinks.forEach((link) => {
    const url = link.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-haspopup", "dialog");

    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();

      loadCalendly()
        .then(() => {
          if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
            window.Calendly.initPopupWidget({ url });
          } else {
            window.open(url, "_blank", "noopener");
          }
        })
        .catch(() => {
          window.open(url, "_blank", "noopener");
        });
    });
  });

  const contactForm = document.querySelector(".contact-form:not(.engagement-form)");
  if (contactForm instanceof HTMLFormElement) {
    if (contactFocusButton) {
      contactFocusButton.addEventListener("click", () => {
        trackOnce("contact_form_open", "lead_form_open", {
          form_type: "contact",
          source_page: window.location.pathname,
          placement: "contact_methods",
        });
        contactForm.scrollIntoView({ block: "start", behavior: "smooth" });
        const firstField = contactForm.querySelector("input:not([type='hidden']):not([name='bot-field']), textarea, select");
        if (firstField instanceof HTMLElement) {
          window.setTimeout(() => firstField.focus({ preventScroll: true }), 220);
        }
      });
    }

    contactForm.addEventListener("submit", (event) => {
      if (!contactForm.checkValidity() || event.defaultPrevented) return;
      trackEvent("lead_form_submit_attempt", {
        form_type: "contact",
        source_page: window.location.pathname,
      });
    });

  }

  regionalToggles.forEach((regionalToggle) => {
    const regionalPanelId = regionalToggle.getAttribute("aria-controls");
    const regionalPanel = regionalPanelId ? document.getElementById(regionalPanelId) : null;

    if (regionalPanel) {
      const closedLabel = regionalToggle.dataset.closedLabel || regionalToggle.textContent || "Show Regional Availability";
      const openLabel = regionalToggle.dataset.openLabel || "Hide Regional Availability";

      regionalToggle.addEventListener("click", () => {
        const isExpanded = regionalToggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        regionalToggle.setAttribute("aria-expanded", String(nextExpanded));
        regionalToggle.textContent = nextExpanded ? openLabel : closedLabel;
        regionalPanel.hidden = !nextExpanded;
        if (nextExpanded) {
          trackOnce(`regional_${regionalPanel.id}`, "content_expand", {
            component_id: regionalPanel.id,
            content_type: "location_travel",
            section_id: regionalToggle.closest(".site-footer") ? "footer" : "page_body",
            action_state: "open",
          });
        }
      });
      if (window.location.hash === `#${regionalPanel.id}`) {
        regionalToggle.setAttribute("aria-expanded", "true");
        regionalToggle.textContent = openLabel;
        regionalPanel.hidden = false;
        window.requestAnimationFrame(() => regionalPanel.scrollIntoView({ block: "center" }));
      }
    }
  });

  const getHashTarget = () => {
    if (!window.location.hash || window.location.hash.length <= 1) return null;

    try {
      return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch (error) {
      return null;
    }
  };

  const scrollElementBelowHeader = (target) => {
    if (!(target instanceof HTMLElement)) return;

    window.requestAnimationFrame(() => {
      const headerHeight = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    });
  };

  const caseDisclosureButtons = [];

  document.querySelectorAll(".case-study").forEach((study, index) => {
    const body = study.querySelector(".case-body");
    const heading = study.querySelector(".case-heading");
    const proofGrid = study.querySelector(".case-proof-grid");
    const methodPanel = study.querySelector(".case-methodology");
    const diagram = study.querySelector(".commerce-diagram");
    if (!(body instanceof HTMLElement) || !(heading instanceof HTMLElement) || !(proofGrid instanceof HTMLElement) || !(methodPanel instanceof HTMLElement)) return;

    const studyId = study.id || `case-study-${index + 1}`;
    if (!study.id) study.id = studyId;

    const drawer = document.createElement("div");
    drawer.className = "case-study-details-drawer";
    drawer.id = `${studyId}-details`;
    drawer.hidden = true;

    const toggle = document.createElement("button");
    toggle.className = "case-disclosure-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", drawer.id);
    toggle.innerHTML = '<span>View Full Case Study</span><span class="case-disclosure-icon" aria-hidden="true"></span>';

    methodPanel.hidden = false;
    drawer.appendChild(proofGrid);
    drawer.appendChild(methodPanel);
    if (diagram instanceof HTMLElement) drawer.appendChild(diagram);

    heading.insertAdjacentElement("afterend", toggle);
    toggle.insertAdjacentElement("afterend", drawer);

    const setExpanded = (isExpanded, shouldFocus = false) => {
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.querySelector("span").textContent = isExpanded ? "Collapse Case Study" : "View Full Case Study";
      drawer.hidden = !isExpanded;
      study.classList.toggle("is-expanded", isExpanded);

      if (!isExpanded && shouldFocus) {
        toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      setExpanded(!isExpanded, isExpanded);
      if (!isExpanded) {
        trackOnce(`case_study_${studyId}`, "case_study_expand", {
          case_study_id: studyId,
          placement: "case_study_index",
        });
      }
    });

    caseDisclosureButtons.push({ study, toggle, drawer, setExpanded });
  });

  const expandCaseStudy = (target) => {
    const targetStudy = target && target.closest ? target.closest(".case-study") : null;
    if (!(targetStudy instanceof HTMLElement)) return false;

    const control = caseDisclosureButtons.find((item) => item.study === targetStudy);
    if (!control) return false;

    control.setExpanded(true);
    return true;
  };

  if (caseMoreButton && extraCaseStudies.length) {
    const setCaseStudiesExpanded = (isExpanded) => {
      caseMoreButton.setAttribute("aria-expanded", String(isExpanded));
      caseMoreButton.textContent = isExpanded ? "Show Fewer Case Studies" : "View More Case Studies";
      if (extraCaseStudyGroup) extraCaseStudyGroup.hidden = !isExpanded;

      extraCaseStudies.forEach((study) => {
        study.hidden = !isExpanded;
        if (isExpanded) study.classList.add("is-visible");
      });
    };

    const expandForHash = () => {
      const target = getHashTarget();
      if (!(target instanceof HTMLElement)) return;
      if (target && target.hasAttribute("data-case-extra")) {
        setCaseStudiesExpanded(true);
      }
      expandCaseStudy(target);
      scrollElementBelowHeader(target);
    };

    setCaseStudiesExpanded(false);
    expandForHash();

    caseMoreButton.addEventListener("click", () => {
      const isExpanded = caseMoreButton.getAttribute("aria-expanded") === "true";
      setCaseStudiesExpanded(!isExpanded);
      if (!isExpanded) {
        trackOnce("additional_case_studies", "content_expand", {
          component_id: "additional_case_studies",
          content_type: "case_study_collection",
          section_id: "case_study_index",
          action_state: "open",
        });
      }
      if (isExpanded) caseMoreButton.scrollIntoView({ block: "center" });
    });

    window.addEventListener("hashchange", expandForHash);
    window.addEventListener("load", () => scrollElementBelowHeader(getHashTarget()));
  } else if (window.location.hash) {
    const target = getHashTarget();
    if (target instanceof HTMLElement) {
      expandCaseStudy(target);
      window.addEventListener("load", () => scrollElementBelowHeader(target));
    }
  }

  const updateProgress = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const amount = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    if (progress) progress.style.width = `${amount}%`;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const topicList = document.querySelector(".topic-family-list");
  if (topicList) {
    const families = Array.from(topicList.querySelectorAll(":scope > .topic-family"));
    topicList.classList.add("conversation-atlas");
    families.forEach((family) => {
      family.hidden = false;
      family.removeAttribute("role");
      family.removeAttribute("aria-labelledby");
    });
  }

  const resumeCopy = document.querySelector(".resume-section .page-copy");
  if (resumeCopy) {
    const blocks = Array.from(resumeCopy.querySelectorAll(":scope > .resume-block"));
    if (blocks.length > 5) {
      const drawer = document.createElement("div");
      drawer.className = "resume-earlier-experience";
      drawer.id = "resume-earlier-experience";
      drawer.hidden = true;
      blocks.slice(4).forEach((block) => drawer.appendChild(block));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "editorial-disclosure";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", drawer.id);
      toggle.innerHTML = '<span>View earlier experience · 2014–2020</span><i aria-hidden="true">+</i>';
      resumeCopy.append(toggle, drawer);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("span").textContent = expanded ? "Hide earlier experience" : "View earlier experience · 2014–2020";
        toggle.querySelector("i").textContent = expanded ? "–" : "+";
        drawer.hidden = !expanded;
        if (expanded) trackOnce("resume_earlier_experience", "content_expand", {
          component_id: drawer.id,
          content_type: "resume_experience",
          section_id: drawer.id,
          action_state: "open",
        });
      });
    }
  }

  const capabilityZones = document.querySelector(".capability-zones");
  if (capabilityZones) {
    const zones = Array.from(capabilityZones.querySelectorAll(":scope > .capability-zone"));
    capabilityZones.classList.add("capability-system");
    zones.forEach((zone) => {
      zone.hidden = false;
      zone.removeAttribute("role");
      zone.removeAttribute("aria-labelledby");
    });
  }

  const skillsSection = document.querySelector(".skills-section");
  if (skillsSection) {
    const secondary = [skillsSection.querySelector(".applied-context"), skillsSection.querySelector(".problem-ledger")].filter(Boolean);
    if (secondary.length) {
      const drawer = document.createElement("div");
      drawer.className = "skills-secondary-detail";
      drawer.id = "skills-secondary-detail";
      drawer.hidden = true;
      secondary.forEach((section) => drawer.appendChild(section));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "editorial-disclosure";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", drawer.id);
      toggle.innerHTML = '<span>View applied context and problem areas</span><i aria-hidden="true">+</i>';
      skillsSection.querySelector(".section-inner").append(toggle, drawer);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("span").textContent = expanded ? "Hide supporting capability detail" : "View applied context and problem areas";
        toggle.querySelector("i").textContent = expanded ? "–" : "+";
        drawer.hidden = !expanded;
        if (expanded) trackOnce("skills_supporting_detail", "content_expand", {
          component_id: drawer.id,
          content_type: "capability_detail",
          section_id: drawer.id,
          action_state: "open",
        });
      });
    }
  }

  const recruiterModule = document.querySelector(".search-fit-module");
  if (recruiterModule) {
    const support = [recruiterModule.querySelector(".search-fit-support"), recruiterModule.querySelector(".search-fit-note")].filter(Boolean);
    if (support.length) {
      const drawer = document.createElement("div");
      drawer.className = "recruiter-support-detail";
      drawer.id = "recruiter-support-detail";
      drawer.hidden = true;
      support.forEach((section) => drawer.appendChild(section));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "editorial-disclosure";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", drawer.id);
      toggle.innerHTML = '<span>View search terms and best-fit mandates</span><i aria-hidden="true">+</i>';
      const actions = recruiterModule.querySelector(".search-fit-actions");
      recruiterModule.insertBefore(toggle, actions);
      recruiterModule.insertBefore(drawer, actions);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("span").textContent = expanded ? "Hide supporting search detail" : "View search terms and best-fit mandates";
        toggle.querySelector("i").textContent = expanded ? "–" : "+";
        drawer.hidden = !expanded;
        if (expanded) trackOnce("recruiter_search_detail", "content_expand", {
          component_id: drawer.id,
          content_type: "recruiter_detail",
          section_id: drawer.id,
          action_state: "open",
        });
      });
    }
  }

  const caseDetailCopy = document.querySelector(".case-detail-copy");
  if (caseDetailCopy) {
    const blocks = Array.from(caseDetailCopy.querySelectorAll(":scope > .case-detail-block"));
    if (blocks.length >= 6) {
      const drawer = document.createElement("div");
      drawer.className = "case-support-detail";
      drawer.id = "case-support-detail";
      drawer.hidden = true;
      blocks.slice(2, 5).forEach((block) => drawer.appendChild(block));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "editorial-disclosure";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", drawer.id);
      toggle.innerHTML = '<span>Explore system map, role, and evidence</span><i aria-hidden="true">+</i>';
      blocks[1].after(toggle, drawer);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("span").textContent = expanded ? "Hide supporting case detail" : "Explore system map, role, and evidence";
        toggle.querySelector("i").textContent = expanded ? "–" : "+";
        drawer.hidden = !expanded;
        if (expanded) trackOnce("case_support_detail", "content_expand", {
          component_id: drawer.id,
          content_type: "case_study_detail",
          section_id: document.body.dataset.caseStudy || "banfield_subscription_commerce",
          action_state: "open",
        });
      });
    }
  }
})();
