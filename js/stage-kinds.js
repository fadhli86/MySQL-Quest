// Which stages are the level's main path and which are optional extra practice,
// plus the navigation rules that follow from that.
//
// A level's main path is: guided practice, concept checks, and the graded
// quests. "Latihan Tambahan" (extras) are the optional drills added around it —
// predict-the-output, Parsons puzzles, debug and optimisation challenges. They
// award XP but never touch mastery, so nobody has to do them, and the
// "next stage" flow therefore steps OVER them instead of dragging a student
// through nine optional stages before the first graded one.
//
// Pure module (no DOM) so the rules can be unit-tested against real content.

export function isExtraStage(stage) {
  return !!(stage.debug || stage.type === "parsons" || (stage.type === "quiz" && stage.code) || (stage.plan && !stage.graded));
}

export function stageIcon(stage) {
  if (stage.debug) return "🐞";
  if (stage.type === "parsons") return "🧩";
  if (stage.type === "quiz" && stage.code) return "🔮";
  if (stage.plan && !stage.graded) return "⚡";
  return "";
}

// id of the stage the "Lanjut" button should open after `currentId`, or null.
// From a main-path stage: the next main-path stage. From an extra: the next
// extra in the same group, and after the last one the next main-path stage.
export function nextStageId(level, currentId) {
  const stages = level.stages;
  const idx = stages.findIndex((s) => s.id === currentId);
  if (idx < 0) return null;
  if (isExtraStage(stages[idx]) && stages[idx + 1] && isExtraStage(stages[idx + 1])) return stages[idx + 1].id;
  for (let j = idx + 1; j < stages.length; j++) if (!isExtraStage(stages[j])) return stages[j].id;
  return null;
}

// Where a student lands on entering a level: the first unfinished main-path
// stage (or the last one when everything is done). `isPassed(stageId)` reads progress.
export function initialStageId(level, isPassed) {
  const main = level.stages.filter((s) => !isExtraStage(s));
  for (const stage of main) if (!isPassed(stage.id)) return stage.id;
  return main[main.length - 1].id;
}
