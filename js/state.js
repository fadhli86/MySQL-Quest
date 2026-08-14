// State store: persistence (localStorage), XP/rank/mastery calculations,
// unlock rules. No backend — progress lives on this device/browser only.

import { LEVELS } from "./levels.js";

const STORAGE_KEY = "mysqlquest_state_v1";

const RANKS = [
  { min: 0, name: "Database Rookie" },
  { min: 500, name: "Query Explorer" },
  { min: 1000, name: "SQL Developer" },
  { min: 1500, name: "Data Engineer" },
  { min: 2000, name: "Database Expert" },
  { min: 2500, name: "Database Architect" },
];

function defaultState() {
  const levels = {};
  LEVELS.forEach((lv, i) => {
    levels[lv.id] = {
      status: i === 0 ? "available" : "locked",
      mastery: 0,
      introSeen: false,
      stages: {},
    };
  });
  return {
    version: 1,
    studentName: "",
    xp: 0,
    xpLog: [],
    levels,
    badges: [],
    portfolio: [],
    drafts: {},
    lastActive: null,
    createdAt: Date.now(),
    courseCompletedAt: null,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    // shallow-merge so new levels added by content updates still appear
    for (const lv of LEVELS) {
      if (!parsed.levels[lv.id]) parsed.levels[lv.id] = def.levels[lv.id];
    }
    return { ...def, ...parsed, levels: { ...def.levels, ...parsed.levels } };
  } catch (e) {
    console.warn("State load failed, resetting.", e);
    return defaultState();
  }
}

let state = load();
const listeners = new Set();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setStudentName(name) {
  state.studentName = name;
  persist();
}

export function getRank(xp) {
  let cur = RANKS[0];
  for (const r of RANKS) if (xp >= r.min) cur = r;
  const idx = RANKS.indexOf(cur);
  const next = RANKS[idx + 1] || null;
  return { name: cur.name, next: next ? next.name : null, nextAt: next ? next.min : null };
}

export function addXp(amount, reason) {
  if (!amount) return;
  state.xp += amount;
  state.xpLog.push({ amount, reason, at: Date.now() });
  persist();
}

export function awardBadgeOnce(badgeId, badgeName, icon) {
  if (state.badges.find((b) => b.id === badgeId)) return false;
  state.badges.push({ id: badgeId, name: badgeName, icon, at: Date.now() });
  persist();
  return true;
}

export function saveDraft(key, sql) {
  state.drafts[key] = sql;
  persist();
}

export function getDraft(key) {
  return state.drafts[key] || "";
}

export function setLastActive(levelId, stageId) {
  state.lastActive = { levelId, stageId, at: Date.now() };
  persist();
}

function levelState(levelId) {
  return state.levels[levelId];
}

export function getStageProgress(levelId, stageId) {
  const ls = levelState(levelId);
  return ls.stages[stageId] || { status: "pending", bestScore: 0, attempts: 0, hintsUsed: 0, hintUsedEver: false };
}

export function recordHintUsed(levelId, stageId) {
  const ls = levelState(levelId);
  if (!ls.stages[stageId]) ls.stages[stageId] = { status: "pending", bestScore: 0, attempts: 0, hintsUsed: 0, hintUsedEver: false };
  ls.stages[stageId].hintsUsed += 1;
  ls.stages[stageId].hintUsedEver = true;
  persist();
}

// Records a graded submit attempt for a stage, updates mastery/unlock/badges/XP.
// gradeResult: {passed, score, breakdown, resultPreview, message}
export function submitStageResult(level, stage, sql, gradeResult) {
  const ls = levelState(level.id);
  if (!ls.stages[stage.id]) {
    ls.stages[stage.id] = { status: "pending", bestScore: 0, attempts: 0, hintsUsed: 0, hintUsedEver: false };
  }
  const sp = ls.stages[stage.id];
  sp.attempts += 1;
  sp.bestScore = Math.max(sp.bestScore, gradeResult.score);
  sp.status = gradeResult.passed ? "passed" : "attempted";
  sp.lastScore = gradeResult.score;
  sp.lastAt = Date.now();

  const xpEvents = [];
  if (gradeResult.passed && !sp.xpAwarded) {
    addXp(stage.xp || 0, `${level.title} — ${stage.title}`);
    xpEvents.push({ amount: stage.xp || 0, reason: stage.title });
    if (!sp.hintUsedEver && stage.noHintBonus) {
      addXp(20, "Bonus tanpa hint");
      xpEvents.push({ amount: 20, reason: "Bonus tanpa hint" });
    }
    if (gradeResult.score >= 98 && stage.perfectBonus) {
      addXp(25, "Perfect query");
      xpEvents.push({ amount: 25, reason: "Perfect query" });
    }
    sp.xpAwarded = true;

    if (stage.portfolio) {
      state.portfolio.push({
        levelId: level.id,
        stageId: stage.id,
        title: `${level.title} — ${stage.title}`,
        sql,
        score: gradeResult.score,
        at: Date.now(),
      });
    }
  }

  // recompute level mastery from graded stages
  const gradedStages = level.stages.filter((s) => s.graded);
  let weightedSum = 0, weightTotal = 0;
  for (const s of gradedStages) {
    const stp = ls.stages[s.id];
    const w = s.weight || 1;
    weightedSum += (stp ? stp.bestScore : 0) * w;
    weightTotal += w;
  }
  ls.mastery = weightTotal ? Math.round(weightedSum / weightTotal) : 0;

  const threshold = level.masteryThreshold || 80;
  const allGradedAttempted = gradedStages.every((s) => ls.stages[s.id] && ls.stages[s.id].attempts > 0);
  let justCompleted = false;

  if (ls.mastery >= threshold && allGradedAttempted) {
    const wasCompleted = ls.status === "completed" || ls.status === "mastered";
    ls.status = "completed";
    if (!wasCompleted) {
      awardBadgeOnce(`level-${level.id}`, level.title, level.badgeIcon || "🏅");
      unlockNext(level);
      justCompleted = true;
    }
  } else if (allGradedAttempted) {
    ls.status = "needs_remedial";
  } else {
    ls.status = "in_progress";
  }

  let courseJustCompleted = false;
  if (justCompleted && !state.courseCompletedAt && isCourseComplete()) {
    state.courseCompletedAt = Date.now();
    courseJustCompleted = true;
  }

  persist();
  return { xpEvents, mastery: ls.mastery, levelStatus: ls.status, justCompleted, courseJustCompleted };
}

export function isCourseComplete() {
  return LEVELS.every((lv) => state.levels[lv.id].status === "completed");
}

export function getCompletionStats() {
  const completedCount = LEVELS.filter((lv) => state.levels[lv.id].status === "completed").length;
  const avgMastery = Math.round(LEVELS.reduce((a, lv) => a + state.levels[lv.id].mastery, 0) / LEVELS.length);
  return {
    completedCount,
    total: LEVELS.length,
    avgMastery,
    xp: state.xp,
    badgeCount: state.badges.length,
    completedAt: state.courseCompletedAt,
  };
}

// For ungraded stages (practice / quiz / demo / reflect): first successful
// completion awards XP once and optionally saves a portfolio artifact.
// Does not affect level mastery.
export function completeUngradedStage(level, stage, opts = {}) {
  const ls = levelState(level.id);
  if (!ls.stages[stage.id]) {
    ls.stages[stage.id] = { status: "pending", bestScore: 0, attempts: 0, hintsUsed: 0, hintUsedEver: false };
  }
  const sp = ls.stages[stage.id];
  sp.attempts += 1;
  sp.lastAt = Date.now();
  let xpAwarded = 0;
  if (!sp.xpAwarded) {
    xpAwarded = stage.xp || 0;
    if (xpAwarded) addXp(xpAwarded, `${level.title} — ${stage.title}`);
    sp.status = "passed";
    sp.xpAwarded = true;
    if (stage.portfolio) {
      state.portfolio.push({
        levelId: level.id,
        stageId: stage.id,
        title: `${level.title} — ${stage.title}`,
        sql: opts.sql || "",
        note: opts.note || "",
        score: null,
        at: Date.now(),
      });
    }
  }
  persist();
  return { xpAwarded };
}

function unlockNext(level) {
  const idx = LEVELS.findIndex((l) => l.id === level.id);
  const next = LEVELS[idx + 1];
  if (next && state.levels[next.id].status === "locked") {
    state.levels[next.id].status = "available";
  }
}

export function markIntroSeen(levelId) {
  levelState(levelId).introSeen = true;
  persist();
}

export function markLevelStarted(levelId) {
  const ls = levelState(levelId);
  if (ls.status === "available") ls.status = "in_progress";
  persist();
}

export function getLevelStatus(levelId) {
  return levelState(levelId).status;
}

export function getOverallProgress() {
  const total = LEVELS.length;
  const done = LEVELS.filter((l) => ["completed", "mastered"].includes(levelState(l.id).status)).length;
  return Math.round((done / total) * 100);
}

// mastery per CPMK, aggregated from levels mapped to that CPMK
export function getCpmkMastery() {
  const map = {};
  for (const lv of LEVELS) {
    const cpmk = lv.cpmk;
    if (!map[cpmk]) map[cpmk] = { cpmk, subs: [] };
    const ls = levelState(lv.id);
    map[cpmk].subs.push({ subCpmk: lv.subCpmk, levelTitle: lv.title, mastery: ls.mastery, status: ls.status });
  }
  return Object.values(map).map((entry) => {
    const attempted = entry.subs.filter((s) => s.status !== "locked");
    const avg = attempted.length ? Math.round(attempted.reduce((a, s) => a + s.mastery, 0) / attempted.length) : 0;
    return { ...entry, avgMastery: avg };
  });
}

export function resetAllProgress() {
  state = defaultState();
  persist();
}

export function exportProgressJson() {
  return JSON.stringify(state, null, 2);
}
