(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const progress = document.querySelector(".scroll-progress");
  const header = document.querySelector("[data-header]");
  const calendlyLinks = document.querySelectorAll('a[href^="https://calendly.com/"]');
  const caseMoreButton = document.querySelector("[data-case-more]");
  const extraCaseStudyGroup = document.getElementById("additional-case-studies");
  const extraCaseStudies = document.querySelectorAll("[data-case-extra]");
  const caseStudies = Array.from(document.querySelectorAll(".case-study[data-case-lenses]"));
  const caseLensButtons = Array.from(document.querySelectorAll("[data-case-lens]"));
  const caseLensStatus = document.querySelector("[data-case-lens-status]");
  const regionalToggles = document.querySelectorAll("[data-regional-toggle]");
  const contactFocusButton = document.querySelector("[data-contact-focus]");
  let calendlyLoadPromise;

  const trackEvent = (eventName, parameters = {}) => {
    if (typeof window.gtag !== "function" || !eventName) return;
    window.gtag("event", eventName, Object.fromEntries(Object.entries(parameters).filter(([, value]) => value)));
  };

  document.querySelectorAll("[data-ga-event]").forEach((element) => {
    element.addEventListener("click", () => {
      trackEvent(element.dataset.gaEvent, {
        case_study_slug: element.dataset.caseStudySlug,
        asset_type: element.dataset.assetType,
        cta_type: element.dataset.ctaType,
        placement: element.dataset.placement,
        destination: element.dataset.destination || element.getAttribute("href"),
      });
    });
  });

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navMenu.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
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

  if (caseMoreButton && extraCaseStudies.length && caseStudies.length && caseLensButtons.length) {
    const lensLabels = Object.fromEntries(
      caseLensButtons.map((button) => [button.dataset.caseLens, button.querySelector("span")?.textContent.trim() || "case studies"])
    );
    const validLenses = new Set(Object.keys(lensLabels));
    let areAllCaseStudiesExpanded = false;
    let activeLens = "all";

    const setCaseStudiesExpanded = (isExpanded) => {
      areAllCaseStudiesExpanded = isExpanded;
      caseMoreButton.setAttribute("aria-expanded", String(isExpanded));
      caseMoreButton.textContent = isExpanded ? "Show Fewer Case Studies" : "View More Case Studies";
      if (extraCaseStudyGroup && activeLens === "all") extraCaseStudyGroup.hidden = !isExpanded;

      extraCaseStudies.forEach((study) => {
        if (activeLens === "all") study.hidden = !isExpanded;
        if (isExpanded) study.classList.add("is-visible");
      });

      if (activeLens === "all" && caseLensStatus) {
        caseLensStatus.textContent = isExpanded
          ? `Showing all ${caseStudies.length} case studies.`
          : `Showing the first ${caseStudies.length - extraCaseStudies.length} of ${caseStudies.length} case studies.`;
      }
    };

    const setActiveLens = (lens, { updateHash = false } = {}) => {
      activeLens = validLenses.has(lens) ? lens : "all";
      const isAll = activeLens === "all";
      let resultCount = 0;

      caseStudies.forEach((study) => {
        const matches = isAll || (study.dataset.caseLenses || "").split(/\s+/).includes(activeLens);
        if (matches) resultCount += 1;
        study.hidden = !matches || (isAll && study.hasAttribute("data-case-extra") && !areAllCaseStudiesExpanded);
        study.classList.toggle("is-filter-match", matches && !isAll);
      });

      if (extraCaseStudyGroup) extraCaseStudyGroup.hidden = isAll && !areAllCaseStudiesExpanded;
      caseMoreButton.closest(".case-study-controls").hidden = !isAll;

      caseLensButtons.forEach((button) => {
        const isActive = button.dataset.caseLens === activeLens;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      if (caseLensStatus) {
        caseLensStatus.textContent = isAll
          ? (areAllCaseStudiesExpanded
            ? `Showing all ${caseStudies.length} case studies.`
            : `Showing the first ${caseStudies.length - extraCaseStudies.length} of ${caseStudies.length} case studies.`)
          : `Showing ${resultCount} case ${resultCount === 1 ? "study" : "studies"} focused on ${lensLabels[activeLens]}.`;
      }

      if (updateHash) {
        const nextUrl = activeLens === "all"
          ? `${window.location.pathname}${window.location.search}`
          : `#lens-${activeLens}`;
        window.history.pushState({ lens: activeLens }, "", nextUrl);
      }
    };

    const restoreStateFromHash = ({ shouldScroll = true } = {}) => {
      const hashValue = window.location.hash.slice(1);
      const requestedLens = hashValue.startsWith("lens-") ? hashValue.slice(5) : null;

      if (requestedLens && validLenses.has(requestedLens) && requestedLens !== "all") {
        setActiveLens(requestedLens);
        return;
      }

      if (requestedLens && !validLenses.has(requestedLens)) {
        setCaseStudiesExpanded(false);
      }

      const target = getHashTarget();
      setActiveLens("all");
      if (!(target instanceof HTMLElement)) return;
      if (target.hasAttribute("data-case-extra")) setCaseStudiesExpanded(true);
      expandCaseStudy(target);
      if (shouldScroll) scrollElementBelowHeader(target);
    };

    setCaseStudiesExpanded(false);
    restoreStateFromHash({ shouldScroll: false });

    caseLensButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setActiveLens(button.dataset.caseLens || "all", { updateHash: true });
      });
    });

    caseMoreButton.addEventListener("click", () => {
      const wasExpanded = caseMoreButton.getAttribute("aria-expanded") === "true";
      setCaseStudiesExpanded(!wasExpanded);
      if (wasExpanded) caseMoreButton.scrollIntoView({ block: "center" });
    });

    window.addEventListener("hashchange", () => restoreStateFromHash());
    window.addEventListener("popstate", () => restoreStateFromHash());
    window.addEventListener("load", () => {
      const target = getHashTarget();
      if (target instanceof HTMLElement) scrollElementBelowHeader(target);
    });
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
})();
