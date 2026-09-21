// Review queue: a light Leitner-style spaced repetition for concept quizzes.
//
// An item (a quiz stage, keyed "levelId:stageId") enters the queue when the
// student answers it wrong, or when they struggle with a graded stage in the
// same level. It is first due after INTERVALS_DAYS[0] days; every correct
// review pushes the next due date further out (3 days, then 7) and three
// correct reviews in a row retire the item. A wrong review sends it back to
// the start. Pure functions over a plain object so they can be unit-tested
// without a DOM or localStorage — state.js owns the persisted `review` map.

export const INTERVALS_DAYS = [1, 3, 7];
export const DAY_MS = 24 * 60 * 60 * 1000;
export const SUCCESSES_TO_RETIRE = INTERVALS_DAYS.length;

export function reviewKey(levelId, stageId) {
  return `${levelId}:${stageId}`;
}

export function parseReviewKey(key) {
  const [levelId, stageId] = String(key).split(":");
  return { levelId: Number(levelId), stageId };
}

// The student answered the quiz wrong: (re)start the item from the beginning.
export function trackMiss(review, key, now = Date.now()) {
  const prev = review[key] || {};
  review[key] = {
    box: 0,
    dueAt: now + INTERVALS_DAYS[0] * DAY_MS,
    misses: (prev.misses || 0) + 1,
    done: false,
    source: prev.source === "miss" || !prev.source ? "miss" : prev.source,
    lastAt: now,
  };
  return review[key];
}

// Adds items that are not tracked yet (e.g. all quizzes of a level the
// student struggled with). Already-tracked items are left alone.
export function trackStruggle(review, keys, now = Date.now()) {
  let added = 0;
  for (const key of keys) {
    if (review[key]) continue;
    review[key] = { box: 0, dueAt: now + INTERVALS_DAYS[0] * DAY_MS, misses: 0, done: false, source: "struggle", lastAt: now };
    added += 1;
  }
  return added;
}

// Applies the result of one review answer. Returns what changed.
export function applyReviewAnswer(review, key, correct, now = Date.now()) {
  const item = review[key];
  if (!item || item.done) return { advanced: false, retired: false };
  item.lastAt = now;
  if (!correct) {
    item.box = 0;
    item.misses = (item.misses || 0) + 1;
    item.dueAt = now + INTERVALS_DAYS[0] * DAY_MS;
    return { advanced: false, retired: false };
  }
  item.box += 1;
  if (item.box >= SUCCESSES_TO_RETIRE) {
    item.done = true;
    item.dueAt = null;
    return { advanced: true, retired: true };
  }
  item.dueAt = now + INTERVALS_DAYS[Math.min(item.box, INTERVALS_DAYS.length - 1)] * DAY_MS;
  return { advanced: true, retired: false };
}

// Keys that are due now, oldest first. `all: true` returns every active item
// (used for "practice anyway" sessions that must not change the schedule).
export function dueKeys(review, now = Date.now(), { all = false } = {}) {
  return Object.entries(review)
    .filter(([, item]) => !item.done && (all || item.dueAt <= now))
    .sort((a, b) => a[1].dueAt - b[1].dueAt)
    .map(([key]) => key);
}

export function summarize(review, now = Date.now()) {
  const items = Object.values(review);
  const active = items.filter((i) => !i.done);
  const upcoming = active.filter((i) => i.dueAt > now).map((i) => i.dueAt);
  return {
    due: active.filter((i) => i.dueAt <= now).length,
    active: active.length,
    retired: items.length - active.length,
    nextDueAt: upcoming.length ? Math.min(...upcoming) : null,
  };
}
