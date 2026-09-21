import { Sandbox, humanizeSqlError } from "../sandbox.js";
import { enableSchemaAutocomplete, makeEditorAccessible } from "../editor-hint.js";
import { el, clear, confirmModal, toast } from "../ui.js";

const PLAYGROUND_SQL = `
CREATE TABLE departments (
  dept_id INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL,
  dept_code TEXT NOT NULL
);
INSERT INTO departments VALUES
(1,'Teknik Informatika','TI'),(2,'Sistem Informasi','SI'),(3,'Manajemen','MJ'),(4,'Akuntansi','AK');

CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id),
  gpa REAL,
  enrollment_year INTEGER,
  city TEXT
);
INSERT INTO students VALUES
(1,'Andi Saputra','andi@asia.ac.id',1,3.42,2023,'Malang'),
(2,'Budi Santoso','budi@asia.ac.id',2,3.10,2022,'Surabaya'),
(3,'Citra Ayu','citra@asia.ac.id',1,3.78,2023,'Malang'),
(4,'Dewi Lestari','dewi@asia.ac.id',3,2.95,2021,'Malang'),
(5,'Eka Prasetyo','eka@asia.ac.id',4,3.25,2022,'Batu'),
(6,'Fajar Nugroho','fajar@asia.ac.id',2,3.55,2023,'Surabaya'),
(7,'Gita Ramadhani','gita@asia.ac.id',1,3.90,2021,'Malang'),
(8,'Hendra Wijaya','hendra@asia.ac.id',3,2.80,2022,'Kediri'),
(9,'Indah Permata','indah@asia.ac.id',4,3.15,2023,'Malang'),
(10,'Joko Ferdinand','joko@asia.ac.id',2,2.60,2021,'Surabaya');

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id)
);
INSERT INTO courses VALUES
(101,'Basis Data',3,1),(102,'Pemrograman Web',3,1),(103,'Struktur Data',3,1),
(201,'Analisis Sistem Informasi',3,2),(202,'Manajemen Proyek TI',2,2),
(301,'Pengantar Manajemen',3,3),(401,'Akuntansi Dasar',3,4);

CREATE TABLE lecturers (
  lecturer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id)
);
INSERT INTO lecturers VALUES
(1,'Dr. Rina Marlina',1),(2,'Bambang Sutrisno, M.Kom',1),(3,'Sri Wahyuni, M.T',2),(4,'Agus Salim, M.M',3),(5,'Dian Puspita, M.Ak',4);

CREATE TABLE classes (
  class_id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  lecturer_id INTEGER NOT NULL REFERENCES lecturers(lecturer_id),
  semester TEXT NOT NULL,
  room TEXT
);
INSERT INTO classes VALUES
(1,101,1,'Ganjil 2025/2026','A101'),(2,102,2,'Ganjil 2025/2026','A102'),(3,103,1,'Ganjil 2025/2026','A103'),
(4,201,3,'Ganjil 2025/2026','B201'),(5,202,3,'Ganjil 2025/2026','B202'),
(6,301,4,'Ganjil 2025/2026','C301'),(7,401,5,'Ganjil 2025/2026','D401');

CREATE TABLE enrollments (
  enrollment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  semester TEXT NOT NULL,
  score REAL
);
INSERT INTO enrollments VALUES
(1,1,101,'Ganjil 2025/2026',88),(2,1,102,'Ganjil 2025/2026',76),(3,1,103,'Ganjil 2025/2026',91),
(4,2,201,'Ganjil 2025/2026',65),(5,2,202,'Ganjil 2025/2026',70),
(6,3,101,'Ganjil 2025/2026',95),(7,3,102,'Ganjil 2025/2026',89),(8,3,103,'Ganjil 2025/2026',93),
(9,4,301,'Ganjil 2025/2026',80),(10,5,401,'Ganjil 2025/2026',85),
(11,6,201,'Ganjil 2025/2026',90),(12,6,202,'Ganjil 2025/2026',88),
(13,7,101,'Ganjil 2025/2026',98),(14,7,102,'Ganjil 2025/2026',94),(15,7,103,'Ganjil 2025/2026',97),
(16,8,301,'Ganjil 2025/2026',60),(17,9,401,'Ganjil 2025/2026',72),
(18,10,201,'Ganjil 2025/2026',55),(19,10,202,'Ganjil 2025/2026',58),(20,2,101,'Ganjil 2025/2026',68);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
INSERT INTO payments VALUES
(1,1,1500000,'2025-08-01','paid'),(2,2,1500000,'2025-08-02','pending'),(3,3,1500000,'2025-08-01','paid'),
(4,4,1200000,'2025-08-03','paid'),(5,5,1200000,'2025-08-05','pending'),(6,6,1500000,'2025-08-01','paid');
`;

export async function renderPlayground() {
  const root = el("div", { class: "page-quest-root" });
  const header = el("div", { class: "quest-header" }, [
    el("div", { class: "qtitle" }, "⌨️ SQL Playground — ASIA Smart Campus (Full Dataset)"),
  ]);
  const body = el("div", { style: "display:flex;flex-direction:column;gap:0;flex:1;min-height:0;" });
  const panels = el("div", { class: "quest-panels no-quest" });
  const panelEditor = el("div", { class: "panel panel-editor active" });
  const panelSchema = el("div", { class: "panel panel-schema" });
  const panelResult = el("div", { class: "panel panel-result active" });
  panels.append(panelEditor, panelSchema, panelResult);

  const tabsBar = el("div", { class: "quest-tabs" }, [
    el("button", { class: "tab-btn active", "data-t": "editor" }, "⌨️ Editor"),
    el("button", { class: "tab-btn", "data-t": "schema" }, "🗂️ Schema"),
    el("button", { class: "tab-btn", "data-t": "result" }, "📊 Result"),
  ]);
  Array.from(tabsBar.children).forEach((btn) => {
    btn.addEventListener("click", () => {
      Array.from(tabsBar.children).forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      [panelEditor, panelSchema, panelResult].forEach((p) => p.classList.remove("active"));
      ({ editor: panelEditor, schema: panelSchema, result: panelResult }[btn.dataset.t]).classList.add("active");
      if (btn.dataset.t === "editor") setTimeout(() => cm.refresh(), 20);
    });
  });

  root.append(header, tabsBar, panels);

  panelSchema.appendChild(el("div", { class: "empty-state" }, [el("div", { class: "spinner" }), el("p", {}, "Menyiapkan sandbox...")]));

  const sandbox = await new Sandbox(PLAYGROUND_SQL).init();

  const toolbar = el("div", { class: "editor-toolbar" }, [
    el("button", { class: "btn btn-sm btn-danger" }, "🗄 Reset Sandbox"),
  ]);
  const cmHost = el("div", {});
  const editorWrap = el("div", { class: "editor-wrap" }, [cmHost]);
  const runRow = el("div", { class: "editor-toolbar", style: "margin-top:8px;" }, [
    el("button", { class: "btn btn-primary btn-block" }, "▶ Run Query"),
  ]);
  panelEditor.append(toolbar, editorWrap, runRow);

  const cm = CodeMirror(cmHost, {
    value: "SELECT s.full_name, d.dept_name, s.gpa\nFROM students s\nJOIN departments d ON s.dept_id = d.dept_id\nORDER BY s.gpa DESC;",
    mode: "text/x-mysql",
    theme: "dracula",
    lineNumbers: true,
    matchBrackets: true,
    extraKeys: { "Ctrl-Space": "autocomplete" },
  });
  enableSchemaAutocomplete(cm, () => sandbox.getSchemaMap());
  makeEditorAccessible(cm, "Editor SQL playground — tulis query Anda di sini. Tekan Tab untuk keluar dari editor.");
  setTimeout(() => cm.refresh(), 30);

  toolbar.firstChild.addEventListener("click", async () => {
    const ok = await confirmModal({ title: "Reset Sandbox?", body: "Seluruh perubahan data pada playground akan dikembalikan ke kondisi awal.", confirmLabel: "Reset", danger: true });
    if (!ok) return;
    await sandbox.restart();
    toast("Sandbox playground direset.");
    renderSchema();
    clear(panelResult);
    panelResult.appendChild(el("div", { class: "empty-hint" }, "Jalankan query untuk melihat hasil."));
  });

  function run() {
    const sql = cm.getValue();
    const res = sandbox.run(sql);
    clear(panelResult);
    if (!res.ok) {
      panelResult.appendChild(el("div", { class: "error-box" }, humanizeSqlError(res.error)));
      renderSchema();
      return;
    }
    if (!res.results.length) {
      panelResult.appendChild(el("div", { class: "empty-hint" }, "Query berhasil dijalankan (tidak ada baris hasil, mis. DDL/DML)."));
    } else {
      const last = res.results[res.results.length - 1];
      const table = el("table", { class: "result-table" }, [
        el("thead", {}, [el("tr", {}, last.columns.map((c) => el("th", {}, c)))]),
        el("tbody", {}, last.values.slice(0, 200).map((row) => el("tr", {}, row.map((v) => el("td", {}, v === null ? "NULL" : String(v)))))),
      ]);
      panelResult.appendChild(el("div", { class: "result-meta" }, [el("span", {}, ["Baris: ", el("b", {}, String(last.values.length))])]));
      panelResult.appendChild(el("div", { class: "table-scroll" }, table));
    }
    renderSchema();
  }
  runRow.firstChild.addEventListener("click", run);

  function renderSchema() {
    clear(panelSchema);
    panelSchema.appendChild(el("div", { class: "section-title" }, "Schema"));
    for (const t of ["departments", "students", "courses", "lecturers", "classes", "enrollments", "payments"]) {
      if (!sandbox.tableExists(t)) continue;
      const info = sandbox.getTableInfo(t);
      const block = el("div", { class: "schema-table" }, [el("div", { class: "tname" }, t)]);
      info.forEach((c) => {
        block.appendChild(el("div", { class: "schema-col" }, [el("span", { class: "cname" }, c.name), el("span", { class: "ctype" }, c.type || "TEXT")]));
      });
      panelSchema.appendChild(block);
    }
  }
  renderSchema();
  panelResult.appendChild(el("div", { class: "empty-hint" }, "Jalankan query untuk melihat hasil."));

  return root;
}
