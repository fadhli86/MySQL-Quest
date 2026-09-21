// A small guided tour: a floating, non-blocking card that explains one part of
// the screen at a time and highlights it. Unlike a modal dialog it leaves the
// page usable behind it (so the highlighted area stays visible), which is why
// it is role="dialog" with aria-modal="false" and manages focus itself.
//
// steps: [{ title, body, target?: CSS selector, before?: () => void }]
//   `before` runs first (e.g. to switch to the right tab on a phone).
import { el } from "./ui.js";

export function runTour(steps, { onFinish } = {}) {
  let index = 0;
  let highlighted = null;
  const opener = document.activeElement;

  const title = el("h3", { id: "tour-title", tabindex: "-1" });
  const body = el("p", { class: "tour-body" });
  const counter = el("div", { class: "tag-note" });
  const skip = el("button", { class: "btn btn-ghost btn-sm" }, "Lewati");
  const back = el("button", { class: "btn btn-ghost btn-sm" }, "← Kembali");
  const next = el("button", { class: "btn btn-primary btn-sm" });
  const card = el("div", { class: "tour-card bottom", role: "dialog", "aria-modal": "false", "aria-labelledby": "tour-title" }, [
    counter,
    title,
    body,
    el("div", { class: "tour-actions" }, [skip, el("div", { class: "spacer", style: "flex:1" }), back, next]),
  ]);
  document.body.appendChild(card);

  function clearHighlight() {
    if (highlighted) highlighted.classList.remove("tour-highlight");
    highlighted = null;
  }

  function finish() {
    clearHighlight();
    document.removeEventListener("keydown", onKey, true);
    card.remove();
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    if (onFinish) onFinish();
  }

  function show(i) {
    index = i;
    const step = steps[i];
    clearHighlight();
    if (step.before) step.before();
    counter.textContent = `Langkah ${i + 1} dari ${steps.length}`;
    title.textContent = step.title;
    body.textContent = step.body;
    back.disabled = i === 0;
    next.textContent = i === steps.length - 1 ? "Selesai ✓" : "Lanjut →";
    // Let a tab switch / re-render settle before measuring the target.
    setTimeout(() => {
      const target = step.target ? document.querySelector(step.target) : null;
      if (target && target.offsetParent !== null) {
        target.classList.add("tour-highlight");
        highlighted = target;
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const r = target.getBoundingClientRect();
        // Put the card on the opposite half of the screen so it never covers the target.
        card.classList.toggle("top", r.top + r.height / 2 > window.innerHeight / 2);
        card.classList.toggle("bottom", !(r.top + r.height / 2 > window.innerHeight / 2));
      }
      title.focus();
    }, 60);
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      finish();
    }
  }

  skip.addEventListener("click", finish);
  back.addEventListener("click", () => show(Math.max(0, index - 1)));
  next.addEventListener("click", () => (index === steps.length - 1 ? finish() : show(index + 1)));
  document.addEventListener("keydown", onKey, true);
  show(0);
  return { stop: finish };
}
