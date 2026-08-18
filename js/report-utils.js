// Shared grade-report logic, used by both the student's own "Laporan
// Evaluasi" (js/views/laporan.js) and the dosen-only "Rekap Kelas"
// (js/views/rekapKelas.js). Kept pure/parametrized on a `levelsState`
// object (shape: { [levelId]: { status, mastery, stages } }) rather than
// reading the live state.js singleton, so the same logic works both for
// "my own progress" and for progress JSON files imported from other
// students' devices.
import { LEVELS } from "./levels.js";
import { el } from "./ui.js";

// Skala huruf mutu ganda umum di PT Indonesia. masteryThreshold di setiap
// level sudah 80 (syarat level "selesai"), jadi ambang batas A- diselaraskan
// ke titik yang sama supaya konsisten dengan logika kelulusan level.
export const GRADE_SCALE = [
  { min: 85, letter: "A", desc: "Sangat Baik" },
  { min: 80, letter: "A-", desc: "Baik Sekali" },
  { min: 75, letter: "B+", desc: "Baik" },
  { min: 70, letter: "B", desc: "Baik" },
  { min: 65, letter: "B-", desc: "Cukup Baik" },
  { min: 60, letter: "C+", desc: "Cukup" },
  { min: 55, letter: "C", desc: "Cukup" },
  { min: 45, letter: "D", desc: "Kurang" },
  { min: 0, letter: "E", desc: "Sangat Kurang" },
];

export function scoreToGrade(score) {
  return GRADE_SCALE.find((g) => score >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
}

export function gradeClass(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

export const STATUS_LABEL = {
  locked: "🔒 Terkunci",
  available: "Belum Dimulai",
  in_progress: "Sedang Berjalan",
  needs_remedial: "Perlu Remedial",
  completed: "✅ Tuntas",
  mastered: "✅ Tuntas",
};

export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase();
}

export function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function levelStats(level, ls) {
  const graded = level.stages.filter((s) => s.graded);
  let attempts = 0, hints = 0;
  for (const s of graded) {
    const sp = ls.stages ? ls.stages[s.id] : null;
    if (sp) { attempts += sp.attempts || 0; hints += sp.hintsUsed || 0; }
  }
  return { attempts, hints };
}

// Mirrors state.js's isLevelComplete/getCompletionStats math, but takes an
// arbitrary levelsState instead of reading the live singleton.
export function computeStats(levelsState) {
  const isComplete = (ls) => ["completed", "mastered"].includes(ls?.status);
  const completedCount = LEVELS.filter((lv) => isComplete(levelsState[lv.id])).length;
  const avgMastery = Math.round(LEVELS.reduce((a, lv) => a + (levelsState[lv.id]?.mastery ?? 0), 0) / LEVELS.length);
  return { completedCount, total: LEVELS.length, avgMastery };
}

// Mirrors state.js's getCpmkMastery math, parametrized on levelsState.
export function computeCpmk(levelsState) {
  const map = {};
  for (const lv of LEVELS) {
    const cpmk = lv.cpmk;
    if (!map[cpmk]) map[cpmk] = { cpmk, subs: [] };
    const ls = levelsState[lv.id] || { status: "locked", mastery: 0 };
    map[cpmk].subs.push({ subCpmk: lv.subCpmk, levelTitle: lv.title, mastery: ls.mastery ?? 0, status: ls.status || "locked" });
  }
  return Object.values(map).map((entry) => {
    const attempted = entry.subs.filter((s) => s.status !== "locked");
    const avg = attempted.length ? Math.round(attempted.reduce((a, s) => a + s.mastery, 0) / attempted.length) : 0;
    return { ...entry, avgMastery: avg };
  });
}

export function csvEscape(v) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ["Nama", "NIM", "No", "Kode", "Level", "CPMK", "SubCPMK", "Kompetensi", "Status", "Nilai", "Huruf", "Percobaan", "HintDipakai", "XP", "NilaiAkhir", "HurufAkhir", "StatusMataKuliah"];

// One CSV row per level for one student — reused for both the single-student
// export in Laporan Evaluasi and the combined multi-student export in Rekap
// Kelas, so a lecturer can concatenate several of these CSVs into one
// gradebook without column drift.
export function levelCsvRows(studentName, studentNim, levelsState, xp, finalScore, finalGradeLetter, statusLabel) {
  return LEVELS.map((lv, i) => {
    const ls = levelsState[lv.id] || { status: "locked", mastery: 0 };
    const { attempts, hints } = levelStats(lv, ls);
    const isLocked = ls.status === "locked";
    const g = scoreToGrade(isLocked ? 0 : ls.mastery);
    return [
      studentName || "", studentNim || "", i + 1, lv.code, lv.title, lv.cpmk, lv.subCpmk, lv.competency,
      STATUS_LABEL[ls.status] || ls.status, isLocked ? 0 : ls.mastery, isLocked ? "-" : g.letter, attempts, hints, xp,
      finalScore, finalGradeLetter, statusLabel,
    ].map(csvEscape).join(",");
  });
}

export async function downloadOrShareFile(filename, content, mime, shareText) {
  const file = new File([content], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text: shareText });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
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
}

export function buildLevelTable(levelsState) {
  const rows = LEVELS.map((lv, i) => {
    const ls = levelsState[lv.id] || { status: "locked", mastery: 0, stages: {} };
    const { attempts, hints } = levelStats(lv, ls);
    const isLocked = ls.status === "locked";
    const g = scoreToGrade(isLocked ? 0 : ls.mastery);
    return el("tr", {}, [
      el("td", {}, String(i + 1)),
      el("td", {}, lv.code),
      el("td", {}, [el("div", { style: "font-weight:700;" }, lv.title), el("div", { style: "font-size:11px;color:var(--text-faint);" }, lv.competency)]),
      el("td", {}, `${lv.cpmk} / ${lv.subCpmk}`),
      el("td", { class: "num" }, isLocked ? "-" : String(ls.mastery)),
      el("td", {}, [el("span", { class: `grade-pill ${gradeClass(isLocked ? 0 : ls.mastery)}` }, isLocked ? "-" : g.letter)]),
      el("td", {}, STATUS_LABEL[ls.status] || ls.status),
      el("td", { class: "num" }, String(attempts)),
      el("td", { class: "num" }, String(hints)),
    ]);
  });
  return el("div", { class: "table-scroll" }, [
    el("table", { class: "report-table" }, [
      el("thead", {}, [el("tr", {}, ["No", "Kode", "Level & Kompetensi", "CPMK/SubCPMK", "Nilai", "Huruf", "Status", "Percobaan", "Hint"].map((h) => el("th", {}, h)))]),
      el("tbody", {}, rows),
    ]),
  ]);
}

export function buildCpmkTable(cpmkData) {
  const rows = cpmkData.map((c) => {
    const g = scoreToGrade(c.avgMastery);
    return el("tr", {}, [
      el("td", { style: "font-weight:700;" }, c.cpmk),
      el("td", { style: "font-size:11.5px;color:var(--text-dim);" }, c.subs.map((x) => x.levelTitle).join(", ")),
      el("td", { class: "num" }, String(c.avgMastery)),
      el("td", {}, [el("span", { class: `grade-pill ${gradeClass(c.avgMastery)}` }, g.letter)]),
    ]);
  });
  return el("div", { class: "table-scroll" }, [
    el("table", { class: "report-table" }, [
      el("thead", {}, [el("tr", {}, ["CPMK", "Level Terkait", "Rata-rata Nilai", "Huruf"].map((h) => el("th", {}, h)))]),
      el("tbody", {}, rows),
    ]),
  ]);
}
