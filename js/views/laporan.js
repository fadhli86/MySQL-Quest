// Laporan Evaluasi (Nilai) — the student's OWN printable, gradebook-ready
// score report so the dosen pengampu doesn't have to reconstruct a grade
// from raw XP/mastery numbers themselves. Shows only the current device's
// own progress (there's no backend, so it's structurally impossible for a
// student to see anyone else's grade here). No backend: the student
// prints/saves this as PDF, or exports the CSV, and hands it to the
// lecturer (same "no backend, student carries their own data" model as
// Export Progress on the Progress page). The dosen-only class-wide recap
// lives separately at js/views/rekapKelas.js.
import { getState, getCpmkMastery, getCompletionStats, isCourseComplete, setStudentName, setStudentNim } from "../state.js";
import { el, promptModal, toast, fmtNum } from "../ui.js";
import { LECTURER_NAME, LECTURER_ROLE } from "../certificate.js";
import { scoreToGrade, gradeClass, hashCode, fmtDate, downloadOrShareFile, buildLevelTable, buildCpmkTable, CSV_HEADER, levelCsvRows } from "../report-utils.js";

export async function renderLaporan({ navigate }) {
  const s = getState();
  const cpmk = getCpmkMastery();
  const stats = getCompletionStats();
  const complete = isCourseComplete();
  const finalGrade = scoreToGrade(stats.avgMastery);
  const printedAt = Date.now();
  const reportId = `LP-${hashCode(`${s.studentName}|${s.studentNim}|${JSON.stringify(s.levels)}`)}`;

  const nameLine = el("span", {}, s.studentName || "Junior Engineer");
  const nimLine = el("span", {}, s.studentNim || "—");

  const editNameBtn = el("button", { class: "btn btn-ghost btn-sm no-print" }, "✏️ Nama");
  editNameBtn.addEventListener("click", async () => {
    const name = await promptModal({ title: "Ubah Nama pada Laporan", body: "Nama ini juga dipakai di seluruh tampilan aplikasi.", placeholder: "Nama lengkap Anda", defaultValue: s.studentName || "" });
    if (name && name.trim()) { setStudentName(name.trim()); nameLine.textContent = name.trim(); }
  });

  const editNimBtn = el("button", { class: "btn btn-ghost btn-sm no-print" }, "✏️ NIM");
  editNimBtn.addEventListener("click", async () => {
    const nim = await promptModal({ title: "Isi/Ubah NIM", body: "Nomor Induk Mahasiswa, dicantumkan pada laporan evaluasi agar mudah dicocokkan oleh dosen pengampu.", placeholder: "cth. 2023110045", defaultValue: s.studentNim || "" });
    setStudentNim(nim.trim());
    nimLine.textContent = nim.trim() || "—";
  });

  const levelTable = buildLevelTable(s.levels);
  const cpmkTable = buildCpmkTable(cpmk);

  // ---- Actions ----
  const printBtn = el("button", { class: "btn btn-primary" }, "🖨️ Cetak / Simpan sebagai PDF");
  printBtn.addEventListener("click", () => window.print());

  const csvBtn = el("button", { class: "btn btn-ghost" }, "⬇ Export Nilai (CSV)");
  csvBtn.addEventListener("click", async () => {
    const statusLabel = complete ? "Tuntas" : `Berjalan (${stats.completedCount}/${stats.total})`;
    const rows = [CSV_HEADER.join(","), ...levelCsvRows(s.studentName, s.studentNim, s.levels, stats.xp, stats.avgMastery, finalGrade.letter, statusLabel)];
    const csv = "﻿" + rows.join("\n");
    const filename = `Laporan-Nilai-MYSQLQUEST-${(s.studentName || "peserta").replace(/\s+/g, "_")}.csv`;
    await downloadOrShareFile(filename, csv, "text/csv", "File nilai MYSQL QUEST — buka dengan Excel/Google Sheets.");
    toast("File CSV nilai berhasil diunduh/dibagikan.");
  });

  const page = el("div", { class: "page page-narrow" }, [
    el("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;", class: "no-print" }, [
      el("h2", { style: "margin:0;" }, "📊 Laporan Evaluasi (Nilai)"),
    ]),
    el("p", { class: "no-print", style: "margin-top:-6px;" }, "Rekap nilai berjalan dalam format siap-cetak, sehingga dosen pengampu tidak perlu menghitung ulang XP/mastery secara manual — cukup cetak, simpan sebagai PDF, atau ekspor CSV untuk direkap di gradebook."),

    el("div", { class: "card report-card" }, [
      el("div", { style: "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px;" }, [
        el("div", {}, [
          el("div", { style: "font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);font-weight:800;" }, "MYSQL QUEST — Mata Kuliah Database MySQL (OBE)"),
          el("h3", { style: "margin:4px 0 0;" }, "Laporan Evaluasi Pembelajaran"),
        ]),
        el("span", { class: `grade-pill big ${gradeClass(stats.avgMastery)}` }, finalGrade.letter),
      ]),
      el("table", { class: "info-table", style: "margin-top:8px;" }, [
        el("tr", {}, [el("th", {}, "Nama"), el("td", {}, [nameLine, " ", editNameBtn])]),
        el("tr", {}, [el("th", {}, "NIM"), el("td", {}, [nimLine, " ", editNimBtn])]),
        el("tr", {}, [el("th", {}, "Dosen Pengampu"), el("td", {}, `${LECTURER_NAME} — ${LECTURER_ROLE}`)]),
        el("tr", {}, [el("th", {}, "Tanggal Cetak"), el("td", {}, fmtDate(printedAt))]),
        el("tr", {}, [el("th", {}, "Status Mata Kuliah"), el("td", {}, complete ? "✅ Tuntas — seluruh level selesai" : `Sedang Berjalan — ${stats.completedCount}/${stats.total} level tuntas`)]),
        el("tr", {}, [el("th", {}, "ID Laporan"), el("td", {}, reportId)]),
      ]),
      el("div", { class: "stat-row", style: "margin-top:14px;" }, [
        el("div", { class: "stat-box" }, [el("div", { class: "num" }, `${stats.avgMastery}`), el("div", { class: "lbl" }, "Nilai Akhir (0-100)")]),
        el("div", { class: "stat-box" }, [el("div", { class: "num" }, finalGrade.letter), el("div", { class: "lbl" }, finalGrade.desc)]),
        el("div", { class: "stat-box" }, [el("div", { class: "num" }, `${stats.completedCount}/${stats.total}`), el("div", { class: "lbl" }, "Level Tuntas")]),
        el("div", { class: "stat-box" }, [el("div", { class: "num" }, fmtNum(stats.xp)), el("div", { class: "lbl" }, "Total XP")]),
        el("div", { class: "stat-box" }, [el("div", { class: "num" }, stats.badgeCount), el("div", { class: "lbl" }, "Badge")]),
      ]),
      el("p", { style: "font-size:11px;color:var(--text-faint);margin-top:10px;margin-bottom:0;" }, "Nilai Akhir dihitung rata-rata mastery dari seluruh 14 level (level yang belum dikerjakan dihitung 0), sehingga angka ini merepresentasikan capaian belajar hingga saat laporan dicetak — bukan hanya level yang sudah disentuh."),
    ]),

    el("div", { class: "card report-card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Rincian Nilai per Level"),
      levelTable,
    ]),

    el("div", { class: "card report-card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Rekap per CPMK"),
      cpmkTable,
    ]),

    el("div", { class: "card report-card sig-block", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Pengesahan"),
      el("div", { class: "sig-row" }, [
        el("div", { class: "sig-col" }, [
          el("div", {}, "Mahasiswa,"),
          el("div", { class: "sig-space" }),
          el("div", { style: "font-weight:700;" }, s.studentName || "Junior Engineer"),
          el("div", { style: "font-size:11px;color:var(--text-faint);" }, s.studentNim || ""),
        ]),
        el("div", { class: "sig-col" }, [
          el("div", {}, "Dosen Pengampu,"),
          el("div", { class: "sig-space" }),
          el("div", { style: "font-weight:700;" }, LECTURER_NAME),
          el("div", { style: "font-size:11px;color:var(--text-faint);" }, LECTURER_ROLE),
        ]),
      ]),
      el("p", { style: "font-size:10.5px;color:var(--text-faint);margin-top:14px;margin-bottom:0;" }, `Laporan dihasilkan otomatis oleh sistem MYSQL QUEST dari data lokal di perangkat/browser ini (belum ada akun/login terpusat). ID Laporan: ${reportId} — © Ahda Development 2026.`),
    ]),

    el("div", { class: "stat-row no-print", style: "margin-top:14px;" }, [printBtn, csvBtn]),
    el("div", { class: "tag-note no-print", style: "margin-top:12px;" }, "Karena aplikasi ini belum memiliki backend/dashboard kelas, laporan ini didesain agar bisa diserahkan langsung ke dosen pengampu — cetak/PDF untuk arsip, atau CSV untuk digabung ke rekap nilai kelas."),
    el("button", { class: "btn btn-ghost btn-sm no-print", style: "margin-top:10px;", onclick: () => navigate("progress") }, "← Kembali ke Learning Progress"),
  ]);

  return page;
}
