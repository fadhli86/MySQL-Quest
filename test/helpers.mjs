// Test harness: runs the game's real Sandbox/grader in Node.
//
// sandbox.js loads sql.js from a CDN through window.initSqlJs; here we
// point it at the local `sql.js` devDependency instead so the exact same
// Sandbox class (runTolerant, splitStatements, ...) is exercised.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
let sqlPromise = null; // sql.js is instantiated once; each Sandbox still gets its own Database
globalThis.window = { initSqlJs: () => (sqlPromise ||= initSqlJs()) };

const { Sandbox } = await import("../js/sandbox.js");
const { gradeSqlStage, gradeQuizStage } = await import("../js/grader.js");
const { LEVELS } = await import("../js/levels.js");

export { Sandbox, gradeSqlStage, gradeQuizStage, LEVELS };

// Model solutions for validate()-graded stages are part of the lecturer's
// confidential answer key (gitignored folder), so they are loaded only when
// present locally. Without them (e.g. CI on the public repo) those stages
// are skipped, while referenceSql stages are still fully verified.
const HERE = dirname(fileURLToPath(import.meta.url));
const SOLUTIONS_FILE = join(HERE, "..", "RAHASIA-kunci-jawaban", "model-solutions.mjs");
export const MODEL_SOLUTIONS = existsSync(SOLUTIONS_FILE) ? (await import(pathToFileURL(SOLUTIONS_FILE).href)).MODEL_SOLUTIONS : {};

export function sqlStages(level) {
  return level.stages.filter((s) => s.type === "sql");
}

// The known-good answer for a stage, or null if unavailable locally. A model
// solution wins over referenceSql (which for e.g. CREATE VIEW stages is only
// the comparison SELECT, not something a student could submit and pass).
export function solutionFor(level, stage) {
  const model = MODEL_SOLUTIONS[`${level.id}:${stage.id}`];
  if (model) return model;
  // referenceSql only counts as a submittable answer if it satisfies the
  // stage's own required constructs (L11 s2's does not: it lacks CREATE VIEW).
  const ref = stage.referenceSql;
  const upper = (ref || "").toUpperCase();
  const submittable = ref && (stage.requiredConstructs || []).every((c) => c === "SUBQUERY" || upper.includes(c.toUpperCase()));
  return submittable ? ref : null;
}

// Mimics quest.js onSubmit: tolerant execution, then grading.
export function submit(sandbox, stage, sql) {
  const exec = sandbox.runTolerant(sql);
  return { exec, grade: gradeSqlStage(sandbox, sql, exec, stage) };
}

// A sandbox as the student would find it right before `stage`: fresh level
// dataset plus the correct solutions of all earlier sql stages applied.
export async function sandboxBefore(level, stage) {
  const sb = await new Sandbox(level.datasetSql).init();
  for (const s of sqlStages(level)) {
    if (s.id === stage.id) break;
    const sol = solutionFor(level, s);
    if (sol) sb.runTolerant(sol);
  }
  return sb;
}
