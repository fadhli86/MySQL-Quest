import { getState, getRank, getOverallProgress, getCpmkMastery } from "../state.js";
import { LEVELS, getLevelById } from "../levels.js";
import { el, fmtNum } from "../ui.js";

export async function renderDashboard({ navigate }) {
  const s = getState();
  const rank = getRank(s.xp);
  const overall = getOverallProgress();
  const cpmk = getCpmkMastery();
  const weakest = [...cpmk].filter((c) => c.avgMastery > 0).sort((a, b) => a.avgMastery - b.avgMastery).slice(0, 3);

  const lastActive = s.lastActive ? getLevelById(s.lastActive.levelId) : null;
  const currentLevel = LEVELS.find((l) => ["available", "in_progress", "needs_remedial"].includes(s.levels[l.id].status));
  const continueTarget = lastActive || currentLevel;

  const rankProgress = rank.nextAt ? Math.round(((s.xp - (rank.nextAt - 500)) / 500) * 100) : 100;

  const page = el("div", { class: "page" }, [
    el("div", { class: "hero-card" }, [
      el("div", { class: "rank-name" }, `👋 Halo, ${s.studentName || "Junior Engineer"}`),
      el("div", { class: "rank-sub" }, `${rank.name} • ${fmtNum(s.xp)} XP${rank.next ? ` — ${rank.nextAt - s.xp} XP menuju ${rank.next}` : " — Rank tertinggi tercapai!"}`),
      el("div", { class: "progress-track" }, [el("div", { class: "progress-fill", style: `width:${overall}%` })]),
      el("div", { style: "margin-top:8px;font-size:12.5px;color:var(--text-dim);" }, `Course progress: ${overall}% (${LEVELS.filter((l) => ["completed", "mastered"].includes(s.levels[l.id].status)).length}/${LEVELS.length} level selesai)`),
      continueTarget
        ? el("div", { class: "continue-card" }, [
            el("div", { class: "info" }, [
              el("div", { class: "lbl" }, "Continue Playing"),
              el("div", { class: "title" }, `Lv.${continueTarget.id} ${continueTarget.title} — ${continueTarget.questTitle}`),
            ]),
            el("button", { class: "btn btn-primary", onclick: () => navigate("quest", continueTarget.id) }, "Resume ▶"),
          ])
        : el("div", { class: "continue-card" }, [el("div", { class: "info" }, [el("div", { class: "title" }, "🎉 Seluruh level selesai!")])]),
    ]),

    el("div", { class: "grid-2", style: "margin-top:14px;" }, [
      el("div", { class: "card" }, [
        el("div", { class: "section-title" }, "Weak Skill — Perlu Reinforcement"),
        weakest.length
          ? el("div", {}, weakest.map((w) =>
              el("div", { class: "weak-item" }, [
                el("span", { class: "name" }, w.cpmk),
                el("span", { class: "pct" }, `${w.avgMastery}%`),
              ])
            ))
          : el("div", { class: "empty-hint" }, "Mulai bermain untuk melihat mastery per CPMK."),
        el("button", { class: "btn btn-ghost btn-sm", style: "margin-top:8px;width:100%", onclick: () => navigate("progress") }, "Lihat Learning Progress →"),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "section-title" }, "Achievement Terbaru"),
        s.badges.length
          ? el("div", { class: "stat-row" }, [
              el("div", { class: "stat-box" }, [
                el("div", { class: "num" }, s.badges[s.badges.length - 1].icon),
                el("div", { class: "lbl" }, s.badges[s.badges.length - 1].name),
              ]),
              el("div", { class: "stat-box" }, [el("div", { class: "num" }, s.badges.length), el("div", { class: "lbl" }, "Total Badge")]),
            ])
          : el("div", { class: "empty-hint" }, "Selesaikan level pertama untuk meraih badge."),
        el("button", { class: "btn btn-ghost btn-sm", style: "margin-top:8px;width:100%", onclick: () => navigate("achievements") }, "Lihat Semua Achievement →"),
      ]),
    ]),

    el("div", { class: "card", style: "margin-top:14px;" }, [
      el("div", { class: "section-title" }, "Quick Action"),
      el("div", { class: "stat-row" }, [
        el("button", { class: "btn btn-block", onclick: () => navigate("journey") }, "🗺️ Journey"),
        el("button", { class: "btn btn-block", onclick: () => navigate("playground") }, "⌨️ SQL Playground"),
        el("button", { class: "btn btn-block", onclick: () => navigate("portfolio") }, "📁 Portfolio"),
      ]),
    ]),

    el("div", { class: "tag-note", style: "margin-top:14px;" }, "Progress disimpan secara lokal di browser ini (localStorage) — belum ada akun/login. Gunakan browser & perangkat yang sama untuk melanjutkan progres."),
  ]);

  return page;
}
