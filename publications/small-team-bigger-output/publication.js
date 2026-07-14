const chapters = [...document.querySelectorAll(".publication-chapter")];
const links = [...document.querySelectorAll("[data-chapter-link]")];
const progress = document.querySelector("[data-chapter-progress]");
const live = document.querySelector("[data-publication-live]");

if (chapters.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    const index = chapters.indexOf(current.target);
    links.forEach((link) => link.setAttribute("aria-current", String(link.hash === `#${current.target.id}`)));
    if (progress) progress.style.width = `${((index + 1) / chapters.length) * 100}%`;
  }, { rootMargin: "-18% 0px -68%", threshold: [0, .25, .6] });
  chapters.forEach((chapter) => observer.observe(chapter));
}

document.querySelectorAll("[data-framework]").forEach((framework, frameworkIndex) => {
  const detail = framework.querySelector("[data-framework-detail]");
  framework.querySelectorAll("button[data-detail]").forEach((button, buttonIndex) => {
    button.addEventListener("click", () => {
      framework.querySelectorAll("button[data-detail]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
      if (detail) detail.innerHTML = button.dataset.detail;
      if (live) live.textContent = `${framework.dataset.framework}: ${button.textContent.trim()} selected.`;
      window.siteAnalytics?.trackEvent("select_content", {
        content_type: "capability",
        item_id: `framework_${frameworkIndex + 1}_option_${buttonIndex + 1}`,
        placement: "publication_body",
      });
    });
  });
});
