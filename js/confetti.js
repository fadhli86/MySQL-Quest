// Lightweight celebration effect for level completion — plain DOM/CSS,
// no canvas or external library, so it stays inside the no-build,
// CDN-only footprint of the rest of the app.
import { el, openDialog } from "./ui.js";

const COLORS = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#fb7185"];

function spawnConfetti(container, count = 46) {
  // Falling confetti is decorative motion: skip it for people who asked for less.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const size = 6 + Math.random() * 6;
    const piece = el("div", {
      class: "confetti-piece",
      style: `
        left:${Math.random() * 100}%;
        width:${size}px; height:${size * 0.4}px;
        background:${COLORS[i % COLORS.length]};
        animation-duration:${1.4 + Math.random() * 1.1}s;
        animation-delay:${Math.random() * 0.35}s;
        transform: rotate(${Math.random() * 360}deg);
      `.replace(/\s+/g, " "),
    });
    container.appendChild(piece);
  }
}

// opts: { badgeIcon, badgeName, levelTitle, xpGained, mastery, hasNext, courseComplete, onContinue }
export function celebrateLevelComplete(opts) {
  const overlay = el("div", { class: "celebrate-overlay" });
  const box = el("div", { class: "celebrate-box" }, [
    el("div", { class: "celebrate-badge" }, opts.courseComplete ? "🎓" : opts.badgeIcon || "🏅"),
    el("div", { class: "celebrate-title" }, opts.courseComplete ? "MYSQL QUEST Selesai!" : "Level Selesai!"),
    el(
      "div",
      { class: "celebrate-sub" },
      opts.courseComplete
        ? `Seluruh 14 level tuntas — Anda resmi jadi Database Architect! Badge "${opts.badgeName}" diraih.`
        : `${opts.levelTitle} — badge "${opts.badgeName}" diraih`
    ),
    el("div", { class: "celebrate-stats" }, [
      el("div", { class: "stat-box" }, [el("div", { class: "num" }, `+${opts.xpGained}`), el("div", { class: "lbl" }, "XP")]),
      el("div", { class: "stat-box" }, [el("div", { class: "num" }, `${opts.mastery}%`), el("div", { class: "lbl" }, "Mastery")]),
    ]),
    el(
      "button",
      { class: "btn btn-primary btn-block" },
      opts.courseComplete ? "Lihat Sertifikat Kelulusan 🎓" : opts.hasNext ? "Lanjut ke Level Berikutnya →" : "Lihat Journey 🎉"
    ),
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  spawnConfetti(box);
  const proceed = () => {
    close();
    opts.onContinue && opts.onContinue();
  };
  const close = openDialog(overlay, box, { onEscape: proceed });
  box.querySelector("button").onclick = proceed;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) proceed();
  });
}
