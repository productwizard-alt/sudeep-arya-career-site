(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const progress = document.querySelector(".scroll-progress");
  const header = document.querySelector("[data-header]");
  const calendlyLinks = document.querySelectorAll('a[href^="https://calendly.com/"]');
  const caseMoreButton = document.querySelector("[data-case-more]");
  const extraCaseStudyGroup = document.getElementById("additional-case-studies");
  const extraCaseStudies = document.querySelectorAll("[data-case-extra]");
  const regionalToggle = document.querySelector("[data-regional-toggle]");
  const contactFocusButton = document.querySelector("[data-contact-focus]");
  let calendlyLoadPromise;

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

  if (regionalToggle) {
    const regionalPanelId = regionalToggle.getAttribute("aria-controls");
    const regionalPanel = regionalPanelId ? document.getElementById(regionalPanelId) : null;

    if (regionalPanel) {
      regionalToggle.addEventListener("click", () => {
        const isExpanded = regionalToggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        regionalToggle.setAttribute("aria-expanded", String(nextExpanded));
        regionalToggle.textContent = nextExpanded ? "Hide regional availability −" : "View regional availability +";
        regionalPanel.hidden = !nextExpanded;
      });
    }
  }

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
})();
