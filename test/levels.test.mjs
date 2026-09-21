// Plays every level with the known-good solutions and checks the real
// grader accepts them; also checks that the untouched starter code and a
// deliberately wrong query do NOT pass (a quest that is already "solved"
// or accepts anything is as broken as one that rejects the right answer).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox, sqlStages, solutionFor, submit, sandboxBefore, MODEL_SOLUTIONS } from "./helpers.mjs";

const hasModelSolutions = Object.keys(MODEL_SOLUTIONS).length > 0;

for (const level of LEVELS) {
  test(`L${level.id} ${level.title}: correct solutions pass in order`, async (t) => {
    const sb = await new Sandbox(level.datasetSql).init();
    for (const stage of sqlStages(level)) {
      const sol = solutionFor(level, stage);
      if (!sol) {
        t.diagnostic(`skipped L${level.id}/${stage.id} (no model solution available locally)`);
        continue;
      }
      const { grade } = submit(sb, stage, sol);
      assert.equal(grade.passed, true, `L${level.id}/${stage.id} should pass; got: ${grade.message} (score ${grade.score})`);
      assert.ok(grade.score >= (stage.passThreshold || 80), `L${level.id}/${stage.id} score ${grade.score}`);
    }
  });

  test(`L${level.id} ${level.title}: resubmitting a correct solution still passes`, async (t) => {
    const sb = await new Sandbox(level.datasetSql).init();
    for (const stage of sqlStages(level)) {
      const sol = solutionFor(level, stage);
      if (!sol) continue;
      submit(sb, stage, sol);
      const again = submit(sb, stage, sol).grade;
      assert.equal(again.passed, true, `L${level.id}/${stage.id} resubmit: ${again.message}`);
    }
  });

  test(`L${level.id} ${level.title}: starter code does not pass by itself`, async () => {
    for (const stage of sqlStages(level)) {
      if (!solutionFor(level, stage)) continue;
      const sb = await sandboxBefore(level, stage);
      const { grade } = submit(sb, stage, stage.starterSql);
      assert.equal(grade.passed, false, `L${level.id}/${stage.id} passes with only its starter code`);
    }
  });

  test(`L${level.id} ${level.title}: a trivially wrong answer does not pass`, async () => {
    for (const stage of sqlStages(level)) {
      if (!solutionFor(level, stage)) continue;
      const sb = await sandboxBefore(level, stage);
      const { grade } = submit(sb, stage, "SELECT 1;");
      assert.equal(grade.passed, false, `L${level.id}/${stage.id} accepts "SELECT 1;"`);
    }
  });
}

test("validate()-graded stages are covered when the local answer key is present", { skip: !hasModelSolutions && "RAHASIA-kunci-jawaban/model-solutions.mjs not present" }, () => {
  for (const level of LEVELS) {
    for (const stage of sqlStages(level)) {
      if (stage.validate) assert.ok(MODEL_SOLUTIONS[`${level.id}:${stage.id}`], `model solution missing for L${level.id}/${stage.id}`);
    }
  }
});
