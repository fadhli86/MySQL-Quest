import { getState, getCpmkMastery, getOverallProgress, resetAllProgress, exportProgressJson } from "../state.js";
import { LEVELS } from "../levels.js";
import { el, confirmModal, toast } from "../ui.js";

function barClass(pct) {
  if (pct >= 80) return "good";
  if (pct >= 50) return "warn";
  return "";
}

export async function renderProgress({ navigate }) {
  const s = getState();
  const cpmk = getCpmkMastery();
  const overall = getOverallProgress();

  const cpmkList = el("div", {}, cpmk.map((c) =>
    el("div", { class: "cpmk-row" }, [
      el("div", { class: "cpmk-head" }, [el("span", {}, c.cpmk), el("span", { class: "pct" }, `${c.avgMastery}%`)]),
      el("div", { class: "progress-track" }, [el("div", { class: `progress-fill ${barClass(c.avgMastery)}`, style: `width:${c.avgMastery}%` })]),
      el("div", { style: "margin-top:6px;font-size:11.5px;color:var(--text-faint);" }, c.subs.map((x) => `${x.levelTitle}: ${x.status === "locked" ? "🔒" : x.mastery + "%"}`).join("  •  ")),
    ])
  ));

  const levelList = el("div", {}, LEVELS.map((lv) => {
    const ls = s.levels[lv.id];
    return el("div", { class: "cpmk-row" }, [
      el("div", { class: "cpmk-head" }, [el("span", {}, `Lv.${lv.id} ${lv.title}`), el("span", { class: "pct" }, ls.status === "locked" ? "🔒 Locked" : `${ls.mastery}%`)]),
      el("div", { class: "progress-track" }, [el("div", { class: `progress-fill ${barClass(ls.mastery)}`, style: `width:${ls.status === "locked" ? 0 : ls.mastery}%` })]),
    ]);
  }));

  const exportBtn = el("button", { class: "btn btn-ghost btn-sm" }, "⬇ Export Progress (JSON)");
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([exportProgressJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mysql-quest-progress.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const resetBtn = el("button", { class: "btn btn-danger btn-sm" }, "🗑 Reset Seluruh Progress");
  resetBtn.addEventListener("click", async () => {
    const ok = await confirmModal({ title: "Reset seluruh progress?", body: "Seluruh XP, badge, mastery, dan portfolio pada browser ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.", confirmLabel: "Ya, Reset", danger: true });
    if (!ok) return;
    resetAllProgress();
    toast("Progress direset.");
    navigate("dashboard");
  });

  return el("div", { class: "page page-narrow" }, [
    el("h2", {}, "Learning Progress"),
    el("div", { class: "card" }, [
      el("div", { class: "section-title" }, "Course Progress"),
      el("div", { class: "progress-track" }, [el("div", { class: "progress-fill good", style: `width:${overall}%` })]),
      el("div", { style: "margin-top:6px;font-size:12.5px;color:var(--text-dim);" }, `${overall}% dari 14 level`),
    ]),
    el("div", { class: "card", style: "margin-top:12px;" }, [el("div", { class: "section-title" }, "Mastery per CPMK"), cpmkList]),
    el("div", { class: "card", style: "margin-top:12px;" }, [el("div", { class: "section-title" }, "Mastery per Level"), levelList]),
    el("div", { class: "card", style: "margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;" }, [exportBtn, resetBtn]),
    el("div", { class: "tag-note", style: "margin-top:12px;" }, "Dashboard ini dihitung dari data lokal di browser Anda. Versi produksi berikutnya dapat menambahkan dashboard kelas untuk dosen (lihat Blueprint §21) setelah tersedia backend."),
  ]);
}
