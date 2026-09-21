// ER diagram model: relationship detection, layout, and the real level schemas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Sandbox, sqlStages, solutionFor } from "./helpers.mjs";
import { buildErdModel, inferRelations, describeErd } from "../js/erd.js";

const table = (name, cols, fks = []) => ({ name, columns: cols.map(([n, pk]) => ({ name: n, type: "INTEGER", pk: !!pk })), fks });

test("declared foreign keys become edges; parents lay out left of children", () => {
  const m = buildErdModel([
    table("departments", [["dept_id", 1], ["name"]]),
    table("students", [["student_id", 1], ["dept_id"]], [{ column: "dept_id", refTable: "departments", refColumn: "dept_id" }]),
  ]);
  assert.equal(m.edges.length, 1);
  const [e] = m.edges;
  assert.deepEqual([e.child, e.parent, e.inferred, e.childSide], ["students", "departments", false, "N"]);
  const dep = m.nodes.find((n) => n.name === "departments");
  const stu = m.nodes.find((n) => n.name === "students");
  assert.ok(dep.x + dep.w < stu.x, "parent is entirely left of the child");
  assert.equal(e.x1, dep.x + dep.w);
  assert.equal(e.x2, stu.x);
});

test("undeclared relations are inferred from a matching primary-key name and marked", () => {
  const rel = inferRelations([
    table("departments", [["dept_id", 1]]),
    table("students", [["student_id", 1], ["dept_id"], ["city"]]),
  ]);
  const students = rel.find((t) => t.name === "students");
  assert.deepEqual(students.fks, [{ column: "dept_id", refTable: "departments", refColumn: "dept_id", inferred: true }]);
  assert.deepEqual(rel.find((t) => t.name === "departments").fks, [], "a primary key is never guessed as a foreign key");
});

test("a declared foreign key is not duplicated by inference", () => {
  const rel = inferRelations([
    table("departments", [["dept_id", 1]]),
    table("students", [["dept_id"]], [{ column: "dept_id", refTable: "departments", refColumn: "dept_id" }]),
  ]);
  assert.equal(rel[1].fks.length, 1);
  assert.equal(rel[1].fks[0].inferred, false);
});

test("chains get one layer per step and unrelated tables stay in layer 0", () => {
  const m = buildErdModel([
    table("a", [["a_id", 1]]),
    table("b", [["b_id", 1], ["a_id"]]),
    table("c", [["c_id", 1], ["b_id"]]),
    table("lonely", [["x"]]),
  ]);
  const layer = Object.fromEntries(m.nodes.map((n) => [n.name, n.layer]));
  assert.deepEqual(layer, { a: 0, b: 1, c: 2, lonely: 0 });
  assert.ok(m.width > 0 && m.height > 0);
});

test("a foreign key that is also the child's primary key is drawn one-to-one", () => {
  const m = buildErdModel([table("person", [["person_id", 1]]), table("passport", [["person_id", 1], ["no"]], [{ column: "person_id", refTable: "person", refColumn: "person_id" }])]);
  assert.equal(m.edges[0].childSide, "1");
});

test("circular references do not hang the layout", () => {
  const m = buildErdModel([
    table("a", [["a_id", 1], ["b_id"]], [{ column: "b_id", refTable: "b", refColumn: "b_id" }]),
    table("b", [["b_id", 1], ["a_id"]], [{ column: "a_id", refTable: "a", refColumn: "a_id" }]),
  ]);
  assert.equal(m.nodes.length, 2);
  assert.equal(m.edges.length, 2);
});

test("the accessible description names every table and every relation", () => {
  const m = buildErdModel([table("departments", [["dept_id", 1]]), table("students", [["student_id", 1], ["dept_id"]])]);
  const text = describeErd(m);
  assert.match(text, /Tabel departments/);
  assert.match(text, /Tabel students/);
  assert.match(text, /students\.dept_id merujuk ke departments\.dept_id \(diperkirakan dari nama kolom\)/);
  assert.match(describeErd(buildErdModel([table("solo", [["id", 1]])])), /Belum ada relasi/);
});

test("every level's real schema builds a model without dangling edges", async () => {
  for (const level of LEVELS) {
    const sb = await new Sandbox(level.datasetSql).init();
    const stages = sqlStages(level);
    if (stages.every((s) => solutionFor(level, s))) for (const s of stages) sb.runTolerant(solutionFor(level, s));
    const tables = sb.getErdSchema().filter((t) => level.tables.includes(t.name));
    assert.ok(tables.length >= 1, `L${level.id}: has tables`);
    const model = buildErdModel(tables);
    const names = new Set(model.nodes.map((n) => n.name));
    for (const e of model.edges) {
      assert.ok(names.has(e.child) && names.has(e.parent), `L${level.id}: edge ${e.child}->${e.parent} ends on drawn tables`);
      assert.ok(Number.isFinite(e.y1) && Number.isFinite(e.y2) && e.y1 > 0 && e.y2 > 0, `L${level.id}: edge ${e.child}.${e.column} points at a real column row`);
    }
  }
});

test("the campus schema shows the expected relations in Level 7", async () => {
  const level = LEVELS.find((l) => l.id === 7);
  const sb = await new Sandbox(level.datasetSql).init();
  const model = buildErdModel(sb.getErdSchema().filter((t) => level.tables.includes(t.name)));
  const pairs = model.edges.map((e) => `${e.child}->${e.parent}`).sort();
  assert.ok(pairs.includes("students->departments"));
  assert.ok(pairs.includes("enrollments->students"));
  assert.ok(pairs.includes("enrollments->courses"));
});
