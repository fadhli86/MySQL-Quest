// Auto-grading engine.
//
// Design follows the blueprint's principle: never diff SQL as raw text.
// Correctness is decided by running the quest's own reference SQL against
// the *same* live sandbox and comparing its result set to what the
// student's query produced (stage.referenceSql) — or, for DDL/DML/trigger
// stages, by a custom state validator (stage.validate) that inspects the
// database after the student's statement executed. Concept coverage is
// checked via required/forbidden SQL constructs. Two more components from
// the blueprint's rubric — efficiency and interpretation — are scored via
// lightweight heuristics documented inline; they are intentionally not a
// full query-plan/NLP analysis, which is out of scope for a static,
// serverless deployment.
import { humanizeSqlError } from "./sandbox.js";

const DEFAULT_WEIGHTS = { correctness: 50, concept: 20, efficiency: 15, interpretation: 15 };

function normCell(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
  return String(v).trim();
}

function rowKey(row) {
  return row.map(normCell).join("");
}

function lastStatement(execResults) {
  if (!execResults || !execResults.length) return { columns: [], values: [] };
  return execResults[execResults.length - 1];
}

// Compares two live sql.js exec() results (actual vs reference).
function compareLiveResults(actualExec, referenceExec, { orderSensitive, checkColumnNames } = {}) {
  const actual = lastStatement(actualExec);
  const reference = lastStatement(referenceExec);

  if (actual.columns.length !== reference.columns.length) {
    return { match: false, reason: `Jumlah kolom hasil (${actual.columns.length}) tidak sesuai target (${reference.columns.length}). Kolom Anda: ${actual.columns.join(", ") || "-"}` };
  }
  if (checkColumnNames) {
    const colsOk = actual.columns.every((c, i) => c.toLowerCase() === reference.columns[i].toLowerCase());
    if (!colsOk) {
      return { match: false, reason: `Nama/urutan kolom belum sesuai. Diharapkan: ${reference.columns.join(", ")} — Anda: ${actual.columns.join(", ")}` };
    }
  }
  if (actual.values.length !== reference.values.length) {
    return { match: false, reason: `Jumlah baris hasil ${actual.values.length}, target ${reference.values.length} baris.` };
  }

  let a = actual.values.map((r) => r.map(normCell));
  let e = reference.values.map((r) => r.map(normCell));
  if (!orderSensitive) {
    a = [...a].sort((x, y) => rowKey(x).localeCompare(rowKey(y)));
    e = [...e].sort((x, y) => rowKey(x).localeCompare(rowKey(y)));
  }
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== e[i][j]) {
        return {
          match: false,
          reason: orderSensitive
            ? `Data baris ${i + 1} berbeda dari target (periksa juga urutan hasil, mis. ORDER BY).`
            : `Ada data yang tidak sesuai target pada hasil query.`,
        };
      }
    }
  }
  return { match: true };
}

function constructPresent(sql, token) {
  const upper = sql.toUpperCase();
  if (token === "SUBQUERY") {
    const matches = upper.match(/\bSELECT\b/g);
    return !!matches && matches.length >= 2;
  }
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(upper);
}

function checkConstructs(sql, list, mode) {
  if (!list || !list.length) return { ok: true, missing: [] };
  const missing = [];
  for (const c of list) {
    const present = constructPresent(sql, c);
    if (mode === "required" && !present) missing.push(c);
    if (mode === "forbidden" && present) missing.push(c);
  }
  return { ok: missing.length === 0, missing };
}

function efficiencyHeuristic(sql, stage) {
  if (!stage.efficiencyHint) return { score: 100, note: null };
  const upper = sql.toUpperCase().trim();
  if (stage.efficiencyHint === "expect-filter" && upper.startsWith("SELECT") && !/\bWHERE\b/.test(upper) && !/\bLIMIT\b/.test(upper)) {
    return { score: 70, note: "Query berjalan tanpa WHERE/LIMIT — pada dataset besar ini berpotensi full table scan." };
  }
  if (stage.efficiencyHint === "expect-index" && !/\bINDEX\b/.test(upper) && !/\bEXPLAIN\b/.test(upper)) {
    return { score: 85, note: null };
  }
  return { score: 100, note: null };
}

// Grades a `sql`-type stage. `execResult` is sandbox.run(sql) already
// executed by the caller so Run and Submit share one execution path.
export function gradeSqlStage(sandbox, sql, execResult, stage) {
  const weights = stage.weights || DEFAULT_WEIGHTS;

  // Some quests (e.g. proving a TRIGGER blocks bad data) are correct
  // precisely when the statement throws. Earlier statements in the same
  // submission (CREATE TRIGGER, etc.) already ran against the sandbox
  // before the failure, so state can still be validated.
  if (stage.expectFailure) {
    const check = stage.validate ? stage.validate(sandbox, execResult, sql) : { passed: true };
    const failedAsExpected = !execResult.ok;
    const correctness = failedAsExpected && check.passed ? 100 : 0;
    const message = !failedAsExpected
      ? "Statement seharusnya ditolak sistem (mis. oleh TRIGGER/constraint), tetapi berhasil dijalankan — periksa kembali logika Anda."
      : check.passed
      ? check.message || "Statement berhasil ditolak sesuai target — proteksi bekerja."
      : check.message || "Statement gagal seperti seharusnya, tetapi objek yang diminta belum terdeteksi dengan benar.";
    const req = checkConstructs(sql, stage.requiredConstructs, "required");
    const concept = req.ok ? 100 : Math.round(((stage.requiredConstructs.length - req.missing.length) / stage.requiredConstructs.length) * 100);
    const score = Math.round((correctness * weights.correctness + concept * weights.concept + 100 * weights.efficiency + 100 * weights.interpretation) / 100);
    const passed = score >= (stage.passThreshold || 80) && correctness === 100 && req.ok;
    return {
      passed,
      score,
      breakdown: { correctness, concept, efficiency: 100, interpretation: 100 },
      message: passed ? "Selesai — kriteria terpenuhi." : [message, !req.ok ? `Query wajib menggunakan: ${req.missing.join(", ")}.` : ""].filter(Boolean).join(" "),
      isError: false,
    };
  }

  if (!execResult.ok) {
    // Re-submitting SQL that already succeeded once (via an earlier Run or
    // Submit) is common for DDL/DML stages: CREATE TABLE/INDEX/TRIGGER/VIEW
    // and INSERT throw "already exists"/"UNIQUE constraint failed" the
    // second time, even though the statement itself is correct and the
    // resulting database state already matches the target. Don't penalize
    // that — fall back to checking the (unaffected, since the statement
    // didn't execute) current state against validate().
    const idempotencyConflict = /already exists|unique constraint failed|duplicate/i.test(execResult.error || "");
    if (stage.validate && idempotencyConflict) {
      const v = stage.validate(sandbox, execResult, sql);
      if (v.passed) {
        return finalizeScore(sql, stage, weights, 100, v.message || "State database sudah sesuai target (dari percobaan sebelumnya).");
      }
    }
    return {
      passed: false,
      score: 0,
      breakdown: { correctness: 0, concept: 0, efficiency: 0, interpretation: 0 },
      message: humanizeSqlError(execResult.error),
      isError: true,
    };
  }

  let correctness = 0;
  let message = "";

  if (stage.validate) {
    const v = stage.validate(sandbox, execResult, sql);
    correctness = v.passed ? 100 : 0;
    message = v.message || (v.passed ? "State database sesuai target." : "State database belum sesuai target.");
  } else if (stage.referenceSql) {
    const refExec = sandbox.run(stage.referenceSql);
    if (!refExec.ok) {
      correctness = 0;
      message = "Terjadi kendala internal saat memvalidasi (hubungi dosen/asisten).";
    } else {
      const cmp = compareLiveResults(execResult.results, refExec.results, {
        orderSensitive: !!stage.orderSensitive,
        checkColumnNames: !!stage.checkColumnNames,
      });
      correctness = cmp.match ? 100 : 0;
      message = cmp.match ? "Hasil query sesuai target." : cmp.reason;
    }
  } else {
    correctness = 100;
    message = "Query berhasil dijalankan.";
  }

  return { ...finalizeScore(sql, stage, weights, correctness, message), resultPreview: execResult.results };
}

// Shared scoring tail: given correctness (0/100) already decided by the
// caller, checks required/forbidden constructs + efficiency heuristic and
// combines everything into the final weighted score/pass verdict.
function finalizeScore(sql, stage, weights, correctness, message) {
  const req = checkConstructs(sql, stage.requiredConstructs, "required");
  const forb = checkConstructs(sql, stage.forbiddenConstructs, "forbidden");
  let concept = 100;
  if (stage.requiredConstructs && stage.requiredConstructs.length) {
    concept = Math.round(((stage.requiredConstructs.length - req.missing.length) / stage.requiredConstructs.length) * 100);
  }
  if (!forb.ok) concept = 0;

  const eff = efficiencyHeuristic(sql, stage);
  const interpretation = 100; // MVP simplification — see module header note.

  const score = Math.round(
    (correctness * weights.correctness + concept * weights.concept + eff.score * weights.efficiency + interpretation * weights.interpretation) / 100
  );

  const notes = [];
  if (correctness < 100) notes.push(message);
  if (!req.ok) notes.push(`Query wajib menggunakan: ${req.missing.join(", ")}.`);
  if (!forb.ok) notes.push(`Query tidak boleh menggunakan: ${forb.missing.join(", ")}.`);
  if (eff.note) notes.push(eff.note);

  const passed = score >= (stage.passThreshold || 80) && correctness === 100 && req.ok && forb.ok;

  return {
    passed,
    score,
    breakdown: { correctness, concept, efficiency: eff.score, interpretation },
    message: passed ? "Selesai — kriteria terpenuhi." : notes.filter(Boolean).join(" "),
    isError: false,
  };
}

export function gradeQuizStage(stage, selectedIndex) {
  const passed = selectedIndex === stage.correctIndex;
  return {
    passed,
    score: passed ? 100 : 0,
    breakdown: { correctness: passed ? 100 : 0, concept: 100, efficiency: 100, interpretation: 100 },
    message: passed ? stage.explainCorrect || "Jawaban tepat." : stage.explainWrong || "Belum tepat, coba tinjau kembali materi.",
  };
}
