const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function createExampleDialog({ dialog, trigger, onSelect }) {
  if (!dialog || !trigger) return null;

  let returnFocus = trigger;

  const focusableControls = () => [...dialog.querySelectorAll(FOCUSABLE)].filter((control) => !control.hidden && control.getClientRects().length > 0);

  function open() {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    document.documentElement.classList.add("example-dialog-open");
    dialog.showModal();
    requestAnimationFrame(() => (dialog.querySelector("[data-example-close]") || focusableControls()[0])?.focus());
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  trigger.addEventListener("click", open);
  dialog.querySelectorAll("[data-example-close]").forEach((button) => button.addEventListener("click", close));

  dialog.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      onSelect?.(button.dataset.example);
      close();
    });
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = focusableControls();
    if (!controls.length) {
      event.preventDefault();
      return;
    }
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("example-dialog-open");
    requestAnimationFrame(() => (returnFocus?.isConnected ? returnFocus : trigger).focus());
  });

  return { open, close };
}
