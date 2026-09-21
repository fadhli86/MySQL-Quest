// Auto-grading engine.
//
// Design follows the blueprint's principle: never diff SQL as raw text.
// Correctness is decided by running the quest's own reference SQL against
// the *same* live sandbox and comparing its result set to what the
// student's query produced (stage.referenceSql) — or, for DDL/DML/trigger
// stages, by a custom state validator (stage.validate) that inspects the
// database after the student's statement executed. Concept coverage is
// checked via required/forbidden SQL constructs. Two more components from
// the blueprint's rubric — efficiency and interpretation — are only scored
// when a stage can actually assess them: efficiency via a lightweight
// heuristic on stages that declare `efficiencyHint` (not a full query-plan
// analysis — out of scope for a static deployment), interpretation not at
// all yet (needs NLP/rubric review). Components a stage cannot assess are
// `null` in the breakdown, hidden in the UI, and excluded from the weighted
// score — a constant 100 would make the score look more thorough than it is.
import { humanizeSqlError, splitStatements } from "./sandbox.js";

const DEFAULT_WEIGHTS = { correctness: 50, concept: 20, efficiency: 15, interpretation: 15 };

// Weighted average over the components that were actually assessed
// (non-null), re-normalized so skipped components don't dilute the score.
function weightedScore(parts, weights) {
  let sum = 0;
  let total = 0;
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    if (parts[key] === null || parts[key] === undefined) continue;
    sum += parts[key] * weights[key];
    total += weights[key];
  }
  return total ? Math.round(sum / total) : 0;
}

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

const DIFF_ROW_LIMIT = 5;

// Multiset difference of two row lists (rows compared by normalized cell
// values): rows the target has that the student's result lacks, and rows
// the student produced that the target doesn't have. Used to show the
// student *what* differs instead of only "row 3 is different".
function diffRows(actualRows, expectedRows) {
  const counts = new Map();
  for (const r of expectedRows) counts.set(rowKey(r), (counts.get(rowKey(r)) || 0) + 1);
  const extra = [];
  for (const r of actualRows) {
    const k = rowKey(r);
    const c = counts.get(k) || 0;
    if (c > 0) counts.set(k, c - 1);
    else extra.push(r);
  }
  const missing = [];
  for (const r of expectedRows) {
    const k = rowKey(r);
    const c = counts.get(k) || 0;
    if (c > 0) {
      counts.set(k, c - 1);
      missing.push(r);
    }
  }
  return { missing, extra };
}

// Compares two live sql.js exec() results (actual vs reference). On a
// mismatch, `diff` carries a bounded, display-ready description of what is
// different (columns, missing rows, extra rows) for the Result panel.
function compareLiveResults(actualExec, referenceExec, { orderSensitive, checkColumnNames } = {}) {
  const actual = lastStatement(actualExec);
  const reference = lastStatement(referenceExec);

  const a = actual.values.map((r) => r.map(normCell));
  const e = reference.values.map((r) => r.map(normCell));
  const { missing, extra } = diffRows(a, e);
  const diff = {
    expectedColumns: reference.columns,
    actualColumns: actual.columns,
    expectedRowCount: e.length,
    actualRowCount: a.length,
    missingRows: missing.slice(0, DIFF_ROW_LIMIT),
    extraRows: extra.slice(0, DIFF_ROW_LIMIT),
    missingTotal: missing.length,
    extraTotal: extra.length,
  };
  const fail = (reason, overrides = {}) => ({ match: false, reason, diff: { ...diff, ...overrides } });

  if (actual.columns.length !== reference.columns.length) {
    // Rows of different width can't be compared meaningfully (every row would
    // show as missing + extra), so only the column difference is reported.
    return fail(`Jumlah kolom hasil (${actual.columns.length}) tidak sesuai target (${reference.columns.length}). Kolom Anda: ${actual.columns.join(", ") || "-"}`, {
      columnsOnly: true,
      missingRows: [],
      extraRows: [],
      missingTotal: 0,
      extraTotal: 0,
    });
  }
  if (checkColumnNames) {
    const colsOk = actual.columns.every((c, i) => c.toLowerCase() === reference.columns[i].toLowerCase());
    if (!colsOk) {
      return fail(`Nama/urutan kolom belum sesuai. Diharapkan: ${reference.columns.join(", ")} — Anda: ${actual.columns.join(", ")}`);
    }
  }
  if (a.length !== e.length) {
    return fail(`Jumlah baris hasil ${a.length}, target ${e.length} baris.`);
  }
  if (missing.length || extra.length) {
    return fail("Ada data yang tidak sesuai target pada hasil query.");
  }
  if (orderSensitive) {
    for (let i = 0; i < a.length; i++) {
      if (rowKey(a[i]) !== rowKey(e[i])) {
        return fail(`Data yang dihasilkan sudah benar, tetapi urutan baris belum sesuai (baris ${i + 1} berbeda) — periksa ORDER BY.`, { orderOnly: true });
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

// The last SELECT of a submission (an `EXPLAIN QUERY PLAN` / `EXPLAIN` prefix
// is stripped), i.e. the query whose plan an optimisation challenge judges.
function lastSelect(sql) {
  const statements = splitStatements(sql);
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i].replace(/^\s*EXPLAIN(\s+QUERY\s+PLAN)?\s+/i, "").trim();
    if (/^(SELECT|WITH)\b/i.test(stmt)) return stmt.replace(/;+\s*$/, "");
  }
  return null;
}

// Real efficiency for optimisation challenges: judge the query PLAN the engine
// actually chooses (after the student's statements, e.g. CREATE INDEX, ran),
// not the query text. stage.plan = { query?, mustMatch?, mustNotMatch?, hintOnFail? }
// — `query` fixes the SELECT to analyse; otherwise the submission's last SELECT is used.
function evaluatePlan(sandbox, sql, plan) {
  const target = plan.query || lastSelect(sql);
  if (!target) return { ok: false, lines: [], note: "Tidak ada query SELECT di akhir jawaban Anda untuk dianalisis rencana eksekusinya — jalankan query-nya setelah membuat index." };
  const lines = sandbox.explainPlan(target);
  if (!lines) return { ok: false, lines: [], note: "Rencana eksekusi query ini tidak dapat dibaca." };
  const text = lines.join("\n");
  const matches = !plan.mustMatch || new RegExp(plan.mustMatch, "i").test(text);
  const clean = !plan.mustNotMatch || !new RegExp(plan.mustNotMatch, "i").test(text);
  const ok = matches && clean;
  return { ok, lines, query: target, note: ok ? null : plan.hintOnFail || "Rencana eksekusi belum efisien." };
}

function efficiencyHeuristic(sql, stage) {
  if (!stage.efficiencyHint) return { score: null, note: null }; // not assessed
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
    const breakdown = { correctness, concept, efficiency: null, interpretation: null };
    const score = weightedScore(breakdown, weights);
    const passed = score >= (stage.passThreshold || 80) && correctness === 100 && req.ok;
    return {
      passed,
      score,
      breakdown,
      message: passed ? "Selesai — kriteria terpenuhi." : [message, !req.ok ? `Query wajib menggunakan: ${req.missing.join(", ")}.` : ""].filter(Boolean).join(" "),
      isError: false,
    };
  }

  const plan = stage.plan && execResult.ok ? evaluatePlan(sandbox, sql, stage.plan) : null;

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
      breakdown: { correctness: 0, concept: 0, efficiency: stage.efficiencyHint ? 0 : null, interpretation: null },
      message: humanizeSqlError(execResult.error),
      isError: true,
    };
  }

  let correctness = 0;
  let message = "";
  let diff = null;

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
      diff = cmp.match ? null : cmp.diff;
    }
  } else {
    correctness = 100;
    message = "Query berhasil dijalankan.";
  }

  return { ...finalizeScore(sql, stage, weights, correctness, message, plan), resultPreview: execResult.results, diff };
}

// Shared scoring tail: given correctness (0/100) already decided by the
// caller, checks required/forbidden constructs + efficiency heuristic and
// combines everything into the final weighted score/pass verdict.
function finalizeScore(sql, stage, weights, correctness, message, plan = null) {
  const req = checkConstructs(sql, stage.requiredConstructs, "required");
  const forb = checkConstructs(sql, stage.forbiddenConstructs, "forbidden");
  let concept = 100;
  if (stage.requiredConstructs && stage.requiredConstructs.length) {
    concept = Math.round(((stage.requiredConstructs.length - req.missing.length) / stage.requiredConstructs.length) * 100);
  }
  if (!forb.ok) concept = 0;

  // A plan-judged stage assesses efficiency for real (and must pass it); others fall back to the light heuristic.
  const eff = plan ? { score: plan.ok ? 100 : 0, note: plan.ok ? null : plan.note } : efficiencyHeuristic(sql, stage);
  const breakdown = { correctness, concept, efficiency: eff.score, interpretation: null };
  const score = weightedScore(breakdown, weights);

  const notes = [];
  if (correctness < 100) notes.push(message);
  if (!req.ok) notes.push(`Query wajib menggunakan: ${req.missing.join(", ")}.`);
  if (!forb.ok) notes.push(`Query tidak boleh menggunakan: ${forb.missing.join(", ")}.`);
  if (eff.note) notes.push(eff.note);

  const passed = score >= (stage.passThreshold || 80) && correctness === 100 && req.ok && forb.ok && (!plan || plan.ok);

  return {
    passed,
    score,
    plan: plan || undefined,
    breakdown,
    message: passed ? "Selesai — kriteria terpenuhi." : notes.filter(Boolean).join(" "),
    isError: false,
  };
}

export function gradeQuizStage(stage, selectedIndex) {
  const passed = selectedIndex === stage.correctIndex;
  return {
    passed,
    score: passed ? 100 : 0,
    breakdown: { correctness: passed ? 100 : 0, concept: null, efficiency: null, interpretation: null },
    // Prefer the explanation written for the specific wrong option chosen
    // (explainWrongByOption is indexed like `options`), then the generic one.
    message: passed
      ? stage.explainCorrect || "Jawaban tepat."
      : (stage.explainWrongByOption && stage.explainWrongByOption[selectedIndex]) || stage.explainWrong || "Belum tepat, coba tinjau kembali materi.",
  };
}
