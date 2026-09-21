import { getState, getCpmkMastery, getOverallProgress, resetAllProgress, exportSignedProgressJson, importProgressJson } from "../state.js";
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

  const exportBtn = el("button", { class: "btn btn-ghost btn-sm" }, "⬇ Export / Kirim Progress");
  exportBtn.addEventListener("click", async () => {
    const filename = "mysql-quest-progress.json";
    const file = new File([await exportSignedProgressJson()], filename, { type: "application/json" });

    // On phones/tablets, hand off to the native share sheet (WhatsApp, Email,
    // Google Drive, Save to Files, ...) so the student doesn't have to hunt
    // for the file in Downloads before they can send it to another device.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "MYSQL QUEST — Progress",
          text: "File progress MYSQL QUEST. Buka file ini lagi lewat tombol Import di device lain untuk melanjutkan.",
        });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // user closed the share sheet
        // otherwise fall through to plain download below
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("File progress diunduh. Kirim file ini ke diri sendiri (email/WhatsApp/Drive) untuk dibuka di device lain.");
  });

  const importInput = el("input", { type: "file", accept: "application/json,.json", style: "display:none;" });
  const importBtn = el("button", { class: "btn btn-ghost btn-sm" }, "⬆ Import Progress (JSON)");
  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) return;
    const ok = await confirmModal({
      title: "Import Progress?",
      body: "Progress pada browser ini (XP, badge, mastery, portfolio) akan DIGANTI dengan isi file yang dipilih. Tindakan ini tidak dapat dibatalkan. Pastikan file ini hasil Export Progress (JSON) dari MYSQL QUEST.",
      confirmLabel: "Ya, Import & Ganti",
      danger: true,
    });
    if (!ok) return;
    try {
      const text = await file.text();
      importProgressJson(text);
      toast("Progress berhasil di-import. Melanjutkan dari data yang diimpor.");
      navigate("dashboard");
    } catch (e) {
      toast(e.message || "Gagal import progress.", "err");
    }
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
      el("div", { class: "section-title" }, "Laporan untuk Dosen Pengampu"),
      el("p", { style: "margin:0 0 10px;font-size:12.5px;color:var(--text-dim);" }, "Butuh rekap nilai untuk diserahkan ke dosen pengampu? Cetak/unduh laporan evaluasi yang sudah dalam bentuk nilai per level & CPMK."),
      el("button", { class: "btn btn-primary btn-sm", onclick: () => navigate("laporan") }, "📊 Lihat Laporan Evaluasi (Nilai) →"),
    ]),
    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Course Progress"),
      el("div", { class: "progress-track" }, [el("div", { class: "progress-fill good", style: `width:${overall}%` })]),
      el("div", { style: "margin-top:6px;font-size:12.5px;color:var(--text-dim);" }, `${overall}% dari 14 level`),
    ]),
    el("div", { class: "card", style: "margin-top:12px;" }, [el("div", { class: "section-title" }, "Mastery per CPMK"), cpmkList]),
    el("div", { class: "card", style: "margin-top:12px;" }, [el("div", { class: "section-title" }, "Mastery per Level"), levelList]),
    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Lanjutkan di Device Lain"),
      el("p", { style: "margin:0 0 10px;font-size:12.5px;color:var(--text-dim);" }, [
        "Progress tersimpan per-browser. Untuk lanjut mengerjakan di HP/laptop atau browser lain: tekan ",
        el("b", {}, "Export / Kirim Progress"),
        " — di HP akan muncul menu \"Bagikan\" (kirim ke WhatsApp/Email/Drive sendiri), di laptop file akan terunduh. Lalu buka MYSQL QUEST di device tujuan dan tekan ",
        el("b", {}, "Import Progress (JSON)"),
        ", pilih file tadi.",
      ]),
      el("p", { style: "margin:0 0 10px;font-size:12px;color:var(--text-faint);" }, "File export berisi SQL yang meloloskan tiap tahap dan ditandatangani otomatis, sehingga dosen dapat memeriksa keasliannya. Jangan mengubah isi file — perubahan apa pun akan terdeteksi."),
      el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;" }, [exportBtn, importBtn, importInput]),
    ]),
    el("div", { class: "card", style: "margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;" }, [resetBtn]),
    el("div", { class: "tag-note", style: "margin-top:12px;" }, "Dashboard ini dihitung dari data lokal di browser Anda. Versi produksi berikutnya dapat menambahkan dashboard kelas untuk dosen (lihat Blueprint §21) setelah tersedia backend."),
  ]);
}
