import { getState, getRank } from "../state.js";
import { LEVELS } from "../levels.js";
import { el, fmtNum, timeAgo } from "../ui.js";

export async function renderAchievements() {
  const s = getState();
  const rank = getRank(s.xp);
  const earnedIds = new Set(s.badges.map((b) => b.id));

  const grid = el("div", { class: "badge-grid" });
  for (const lv of LEVELS) {
    const id = `level-${lv.id}`;
    const earned = earnedIds.has(id);
    grid.appendChild(
      el("div", { class: `badge-card${earned ? " earned" : ""}` }, [
        el("div", { class: "ic" }, lv.badgeIcon),
        el("div", { class: "nm" }, lv.title),
      ])
    );
  }

  const recentBadges = [...s.badges].reverse().slice(0, 8);

  return el("div", { class: "page page-narrow" }, [
    el("h2", {}, "Achievement"),
    el("div", { class: "card" }, [
      el("div", { class: "section-title" }, "Rank Saat Ini"),
      el("div", { style: "font-size:20px;font-weight:800;" }, rank.name),
      el("div", { style: "font-size:12.5px;color:var(--text-dim);margin-top:2px;" }, `${fmtNum(s.xp)} XP${rank.next ? ` • ${rank.nextAt - s.xp} XP menuju ${rank.next}` : " • Rank tertinggi"}`),
    ]),
    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, `Badge Kompetensi (${s.badges.length}/${LEVELS.length})`),
      grid,
    ]),
    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Riwayat Badge Terbaru"),
      recentBadges.length
        ? el("div", {}, recentBadges.map((b) => el("div", { class: "weak-item" }, [el("span", { class: "name" }, `${b.icon} ${b.name}`), el("span", { class: "pct" }, timeAgo(b.at))])))
        : el("div", { class: "empty-hint" }, "Belum ada badge — selesaikan level pertama untuk memulai."),
    ]),
    el("div", { class: "tag-note", style: "margin-top:12px;" }, "XP dan rank mengukur engagement/progression, bukan nilai akademik. Nilai akademik ditentukan oleh mastery per level (lihat Learning Progress)."),
  ]);
}
