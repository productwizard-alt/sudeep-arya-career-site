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

  document.querySelectorAll(".site-footer").forEach((footer, footerIndex) => {
    footer.classList.add("editorial-footer");
    let profile = footer.querySelector(".footer-profile");
    if (!profile) {
      profile = document.createElement("div");
      profile.className = "footer-profile";
      footer.prepend(profile);
    }
    if (!profile.querySelector(".footer-brand")) {
      profile.insertAdjacentHTML("afterbegin", '<a class="brand footer-brand" href="/" aria-label="Sudeep Arya home"><span>SA</span><span class="footer-brand-copy"><strong>Sudeep Arya</strong><small>Commerce leadership across channels, platforms, data, and operations.</small></span></a>');
    }
    if (!profile.querySelector(".footer-regional, .home-availability")) {
      const pathKey = (window.location.pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home").toLowerCase();
      const panelId = `footer-location-travel-${pathKey}-${footerIndex + 1}`;
      profile.insertAdjacentHTML("beforeend", `<div class="home-availability"><p class="regional-eyebrow">Location &amp; travel</p><strong>Central New Jersey</strong><span>Northeast corridor access · Travel available for the right opportunity</span><button class="regional-toggle regional-toggle--footer" type="button" aria-expanded="false" aria-controls="${panelId}" data-regional-toggle data-closed-label="View Location &amp; Travel Availability" data-open-label="Hide Location &amp; Travel Availability">View Location &amp; Travel Availability</button><div class="availability-system availability-system--compact home-availability__drawer" id="${panelId}" data-regional-panel hidden><section><p class="regional-eyebrow">Regional access</p><p>Available across the Northeast corridor depending on the role and schedule.</p><ol class="availability-route-list" aria-label="Northeast corridor locations"><li><span>DE</span>Wilmington</li><li><span>PA</span>Philadelphia</li><li><span>NJ</span>Trenton</li><li class="is-base"><span>NJ</span>Central New Jersey <small>Base</small></li><li><span>NJ</span>Newark</li><li><span>NY</span>New York City</li><li><span>CT</span>Bridgeport</li></ol><small>A stylized view of regional availability; not a literal transit route.</small></section><section class="availability-system__travel footer-travel"><div><p class="regional-eyebrow">Travel availability</p><h3>Beyond the Northeast</h3><p>Open to domestic and international travel when the opportunity and business need are the right fit.</p></div><div class="travel-arc" aria-hidden="true"><span class="travel-origin">Central NJ</span><span>U.S. travel</span><span>International</span></div><ul class="availability-system__mode-list" aria-label="Available work modes"><li>Remote</li><li>Hybrid</li><li>On-site</li><li>Domestic travel</li><li>International travel</li></ul></section></div></div>`);
    }
    let links = footer.querySelector(".footer-link-stack");
    if (!links) {
      links = document.createElement("div");
      links.className = "footer-link-stack";
      footer.append(links);
    }
    links.innerHTML = '<nav class="footer-primary-nav" aria-label="Footer navigation"><a href="/resume/">Resume</a><a href="/case-studies/">Case Studies</a><a href="/insights/">Insights</a><a href="/skills/">Skills</a><a href="/engagements/">Speaking &amp; Media</a><a href="/audit/">Audit</a><a href="/contact/">Contact</a></nav><nav class="footer-action-nav" aria-label="Footer actions"><a href="/tools/ai-cost-reality-calculator/">AI Cost Calculator</a><a href="/downloads/running-before-crawling-executive-edition.pdf">Download executive paper</a></nav>';
  });

  regionalToggles = document.querySelectorAll("[data-regional-toggle]");

  document.querySelectorAll(".footer-regional").forEach((footerAvailability) => {
    footerAvailability.setAttribute("aria-label", "Location and travel availability");
    const eyebrow = footerAvailability.querySelector(".footer-regional-summary .regional-eyebrow");
    const summaryBody = footerAvailability.querySelector(".footer-regional-summary .regional-card-copy > p:last-child");
    const toggle = footerAvailability.querySelector("[data-regional-toggle]");
    const drawer = footerAvailability.querySelector("[data-regional-panel]");
    if (eyebrow) eyebrow.textContent = "Location & Travel";
    if (summaryBody) summaryBody.textContent = "Northeast corridor access · Travel available for the right opportunity";
    if (toggle) {
      toggle.dataset.closedLabel = "View Location & Travel Availability";
      toggle.dataset.openLabel = "Hide Location & Travel Availability";
      toggle.textContent = toggle.dataset.closedLabel;
    }
    if (drawer) {
      drawer.classList.add("availability-system", "availability-system--compact");
      const drawerEyebrow = drawer.querySelector(".regional-eyebrow");
      const drawerTitle = drawer.querySelector(".regional-card-title");
      if (drawerEyebrow) drawerEyebrow.textContent = "Location & Travel";
      if (drawerTitle) drawerTitle.textContent = "Northeast corridor access";
      const travel = document.createElement("section");
      travel.className = "availability-system__travel footer-travel";
      travel.innerHTML = '<div><p class="regional-eyebrow">Travel availability</p><h3>Beyond the Northeast</h3><p>Open to domestic and international travel when the opportunity and business need are the right fit.</p></div><div class="travel-arc" aria-hidden="true"><span class="travel-origin">Central NJ</span><span>U.S. travel</span><span>International</span></div><ul class="availability-system__mode-list" aria-label="Available work modes"><li>Remote</li><li>Hybrid</li><li>On-site</li><li>Domestic travel</li><li>International travel</li></ul>';
      drawer.appendChild(travel);
    }
  });

  document.querySelectorAll(".home-availability__drawer .availability-route-list").forEach((routeList) => {
    if (routeList.previousElementSibling?.classList.contains("footer-corridor-visual")) return;
    routeList.insertAdjacentHTML("beforebegin", '<div class="footer-corridor-visual"><svg class="footer-corridor-map" viewBox="0 0 620 190" role="img" aria-label="Northeast availability corridor from Wilmington to Bridgeport with Central New Jersey emphasized"><g class="footer-map-grid" aria-hidden="true"><path d="M44 35H582M44 85H582M44 135H582M104 22V160M208 22V160M312 22V160M416 22V160M520 22V160"/></g><path class="footer-route-shadow" d="M48 143 C100 108 155 130 225 115 C270 104 293 70 318 78 C358 90 380 122 410 110 C455 92 468 113 492 97 C532 72 551 77 580 52"/><path class="footer-route-line" d="M48 143 C100 108 155 130 225 115 C270 104 293 70 318 78 C358 90 380 122 410 110 C455 92 468 113 492 97 C532 72 551 77 580 52"/><g class="footer-map-stop endpoint"><circle cx="48" cy="143" r="7"/><text x="48" y="174">Wilmington</text></g><g class="footer-map-stop"><circle cx="135" cy="119" r="7"/><text x="135" y="94">Philadelphia</text></g><g class="footer-map-stop"><circle cx="225" cy="115" r="7"/><text x="225" y="148">Trenton</text></g><g class="footer-map-stop base"><circle cx="318" cy="78" r="11"/><text x="318" y="48">Central NJ</text></g><g class="footer-map-stop"><circle cx="410" cy="110" r="7"/><text x="410" y="145">Newark</text></g><g class="footer-map-stop"><circle cx="492" cy="97" r="7"/><text x="492" y="70">New York City</text></g><g class="footer-map-stop endpoint"><circle cx="580" cy="52" r="7"/><text x="558" y="27">Bridgeport</text></g></svg></div>');
  });

  const trackEvent = (eventName, parameters = {}) => {
    if (typeof window.gtag !== "function" || !eventName) return;
    window.gtag("event", eventName, Object.fromEntries(Object.entries(parameters).filter(([, value]) => value)));
  };

  document.querySelectorAll("[data-ga-event]").forEach((element) => {
    element.addEventListener("click", () => {
      trackEvent(element.dataset.gaEvent, {
        whitepaper_slug: element.dataset.whitepaperSlug,
        case_study_slug: element.dataset.caseStudySlug,
        asset_type: element.dataset.assetType,
        cta_type: element.dataset.ctaType,
        placement: element.dataset.placement,
        destination: element.dataset.destination || element.getAttribute("href"),
      });
    });
  });

  if (navToggle && navMenu) {
    const menuLinks = Array.from(navMenu.querySelectorAll("a"));
    const closeMenu = (restoreFocus = false) => {
      navMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      if (restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
      if (isOpen && menuLinks[0]) menuLinks[0].focus();
    });

    navMenu.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!navMenu.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
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

  const contactForm = document.querySelector(".contact-form");
  if (contactForm instanceof HTMLFormElement) {
    if (contactFocusButton) {
      contactFocusButton.addEventListener("click", () => {
        contactForm.scrollIntoView({ block: "start", behavior: "smooth" });
        const firstField = contactForm.querySelector("input:not([type='hidden']):not([name='bot-field']), textarea, select");
        if (firstField instanceof HTMLElement) {
          window.setTimeout(() => firstField.focus({ preventScroll: true }), 220);
        }
      });
    }

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

  /* Progressive enhancement for long-form paper sections. The complete article
     stays in the HTML and remains visible when JavaScript is unavailable. */
  const paperContent = document.querySelector(".paper-content");
  const expandablePaperSections = new Set([
    "the-public-record-is-already-giving-boards-clues",
    "the-license-is-the-cover-charge",
    "do-not-automate-away-the-person-who-knows-why-the-process-breaks",
    "a-product-page-is-not-just-a-writing-prompt",
    "build-from-truth-upward-not-from-the-demo-downward",
    "nine-questions-before-headcount-becomes-an-ai-assumption"
  ]);

  if (paperContent) {
    const controls = [];
    paperContent.querySelectorAll(":scope > h2[id]").forEach((heading) => {
      if (!expandablePaperSections.has(heading.id)) return;
      const sectionNodes = [];
      let sibling = heading.nextElementSibling;
      while (sibling && sibling.tagName !== "H2") {
        sectionNodes.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      if (sectionNodes.length < 4) return;

      const drawer = document.createElement("div");
      drawer.className = "paper-section-more";
      drawer.id = `${heading.id}-more`;
      drawer.hidden = true;
      sectionNodes.slice(2).forEach((node) => drawer.appendChild(node));

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "paper-learn-more";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", drawer.id);
      toggle.innerHTML = '<span>Learn more</span><i aria-hidden="true">+</i>';
      heading.parentNode.insertBefore(toggle, sibling);
      heading.parentNode.insertBefore(drawer, sibling);

      const setExpanded = (expanded, track = false) => {
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("span").textContent = expanded ? "Show less" : "Learn more";
        toggle.querySelector("i").textContent = expanded ? "–" : "+";
        drawer.hidden = !expanded;
        if (track && expanded) trackEvent("whitepaper_section_expand", { section_id: heading.id, article_slug: "running-before-crawling" });
      };
      toggle.addEventListener("click", () => setExpanded(toggle.getAttribute("aria-expanded") !== "true", true));
      controls.push({ heading, drawer, setExpanded });
    });

    const openContainingPaperSection = () => {
      const target = getHashTarget();
      if (!target) return;
      const control = controls.find(({ heading, drawer }) => target === heading || drawer.contains(target));
      if (control) control.setExpanded(true);
    };
    openContainingPaperSection();
    window.addEventListener("hashchange", openContainingPaperSection);
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
        if (expanded) trackEvent("resume_earlier_experience_expand", { section_id: drawer.id });
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
        if (expanded) trackEvent("skills_supporting_detail_expand", { section_id: drawer.id });
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
        if (expanded) trackEvent("recruiter_search_detail_expand", { section_id: drawer.id });
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
        if (expanded) trackEvent("case_support_detail_expand", { case_study_slug: document.body.dataset.caseStudy || "banfield-subscription-commerce" });
      });
    }
  }
})();
