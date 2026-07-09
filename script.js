(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const progress = document.querySelector(".scroll-progress");
  const header = document.querySelector("[data-header]");
  const calendlyLinks = document.querySelectorAll('a[href^="https://calendly.com/"]');
  const caseMoreButton = document.querySelector("[data-case-more]");
  const extraCaseStudies = document.querySelectorAll("[data-case-extra]");
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
    contactForm.addEventListener("submit", (event) => {
      const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
      if (!localHosts.has(window.location.hostname)) return;

      event.preventDefault();
      const nextUrl = new URL(contactForm.getAttribute("action") || "/contact/success/", window.location.href);
      window.location.assign(nextUrl.pathname);
    });
  }

  if (caseMoreButton && extraCaseStudies.length) {
    const setCaseStudiesExpanded = (isExpanded) => {
      caseMoreButton.setAttribute("aria-expanded", String(isExpanded));
      caseMoreButton.textContent = isExpanded ? "Show Fewer Case Studies" : "View More Case Studies";

      extraCaseStudies.forEach((study) => {
        study.hidden = !isExpanded;
        if (isExpanded) study.classList.add("is-visible");
      });
    };

    const expandForHash = () => {
      if (!window.location.hash) return;
      const target = document.querySelector(window.location.hash);
      if (target && target.hasAttribute("data-case-extra")) {
        setCaseStudiesExpanded(true);
      }
    };

    setCaseStudiesExpanded(false);
    expandForHash();

    caseMoreButton.addEventListener("click", () => {
      const isExpanded = caseMoreButton.getAttribute("aria-expanded") === "true";
      setCaseStudiesExpanded(!isExpanded);
      if (isExpanded) caseMoreButton.scrollIntoView({ block: "center" });
    });

    window.addEventListener("hashchange", expandForHash);
  }

  document.querySelectorAll(".case-study").forEach((study, index) => {
    const caseIndex = study.querySelector(".case-index");
    const caseBody = study.querySelector(".case-body");
    const caseTitle = study.querySelector("h2");
    if (!caseIndex || !caseBody) return;

    if (!caseBody.id) {
      caseBody.id = `${study.id || `case-study-${index + 1}`}-body`;
    }

    const toggle = document.createElement("button");
    toggle.className = "case-collapse-button";
    toggle.type = "button";
    toggle.textContent = "-";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", caseBody.id);
    toggle.setAttribute("aria-label", `Collapse ${caseTitle ? caseTitle.textContent.trim() : "case study"}`);
    caseIndex.appendChild(toggle);

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;
      toggle.setAttribute("aria-expanded", String(nextExpanded));
      toggle.textContent = nextExpanded ? "-" : "+";
      toggle.setAttribute("aria-label", `${nextExpanded ? "Collapse" : "Expand"} ${caseTitle ? caseTitle.textContent.trim() : "case study"}`);
      caseBody.hidden = !nextExpanded;
      study.classList.toggle("is-collapsed", !nextExpanded);
    });
  });

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
