// Focused unit tests of grading behaviour that quests rely on: what counts
// as "same result", the mismatch diff shown to students, concept checks,
// and the idempotent-resubmit rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Sandbox, gradeQuizStage, submit } from "./helpers.mjs";
import { shuffledOptionOrder } from "../js/quiz-utils.js";

const DATA = `
CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT, score REAL);
INSERT INTO t VALUES (1,'Ani',90),(2,'Budi',70),(3,'Citra',80),(4,'Dedi',70);
`;
const fresh = () => new Sandbox(DATA).init();
const stage = (over) => ({ id: "x", type: "sql", graded: true, xp: 10, referenceSql: "SELECT name, score FROM t WHERE score >= 80;", ...over });

test("same rows in a different order pass when order does not matter", async () => {
  const sb = await fresh();
  const { grade } = submit(sb, stage({}), "SELECT name, score FROM t WHERE score >= 80 ORDER BY name DESC;");
  assert.equal(grade.passed, true);
  assert.equal(grade.diff, null);
});

test("order-sensitive stage: right data, wrong order is reported as order-only", async () => {
  const sb = await fresh();
  const s = stage({ orderSensitive: true, referenceSql: "SELECT name FROM t ORDER BY score DESC, name;" });
  const { grade } = submit(sb, s, "SELECT name FROM t ORDER BY score, name;");
  assert.equal(grade.passed, false);
  assert.equal(grade.diff.orderOnly, true);
  assert.match(grade.message, /urutan/);
});

test("mismatch diff lists missing and extra rows", async () => {
  const sb = await fresh();
  // target: Ani, Citra. Student returns Ani and Budi (same row count).
  const { grade } = submit(sb, stage({}), "SELECT name, score FROM t WHERE id IN (1,2);");
  assert.equal(grade.passed, false);
  assert.equal(grade.diff.missingRows.length, 1);
  assert.equal(grade.diff.missingRows[0][0], "Citra");
  assert.equal(grade.diff.extraRows[0][0], "Budi");
  assert.equal(grade.diff.missingTotal, 1);
  assert.equal(grade.diff.extraTotal, 1);
});

test("diff rows are capped for display but totals stay true", async () => {
  const inserts = Array.from({ length: 20 }, (_, i) => `INSERT INTO n VALUES (${i});`).join("");
  const sb = await new Sandbox(`CREATE TABLE n (v INTEGER); ${inserts}`).init();
  const { grade } = submit(sb, stage({ referenceSql: "SELECT v FROM n;" }), "SELECT v + 100 FROM n;");
  assert.equal(grade.diff.missingRows.length, 5);
  assert.equal(grade.diff.missingTotal, 20);
  assert.equal(grade.diff.extraTotal, 20);
});

test("wrong column count is reported with both column lists", async () => {
  const sb = await fresh();
  const { grade } = submit(sb, stage({}), "SELECT name FROM t WHERE score >= 80;");
  assert.equal(grade.passed, false);
  assert.deepEqual(grade.diff.expectedColumns, ["name", "score"]);
  assert.deepEqual(grade.diff.actualColumns, ["name"]);
  assert.equal(grade.diff.columnsOnly, true);
  assert.equal(grade.diff.missingRows.length + grade.diff.extraRows.length, 0, "no noisy row diff when widths differ");
});

test("checkColumnNames rejects an alias that differs from the target", async () => {
  const sb = await fresh();
  const s = stage({ checkColumnNames: true, referenceSql: "SELECT AVG(score) AS rata FROM t;" });
  assert.equal(submit(sb, s, "SELECT AVG(score) AS rata FROM t;").grade.passed, true);
  assert.equal(submit(sb, s, "SELECT AVG(score) AS avg_score FROM t;").grade.passed, false);
});

test("right data but a required construct missing does not pass", async () => {
  const sb = await fresh();
  const s = stage({ requiredConstructs: ["WHERE"] });
  assert.equal(submit(sb, s, "SELECT name, score FROM t WHERE score >= 80;").grade.passed, true);
  const noWhere = submit(sb, s, "SELECT name, score FROM t GROUP BY id HAVING score >= 80;").grade;
  assert.equal(noWhere.passed, false);
  assert.match(noWhere.message, /WHERE/);
});

test("forbidden construct fails even with the right result", async () => {
  const sb = await fresh();
  const s = stage({ forbiddenConstructs: ["DISTINCT"] });
  const r = submit(sb, s, "SELECT DISTINCT name, score FROM t WHERE score >= 80;").grade;
  assert.equal(r.passed, false);
  assert.match(r.message, /DISTINCT/);
});

test("SQL errors are reported as errors with a humanized message", async () => {
  const sb = await fresh();
  const r = submit(sb, stage({}), "SELECT name FROM nope;").grade;
  assert.equal(r.passed, false);
  assert.equal(r.isError, true);
  assert.match(r.message, /Tabel "nope" tidak ditemukan/);
});

test("validate()-stage: re-submitting a correct CREATE TABLE is not penalized", async () => {
  const sb = await fresh();
  const s = { id: "v", type: "sql", graded: true, xp: 10, validate: (box) => ({ passed: box.tableExists("k") }), requiredConstructs: ["CREATE TABLE"] };
  const sql = "CREATE TABLE k (a INTEGER);";
  assert.equal(submit(sb, s, sql).grade.passed, true);
  assert.equal(submit(sb, s, sql).grade.passed, true);
  // multi-statement submission with a redundant CREATE inside
  assert.equal(submit(sb, s, `${sql} INSERT INTO k VALUES (1);`).grade.passed, true);
});

test("validate()-stage: a real syntax error inside a multi-statement submit still fails", async () => {
  const sb = await fresh();
  const s = { id: "v", type: "sql", graded: true, xp: 10, validate: (box) => ({ passed: box.tableExists("k") }) };
  const r = submit(sb, s, "CREATE TABLE k (a INTEGER); INSERT INTO k VALUS (1);").grade;
  assert.equal(r.isError, true);
});

test("components a stage cannot assess are null, hidden from the score, and do not dilute it", async () => {
  const sb = await fresh();
  const plain = submit(sb, stage({}), "SELECT name, score FROM t WHERE score >= 80;").grade;
  assert.equal(plain.breakdown.efficiency, null);
  assert.equal(plain.breakdown.interpretation, null);
  assert.equal(plain.score, 100);
  // a wrong-construct answer with correct data loses score only via concept, not via phantom 100s
  const s = stage({ requiredConstructs: ["ORDER BY", "LIMIT"] });
  const half = submit(sb, s, "SELECT name, score FROM t WHERE score >= 80 ORDER BY name;").grade;
  assert.equal(half.breakdown.concept, 50);
  assert.equal(half.score, Math.round((100 * 50 + 50 * 20) / 70));
});

test("efficiency counts only on stages that declare efficiencyHint", async () => {
  const sb = await fresh();
  const s = stage({ efficiencyHint: "expect-filter", referenceSql: "SELECT name FROM t;" });
  const r = submit(sb, s, "SELECT name FROM t;").grade;
  assert.equal(r.breakdown.efficiency, 70);
  assert.equal(r.score, Math.round((100 * 50 + 100 * 20 + 70 * 15) / 85));
});

test("quiz: a wrong pick gets the explanation written for that option", () => {
  const q = { correctIndex: 0, explainCorrect: "ok", explainWrong: "generic", explainWrongByOption: [null, "why B is wrong", "why C is wrong"] };
  assert.equal(gradeQuizStage(q, 1).message, "why B is wrong");
  assert.equal(gradeQuizStage(q, 2).message, "why C is wrong");
  assert.equal(gradeQuizStage({ ...q, explainWrongByOption: undefined }, 1).message, "generic");
  assert.equal(gradeQuizStage(q, 0).message, "ok");
});

test("quiz grading uses the original option index", () => {
  const q = { correctIndex: 0, explainCorrect: "ok", explainWrong: "no" };
  assert.equal(gradeQuizStage(q, 0).passed, true);
  assert.equal(gradeQuizStage(q, 2).passed, false);
});

test("quiz option order: a permutation, stable per seed, varies across seeds", () => {
  const a = shuffledOptionOrder(4, "1:s2:Ani");
  assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
  assert.deepEqual(shuffledOptionOrder(4, "1:s2:Ani"), a, "stable for the same seed");
  const firsts = new Set(Array.from({ length: 40 }, (_, i) => shuffledOptionOrder(4, `1:s2:student${i}`)[0]));
  assert.ok(firsts.size >= 3, "the answer does not always land in the same position");
});

test("getSchemaMap lists tables and views with their columns (for autocomplete)", async () => {
  const sb = await fresh();
  sb.run("CREATE VIEW v_top AS SELECT name FROM t WHERE score > 80;");
  const map = sb.getSchemaMap();
  assert.deepEqual(map.t, ["id", "name", "score"]);
  assert.deepEqual(map.v_top, ["name"]);
  assert.ok(!Object.keys(map).some((k) => k.startsWith("sqlite_")));
});
