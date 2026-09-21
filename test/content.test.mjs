// Structural checks on level content — catches typos that would silently
// break a quest (bad quiz index, missing hints, dataset that won't load).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox, sqlStages, solutionFor } from "./helpers.mjs";
import { MYSQL_NOTES } from "../js/mysql-notes.js";

test("there are 14 levels with sequential ids", () => {
  assert.deepEqual(LEVELS.map((l) => l.id), Array.from({ length: 14 }, (_, i) => i + 1));
});

for (const level of LEVELS) {
  test(`L${level.id} ${level.title}: stage structure`, () => {
    assert.ok(level.stages.length > 0, "level has stages");
    const ids = level.stages.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, "stage ids are unique");
    for (const s of level.stages) {
      const where = `L${level.id}/${s.id}`;
      assert.ok(s.title, `${where}: title`);
      assert.ok(Number.isFinite(s.xp), `${where}: xp`);
      if (s.type === "quiz") {
        assert.ok(Array.isArray(s.options) && s.options.length >= 2, `${where}: options`);
        assert.ok(Number.isInteger(s.correctIndex) && s.correctIndex >= 0 && s.correctIndex < s.options.length, `${where}: correctIndex in range`);
        assert.ok(s.explainCorrect, `${where}: explainCorrect`);
        // A wrong pick should be told *why* that option is wrong, not just "wrong".
        assert.equal(s.explainWrongByOption?.length, s.options.length, `${where}: explainWrongByOption aligned with options`);
        s.options.forEach((_, i) => {
          if (i !== s.correctIndex) assert.ok(s.explainWrongByOption[i], `${where}: explanation for wrong option ${i}`);
        });
      }
      if (s.type === "sql") {
        assert.ok(s.instruction, `${where}: instruction`);
        assert.ok(s.referenceSql || s.validate, `${where}: needs referenceSql or validate()`);
        assert.ok(Array.isArray(s.hints) && s.hints.length >= 1, `${where}: hints`);
        assert.ok(typeof s.starterSql === "string", `${where}: starterSql`);
      }
    }
  });

  // level.tables may name tables the student creates during the level (the
  // Schema panel skips ones that don't exist yet), so those must exist once
  // the level's solutions have been applied. Without the local answer key
  // only "the dataset loads" can be checked.
  test(`L${level.id} ${level.title}: dataset loads, declared tables exist`, async () => {
    const sb = await new Sandbox(level.datasetSql).init();
    const stages = sqlStages(level);
    if (!stages.every((s) => solutionFor(level, s))) return;
    for (const s of stages) sb.runTolerant(solutionFor(level, s));
    const missing = level.tables.filter((tbl) => !sb.tableExists(tbl));
    assert.deepEqual(missing, [], `declared tables missing: ${missing.join(", ")}`);
  });
}

test("every level has MySQL-vs-sandbox notes with both sides filled in", () => {
  for (const level of LEVELS) {
    const notes = MYSQL_NOTES[level.id];
    assert.ok(Array.isArray(notes) && notes.length >= 1, `L${level.id}: has notes`);
    for (const n of notes) {
      assert.ok(n.topic && n.sandbox && n.mysql, `L${level.id} "${n.topic}": topic, sandbox and mysql are required`);
    }
  }
  assert.deepEqual(Object.keys(MYSQL_NOTES).map(Number).sort((a, b) => a - b), LEVELS.map((l) => l.id), "no notes for unknown levels");
});

test("debug stages: ungraded, with a buggy starter that differs from the fix", () => {
  const debugStages = LEVELS.flatMap((l) => l.stages.filter((s) => s.debug).map((s) => ({ l, s })));
  assert.ok(debugStages.length >= 1, "there are debug stages");
  for (const { l, s } of debugStages) {
    const where = `L${l.id}/${s.id}`;
    assert.equal(s.type, "sql", `${where}: is an sql stage`);
    assert.equal(s.graded, false, `${where}: debug stages must not affect mastery`);
    assert.ok(s.starterSql.trim() && s.referenceSql, `${where}: starter (buggy) and referenceSql (fixed)`);
    assert.notEqual(s.starterSql.replace(/\s+/g, " ").trim(), s.referenceSql.replace(/\s+/g, " ").trim(), `${where}: starter must actually be buggy`);
    assert.ok(s.hints.length >= 2, `${where}: hints`);
  }
});
