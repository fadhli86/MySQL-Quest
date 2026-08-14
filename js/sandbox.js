// SQL sandbox wrapper around sql.js (SQLite compiled to WebAssembly).
// Every level gets its own isolated in-memory database seeded from the
// level's dataset script — nothing here ever touches a real server, so
// students can experiment freely and reset without any risk.

let SQLPromise = null;

function loadSQL() {
  if (!SQLPromise) {
    SQLPromise = window.initSqlJs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`,
    });
  }
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
