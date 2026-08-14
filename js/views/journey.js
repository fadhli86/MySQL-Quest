import { getState } from "../state.js";
import { LEVELS } from "../levels.js";
import { el } from "../ui.js";

const STATUS_LABEL = {
  locked: "Locked",
  available: "Available",
  in_progress: "In Progress",
  needs_remedial: "Needs Remedial",
  completed: "Completed",
  mastered: "Mastered",
};

function nodeClass(status) {
  if (status === "completed" || status === "mastered") return "done";
  if (status === "needs_remedial") return "remedial";
  if (status === "in_progress" || status === "available") return "now";
  return "locked";
}

export async function renderJourney({ navigate }) {
  const s = getState();

  const list = el("div", { class: "journey-list" });
  for (const lv of LEVELS) {
    const status = s.levels[lv.id].status;
    const mastery = s.levels[lv.id].mastery;
    const cls = nodeClass(status);
    const locked = status === "locked";

    list.appendChild(
      el(
        "button",
        {
          class: `journey-node ${cls}`,
          onclick: locked ? null : () => navigate("quest", lv.id),
          disabled: locked,
        },
        [
          el("div", { class: "node-dot" }, cls === "done" ? "✓" : String(lv.id).padStart(2, "0")),
          el("div", { class: "node-body" }, [
            el("div", { class: "node-title" }, `${lv.title}${lv.bossBattle ? ` ⚔ ${lv.bossLabel}` : ""}`),
            el("div", { class: "node-quest" }, `${lv.questTitle} — ${lv.competency}`),
            el("div", { class: "node-status" }, locked ? "🔒 Requires level sebelumnya" : STATUS_LABEL[status]),
            !locked ? el("div", { class: "node-mastery" }, `Mastery: ${mastery}% ${mastery >= lv.masteryThreshold ? "✅" : ""}`) : null,
          ]),
        ]
      )
    );
  }

  return el("div", { class: "page page-narrow" }, [
    el("h2", {}, "Journey — Peta 14 Level"),
    el("p", {}, "Ikuti perjalanan dari Database Rookie hingga Database Architect. Level terbuka secara berurutan; capai mastery ≥ 80% untuk melanjutkan ke level berikutnya."),
    list,
  ]);
}
