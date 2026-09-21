// "Susun potongan SQL" (Parsons) puzzles: the student orders shuffled pieces of
// a query — some of them decoys — instead of typing it. Grading is by RESULT,
// not by comparing the assembled text with one canonical order: the assembled
// SQL runs in the level's sandbox and is compared with `stage.referenceSql` by
// the real grader, so any order that produces the right result is accepted.
//
// Pure (no DOM) so tests can check every puzzle: the intended order must pass,
// and each decoy must break the query wherever it is inserted.
import { gradeSqlStage } from "./grader.js";

export function assembleSql(stage, order) {
  return order.map((i) => stage.pieces[i]).join("\n");
}

// order: indices into stage.pieces, in the sequence the student arranged them.
// Returns { passed, message, sql }. The grader's row-by-row diff is
// deliberately not exposed: it would spell out the expected rows for anyone
// guessing.
export function gradeParsons(sandbox, stage, order) {
  if (!order.length) return { passed: false, message: "Susunan masih kosong — ketuk potongan untuk menambahkannya.", sql: "" };
  const sql = assembleSql(stage, order);
  const exec = sandbox.run(sql);
  const grade = gradeSqlStage(sandbox, sql, exec, stage);
  return {
    passed: grade.passed,
    message: grade.passed ? stage.explainCorrect || "Susunan tepat." : grade.message,
    isError: !!grade.isError,
    sql,
  };
}
