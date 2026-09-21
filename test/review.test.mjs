// Spaced-review queue: scheduling rules (pure) and how state.js feeds them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INTERVALS_DAYS, DAY_MS, trackMiss, trackStruggle, applyReviewAnswer, dueKeys, summarize, reviewKey, parseReviewKey } from "../js/review.js";

const T0 = 1_000_000_000_000;

test("a miss schedules the item 1 day out and counts the miss", () => {
  const r = {};
  trackMiss(r, "3:q1", T0);
  assert.equal(r["3:q1"].dueAt, T0 + DAY_MS);
  assert.equal(r["3:q1"].misses, 1);
  assert.deepEqual(dueKeys(r, T0), [], "not due immediately");
  assert.deepEqual(dueKeys(r, T0 + DAY_MS), ["3:q1"]);
  trackMiss(r, "3:q1", T0 + 5);
  assert.equal(r["3:q1"].misses, 2);
  assert.equal(r["3:q1"].box, 0);
});

test("correct reviews space out 3 then 7 days, and the third retires the item", () => {
  const r = {};
  trackMiss(r, "k", T0);
  let now = T0 + DAY_MS;
  let res = applyReviewAnswer(r, "k", true, now);
  assert.deepEqual(res, { advanced: true, retired: false });
  assert.equal(r.k.dueAt, now + 3 * DAY_MS);
  now = r.k.dueAt;
  applyReviewAnswer(r, "k", true, now);
  assert.equal(r.k.dueAt, now + 7 * DAY_MS);
  now = r.k.dueAt;
  res = applyReviewAnswer(r, "k", true, now);
  assert.deepEqual(res, { advanced: true, retired: true });
  assert.equal(r.k.done, true);
  assert.deepEqual(dueKeys(r, now + 365 * DAY_MS), [], "retired items never come back");
  assert.deepEqual(applyReviewAnswer(r, "k", true, now), { advanced: false, retired: false }, "no double credit");
});

test("a wrong review resets the item to the start", () => {
  const r = {};
  trackMiss(r, "k", T0);
  applyReviewAnswer(r, "k", true, T0 + DAY_MS);
  applyReviewAnswer(r, "k", false, T0 + 4 * DAY_MS);
  assert.equal(r.k.box, 0);
  assert.equal(r.k.dueAt, T0 + 4 * DAY_MS + INTERVALS_DAYS[0] * DAY_MS);
  assert.equal(r.k.misses, 2);
});

test("struggle adds only untracked items and never overwrites progress", () => {
  const r = {};
  trackMiss(r, "5:q1", T0);
  applyReviewAnswer(r, "5:q1", true, T0 + DAY_MS);
  const added = trackStruggle(r, ["5:q1", "5:q2"], T0 + 2 * DAY_MS);
  assert.equal(added, 1);
  assert.equal(r["5:q1"].box, 1, "existing item untouched");
  assert.equal(r["5:q2"].source, "struggle");
});

test("dueKeys is oldest-first and `all` includes not-yet-due items", () => {
  const r = {};
  trackMiss(r, "b", T0 + 2 * DAY_MS);
  trackMiss(r, "a", T0);
  assert.deepEqual(dueKeys(r, T0 + 10 * DAY_MS), ["a", "b"]);
  assert.deepEqual(dueKeys(r, T0, { all: true }), ["a", "b"]);
  assert.deepEqual(dueKeys(r, T0), []);
});

test("summarize counts due, active, retired and the next due time", () => {
  const r = {};
  trackMiss(r, "a", T0);
  trackMiss(r, "b", T0 + 3 * DAY_MS);
  const s = summarize(r, T0 + DAY_MS);
  assert.deepEqual(s, { due: 1, active: 2, retired: 0, nextDueAt: T0 + 4 * DAY_MS });
});

test("review keys round-trip", () => {
  assert.equal(reviewKey(3, "q1"), "3:q1");
  assert.deepEqual(parseReviewKey("3:q1"), { levelId: 3, stageId: "q1" });
});

// ---- state.js integration (localStorage is stubbed; state.js tolerates its absence)
test("state: quiz miss -> queue -> review answer awards XP once; practice does not", async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const S = await import("../js/state.js");
  const { LEVELS } = await import("../js/levels.js");
  S.resetAllProgress();
  const level = LEVELS.find((l) => l.id === 3);
  const quiz = level.stages.find((s) => s.id === "q1");

  assert.deepEqual(S.getReviewItems({ all: true }), []);
  S.recordQuizMiss(level, quiz);
  assert.equal(S.getReviewSummary().active, 1);
  assert.equal(S.getReviewItems().length, 0, "not due right after the miss");
  const [item] = S.getReviewItems({ all: true });
  assert.equal(item.stage.id, "q1");
  assert.equal(item.level.id, 3);

  const before = S.getState().xp;
  assert.equal(S.answerReview(item.key, true, { practice: true }).xp, 0);
  assert.equal(S.getState().xp, before, "practice gives no XP");
  assert.equal(S.getState().review[item.key].box, 0, "practice does not move the schedule");

  const r = S.answerReview(item.key, true);
  assert.equal(r.xp, S.REVIEW_XP);
  assert.equal(S.getState().xp, before + S.REVIEW_XP);
  assert.equal(S.getState().review[item.key].box, 1);
});

test("state: stale review keys (quiz removed from content) are skipped, and old saves without `review` load", async () => {
  const S = await import("../js/state.js");
  S.resetAllProgress();
  S.getState().review["99:zz"] = { box: 0, dueAt: 0, misses: 1, done: false };
  S.getState().review["3:s2"] = { box: 0, dueAt: 0, misses: 1, done: false }; // an sql stage, not a quiz
  assert.deepEqual(S.getReviewItems({ all: true }), []);
  const legacy = JSON.parse(S.exportProgressJson());
  delete legacy.review;
  S.importProgressJson(JSON.stringify(legacy));
  assert.deepEqual(S.getReviewSummary(), { due: 0, active: 0, retired: 0, nextDueAt: null });
});

test("state: struggling with a graded stage (3 attempts) queues the level's concept quizzes", async () => {
  const S = await import("../js/state.js");
  const { LEVELS } = await import("../js/levels.js");
  S.resetAllProgress();
  const level = LEVELS.find((l) => l.id === 3);
  const graded = level.stages.find((s) => s.graded);
  const fail = { passed: false, score: 0 };
  S.submitStageResult(level, graded, "x", fail);
  S.submitStageResult(level, graded, "x", fail);
  assert.equal(S.getReviewSummary().active, 0, "two attempts is not struggling yet");
  S.submitStageResult(level, graded, "x", fail);
  const keys = S.getReviewItems({ all: true }).map((i) => i.key).sort();
  assert.deepEqual(keys, ["3:q1", "3:q2"]);
});
