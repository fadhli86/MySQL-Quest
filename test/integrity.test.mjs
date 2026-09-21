// Progress-file integrity: signing, evidence capture, lecturer-side re-grading.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox, gradeSqlStage, sqlStages, solutionFor } from "./helpers.mjs";
import { verifySignature, checkXpConsistency, hasEvidence, stable } from "../js/integrity.js";
import { replayVerify, timingFindings, findSimilar, integrityStatus, normalizeSql } from "../js/verify-progress.js";

const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const S = await import("../js/state.js");

// Plays a level the way the game does: run the SQL, grade it, record the result.
function play(level, stage, sb, sql) {
  const exec = sb.runTolerant(sql);
  const grade = gradeSqlStage(sb, sql, exec, stage);
  S.submitStageResult(level, stage, sql, grade);
  return grade;
}

async function playerWith(levelIds) {
  S.resetAllProgress();
  S.setStudentName("Uji Coba");
  S.setStudentNim("2026001");
  for (const id of levelIds) {
    const level = LEVELS.find((l) => l.id === id);
    const sb = await new Sandbox(level.datasetSql).init();
    for (const stage of sqlStages(level)) {
      const sol = solutionFor(level, stage);
      if (sol) play(level, stage, sb, sol);
    }
  }
  return S.getState();
}

test("passing a stage records the SQL, when it passed and when it was first tried", async () => {
  await playerWith([5]);
  const sp = S.getState().levels[5].stages.s2;
  assert.equal(sp.status, "passed");
  assert.match(sp.passedSql, /gpa/i);
  assert.ok(sp.passedAt >= sp.firstAt && sp.firstAt > 0);
});

test("the first passing SQL is kept even if the stage is passed again later", async () => {
  await playerWith([5]);
  const level = LEVELS.find((l) => l.id === 5);
  const stage = level.stages.find((s) => s.id === "s2");
  const first = S.getState().levels[5].stages.s2.passedSql;
  const sb = await new Sandbox(level.datasetSql).init();
  play(level, stage, sb, `${first} -- again`);
  assert.equal(S.getState().levels[5].stages.s2.passedSql, first);
});

test("a signed export verifies; any edit to XP, a stage, or the SQL breaks it", async () => {
  await playerWith([5, 6]);
  const file = JSON.parse(await S.exportSignedProgressJson());
  assert.equal(file.integrity.alg, "HMAC-SHA256");
  assert.equal(await verifySignature(file), "valid");

  const bumpXp = structuredClone(file);
  bumpXp.xp += 500;
  assert.equal(await verifySignature(bumpXp), "invalid");

  const flipStage = structuredClone(file);
  flipStage.levels[6].stages.s3.status = "attempted";
  assert.equal(await verifySignature(flipStage), "invalid");

  const swapSql = structuredClone(file);
  swapSql.levels[5].stages.s2.passedSql = "SELECT 1;";
  assert.equal(await verifySignature(swapSql), "invalid");

  const noSig = structuredClone(file);
  delete noSig.integrity;
  assert.equal(await verifySignature(noSig), "missing");
});

test("things that don't affect the grade (drafts, portfolio) don't break the signature", async () => {
  await playerWith([5]);
  const file = JSON.parse(await S.exportSignedProgressJson());
  file.drafts = { "5:s2": "whatever I typed" };
  file.portfolio = [];
  assert.equal(await verifySignature(file), "valid");
});

test("XP must match the XP log; importing a file drops its integrity block from live state", async () => {
  await playerWith([5]);
  const file = JSON.parse(await S.exportSignedProgressJson());
  assert.equal(checkXpConsistency(file).ok, true);
  file.xp += 1000;
  const check = checkXpConsistency(file);
  assert.equal(check.ok, false);
  assert.equal(check.xp - check.logged, 1000);

  const good = await S.exportSignedProgressJson();
  S.importProgressJson(good);
  assert.equal("integrity" in S.getState(), false);
});

test("stable() ignores key order", () => {
  assert.equal(stable({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }), stable({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }));
});

test("replay: an honestly played save re-grades clean, at any level with an available answer", async () => {
  const state = await playerWith(LEVELS.map((l) => l.id));
  assert.ok(hasEvidence(state));
  const { findings, summary } = await replayVerify(state.levels);
  assert.deepEqual(findings, [], JSON.stringify(findings));
  assert.equal(summary.fail, 0);
  assert.equal(summary.noEvidence, 0);
  assert.ok(summary.ok >= 10, `expected many stages checked, got ${summary.ok}`);
});

test("replay: a pass with no working SQL behind it is caught, whether wrong or missing", async () => {
  const state = structuredClone(await playerWith([5, 6]));
  state.levels[5].stages.s2.passedSql = "SELECT 1;"; // claims a pass with an answer that doesn't work
  delete state.levels[6].stages.s3.passedSql; // claims a pass with no evidence at all
  const { findings, summary } = await replayVerify(state.levels);
  assert.equal(summary.fail, 1);
  assert.equal(summary.noEvidence, 1);
  assert.deepEqual(findings.map((f) => `${f.levelId}:${f.stageId}:${f.verdict}`).sort(), ["5:s2:fail", "6:s3:no-evidence"]);
});

test("replay: an edited status alone (no SQL) is what a hand-edited JSON looks like", async () => {
  const state = structuredClone(await playerWith([5]));
  state.levels[7] = { status: "in_progress", mastery: 100, stages: { s2: { status: "passed", bestScore: 100, attempts: 1 } } };
  const { summary } = await replayVerify(state.levels);
  assert.equal(summary.noEvidence, 1);
});

test("timing: a long answer that passed seconds after the previous stage is noted; a slow pace is not", () => {
  const sql = "SELECT full_name, gpa FROM students WHERE gpa > 3.3 ORDER BY gpa DESC;";
  const at = 1_700_000_000_000;
  const fast = { 5: { stages: { s2: { passedAt: at, passedSql: sql }, s3: { passedAt: at + 4000, passedSql: sql } } } };
  const slow = { 5: { stages: { s2: { passedAt: at, passedSql: sql }, s3: { passedAt: at + 90_000, passedSql: sql } } } };
  assert.deepEqual(timingFindings(fast).map((f) => f.stageId), ["s3"]);
  assert.deepEqual(timingFindings(slow), []);
});

test("similarity: long identical answers group students; short or different ones don't", () => {
  const long = "CREATE TABLE course_x (id INTEGER PRIMARY KEY, name TEXT NOT NULL, credits INTEGER, dept_id INTEGER);";
  const mk = (name, sql) => ({ id: name, studentName: name, levels: { 3: { stages: { s2: { passedSql: sql } } } } });
  const groups = findSimilar([mk("Ani", long), mk("Budi", long.toLowerCase().replace(/ +/g, "  ")), mk("Citra", "SELECT 1;"), mk("Dedi", long + " -- lain")]);
  assert.equal(groups.length, 1);
  assert.deepEqual([...new Set(groups[0].students)].sort(), ["Ani", "Budi", "Dedi"]);
  assert.equal(findSimilar([mk("Ani", "SELECT 1;"), mk("Budi", "SELECT 1;")]).length, 0, "short answers coincide by chance");
  assert.equal(normalizeSql("SELECT  a ,b\nFROM t ; -- x"), "select a,b from t");
});

test("status badge: legacy, pending, ok, and each reason to review", () => {
  const base = { signature: "valid", xpOk: true, hasEvidence: true };
  const clean = { summary: { checked: 3, ok: 3, fail: 0, noEvidence: 0 }, findings: [], timing: [] };
  assert.equal(integrityStatus({ integrity: { ...base, hasEvidence: false, signature: "missing" } }).code, "legacy");
  assert.equal(integrityStatus({ integrity: base }).code, "pending");
  assert.equal(integrityStatus({ integrity: base, verify: clean }).code, "ok");
  assert.equal(integrityStatus({ integrity: { ...base, signature: "invalid" }, verify: clean }).code, "review");
  assert.equal(integrityStatus({ integrity: { ...base, signature: "missing" }, verify: clean }).code, "review", "evidence but signature stripped");
  assert.equal(integrityStatus({ integrity: { ...base, xpOk: false } }).code, "review");
  assert.equal(integrityStatus({ integrity: base, verify: { ...clean, summary: { ...clean.summary, ok: 2, fail: 1 } } }).code, "review");
  assert.match(integrityStatus({ integrity: { ...base, signature: "invalid" } }).reasons.join(" "), /diubah/);
  assert.equal(integrityStatus({ integrity: { ...base, signature: "unavailable" }, verify: clean }).code, "ok");
});
