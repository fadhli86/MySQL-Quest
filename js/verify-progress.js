// Lecturer-side checks on a student's exported progress (see js/integrity.js
// for what these can and cannot prove):
//
//  - replayVerify: re-grades the SQL stored for every passed stage, level by
//    level in a fresh sandbox, with the real grader. A pass that was only
//    typed into the JSON has no working SQL behind it and fails here.
//  - timingFindings: stages "solved" implausibly soon after the previous one.
//  - findSimilar: identical (normalized) longer answers across students —
//    a reason to look, not evidence of copying.
//  - integrityStatus: folds the above into one badge for the class table.
//
// Replay starts each level from its seed data and applies the stored SQL in
// stage order. A student's live sandbox also carried their Run experiments,
// so an occasional mismatch can be a false alarm — the wording everywhere is
// "perlu ditinjau", never "curang".
import { LEVELS } from "./levels.js";
import { Sandbox } from "./sandbox.js";
import { gradeSqlStage } from "./grader.js";

const FAST_MS = 15000; // stage passed < 15 s after the previous one...
const FAST_MIN_SQL = 40; // ...and the answer wasn't a one-liner
const SIMILAR_MIN_LEN = 60; // shorter answers coincide by chance

export function normalizeSql(sql) {
  return String(sql || "")
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([,()=;])\s*/g, "$1")
    .replace(/;+$/, "")
    .trim()
    .toLowerCase();
}

// levelsState: { [levelId]: { stages: { [stageId]: { status, passedSql, ... } } } }
// Returns { findings: [{ levelId, stageId, title, verdict, message }], summary: { checked, ok, fail, noEvidence } }
export async function replayVerify(levelsState) {
  const findings = [];
  const summary = { checked: 0, ok: 0, fail: 0, noEvidence: 0 };
  for (const level of LEVELS) {
    const ls = levelsState && levelsState[level.id];
    if (!ls || !ls.stages) continue;
    const graded = level.stages.filter((s) => s.type === "sql" && s.graded);
    if (!graded.some((s) => ls.stages[s.id] && ls.stages[s.id].status === "passed")) continue;
    const sb = await new Sandbox(level.datasetSql).init();
    try {
      for (const stage of graded) {
        const sp = ls.stages[stage.id];
        if (!sp || sp.status !== "passed") continue;
        summary.checked += 1;
        if (!sp.passedSql) {
          summary.noEvidence += 1;
          findings.push({ levelId: level.id, stageId: stage.id, title: stage.title, verdict: "no-evidence", message: "Tercatat lulus, tetapi tidak ada SQL sebagai bukti." });
          continue;
        }
        const exec = sb.runTolerant(sp.passedSql);
        const grade = gradeSqlStage(sb, sp.passedSql, exec, stage);
        if (grade.passed) {
          summary.ok += 1;
        } else {
          summary.fail += 1;
          findings.push({ levelId: level.id, stageId: stage.id, title: stage.title, verdict: "fail", message: `SQL yang tersimpan tidak lolos saat dinilai ulang: ${grade.message}` });
        }
      }
    } finally {
      sb.reset();
    }
  }
  return { findings, summary };
}

export function timingFindings(levelsState) {
  const out = [];
  for (const level of LEVELS) {
    const ls = levelsState && levelsState[level.id];
    if (!ls || !ls.stages) continue;
    const passed = level.stages
      .filter((s) => s.type === "sql" && s.graded && ls.stages[s.id] && ls.stages[s.id].passedAt)
      .map((s) => ({ stage: s, sp: ls.stages[s.id] }))
      .sort((a, b) => a.sp.passedAt - b.sp.passedAt);
    for (let i = 1; i < passed.length; i++) {
      const gap = passed[i].sp.passedAt - passed[i - 1].sp.passedAt;
      if (gap >= 0 && gap < FAST_MS && String(passed[i].sp.passedSql || "").length >= FAST_MIN_SQL) {
        out.push({ levelId: level.id, stageId: passed[i].stage.id, title: passed[i].stage.title, seconds: Math.round(gap / 1000) });
      }
    }
  }
  return out;
}

// records: [{ id, studentName, levels }]. Returns groups of >= 2 students that
// submitted the same normalized answer for the same stage.
export function findSimilar(records) {
  const groups = new Map();
  for (const r of records) {
    for (const level of LEVELS) {
      const ls = r.levels && r.levels[level.id];
      if (!ls || !ls.stages) continue;
      for (const stage of level.stages) {
        const sp = ls.stages[stage.id];
        if (!sp || !sp.passedSql) continue;
        const norm = normalizeSql(sp.passedSql);
        if (norm.length < SIMILAR_MIN_LEN) continue;
        const key = `${level.id}:${stage.id}\u0000${norm}`;
        if (!groups.has(key)) groups.set(key, { levelId: level.id, stageId: stage.id, title: stage.title, sql: sp.passedSql.trim(), students: [] });
        groups.get(key).students.push(r.studentName || r.id);
      }
    }
  }
  return [...groups.values()].filter((g) => new Set(g.students).size >= 2);
}

// record.integrity = { signature, xpOk, hasEvidence }, record.verify = { summary, findings, timing }
export function integrityStatus(record) {
  const reasons = [];
  const integ = record.integrity || {};
  if (integ.signature === "invalid") reasons.push("Tanda tangan tidak cocok — file diubah setelah diekspor.");
  if (integ.signature === "missing" && integ.hasEvidence) reasons.push("Tanda tangan tidak ada padahal file berisi bukti SQL.");
  if (integ.xpOk === false) reasons.push("Total XP tidak sama dengan jumlah catatan XP.");
  const v = record.verify;
  if (v) {
    if (v.summary.fail > 0) reasons.push(`${v.summary.fail} jawaban gagal saat dinilai ulang.`);
    if (v.summary.noEvidence > 0 && integ.hasEvidence) reasons.push(`${v.summary.noEvidence} tahap lulus tanpa bukti SQL.`);
  }
  if (reasons.length) return { code: "review", label: "⚠ Perlu ditinjau", reasons };
  if (!integ.hasEvidence) return { code: "legacy", label: "— Tanpa bukti (file lama)", reasons: ["File berasal dari versi lama yang belum menyimpan bukti SQL, sehingga tidak bisa dinilai ulang."] };
  if (!v) return { code: "pending", label: "… Belum diverifikasi", reasons: [] };
  return { code: "ok", label: integ.signature === "valid" ? "✔ Terverifikasi" : "✔ Nilai cocok", reasons: [] };
}
