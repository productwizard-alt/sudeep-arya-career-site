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
