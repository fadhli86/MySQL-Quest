// Entity-relationship diagram of the sandbox schema.
//
// `buildErdModel` is pure (tables in -> laid-out boxes and edges out) so the
// layout and relationship inference can be unit-tested; `renderErd` turns the
// model into an accessible inline SVG. Relationships come from real FOREIGN
// KEY declarations when the table has them, and are otherwise inferred from
// naming (a non-key column that carries the same name as another table's
// single-column primary key, e.g. students.dept_id -> departments.dept_id);
// inferred edges are drawn dashed so students can tell the difference.

const CHAR_W = 7.6; // approx. width of one monospace glyph at the diagram's font size
const HEADER_H = 32;
const ROW_H = 24;
const PAD_X = 16;
const LAYER_GAP = 120;
const ROW_GAP = 26;
const MARGIN = 16;

// tables: [{ name, columns: [{ name, type, pk }], fks: [{ column, refTable, refColumn }] }]
export function inferRelations(tables) {
  const pkOf = new Map();
  for (const t of tables) {
    const pks = t.columns.filter((c) => c.pk);
    if (pks.length === 1) pkOf.set(t.name, pks[0].name);
  }
  return tables.map((t) => {
    const fks = t.fks.map((f) => ({ ...f, inferred: false }));
    const covered = new Set(fks.map((f) => f.column));
    for (const c of t.columns) {
      if (c.pk || covered.has(c.name)) continue;
      const target = tables.find((u) => u.name !== t.name && pkOf.get(u.name) === c.name);
      if (target) fks.push({ column: c.name, refTable: target.name, refColumn: c.name, inferred: true });
    }
    return { ...t, fks };
  });
}

export function buildErdModel(rawTables) {
  const tables = inferRelations(rawTables);
  const byName = new Map(tables.map((t) => [t.name, t]));

  // Layer = how far a table sits from the "one" side: parents left, children right.
  const layer = new Map(tables.map((t) => [t.name, 0]));
  for (let pass = 0; pass < tables.length; pass++) {
    let changed = false;
    for (const t of tables) {
      for (const f of t.fks) {
        if (!byName.has(f.refTable)) continue;
        const want = layer.get(f.refTable) + 1;
        if (want > layer.get(t.name) && want <= tables.length) {
          layer.set(t.name, want);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const nodes = tables.map((t) => {
    const widest = Math.max(t.name.length, ...t.columns.map((c) => c.name.length + (c.type || "TEXT").length + 8));
    return {
      name: t.name,
      columns: t.columns,
      fks: t.fks,
      layer: layer.get(t.name),
      w: Math.max(160, Math.round(widest * CHAR_W + PAD_X * 2)),
      h: HEADER_H + t.columns.length * ROW_H,
      x: 0,
      y: 0,
    };
  });

  const layers = [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b);
  const layerWidth = new Map();
  const layerHeight = new Map();
  for (const l of layers) {
    const inLayer = nodes.filter((n) => n.layer === l);
    layerWidth.set(l, Math.max(...inLayer.map((n) => n.w)));
    layerHeight.set(l, inLayer.reduce((sum, n) => sum + n.h, 0) + ROW_GAP * (inLayer.length - 1));
  }
  const tallest = Math.max(...layers.map((l) => layerHeight.get(l)));
  let x = MARGIN;
  for (const l of layers) {
    let y = MARGIN + (tallest - layerHeight.get(l)) / 2;
    for (const n of nodes.filter((m) => m.layer === l)) {
      n.x = x;
      n.y = y;
      y += n.h + ROW_GAP;
    }
    x += layerWidth.get(l) + LAYER_GAP;
  }

  const nodeByName = new Map(nodes.map((n) => [n.name, n]));
  const rowY = (n, colName) => n.y + HEADER_H + n.columns.findIndex((c) => c.name === colName) * ROW_H + ROW_H / 2;
  const edges = [];
  for (const child of nodes) {
    for (const f of child.fks) {
      const parent = nodeByName.get(f.refTable);
      if (!parent || parent === child) continue;
      const childCol = child.columns.find((c) => c.name === f.column);
      edges.push({
        child: child.name,
        parent: parent.name,
        column: f.column,
        refColumn: f.refColumn,
        inferred: f.inferred,
        // a foreign key that is itself the child's primary key is one-to-one
        childSide: childCol && childCol.pk ? "1" : "N",
        x1: parent.x + parent.w,
        y1: rowY(parent, f.refColumn),
        x2: child.x,
        y2: rowY(child, f.column),
      });
    }
  }

  const width = Math.max(...nodes.map((n) => n.x + n.w)) + MARGIN;
  const height = Math.max(...nodes.map((n) => n.y + n.h)) + MARGIN;
  return { nodes, edges, width, height, constants: { HEADER_H, ROW_H, PAD_X } };
}

// Plain-language description (used as the SVG's accessible text).
export function describeErd(model) {
  const parts = model.nodes.map((n) => `Tabel ${n.name} dengan kolom ${n.columns.map((c) => c.name + (c.pk ? " (kunci utama)" : "")).join(", ")}.`);
  if (model.edges.length) {
    parts.push(
      ...model.edges.map(
        (e) => `${e.child}.${e.column} merujuk ke ${e.parent}.${e.refColumn}${e.inferred ? " (diperkirakan dari nama kolom)" : ""}: satu ${e.parent} bisa punya ${e.childSide === "1" ? "satu" : "banyak"} ${e.child}.`
      )
    );
  } else {
    parts.push("Belum ada relasi antar tabel.");
  }
  return parts.join(" ");
}

const NS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderErd(model) {
  const { HEADER_H: H, ROW_H: R, PAD_X: PX } = model.constants;
  const root = svg("svg", { class: "erd-svg", width: model.width, height: model.height, viewBox: `0 0 ${model.width} ${model.height}`, role: "group", "aria-label": "Diagram ERD" });
  root.appendChild(svg("title", {}, "Diagram ERD"));
  root.appendChild(svg("desc", {}, describeErd(model)));

  let selected = null;
  const edgeEls = [];
  const nodeEls = new Map();

  function applySelection() {
    for (const [name, g] of nodeEls) {
      const related = !selected || name === selected || model.edges.some((e) => (e.child === selected && e.parent === name) || (e.parent === selected && e.child === name));
      g.classList.toggle("dim", !related);
      g.setAttribute("aria-pressed", name === selected ? "true" : "false");
    }
    for (const { el, edge } of edgeEls) el.classList.toggle("dim", !!selected && edge.child !== selected && edge.parent !== selected);
  }

  for (const e of model.edges) {
    const dx = Math.max(40, (e.x2 - e.x1) / 2);
    const g = svg("g", { class: `erd-edge${e.inferred ? " inferred" : ""}` });
    g.appendChild(svg("path", { d: `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}` }));
    g.appendChild(svg("text", { class: "erd-card", x: e.x1 + 6, y: e.y1 - 6 }, "1"));
    g.appendChild(svg("text", { class: "erd-card", x: e.x2 - 14, y: e.y2 - 6 }, e.childSide));
    root.appendChild(g);
    edgeEls.push({ el: g, edge: e });
  }

  for (const n of model.nodes) {
    const related = model.edges.filter((e) => e.child === n.name || e.parent === n.name);
    const others = [...new Set(related.map((e) => (e.child === n.name ? e.parent : e.child)))];
    const label = `Tabel ${n.name}, ${n.columns.length} kolom${others.length ? `, berelasi dengan ${others.join(", ")}` : ""}. Tekan Enter untuk menyorot relasinya.`;
    const g = svg("g", { class: "erd-node", role: "button", tabindex: "0", "aria-pressed": "false", "aria-label": label });
    g.appendChild(svg("rect", { class: "erd-box", x: n.x, y: n.y, width: n.w, height: n.h, rx: 10 }));
    g.appendChild(svg("rect", { class: "erd-head", x: n.x, y: n.y, width: n.w, height: H, rx: 10 }));
    g.appendChild(svg("rect", { class: "erd-head", x: n.x, y: n.y + H - 10, width: n.w, height: 10 }));
    g.appendChild(svg("text", { class: "erd-title", x: n.x + PX, y: n.y + H / 2 + 5 }, n.name));
    const fkCols = new Set(n.fks.map((f) => f.column));
    n.columns.forEach((c, i) => {
      const y = n.y + H + i * R + R / 2 + 4;
      if (i > 0) g.appendChild(svg("line", { class: "erd-sep", x1: n.x, x2: n.x + n.w, y1: n.y + H + i * R, y2: n.y + H + i * R }));
      g.appendChild(svg("text", { class: "erd-col", x: n.x + PX, y }, c.name));
      const tag = c.pk ? "PK" : fkCols.has(c.name) ? "FK" : "";
      g.appendChild(svg("text", { class: `erd-key ${c.pk ? "pk" : "fk"}`, x: n.x + n.w - PX, y, "text-anchor": "end" }, tag));
    });
    const toggle = () => {
      selected = selected === n.name ? null : n.name;
      applySelection();
    };
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        toggle();
      }
    });
    root.appendChild(g);
    nodeEls.set(n.name, g);
  }
  return root;
}
