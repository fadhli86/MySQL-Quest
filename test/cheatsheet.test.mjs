// Cheat sheet content sanity, and the first-run tour flag in the progress state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "./helpers.mjs";

// cheatsheet.js imports ui.js (DOM helpers) but only touches the DOM inside functions
const { CHEATSHEET } = await import("../js/cheatsheet.js");

test("every section and item is complete and points at a real level", () => {
  const levelIds = new Set(LEVELS.map((l) => l.id));
  const titles = new Set();
  for (const section of CHEATSHEET) {
    assert.ok(section.title && !titles.has(section.title), `unique title: ${section.title}`);
    titles.add(section.title);
    assert.ok(levelIds.has(section.fromLevel), `${section.title}: fromLevel ${section.fromLevel} exists`);
    assert.ok(section.items.length >= 1, `${section.title}: has items`);
    for (const item of section.items) {
      assert.ok(item.syntax.trim() && item.desc.trim(), `${section.title}: syntax and desc are filled`);
    }
  }
});

test("sections are ordered by the level that introduces them", () => {
  const levels = CHEATSHEET.map((s) => s.fromLevel);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
});

test("examples use placeholder names, not the quests' own table answers", () => {
  const all = CHEATSHEET.flatMap((s) => s.items.map((i) => i.syntax)).join("\n");
  for (const forbidden of ["course_reviews", "students_norm", "courses_norm", "trg_min_score", "trg_log_payment", "idx_students_dept", "view_mahasiswa_teladan"]) {
    assert.ok(!all.includes(forbidden), `cheat sheet must not contain quest answer name ${forbidden}`);
  }
});

test("tour flag: defaults to unseen, persists once marked, survives old saves", async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const S = await import("../js/state.js");
  S.resetAllProgress();
  assert.equal(S.getState().tourSeen, false);
  S.markTourSeen();
  assert.equal(S.getState().tourSeen, true);
  const legacy = JSON.parse(S.exportProgressJson());
  delete legacy.tourSeen;
  S.importProgressJson(JSON.stringify(legacy));
  assert.equal(S.getState().tourSeen, false, "an old save without the flag loads as unseen");
});
