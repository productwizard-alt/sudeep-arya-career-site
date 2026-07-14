(function () {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopTopics = window.matchMedia("(min-width: 761px)");
  const explorer = document.querySelector("[data-topic-explorer]");
  const selectorList = explorer?.querySelector("[data-topic-selector-list]");
  const topics = explorer ? Array.from(explorer.querySelectorAll("[data-topic]")) : [];
  let activeTopic = Math.max(0, topics.findIndex((topic) => topic.open));
  let topicButtons = [];

  const trackTopicSelection = (topic, placement) => {
    window.siteAnalytics?.trackEvent("engagement_topic_select", {
      topic_id: topic?.dataset.topic,
      placement,
    });
  };

  const setActiveTopic = (index, focusButton = false) => {
    if (!topics.length) return;
    activeTopic = Math.min(Math.max(index, 0), topics.length - 1);

    topics.forEach((topic, topicIndex) => {
      const active = topicIndex === activeTopic;
      topic.open = active;
      topic.hidden = desktopTopics.matches && !active;
    });

    topicButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === activeTopic;
      button.setAttribute("aria-pressed", String(active));
      button.tabIndex = active ? 0 : -1;
    });

    if (focusButton && topicButtons[activeTopic]) topicButtons[activeTopic].focus();
  };

  if (selectorList && topics.length) {
    topics.forEach((topic, index) => {
      const summary = topic.querySelector("summary");
      const number = summary?.querySelector("span")?.textContent?.trim() || String(index + 1).padStart(2, "0");
      const label = summary?.querySelector("strong")?.textContent?.trim() || `Topic ${index + 1}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "topic-selector";
      button.setAttribute("aria-controls", topic.id);
      button.setAttribute("aria-pressed", String(index === activeTopic));
      button.innerHTML = `<span>${number}</span><strong>${label}</strong>`;
      button.addEventListener("click", () => {
        setActiveTopic(index);
        trackTopicSelection(topic, "topic_selector");
      });
      button.addEventListener("keydown", (event) => {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") return setActiveTopic(0, true);
        if (event.key === "End") return setActiveTopic(topics.length - 1, true);
        const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        setActiveTopic((index + direction + topics.length) % topics.length, true);
      });
      selectorList.append(button);
      topicButtons.push(button);
    });

    topics.forEach((topic, index) => {
      topic.addEventListener("toggle", () => {
        if (desktopTopics.matches || !topic.open) return;
        activeTopic = index;
        topics.forEach((otherTopic, otherIndex) => {
          if (otherIndex !== index) otherTopic.open = false;
        });
        trackTopicSelection(topic, "topic_disclosure");
      });
    });

    const updateTopicMode = () => {
      topics.forEach((topic, index) => {
        topic.hidden = desktopTopics.matches && index !== activeTopic;
        topic.open = index === activeTopic;
      });
      setActiveTopic(activeTopic);
    };

    desktopTopics.addEventListener("change", updateTopicMode);
    updateTopicMode();
  }

  const panel = document.querySelector("[data-inquiry-panel]");
  const inquiryForm = document.getElementById("engagement-inquiry-form");
  const inquiryHeading = document.getElementById("engagement-form-title");
  const inquiryControls = Array.from(document.querySelectorAll("[data-inquiry-toggle]"));

  const inquiryHashIsOpen = () => ["#engagement-inquiry-form", "#engagement-inquiry-panel"].includes(window.location.hash);

  const setInquiryOpen = (open, options = {}) => {
    if (!(panel instanceof HTMLElement)) return;
    const { focus = false, updateHistory = false, recordClose = false } = options;
    const wasOpen = !panel.hidden;
    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
    inquiryControls.forEach((control) => control.setAttribute("aria-expanded", String(open)));

    if (open) {
      panel.classList.remove("is-opening");
      window.requestAnimationFrame(() => panel.classList.add("is-opening"));
      if (updateHistory && window.location.hash !== "#engagement-inquiry-form") {
        window.history.pushState({ engagementInquiry: true }, "", "#engagement-inquiry-form");
      }
      if (focus && inquiryHeading instanceof HTMLElement) {
        inquiryHeading.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
        window.setTimeout(() => inquiryHeading.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 280);
      }
    } else {
      panel.classList.remove("is-opening");
      if (wasOpen && recordClose) {
        window.siteAnalytics?.trackEvent("content_expand", {
          component_id: "engagement_inquiry_panel",
          content_type: "lead_form",
          section_id: "engagement_form",
          action_state: "close",
        });
      }
    }
  };

  if (panel instanceof HTMLElement && inquiryForm instanceof HTMLFormElement) {
    setInquiryOpen(inquiryHashIsOpen());

    inquiryControls.forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        window.siteAnalytics?.trackOnce("engagement_form_open", "lead_form_open", {
          form_type: "engagement",
          source_page: window.location.pathname,
          placement: control.closest(".engagements-hero") ? "engagements_hero" : "engagement_cta",
        });
        setInquiryOpen(true, { focus: true, updateHistory: true });
      });
    });

    window.addEventListener("popstate", () => setInquiryOpen(inquiryHashIsOpen(), { recordClose: true }));
    window.addEventListener("hashchange", () => setInquiryOpen(inquiryHashIsOpen(), { recordClose: true }));

    const errorSummary = document.getElementById("engagement-form-errors");
    let validationFrame = 0;

    const fieldLabel = (field) => {
      const label = field.closest("label");
      const textNode = label ? Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) : null;
      return textNode?.textContent.trim() || field.name || "This field";
    };

    const fieldMessage = (field) => {
      const label = fieldLabel(field);
      if (field.validity.valueMissing) return `${label} is required.`;
      if (field.validity.typeMismatch && field.type === "email") return "Enter a valid email address.";
      if (field.validity.typeMismatch && field.type === "url") return "Enter a complete URL, including https://.";
      return field.validationMessage || `Check ${label.toLowerCase()}.`;
    };

    const clearFieldError = (field) => {
      field.removeAttribute("aria-invalid");
      const errorId = field.getAttribute("aria-describedby");
      if (errorId?.startsWith("engagement-error-")) field.removeAttribute("aria-describedby");
      field.closest("label")?.querySelector(".field-error")?.remove();
    };

    const showFieldError = (field, index) => {
      clearFieldError(field);
      const error = document.createElement("span");
      error.className = "field-error";
      error.id = `engagement-error-${field.name || index}`;
      error.textContent = fieldMessage(field);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", error.id);
      field.closest("label")?.append(error);
    };

    const renderValidationSummary = () => {
      validationFrame = 0;
      if (!(errorSummary instanceof HTMLElement)) return;
      const invalidFields = Array.from(inquiryForm.elements).filter((field) => field instanceof HTMLElement && "validity" in field && !field.validity.valid);

      if (!invalidFields.length) {
        errorSummary.hidden = true;
        errorSummary.replaceChildren();
        return;
      }

      const heading = document.createElement("h4");
      heading.textContent = `Please correct ${invalidFields.length === 1 ? "this field" : `these ${invalidFields.length} fields`}:`;
      const list = document.createElement("ul");
      invalidFields.forEach((field, index) => {
        showFieldError(field, index);
        if (!field.id) field.id = `engagement-field-${field.name || index}`;
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = fieldMessage(field);
        button.addEventListener("click", () => field.focus());
        item.append(button);
        list.append(item);
      });
      errorSummary.replaceChildren(heading, list);
      errorSummary.hidden = false;
      errorSummary.focus();
    };

    inquiryForm.addEventListener("invalid", (event) => {
      event.preventDefault();
      if (!(event.target instanceof HTMLElement)) return;
      if (validationFrame) window.cancelAnimationFrame(validationFrame);
      validationFrame = window.requestAnimationFrame(renderValidationSummary);
    }, true);

    inquiryForm.addEventListener("input", (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement) || !("validity" in field) || !field.validity.valid) return;
      clearFieldError(field);
      const remaining = Array.from(inquiryForm.elements).some((element) => "validity" in element && !element.validity.valid);
      if (!remaining && errorSummary instanceof HTMLElement) {
        errorSummary.hidden = true;
        errorSummary.replaceChildren();
      }
    });

    inquiryForm.addEventListener("submit", (event) => {
      if (!inquiryForm.checkValidity() || event.defaultPrevented) return;
      window.siteAnalytics?.trackEvent("lead_form_submit_attempt", {
        form_type: "engagement",
        source_page: window.location.pathname,
      });
    });
  }

  root.classList.add("engagements-enhanced");
})();
