const chapters = [...document.querySelectorAll(".publication-chapter")];
const links = [...document.querySelectorAll("[data-chapter-link]")];
const bar = document.querySelector("[data-chapter-progress]");
const live = document.querySelector("[data-publication-live]");

if (chapters.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    const index = chapters.indexOf(current.target);
    links.forEach((link) => link.setAttribute("aria-current", String(link.hash === `#${current.target.id}`)));
    if (bar) bar.style.width = `${((index + 1) / chapters.length) * 100}%`;
  }, { rootMargin: "-20% 0px -65%", threshold: [0, .25, .6] });
  chapters.forEach((chapter) => observer.observe(chapter));
}

document.querySelectorAll("[data-framework]").forEach((framework) => {
  const detail = framework.querySelector("[data-framework-detail]");
  framework.querySelectorAll("button[data-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      framework.querySelectorAll("button[data-detail]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
      if (detail) detail.innerHTML = button.dataset.detail;
      if (live) live.textContent = `${framework.dataset.framework}: ${button.textContent.trim()} selected.`;
    });
  });
});

document.querySelectorAll("[data-decision-question]").forEach((group) => {
  group.addEventListener("change", () => {
    const framework = group.closest("[data-framework]");
    const selected = [...framework.querySelectorAll("input:checked")].map((input) => input.value);
    const recommendation = framework.querySelector("[data-decision-result]");
    if (!recommendation) return;
    if (selected.includes("build")) recommendation.textContent = "Build only if the unique integration or control need is real and an owner can maintain it.";
    else if (selected.filter((value) => value === "buy").length >= 2) recommendation.textContent = "Recurring complexity suggests evaluating specialized software after the problem and owner are documented.";
    else recommendation.textContent = "Keep it simple. A maintained table, library, workflow board, and approved AI workspace may be enough.";
  });
});

document.body.dataset.printDate = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
