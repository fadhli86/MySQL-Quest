// Efficiency judged by the query PLAN the engine really picks (EXPLAIN QUERY
// PLAN after the student's statements ran), not by looking at the SQL text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox, submit } from "./helpers.mjs";

const stageOf = (levelId, stageId) => {
  const level = LEVELS.find((l) => l.id === levelId);
  return { level, stage: level.stages.find((s) => s.id === stageId) };
};
const fresh = async (level) => new Sandbox(level.datasetSql).init();

// ---------------------------------------------------------------- L11 o1 / o2
test("L11/o1: the starter scans; an index plus the query afterwards passes", async () => {
  const { level, stage } = stageOf(11, "o1");
  const starter = submit(await fresh(level), stage, stage.starterSql).grade;
  assert.equal(starter.passed, false);
  assert.deepEqual(starter.plan.lines, ["SCAN enrollments"]);

  const ok = submit(await fresh(level), stage, "CREATE INDEX idx_enr_course ON enrollments(course_id);\nSELECT * FROM enrollments WHERE course_id = 101;").grade;
  assert.equal(ok.passed, true, ok.message);
  assert.match(ok.plan.lines.join(" "), /SEARCH enrollments USING INDEX idx_enr_course/);
  assert.equal(ok.breakdown.efficiency, 100);
});

test("L11/o1: an index but no query after it, or the index on the wrong column, does not pass", async () => {
  const { level, stage } = stageOf(11, "o1");
  const noQuery = submit(await fresh(level), stage, "CREATE INDEX idx_a ON enrollments(course_id);").grade;
  assert.equal(noQuery.passed, false);
  const wrongColumn = submit(await fresh(level), stage, "CREATE INDEX idx_b ON enrollments(semester);\nSELECT * FROM enrollments WHERE course_id = 101;").grade;
  assert.equal(wrongColumn.passed, false);
  assert.match(wrongColumn.plan.lines.join(" "), /SCAN/);
  assert.match(wrongColumn.message, /SCAN/);
});

test("L11/o1: the query must still return the right rows (an efficient wrong query fails)", async () => {
  const { level, stage } = stageOf(11, "o1");
  const g = submit(await fresh(level), stage, "CREATE INDEX idx_c ON enrollments(course_id);\nSELECT * FROM enrollments WHERE course_id = 102;").grade;
  assert.equal(g.passed, false);
  assert.equal(g.breakdown.efficiency, 100, "the plan is fine...");
  assert.equal(g.breakdown.correctness, 0, "...but the result is wrong");
});

test("L11/o2: it needs BOTH the index and a rewrite without UPPER()", async () => {
  const { level, stage } = stageOf(11, "o2");
  const both = "CREATE INDEX idx_city ON students(city);\nSELECT full_name FROM students WHERE city = 'Malang';";
  assert.equal(submit(await fresh(level), stage, both).grade.passed, true);
  assert.equal(submit(await fresh(level), stage, stage.starterSql).grade.passed, false, "starter");
  const indexOnly = submit(await fresh(level), stage, "CREATE INDEX idx_city ON students(city);\nSELECT full_name FROM students WHERE UPPER(city) = 'MALANG';").grade;
  assert.equal(indexOnly.passed, false, "an index can't help when the column is wrapped in a function");
  assert.deepEqual(indexOnly.plan.lines, ["SCAN students"]);
  const rewriteOnly = submit(await fresh(level), stage, "SELECT full_name FROM students WHERE city = 'Malang';").grade;
  assert.equal(rewriteOnly.passed, false, "no index yet");
});

// ---------------------------------------------------------------- L14 o3
test("L14/o3: ORDER BY needs an index so the engine stops sorting by hand", async () => {
  const { level, stage } = stageOf(14, "o3");
  const starter = submit(await fresh(level), stage, stage.starterSql).grade;
  assert.equal(starter.passed, false);
  assert.ok(starter.plan.lines.some((l) => /TEMP B-TREE/.test(l)));

  const ok = submit(await fresh(level), stage, "CREATE INDEX idx_gpa ON students(gpa);\nSELECT full_name, gpa FROM students ORDER BY gpa DESC LIMIT 3;").grade;
  assert.equal(ok.passed, true, ok.message);
  assert.ok(!ok.plan.lines.some((l) => /TEMP B-TREE/.test(l)));
});

// ---------------------------------------------------------------- L11 s3 (now judged by plan)
test("L11/s3: creating the index on the wrong column no longer earns full marks", async () => {
  const { level, stage } = stageOf(11, "s3");
  // right name and table (what validate() checks), wrong column: the lookup by dept_id still scans
  const g = submit(await fresh(level), stage, "CREATE INDEX idx_students_dept ON students(city);\nEXPLAIN QUERY PLAN SELECT * FROM students WHERE dept_id = 2;").grade;
  assert.equal(g.passed, false);
  assert.match(g.plan.lines.join(" "), /SCAN students/);
  const right = submit(await fresh(level), stage, "CREATE INDEX idx_students_dept ON students(dept_id);\nEXPLAIN QUERY PLAN SELECT * FROM students WHERE dept_id = 2;").grade;
  assert.equal(right.passed, true, right.message);
});

// ---------------------------------------------------------------- engine
test("plan-judged stages: a SQL error is reported as an error, not as a plan problem", async () => {
  const { level, stage } = stageOf(11, "o1");
  const g = submit(await fresh(level), stage, "CREATE INDEX idx_x ON enrollments(nope);").grade;
  assert.equal(g.passed, false);
  assert.equal(g.isError, true);
  assert.equal(g.plan, undefined);
});

test("every optimisation stage's starter fails, has a plan rule, and stays ungraded", () => {
  for (const level of LEVELS) {
    for (const stage of level.stages.filter((s) => s.plan && !s.graded)) {
      assert.ok(stage.plan.mustMatch || stage.plan.mustNotMatch, `L${level.id}/${stage.id}: plan needs a rule`);
      assert.ok(stage.plan.hintOnFail, `L${level.id}/${stage.id}: plan needs an explanation for when it fails`);
      assert.ok(stage.requiredConstructs.includes("CREATE INDEX"), `L${level.id}/${stage.id}: requires CREATE INDEX`);
    }
  }
});
