import { getState, getRank, getOverallProgress, getCpmkMastery, isCourseComplete, getReviewSummary } from "../state.js";
import { LEVELS, getLevelById } from "../levels.js";
import { el, fmtNum } from "../ui.js";

// Spaced-review entry point; hidden until the student has anything to review.
function reviewCard(navigate) {
  const sum = getReviewSummary();
  if (!sum.active && !sum.retired) return null;
  return el("div", { class: "card", style: "margin-top:14px;" }, [
    el("div", { class: "section-title" }, "🔁 Review Konsep"),
    el("div", { style: "font-size:13.5px;color:var(--text-dim);margin-bottom:8px;" },
      sum.due ? `${sum.due} soal konsep siap diulang agar tidak terlupa.` : sum.active ? "Belum ada soal yang jatuh tempo — Anda tetap bisa berlatih." : `✅ ${sum.retired} konsep sudah Anda kuasai.`),
    el("button", { class: `btn ${sum.due ? "btn-primary" : "btn-ghost"} btn-sm`, style: "width:100%", onclick: () => navigate("review") }, sum.due ? "Mulai Review →" : "Buka Review →"),
  ]);
}

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

  const courseComplete = isCourseComplete();

  const page = el("div", { class: "page" }, [
    courseComplete
      ? el("div", { class: "hero-card", style: "margin-bottom:14px;border-color:rgba(251,191,36,.4);" }, [
          el("div", { class: "rank-name" }, "🎓 Selamat, MYSQL QUEST Selesai!"),
          el("div", { class: "rank-sub" }, "Seluruh 14 level telah Anda selesaikan. Sertifikat kelulusan bertanda tangan dosen pengampu sudah bisa diunduh."),
          el("button", { class: "btn btn-primary btn-block", style: "margin-top:10px;", onclick: () => navigate("certificate") }, "Lihat & Unduh Sertifikat →"),
        ])
      : null,
    el("div", { class: "hero-card" }, [
      el("div", { class: "rank-name" }, `👋 Halo, ${s.studentName || "Junior Engineer"}`),
      el("div", { class: "rank-sub" }, `${rank.name} • ${fmtNum(s.xp)} XP${rank.next ? ` — ${rank.nextAt - s.xp} XP menuju ${rank.next}` : " — Rank tertinggi tercapai!"}`),
      el("div", { class: "status-row" }, [
        el("span", { class: "status-pill" }, `📈 Progress ${overall}%`),
        el("span", { class: "status-pill" }, `🎯 Rank ${rank.name}`),
        el("span", { class: "status-pill" }, `⭐ ${fmtNum(s.xp)} XP`),
      ]),
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

    reviewCard(navigate),

    el("div", { class: "card", style: "margin-top:14px;" }, [
      el("div", { class: "section-title" }, "Quick Action"),
      el("div", { class: "action-grid" }, [
        el("button", { class: "btn action-card", onclick: () => navigate("journey") }, [el("span", { class: "ic" }, "🗺️"), el("span", { class: "label" }, "Journey")]),
        el("button", { class: "btn action-card", onclick: () => navigate("playground") }, [el("span", { class: "ic" }, "⌨️"), el("span", { class: "label" }, "SQL Playground")]),
        el("button", { class: "btn action-card", onclick: () => navigate("portfolio") }, [el("span", { class: "ic" }, "📁"), el("span", { class: "label" }, "Portfolio")]),
        el("button", { class: "btn action-card", onclick: () => navigate("help") }, [el("span", { class: "ic" }, "🧭"), el("span", { class: "label" }, "Panduan")]),
      ]),
    ]),

    el("div", { class: "tag-note", style: "margin-top:14px;" }, [
      "Progress disimpan otomatis di browser ini (localStorage) — belum ada akun/login. Anda bisa berhenti kapan saja dan lanjut nanti dari titik terakhir. Untuk lanjut di device/browser lain, pakai Export/Import di halaman ",
      el("a", { href: "#/progress", style: "color:var(--brand);font-weight:700;" }, "Learning Progress"),
      ".",
    ]),
    el("div", { style: "margin-top:14px;font-size:10.5px;color:var(--text-faint);text-align:center;" }, "© Ahda Development 2026"),
  ]);

  return page;
}
