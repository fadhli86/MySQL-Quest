// Parsons ("susun potongan SQL") puzzles: the intended order must pass, and every
// decoy must break the query wherever it is inserted — otherwise a puzzle
// either can't be solved or can be solved by including everything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox } from "./helpers.mjs";
import { gradeParsons, assembleSql } from "../js/parsons.js";

const puzzles = LEVELS.flatMap((level) => level.stages.filter((s) => s.type === "parsons").map((stage) => ({ level, stage })));

test("there are Parsons puzzles", () => assert.ok(puzzles.length >= 4));

for (const { level, stage } of puzzles) {
  const where = `L${level.id}/${stage.id}`;
  const decoys = stage.pieces.map((_, i) => i).filter((i) => !stage.solution.includes(i));
  const fresh = () => new Sandbox(level.datasetSql).init();

  test(`${where}: structure`, () => {
    assert.ok(stage.instruction && stage.explainCorrect && stage.referenceSql, "instruction, explainCorrect, referenceSql");
    assert.ok(stage.graded === false && stage.xp > 0, "ungraded, gives XP");
    assert.ok(stage.pieces.length >= 5 && stage.pieces.every((p) => typeof p === "string" && p.trim()), "at least 5 non-empty pieces");
    assert.equal(new Set(stage.solution).size, stage.solution.length, "solution indices unique");
    assert.ok(stage.solution.every((i) => Number.isInteger(i) && i >= 0 && i < stage.pieces.length), "solution indices in range");
    assert.ok(decoys.length >= 1, "has at least one decoy");
  });

  test(`${where}: the intended order passes`, async () => {
    const r = gradeParsons(await fresh(), stage, stage.solution);
    assert.equal(r.passed, true, r.message);
    assert.equal("diff" in r, false, "the expected-rows diff is not exposed");
  });

  test(`${where}: identical pieces are interchangeable`, async () => {
    const byText = new Map();
    stage.solution.forEach((idx, pos) => byText.set(stage.pieces[idx], [...(byText.get(stage.pieces[idx]) || []), pos]));
    for (const [, positions] of byText) {
      if (positions.length < 2) continue;
      const swapped = [...stage.solution];
      [swapped[positions[0]], swapped[positions[1]]] = [swapped[positions[1]], swapped[positions[0]]];
      assert.equal(gradeParsons(await fresh(), stage, swapped).passed, true);
    }
  });

  test(`${where}: reversed, empty and partial arrangements fail`, async () => {
    assert.equal(gradeParsons(await fresh(), stage, [...stage.solution].reverse()).passed, false, "reversed");
    assert.equal(gradeParsons(await fresh(), stage, []).passed, false, "empty");
    assert.equal(gradeParsons(await fresh(), stage, stage.solution.slice(0, -1)).passed, false, "missing the last piece");
  });

  test(`${where}: every decoy breaks the query at every position`, async () => {
    for (const decoy of decoys) {
      for (let pos = 0; pos <= stage.solution.length; pos++) {
        const order = [...stage.solution.slice(0, pos), decoy, ...stage.solution.slice(pos)];
        const r = gradeParsons(await fresh(), stage, order);
        assert.equal(r.passed, false, `decoy "${stage.pieces[decoy]}" at position ${pos} still passes:\n${assembleSql(stage, order)}`);
      }
    }
  });
}
