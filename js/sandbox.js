// SQL sandbox wrapper around sql.js (SQLite compiled to WebAssembly).
// Every level gets its own isolated in-memory database seeded from the
// level's dataset script — nothing here ever touches a real server, so
// students can experiment freely and reset without any risk.

const CREATE_OBJECT_RE = /^\s*CREATE\s+(TABLE|INDEX|VIEW|TRIGGER)\b/i;
const INSERT_RE = /^\s*INSERT\s+INTO\b/i;

// Splits a SQL script into individual statements on top-level semicolons —
// not inside a single-quoted string, and not inside a CREATE TRIGGER's
// BEGIN...END body (which has its own internal semicolons, e.g. the
// RAISE(ABORT, '...'); inside a trigger). Good enough for the
// teaching-level SQL this app handles — doesn't need to understand
// comments, dollar-quoting, nested procedural blocks, etc.
export function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inString = false;
  let beginDepth = 0;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") {
      inString = !inString;
      current += ch;
      i++;
      continue;
    }
    if (!inString) {
      const prevChar = i > 0 ? sql[i - 1] : "";
      const isWordStart = !/[A-Za-z0-9_]/.test(prevChar);
      if (isWordStart && /^BEGIN\b/i.test(sql.slice(i, i + 6))) {
        beginDepth++;
        current += "BEGIN";
        i += 5;
        continue;
      }
      if (isWordStart && /^END\b/i.test(sql.slice(i, i + 4))) {
        beginDepth = Math.max(0, beginDepth - 1);
        current += "END";
        i += 3;
        continue;
      }
      if (ch === ";" && beginDepth === 0) {
        statements.push(current);
        current = "";
        i++;
        continue;
      }
    }
    current += ch;
    i++;
  }
  if (current.trim()) statements.push(current);
  return statements.map((s) => s.trim()).filter(Boolean);
}

let SQLPromise = null;
const SQL_LOAD_TIMEOUT_MS = 20000;
const SQL_JS_SRC = "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js";

// The <script> tag for sql.js lives in index.html and only ever attempts to
// load once at page load. If that attempt failed (CDN blocked at that
// moment, hiccup, ...), window.initSqlJs stays undefined forever — clicking
// "Coba Lagi" would just keep failing with no real retry happening. This
// injects a fresh <script> so a retry is an actual new network attempt.
function injectSqlJsScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SQL_JS_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Komponen sql.js gagal dimuat dari CDN."));
    document.head.appendChild(s);
  });
}

// Loads the sql.js WASM runtime from CDN. On failure (CDN blocked/down,
// slow network) the cached promise is cleared so the next call — e.g. the
// student clicking "Coba Lagi" on the error screen — actually retries
// instead of replaying the same rejection forever.
function loadSQL() {
  if (SQLPromise) return SQLPromise;
  SQLPromise = (async () => {
    if (typeof window.initSqlJs !== "function") await injectSqlJsScript();
    if (typeof window.initSqlJs !== "function") throw new Error("Komponen sql.js gagal dimuat dari CDN.");
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Waktu memuat sql.js habis (timeout) — koneksi internet mungkin terlalu lambat.")), SQL_LOAD_TIMEOUT_MS);
    });
    try {
      return await Promise.race([window.initSqlJs({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}` }), timeout]);
    } finally {
      clearTimeout(timer);
    }
  })().catch((e) => {
    SQLPromise = null;
    throw e;
  });
  return SQLPromise;
}

export class Sandbox {
  constructor(seedSql) {
    this.seedSql = seedSql;
    this.db = null;
  }

  async init() {
    const SQL = await loadSQL();
    this.db = new SQL.Database();
    if (this.seedSql) this.db.run(this.seedSql);
    return this;
  }

  reset() {
    if (this.db) this.db.close();
    this.db = null;
  }

  async restart() {
    this.reset();
    await this.init();
  }

  // Executes arbitrary SQL (possibly multiple statements). Returns
  // { ok, results, error }. `results` is sql.js's exec() output:
  // an array of { columns: string[], values: any[][] } — one per
  // statement that produced rows.
  run(sql) {
    if (!this.db) return { ok: false, error: "Sandbox belum siap." };
    try {
      const results = this.db.exec(sql);
      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  // Executes SQL statement-by-statement, tolerating conflicts that mean
  // "this exact thing was already applied successfully" (a redundant
  // CREATE TABLE/INDEX/VIEW/TRIGGER that already exists, or a re-inserted
  // duplicate row) instead of aborting the whole submission on them.
  //
  // Why this exists: Run and Submit share one persistent sandbox per level
  // (by design, so state carries across stages/attempts). A student who
  // tests a CREATE TABLE with Run, then Submits the same statement — or
  // who submits "CREATE TABLE ...; INSERT ...;" for a later stage after
  // an earlier stage already created that table — hits a genuine SQLite
  // error ("already exists" / "UNIQUE constraint failed") on a statement
  // that is not actually wrong. Grading should judge the *resulting
  // database state* (that's what validate()/referenceSql compare), not
  // whether every individual statement in a multi-statement submission
  // happened to be new. Statements that fail for any other reason (syntax
  // error, wrong column, etc.) still abort immediately, unchanged.
  runTolerant(sql) {
    if (!this.db) return { ok: false, error: "Sandbox belum siap.", results: [] };
    const statements = splitStatements(sql);
    const results = [];
    for (const stmt of statements) {
      try {
        const r = this.db.exec(stmt);
        if (r && r.length) results.push(...r);
      } catch (e) {
        const msg = e.message || String(e);
        const tolerable =
          (CREATE_OBJECT_RE.test(stmt) && /already exists/i.test(msg)) ||
          (INSERT_RE.test(stmt) && /unique constraint failed/i.test(msg));
        if (tolerable) continue;
        return { ok: false, error: msg, results };
      }
    }
    return { ok: true, results };
  }

  // Runs a read-only validator query, e.g. "SELECT * FROM t WHERE ..."
  query(sql, params) {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare(sql);
      if (params) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    } catch (e) {
      return [];
    }
  }

  // { tableName: [columnName, ...] } for every table and view — used to feed
  // editor autocomplete. Internal sqlite_* tables are left out.
  getSchemaMap() {
    const map = {};
    const objects = this.query("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
    for (const { name } of objects) map[name] = this.getTableInfo(name).map((c) => c.name);
    return map;
  }

  // Tables (not views) with their columns and declared foreign keys, for the
  // ER diagram: [{ name, columns: [{ name, type, pk }], fks: [{ column, refTable, refColumn }] }]
  getErdSchema() {
    const tables = this.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
    return tables.map(({ name }) => ({
      name,
      columns: this.getTableInfo(name).map((c) => ({ name: c.name, type: c.type || "TEXT", pk: c.pk > 0 })),
      fks: this.query(`PRAGMA foreign_key_list(${name})`).map((f) => ({ column: f.from, refTable: f.table, refColumn: f.to })),
    }));
  }

  // Lines of SQLite's EXPLAIN QUERY PLAN for one SELECT ("SCAN t", "SEARCH t
  // USING INDEX i (col=?)", "USE TEMP B-TREE FOR ORDER BY", ...), or null if
  // the statement can't be planned. Read-only: nothing is executed or changed.
  explainPlan(selectSql) {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(`EXPLAIN QUERY PLAN ${selectSql}`);
      const lines = [];
      while (stmt.step()) lines.push(String(stmt.getAsObject().detail));
      stmt.free();
      return lines;
    } catch (e) {
      return null;
    }
  }

  tableExists(name) {
    const rows = this.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [name]);
    return rows.length > 0;
  }

  getTableInfo(name) {
    return this.query(`PRAGMA table_info(${name})`);
  }
}

export function humanizeSqlError(message) {
  if (!message) return "Terjadi kesalahan tidak diketahui.";
  const m = message;
  if (/no such table: (\w+)/i.test(m)) {
    const t = m.match(/no such table: (\w+)/i)[1];
    return `Tabel "${t}" tidak ditemukan. Periksa kembali nama tabel pada Schema.`;
  }
  if (/no such column: (.+)/i.test(m)) {
    const c = m.match(/no such column: (.+)/i)[1];
    return `Kolom "${c}" tidak ditemukan. Periksa ejaan kolom pada Schema.`;
  }
  if (/syntax error/i.test(m)) {
    return `Syntax error pada query Anda: ${m}`;
  }
  if (/NOT NULL constraint failed: (.+)/i.test(m)) {
    const c = m.match(/NOT NULL constraint failed: (.+)/i)[1];
    return `Kolom "${c}" wajib diisi (NOT NULL constraint).`;
  }
  if (/UNIQUE constraint failed: (.+)/i.test(m)) {
    const c = m.match(/UNIQUE constraint failed: (.+)/i)[1];
    return `Nilai pada "${c}" harus unik (UNIQUE constraint gagal).`;
  }
  if (/FOREIGN KEY constraint failed/i.test(m)) {
    return `Foreign key constraint gagal — pastikan nilai referensi ada di tabel induk.`;
  }
  return m;
}
