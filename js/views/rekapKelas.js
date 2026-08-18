// Rekap Kelas — DOSEN ONLY. Not linked from any student-facing menu (no
// sidebar/bottom-nav entry); reachable only via the direct #/rekap-kelas
// route, behind a PIN gate below.
//
// Why this exists: the app has no backend, so each student's progress
// lives only in their own browser's localStorage — there is no server-side
// place a "whole class" list could come from. This page is the no-backend
// workaround: the dosen collects the JSON files students already send via
// "Export / Kirim Progress" (see js/views/progress.js) and imports them
// here to build one combined, sortable, printable class grade table.
//
// IMPORTANT: the PIN below is a UX gate to stop a student from stumbling
// into this page by accident — it is NOT real security. This is a static
// site with no server, so the PIN (and this whole file) is visible to
// anyone who opens devtools. Do not rely on it to protect sensitive data.
// Change it to something only you know:
const DOSEN_PIN = "ASIA2026";

const GATE_KEY = "mq_dosen_gate_ok";
const RECAP_KEY = "mysqlquest_dosen_recap_v1";

import { el, clear, toast, confirmModal, fmtNum } from "../ui.js";
import {
  scoreToGrade, gradeClass, fmtDate, downloadOrShareFile,
  buildLevelTable, buildCpmkTable, computeStats, computeCpmk,
  CSV_HEADER, levelCsvRows,
} from "../report-utils.js";

function loadRecap() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECAP_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveRecap(list) {
  localStorage.setItem(RECAP_KEY, JSON.stringify(list));
}

export async function renderRekapKelas({ navigate }) {
  const container = el("div", { class: "page page-narrow" });

  function showGate() {
    clear(container);
    const input = el("input", {
      type: "password", placeholder: "Masukkan PIN Dosen",
      style: "width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-size:15px;margin-top:14px;",
    });
    const btn = el("button", { class: "btn btn-primary btn-block", style: "margin-top:10px;" }, "Masuk");
    const submit = () => {
      if (input.value === DOSEN_PIN) {
        sessionStorage.setItem(GATE_KEY, "1");
        showContent();
      } else {
        toast("PIN salah.", "err");
        input.value = "";
        input.focus();
      }
    };
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    container.appendChild(
      el("div", { class: "card", style: "margin-top:15vh;text-align:center;" }, [
        el("div", { style: "font-size:36px;" }, "🔒"),
        el("h3", { style: "margin:8px 0 4px;" }, "Akses Dosen"),
        el("p", { style: "margin:0;" }, "Halaman ini khusus dosen pengampu — rekap nilai gabungan seluruh mahasiswa. Masukkan PIN untuk melanjutkan."),
        input,
        btn,
      ])
    );
    setTimeout(() => input.focus(), 50);
  }

  function showContent() {
    clear(container);

    const records = loadRecap().sort((a, b) => (a.studentName || "").localeCompare(b.studentName || "", "id"));

    // ---- Import ----
    const importInput = el("input", { type: "file", accept: "application/json,.json", multiple: true, style: "display:none;" });
    const importBtn = el("button", { class: "btn btn-primary btn-sm" }, "⬆ Import File Progress (JSON)");
    importBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async () => {
      const files = Array.from(importInput.files || []);
      importInput.value = "";
      if (!files.length) return;
      const list = loadRecap();
      let ok = 0, fail = 0;
      for (const file of files) {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== "object" || !parsed.levels || typeof parsed.levels !== "object") throw new Error("format tidak dikenali");
          const id = (parsed.studentNim && String(parsed.studentNim).trim()) || (parsed.studentName && String(parsed.studentName).trim().toLowerCase()) || file.name;
          const record = {
            id,
            studentName: parsed.studentName || "(Tanpa nama)",
            studentNim: parsed.studentNim || "",
            xp: parsed.xp || 0,
            badgeCount: Array.isArray(parsed.badges) ? parsed.badges.length : 0,
            levels: parsed.levels,
            importedAt: Date.now(),
            sourceFileName: file.name,
          };
          const idx = list.findIndex((r) => r.id === id);
          if (idx >= 0) list[idx] = record; else list.push(record);
          ok++;
        } catch (e) {
          fail++;
        }
      }
      saveRecap(list);
      toast(`${ok} file berhasil diimpor/diperbarui${fail ? `, ${fail} gagal (bukan file Export Progress yang valid)` : ""}.`);
      showContent();
    });

    const importCard = el("div", { class: "card no-print" }, [
      el("div", { class: "section-title" }, "Import Progress Mahasiswa"),
      el("p", { style: "margin:0 0 10px;font-size:12.5px;color:var(--text-dim);" }, "Minta mahasiswa mengirim file hasil tombol \"Export / Kirim Progress\" (halaman Learning Progress mereka), lalu impor beberapa file sekaligus di sini. Mengimpor ulang file NIM/nama yang sama akan memperbarui datanya (bukan duplikat)."),
      el("div", {}, [importBtn, importInput]),
    ]);

    // ---- Empty state ----
    if (!records.length) {
      container.appendChild(
        el("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;", class: "no-print" }, [
          el("h2", { style: "margin:0;" }, "🧑‍🏫 Rekap Kelas (Dosen)"),
          el("button", { class: "btn btn-ghost btn-sm", onclick: lockAndReset }, "🔒 Kunci Halaman"),
        ])
      );
      container.appendChild(importCard);
      container.appendChild(
        el("div", { class: "empty-state" }, [
          el("div", { class: "ic" }, "📭"),
          el("p", {}, "Belum ada data mahasiswa yang diimpor."),
        ])
      );
      return;
    }

    // ---- Summary stat ----
    const allStats = records.map((r) => computeStats(r.levels));
    const classAvg = Math.round(allStats.reduce((a, s) => a + s.avgMastery, 0) / allStats.length);

    // ---- Table rows ----
    const headers = ["No", "Nama", "NIM", "Nilai Akhir", "Huruf", "Level Tuntas", "XP", "Badge", "Diimpor", "Aksi"];
    const bodyRows = [];
    records.forEach((r, i) => {
      const stats = computeStats(r.levels);
      const cpmk = computeCpmk(r.levels);
      const g = scoreToGrade(stats.avgMastery);

      const detailBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Detail");
      const delBtn = el("button", { class: "btn btn-danger btn-sm", style: "margin-left:6px;" }, "Hapus");

      const tr = el("tr", {}, [
        el("td", {}, String(i + 1)),
        el("td", { style: "font-weight:700;" }, r.studentName),
        el("td", {}, r.studentNim || "—"),
        el("td", { class: "num" }, String(stats.avgMastery)),
        el("td", {}, [el("span", { class: `grade-pill ${gradeClass(stats.avgMastery)}` }, g.letter)]),
        el("td", { class: "num" }, `${stats.completedCount}/${stats.total}`),
        el("td", { class: "num" }, fmtNum(r.xp)),
        el("td", { class: "num" }, String(r.badgeCount)),
        el("td", { style: "font-size:11px;color:var(--text-faint);white-space:nowrap;" }, fmtDate(r.importedAt)),
        el("td", { class: "no-print" }, [detailBtn, delBtn]),
      ]);

      const detailRow = el("tr", { class: "no-print" }, [
        el("td", { colspan: String(headers.length), style: "padding:14px;background:var(--bg-elevated);" }, [
          buildLevelTable(r.levels),
          el("div", { style: "margin-top:10px;" }, [buildCpmkTable(cpmk)]),
        ]),
      ]);
      detailRow.style.display = "none";

      detailBtn.addEventListener("click", () => {
        const showing = detailRow.style.display !== "none";
        detailRow.style.display = showing ? "none" : "table-row";
        detailBtn.textContent = showing ? "Detail" : "Sembunyikan";
      });
      delBtn.addEventListener("click", async () => {
        const ok = await confirmModal({
          title: `Hapus data ${r.studentName}?`,
          body: "Data ini akan dihapus dari Rekap Kelas di browser dosen ini saja — tidak memengaruhi progress asli di device mahasiswa.",
          confirmLabel: "Ya, Hapus",
          danger: true,
        });
        if (!ok) return;
        saveRecap(loadRecap().filter((x) => x.id !== r.id));
        toast("Data dihapus dari rekap.");
        showContent();
      });

      bodyRows.push(tr, detailRow);
    });

    const table = el("div", { class: "table-scroll" }, [
      el("table", { class: "report-table" }, [
        el("thead", {}, [el("tr", {}, headers.map((h) => el("th", { class: h === "Aksi" ? "no-print" : "" }, h)))]),
        el("tbody", {}, bodyRows),
      ]),
    ]);

    // ---- Actions ----
    const printBtn = el("button", { class: "btn btn-primary" }, "🖨️ Cetak / Simpan sebagai PDF");
    printBtn.addEventListener("click", () => window.print());

    const csvBtn = el("button", { class: "btn btn-ghost" }, "⬇ Export Gabungan (CSV)");
    csvBtn.addEventListener("click", async () => {
      const rows = [CSV_HEADER.join(",")];
      for (const r of records) {
        const stats = computeStats(r.levels);
        const g = scoreToGrade(stats.avgMastery);
        const statusLabel = stats.completedCount === stats.total ? "Tuntas" : `Berjalan (${stats.completedCount}/${stats.total})`;
        rows.push(...levelCsvRows(r.studentName, r.studentNim, r.levels, r.xp, stats.avgMastery, g.letter, statusLabel));
      }
      const csv = "﻿" + rows.join("\n");
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadOrShareFile(`Rekap-Kelas-MYSQLQUEST-${stamp}.csv`, csv, "text/csv", "Rekap nilai kelas MYSQL QUEST — buka dengan Excel/Google Sheets.");
      toast("File CSV rekap kelas berhasil diunduh/dibagikan.");
    });

    const clearBtn = el("button", { class: "btn btn-danger btn-sm" }, "🗑 Hapus Semua Rekap");
    clearBtn.addEventListener("click", async () => {
      const ok = await confirmModal({ title: "Hapus seluruh rekap kelas?", body: `Seluruh ${records.length} data mahasiswa yang sudah diimpor di browser dosen ini akan dihapus. File JSON asli dari mahasiswa tidak terpengaruh dan bisa diimpor ulang kapan saja.`, confirmLabel: "Ya, Hapus Semua", danger: true });
      if (!ok) return;
      saveRecap([]);
      toast("Rekap kelas dikosongkan.");
      showContent();
    });

    container.appendChild(
      el("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;", class: "no-print" }, [
        el("h2", { style: "margin:0;" }, "🧑‍🏫 Rekap Kelas (Dosen)"),
        el("button", { class: "btn btn-ghost btn-sm", onclick: lockAndReset }, "🔒 Kunci Halaman"),
      ])
    );
    container.appendChild(el("p", { class: "no-print", style: "margin-top:-6px;" }, "Rekap nilai gabungan seluruh mahasiswa yang datanya sudah diimpor di browser ini. Halaman ini tidak tertaut dari menu manapun untuk mahasiswa."));
    container.appendChild(importCard);

    container.appendChild(
      el("div", { class: "card report-card", style: "margin-top:12px;" }, [
        el("div", { class: "section-title" }, "Ringkasan Kelas"),
        el("div", { class: "stat-row" }, [
          el("div", { class: "stat-box" }, [el("div", { class: "num" }, records.length), el("div", { class: "lbl" }, "Mahasiswa Diimpor")]),
          el("div", { class: "stat-box" }, [el("div", { class: "num" }, classAvg), el("div", { class: "lbl" }, "Rata-rata Nilai Kelas")]),
          el("div", { class: "stat-box" }, [el("div", { class: "num" }, allStats.filter((s) => s.completedCount === s.total).length), el("div", { class: "lbl" }, "Sudah Tuntas Semua Level")]),
        ]),
      ])
    );

    container.appendChild(
      el("div", { class: "card report-card", style: "margin-top:12px;" }, [
        el("div", { class: "section-title" }, "Daftar Nilai Mahasiswa"),
        table,
      ])
    );

    container.appendChild(el("div", { class: "stat-row no-print", style: "margin-top:14px;" }, [printBtn, csvBtn]));
    container.appendChild(el("div", { style: "margin-top:10px;", class: "no-print" }, [clearBtn]));
    container.appendChild(el("div", { class: "tag-note no-print", style: "margin-top:12px;" }, "Data rekap ini tersimpan lokal di browser dosen (localStorage), terpisah dari progress mahasiswa manapun. Import ulang file yang sama (dicocokkan lewat NIM/nama) akan memperbarui datanya, bukan menduplikasi baris."));
  }

  function lockAndReset() {
    sessionStorage.removeItem(GATE_KEY);
    showGate();
  }

  if (sessionStorage.getItem(GATE_KEY) === "1") showContent();
  else showGate();

  return container;
}
