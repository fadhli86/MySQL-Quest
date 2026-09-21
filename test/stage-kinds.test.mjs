// Main path vs optional extras: classification, grouping and navigation, on the real content.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "./helpers.mjs";
import { isExtraStage, nextStageId, initialStageId } from "../js/stage-kinds.js";

test("every graded stage, concept check and practice stage is on the main path", () => {
  for (const level of LEVELS) {
    for (const stage of level.stages) {
      if (stage.graded) assert.equal(isExtraStage(stage), false, `L${level.id}/${stage.id} graded stages must never be optional`);
      if (stage.type === "practice" || stage.type === "reflect") assert.equal(isExtraStage(stage), false, `L${level.id}/${stage.id}`);
      if (stage.type === "quiz" && !stage.code) assert.equal(isExtraStage(stage), false, `L${level.id}/${stage.id}: plain concept quizzes stay on the path`);
    }
  }
});

test("debug, predict, Parsons and optimisation stages are the extras", () => {
  const extras = LEVELS.flatMap((l) => l.stages.filter(isExtraStage).map((s) => `${l.id}:${s.id}`));
  for (const key of ["5:p1", "5:z1", "5:d1", "5:d2", "6:p2", "7:z1", "8:d1", "11:o1", "11:o2", "14:o3"]) assert.ok(extras.includes(key), `${key} should be an extra`);
  assert.equal(extras.length, 7 + 4 + 5 + 3, "predict + parsons + debug + optimise");
});

test("in each level the extras form one contiguous group (the UI renders one collapsible group)", () => {
  for (const level of LEVELS) {
    const flags = level.stages.map(isExtraStage);
    const first = flags.indexOf(true);
    if (first < 0) continue;
    const last = flags.lastIndexOf(true);
    assert.ok(flags.slice(first, last + 1).every(Boolean), `L${level.id}: extras are not contiguous`);
  }
});

test("'next' from the main path skips the extras; from an extra it walks the group then rejoins the path", () => {
  const l5 = LEVELS.find((l) => l.id === 5);
  assert.equal(nextStageId(l5, "s1"), "q1");
  assert.equal(nextStageId(l5, "q2"), "s2", "concept check -> the graded quest, over 5 extras");
  assert.equal(nextStageId(l5, "p1"), "p2");
  assert.equal(nextStageId(l5, "z1"), "d1");
  assert.equal(nextStageId(l5, "d2"), "s2", "last extra rejoins the main path");
  assert.equal(nextStageId(l5, "s3"), null, "end of the level");
});

test("walking 'next' from the first stage visits only main-path stages, in order, in every level", () => {
  for (const level of LEVELS) {
    const visited = [];
    for (let id = level.stages[0].id; id; id = nextStageId(level, id)) {
      visited.push(id);
      assert.ok(visited.length <= level.stages.length, "no cycle");
    }
    assert.deepEqual(visited, level.stages.filter((s) => !isExtraStage(s)).map((s) => s.id), `L${level.id}`);
  }
});

test("entering a level lands on the first unfinished main-path stage, never on an extra", () => {
  const l6 = LEVELS.find((l) => l.id === 6);
  assert.equal(initialStageId(l6, () => false), "s1");
  assert.equal(initialStageId(l6, (id) => ["s1", "q1"].includes(id)), "q2");
  assert.equal(initialStageId(l6, (id) => ["s1", "q1", "q2"].includes(id)), "s2", "skips the unfinished extras");
  assert.equal(initialStageId(l6, () => true), "s4", "all done -> the last main-path stage");
  for (const level of LEVELS) assert.equal(isExtraStage(level.stages.find((s) => s.id === initialStageId(level, () => false))), false);
});
