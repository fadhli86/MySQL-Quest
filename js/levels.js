// Content data for all 14 levels of MYSQL QUEST, derived from
// "Grand Design MYSQL QUEST" and "Blueprint Gameplay MYSQL QUEST".
//
// Case study: ASIA SMART CAMPUS (per Grand Design §14), a dataset that
// grows level by level. The sandbox engine is SQLite (via sql.js) running
// entirely in the browser — see js/sandbox.js. Core SQL taught (SELECT,
// JOIN, GROUP BY, subquery, VIEW, INDEX, TRIGGER, transactions) is
// standard SQL shared with MySQL; a few MySQL-only features (stored
// PROCEDURE/FUNCTION, user privilege management) aren't executable in
// SQLite and are covered as reference material instead of hands-on
// exercises — noted explicitly where relevant (Level 13, Level 14).

// ---------------------------------------------------------------------
// Reusable dataset fragments (SQL) — composed per level below.
// ---------------------------------------------------------------------
const F = {
  departments: `
CREATE TABLE departments (
  dept_id INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL,
  dept_code TEXT NOT NULL
);
INSERT INTO departments (dept_id, dept_name, dept_code) VALUES
(1,'Teknik Informatika','TI'),
(2,'Sistem Informasi','SI'),
(3,'Manajemen','MJ'),
(4,'Akuntansi','AK');
`,

  studentsFlat: `
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  gpa REAL,
  city TEXT
);
INSERT INTO students (student_id, full_name, email, department, gpa, city) VALUES
(1,'Andi Saputra','andi@asia.ac.id','Teknik Informatika',3.42,'Malang'),
(2,'Budi Santoso','budi@asia.ac.id','Sistem Informasi',3.10,'Surabaya'),
(3,'Citra Ayu','citra@asia.ac.id','Teknik Informatika',3.78,'Malang'),
(4,'Dewi Lestari','dewi@asia.ac.id','Manajemen',2.95,'Malang'),
(5,'Eka Prasetyo','eka@asia.ac.id','Akuntansi',3.25,'Batu'),
(6,'Fajar Nugroho','fajar@asia.ac.id','Sistem Informasi',3.55,'Surabaya'),
(7,'Gita Ramadhani','gita@asia.ac.id','Teknik Informatika',3.90,'Malang'),
(8,'Hendra Wijaya','hendra@asia.ac.id','Manajemen',2.80,'Kediri');
`,

  students: `
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id),
  gpa REAL,
  enrollment_year INTEGER,
  city TEXT
);
INSERT INTO students (student_id, full_name, email, dept_id, gpa, enrollment_year, city) VALUES
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
`,

  courses: `
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id)
);
INSERT INTO courses (course_id, course_name, credits, dept_id) VALUES
(101,'Basis Data',3,1),
(102,'Pemrograman Web',3,1),
(103,'Struktur Data',3,1),
(201,'Analisis Sistem Informasi',3,2),
(202,'Manajemen Proyek TI',2,2),
(301,'Pengantar Manajemen',3,3),
(401,'Akuntansi Dasar',3,4);
`,

  lecturers: `
CREATE TABLE lecturers (
  lecturer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  dept_id INTEGER NOT NULL REFERENCES departments(dept_id)
);
INSERT INTO lecturers (lecturer_id, full_name, dept_id) VALUES
(1,'Dr. Rina Marlina',1),
(2,'Bambang Sutrisno, M.Kom',1),
(3,'Sri Wahyuni, M.T',2),
(4,'Agus Salim, M.M',3),
(5,'Dian Puspita, M.Ak',4);
`,

  classes: `
CREATE TABLE classes (
  class_id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  lecturer_id INTEGER NOT NULL REFERENCES lecturers(lecturer_id),
  semester TEXT NOT NULL,
  room TEXT
);
INSERT INTO classes (class_id, course_id, lecturer_id, semester, room) VALUES
(1,101,1,'Ganjil 2025/2026','A101'),
(2,102,2,'Ganjil 2025/2026','A102'),
(3,103,1,'Ganjil 2025/2026','A103'),
(4,201,3,'Ganjil 2025/2026','B201'),
(5,202,3,'Ganjil 2025/2026','B202'),
(6,301,4,'Ganjil 2025/2026','C301'),
(7,401,5,'Ganjil 2025/2026','D401');
`,

  enrollments: `
CREATE TABLE enrollments (
  enrollment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  semester TEXT NOT NULL,
  score REAL
);
INSERT INTO enrollments (enrollment_id, student_id, course_id, semester, score) VALUES
(1,1,101,'Ganjil 2025/2026',88),
(2,1,102,'Ganjil 2025/2026',76),
(3,1,103,'Ganjil 2025/2026',91),
(4,2,201,'Ganjil 2025/2026',65),
(5,2,202,'Ganjil 2025/2026',70),
(6,3,101,'Ganjil 2025/2026',95),
(7,3,102,'Ganjil 2025/2026',89),
(8,3,103,'Ganjil 2025/2026',93),
(9,4,301,'Ganjil 2025/2026',80),
(10,5,401,'Ganjil 2025/2026',85),
(11,6,201,'Ganjil 2025/2026',90),
(12,6,202,'Ganjil 2025/2026',88),
(13,7,101,'Ganjil 2025/2026',98),
(14,7,102,'Ganjil 2025/2026',94),
(15,7,103,'Ganjil 2025/2026',97),
(16,8,301,'Ganjil 2025/2026',60),
(17,9,401,'Ganjil 2025/2026',72),
(18,10,201,'Ganjil 2025/2026',55),
(19,10,202,'Ganjil 2025/2026',58),
(20,2,101,'Ganjil 2025/2026',68);
`,

  payments: `
CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
INSERT INTO payments (payment_id, student_id, amount, payment_date, status) VALUES
(1,1,1500000,'2025-08-01','paid'),
(2,2,1500000,'2025-08-02','pending'),
(3,3,1500000,'2025-08-01','paid'),
(4,4,1200000,'2025-08-03','paid'),
(5,5,1200000,'2025-08-05','pending'),
(6,6,1500000,'2025-08-01','paid');
`,

  rawRegistrations: `
CREATE TABLE raw_registrations (
  reg_id INTEGER PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_city TEXT,
  course_name TEXT NOT NULL,
  course_credits INTEGER,
  lecturer_name TEXT
);
INSERT INTO raw_registrations (reg_id, student_name, student_city, course_name, course_credits, lecturer_name) VALUES
(1,'Andi Saputra','Malang','Basis Data',3,'Dr. Rina Marlina'),
(2,'Andi Saputra','Malang','Pemrograman Web',3,'Bambang Sutrisno, M.Kom'),
(3,'Citra Ayu','Malang','Basis Data',3,'Dr. Rina Marlina'),
(4,'Citra Ayu','Malang','Struktur Data',3,'Dr. Rina Marlina'),
(5,'Budi Santoso','Surabaya','Analisis Sistem Informasi',3,'Sri Wahyuni, M.T'),
(6,'Fajar Nugroho','Surabaya','Analisis Sistem Informasi',3,'Sri Wahyuni, M.T');
`,

  paymentAudit: `
CREATE TABLE payment_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER,
  action TEXT,
  changed_at TEXT
);
`,
};

// ---------------------------------------------------------------------
// Small validate() helpers shared across levels
// ---------------------------------------------------------------------
function colInfo(sandbox, table, name) {
  return sandbox.getTableInfo(table).find((c) => c.name.toLowerCase() === name.toLowerCase());
}

function tableShapeOk(sandbox, table, required) {
  if (!sandbox.tableExists(table)) return { passed: false, message: `Tabel "${table}" belum ditemukan.` };
  for (const r of required) {
    const c = colInfo(sandbox, table, r.name);
    if (!c) return { passed: false, message: `Kolom "${r.name}" belum ada pada tabel "${table}".` };
    if (r.type && c.type.toUpperCase() !== r.type.toUpperCase()) {
      return { passed: false, message: `Kolom "${r.name}" seharusnya bertipe ${r.type}.` };
    }
    if (r.pk && c.pk !== 1) return { passed: false, message: `Kolom "${r.name}" seharusnya menjadi PRIMARY KEY.` };
    if (r.notnull && c.notnull !== 1 && c.pk !== 1) return { passed: false, message: `Kolom "${r.name}" seharusnya NOT NULL.` };
  }
  return { passed: true };
}

function rowCountWhere(sandbox, table, where) {
  const rows = sandbox.query(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`);
  return rows.length ? rows[0].c : 0;
}

// =======================================================================
// LEVEL DEFINITIONS
// =======================================================================
export const LEVELS = [
  // ---------------------------------------------------------------- L1
  {
    id: 1,
    code: "L01",
    title: "Database Rookie",
    questTitle: "Database Detective",
    cpmk: "CPMK-1",
    subCpmk: "SubCPMK-1.1",
    competency: "Identifikasi DBMS/RDBMS, tabel, record, key",
    badgeIcon: "🔎",
    masteryThreshold: 80,
    tables: ["students"],
    datasetSql: F.studentsFlat,
    story: "Selamat datang, Junior Database Engineer! ASIA Smart Campus baru saja memberi Anda akses ke satu tabel data mahasiswa. Sebelum menulis SQL yang rumit, seorang Database Detective harus lebih dulu mengenali anatomi sebuah database.",
    microlearning: [
      { heading: "DBMS & RDBMS", body: "DBMS (Database Management System) adalah perangkat lunak untuk menyimpan dan mengelola data, seperti MySQL. RDBMS adalah DBMS yang menyimpan data dalam bentuk tabel-tabel relasional yang saling terhubung." },
      { heading: "Tabel, Baris, Kolom", body: "Sebuah tabel tersusun dari baris (record) dan kolom (field/atribut). Satu baris merepresentasikan satu entitas nyata — pada tabel students, satu baris = satu mahasiswa." },
      { heading: "Primary Key", body: "Primary key adalah kolom (atau kombinasi kolom) yang nilainya unik dan tidak boleh kosong untuk setiap baris, digunakan untuk mengidentifikasi record secara pasti — misalnya student_id." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Inspect", instruction: "Jalankan query berikut untuk melihat seluruh data mahasiswa ASIA Smart Campus.", starterSql: "SELECT * FROM students;", xp: 10, graded: false },
      { id: "s2", type: "quiz", title: "Classify: Primary Key", question: "Kolom manakah yang paling tepat dijadikan PRIMARY KEY pada tabel students?", options: ["student_id", "full_name", "email", "gpa"], correctIndex: 0, explainWrongByOption: [null, "Nama bisa sama antar mahasiswa dan bisa berubah, sehingga tidak dapat mengidentifikasi satu baris secara pasti.", "Email memang cenderung unik, tetapi bisa berganti dan bisa kosong (NULL). Primary key harus unik, tidak boleh NULL, dan stabil — email lebih cocok diberi UNIQUE constraint.", "IPK sangat mungkin sama untuk banyak mahasiswa dan berubah tiap semester, jadi tidak unik maupun stabil."], explainCorrect: "Tepat — student_id bersifat unik dan tidak berubah untuk setiap mahasiswa, kandidat ideal primary key.", explainWrong: "Kolom yang bisa berulang atau berubah nilainya bukan kandidat primary key yang baik.", xp: 10, graded: false },
      { id: "s3", type: "quiz", title: "Classify: Record", question: "Satu baris (row) pada tabel students merepresentasikan apa?", options: ["Satu mahasiswa (record)", "Satu kolom data", "Satu database", "Satu perintah SQL"], correctIndex: 0, explainWrongByOption: [null, "Kolom (field) adalah atribut seperti full_name atau gpa; satu baris berisi nilai semua kolom untuk satu mahasiswa.", "Database adalah kumpulan tabel; satu baris hanyalah satu entri di dalam satu tabel.", "Perintah SQL (mis. SELECT) adalah instruksi untuk mengakses data, bukan data itu sendiri."], explainCorrect: "Benar — satu baris adalah satu record/entitas, dalam hal ini satu mahasiswa.", xp: 10, graded: false },
      {
        id: "s4", type: "sql", title: "Mini Quest: Kolom Terpilih", graded: true, weight: 1, xp: 30,
        instruction: "Tampilkan hanya kolom full_name dan department dari seluruh mahasiswa.",
        starterSql: "SELECT ____ FROM students;",
        referenceSql: "SELECT full_name, department FROM students;",
        hints: ["SELECT menentukan kolom apa saja yang ditampilkan.", "Sebutkan nama kolom dipisah koma: full_name, department.", "Coba: SELECT full_name, department FROM students;"],
      },
      {
        id: "s5", type: "sql", title: "Challenge: Detective Malang", graded: true, weight: 2, xp: 50, noHintBonus: true, perfectBonus: true, portfolio: true,
        instruction: "Database Detective ingin tahu siapa saja mahasiswa yang berasal dari kota Malang. Tampilkan full_name dan gpa mereka.",
        starterSql: "-- Tulis query Anda di sini\n",
        referenceSql: "SELECT full_name, gpa FROM students WHERE city = 'Malang';",
        requiredConstructs: ["WHERE"],
        hints: ["Perhatikan kolom mana yang menyimpan kota mahasiswa pada tab Schema.", "Gunakan klausa WHERE untuk memfilter baris.", "Coba: SELECT full_name, gpa FROM students WHERE city = 'Malang';"],
      },
    ],
  },

  // ---------------------------------------------------------------- L2
  {
    id: 2,
    code: "L02",
    title: "Data Architect",
    questTitle: "ERD Puzzle",
    cpmk: "CPMK-2",
    subCpmk: "SubCPMK-2.1",
    competency: "Entity, attribute, relationship, cardinality",
    badgeIcon: "🧩",
    masteryThreshold: 80,
    tables: ["departments", "students"],
    datasetSql: F.departments + F.studentsFlat,
    story: "Data Architect mengamati bahwa kolom department pada tabel students berisi teks bebas yang berulang. Sebelum membangun ulang skema secara relasional, Anda perlu memahami entity, atribut, dan kardinalitas hubungan antar entity.",
    microlearning: [
      { heading: "Entity & Attribute", body: "Entity adalah objek nyata yang datanya disimpan (mis. Student, Department). Attribute adalah properti dari entity tersebut (mis. full_name, gpa)." },
      { heading: "Relationship & Cardinality", body: "Relationship menyatakan bagaimana dua entity berhubungan. Cardinality menyatakan jumlah keterhubungannya: one-to-one, one-to-many, atau many-to-many." },
    ],
    stages: [
      { id: "s1", type: "quiz", title: "Cardinality", question: "Satu department dapat memiliki banyak mahasiswa, tetapi satu mahasiswa hanya terdaftar pada satu department. Apa jenis kardinalitas ini?", options: ["One-to-Many", "Many-to-Many", "One-to-One", "Tidak ada relasi"], correctIndex: 0, explainWrongByOption: [null, "Many-to-Many berarti satu mahasiswa juga bisa terdaftar di banyak department. Di sini mahasiswa hanya di satu department, jadi salah satu sisi relasinya 'satu'.", "One-to-One berarti satu department hanya punya satu mahasiswa, padahal satu department punya banyak mahasiswa.", "Relasinya ada: students.dept_id merujuk ke departments.dept_id."], explainCorrect: "Benar — dari sisi department ke students adalah one-to-many.", xp: 10, graded: false },
      { id: "s2", type: "quiz", title: "Menghubungkan Entity", question: "Agar tabel students terhubung secara relasional ke departments, kolom apa yang sebaiknya ditambahkan pada tabel students?", options: ["dept_id sebagai foreign key merujuk ke departments.dept_id", "Menyalin seluruh kolom departments ke students", "Menghapus tabel departments", "Mengubah primary key students menjadi dept_id"], correctIndex: 0, explainWrongByOption: [null, "Menyalin seluruh kolom department ke students menimbulkan redundansi: data department terulang di setiap baris mahasiswa dan rawan tidak konsisten.", "Menghapus departments menghilangkan data yang justru ingin dihubungkan; relasi dibuat dengan foreign key, bukan dengan menghapus tabel.", "Primary key students tetap student_id (identitas mahasiswa). dept_id tidak unik per mahasiswa, jadi tidak cocok menjadi primary key students."], explainCorrect: "Tepat — dengan dept_id sebagai foreign key di students yang merujuk ke departments.dept_id, setiap mahasiswa terhubung ke satu department tanpa menyalin data department.", xp: 10, graded: false },
      { id: "s3", type: "quiz", title: "Entity ke Tabel", question: "Sebuah entity pada ERD umumnya diimplementasikan menjadi apa pada database relasional?", options: ["Tabel", "Kolom", "Baris", "Index"], correctIndex: 0, explainWrongByOption: [null, "Kolom mengimplementasikan atribut sebuah entity (mis. nama, IPK), bukan entity-nya.", "Baris mengimplementasikan satu instance/record dari entity, bukan entity itu sendiri.", "Index adalah struktur bantu untuk mempercepat pencarian; bukan hasil pemetaan entity ERD."], explainCorrect: "Benar — setiap entity pada ERD (mis. Student, Department) diimplementasikan menjadi satu tabel; atribut menjadi kolom dan instance-nya menjadi baris.", xp: 10, graded: false },
      {
        id: "s4", type: "sql", title: "Mini Quest: Daftar Department", graded: true, weight: 1, xp: 30,
        instruction: "Sebagai persiapan transisi, tampilkan dept_name dan dept_code dari seluruh department, diurutkan A-Z berdasarkan dept_name.",
        starterSql: "SELECT ____ FROM departments ORDER BY ____;",
        referenceSql: "SELECT dept_name, dept_code FROM departments ORDER BY dept_name ASC;",
        requiredConstructs: ["ORDER BY"],
        hints: ["Gunakan ORDER BY nama_kolom untuk mengurutkan.", "Tambahkan ASC untuk urutan A-Z (opsional, default sudah ASC).", "Coba: SELECT dept_name, dept_code FROM departments ORDER BY dept_name ASC;"],
      },
      {
        id: "s5", type: "sql", title: "Challenge: Jejak Redundansi", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Buktikan masalah desain saat ini: tampilkan daftar UNIK nama department yang tertulis sebagai teks bebas pada tabel students, diurutkan A-Z. Perhatikan — ini menunjukkan mengapa data department seharusnya tidak disimpan berulang sebagai teks.",
        starterSql: "-- gunakan DISTINCT\n",
        referenceSql: "SELECT DISTINCT department FROM students ORDER BY department ASC;",
        requiredConstructs: ["DISTINCT"],
        hints: ["DISTINCT menghapus duplikat pada hasil query.", "Terapkan DISTINCT pada kolom department.", "Coba: SELECT DISTINCT department FROM students ORDER BY department ASC;"],
      },
    ],
  },

  // ---------------------------------------------------------------- L3
  {
    id: 3,
    code: "L03",
    title: "Schema Builder",
    questTitle: "Build the Kingdom",
    cpmk: "CPMK-3",
    subCpmk: "SubCPMK-3.1",
    competency: "CREATE DATABASE/TABLE, datatype, PK/FK",
    badgeIcon: "🏰",
    masteryThreshold: 80,
    bossBattle: true,
    bossLabel: "Mini Boss A",
    tables: ["departments", "courses"],
    datasetSql: F.departments,
    story: "Kerajaan data ASIA Smart Campus butuh istana yang kokoh. departments sudah berdiri — kini giliran Anda membangun tabel courses yang relasional dan menghubungkannya ke departments. Ini juga Mini Boss pertama Anda, menutup kompetensi Level 1–3.",
    microlearning: [
      { heading: "CREATE TABLE", body: "Sintaks dasar: CREATE TABLE nama_tabel (kolom1 TIPE constraint, kolom2 TIPE constraint, ...);" },
      { heading: "Tipe Data Umum", body: "INTEGER untuk bilangan bulat, TEXT untuk string, REAL untuk desimal. PRIMARY KEY menandai kolom identitas unik; REFERENCES menandai foreign key ke tabel lain." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Inspect Kingdom", instruction: "Lihat dulu tabel departments yang sudah berdiri.", starterSql: "SELECT * FROM departments;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: Foreign Key", question: "Pada tabel courses, kolom dept_id dimaksudkan menunjuk ke program studi pemilik mata kuliah. Constraint apa yang tepat untuk menegakkan hubungan itu?", options: ["PRIMARY KEY pada dept_id", "FOREIGN KEY (dept_id) REFERENCES departments(dept_id)", "NOT NULL saja pada dept_id", "DEFAULT 0 pada dept_id"], correctIndex: 1, explainCorrect: "Tepat — FOREIGN KEY membuat setiap dept_id di courses harus ada di departments, sehingga relasi antar tabel terjaga.", explainWrongByOption: ["PRIMARY KEY mengidentifikasi baris courses itu sendiri dan harus unik; banyak mata kuliah bisa berasal dari satu program studi, jadi dept_id bukan primary key.", null, "NOT NULL hanya melarang kosong; nilai dept_id yang tidak ada di departments tetap bisa masuk.", "DEFAULT hanya memberi nilai bawaan; tidak memastikan nilainya merujuk ke baris yang ada di departments."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Tipe Data", question: "Tipe data mana yang paling tepat untuk kolom credits (jumlah SKS, mis. 3)?", options: ["TEXT", "DATE", "INTEGER", "BLOB"], correctIndex: 2, explainCorrect: "Benar — SKS adalah bilangan bulat, sehingga INTEGER memungkinkan penjumlahan, perbandingan, dan pengurutan numerik yang benar.", explainWrongByOption: ["Sebagai teks, nilai diurutkan per karakter ('10' dianggap lebih kecil dari '3') dan tidak bisa dijumlahkan dengan benar.", "DATE untuk tanggal, bukan bilangan.", null, "BLOB untuk data biner seperti file atau gambar, bukan angka."], xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: Bangun Tabel Courses", graded: true, weight: 1, xp: 30,
        instruction: "Buat tabel baru bernama courses dengan kolom: course_id (INTEGER PRIMARY KEY), course_name (TEXT, wajib diisi), credits (INTEGER), dept_id (INTEGER, merujuk departments.dept_id).",
        starterSql: "CREATE TABLE courses (\n  \n);",
        requiredConstructs: ["CREATE TABLE"],
        validate: (sandbox) => tableShapeOk(sandbox, "courses", [
          { name: "course_id", pk: true },
          { name: "course_name", notnull: true },
          { name: "credits" },
          { name: "dept_id" },
        ]),
        hints: [
          "Gunakan CREATE TABLE nama_tabel (...);",
          "Definisikan course_id sebagai INTEGER PRIMARY KEY.",
          "Tambahkan course_name TEXT NOT NULL, credits INTEGER, dept_id INTEGER.",
          "Contoh kerangka: CREATE TABLE courses (course_id INTEGER PRIMARY KEY, course_name TEXT NOT NULL, credits INTEGER, dept_id INTEGER REFERENCES departments(dept_id));",
        ],
      },
      {
        id: "s3", type: "sql", title: "⚔ Mini Boss: Isi Program Studi TI", graded: true, weight: 2, xp: 100, noHintBonus: true, portfolio: true, bossBattle: true,
        instruction: "Isi tabel courses yang baru dibuat dengan 3 mata kuliah program studi Teknik Informatika (dept_id = 1): course_id 101 'Basis Data' (3 sks), course_id 102 'Pemrograman Web' (3 sks), course_id 103 'Struktur Data' (3 sks).",
        starterSql: "INSERT INTO courses (course_id, course_name, credits, dept_id) VALUES\n  ;",
        requiredConstructs: ["INSERT INTO"],
        validate: (sandbox) => {
          if (!sandbox.tableExists("courses")) return { passed: false, message: "Tabel courses belum ada — selesaikan Mini Quest terlebih dahulu." };
          const need = [[101, "Basis Data", 3], [102, "Pemrograman Web", 3], [103, "Struktur Data", 3]];
          for (const [id, name, credits] of need) {
            const c = rowCountWhere(sandbox, "courses", `course_id=${id} AND course_name='${name}' AND credits=${credits} AND dept_id=1`);
            if (c < 1) return { passed: false, message: `Data course_id=${id} ('${name}') belum ditemukan sesuai spesifikasi.` };
          }
          return { passed: true };
        },
        hints: [
          "Gunakan INSERT INTO courses (kolom...) VALUES (...), (...), (...);",
          "Anda bisa menyisipkan 3 baris sekaligus dengan koma di antara setiap tanda kurung.",
          "Pastikan dept_id = 1 untuk ketiga mata kuliah ini.",
          "Contoh baris pertama: (101, 'Basis Data', 3, 1)",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- L4
  {
    id: 4,
    code: "L04",
    title: "CRUD Ranger",
    questTitle: "CRUD Mission",
    cpmk: "CPMK-4",
    subCpmk: "SubCPMK-4.1",
    competency: "INSERT, UPDATE, DELETE",
    badgeIcon: "🛠️",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses"],
    datasetSql: F.departments + F.students + F.courses,
    story: "Sistem akademik ASIA Smart Campus butuh Ranger yang sigap mengubah data harian: mahasiswa baru mendaftar, GPA diperbarui tiap semester, dan sesekali ada data yang perlu dihapus. Ingat: DELETE/UPDATE tanpa WHERE bisa menghapus seluruh tabel — gunakan tombol Reset Sandbox bila terjadi.",
    microlearning: [
      { heading: "INSERT", body: "INSERT INTO tabel (kolom...) VALUES (nilai...); menambahkan baris baru." },
      { heading: "UPDATE & DELETE", body: "UPDATE tabel SET kolom=nilai WHERE kondisi; mengubah baris tertentu. DELETE FROM tabel WHERE kondisi; menghapus baris tertentu. WHERE wajib ada agar tidak mengenai seluruh tabel." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Coba INSERT", instruction: "Jalankan contoh berikut lalu amati hasil SELECT-nya.", starterSql: "INSERT INTO students (student_id, full_name, email, dept_id, gpa, enrollment_year, city)\nVALUES (99,'Mahasiswa Uji','uji@asia.ac.id',1,3.0,2024,'Malang');\nSELECT * FROM students WHERE student_id = 99;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: UPDATE tanpa WHERE", question: "Apa yang terjadi jika Anda menjalankan UPDATE students SET gpa = 4.0; tanpa klausa WHERE?", options: ["Hanya baris pertama yang berubah", "Semua baris pada tabel students ikut berubah", "Perintah selalu ditolak karena WHERE wajib", "Tidak ada yang berubah sampai Anda menjalankan COMMIT"], correctIndex: 1, explainCorrect: "Tepat — tanpa WHERE, UPDATE berlaku untuk seluruh baris. Selalu periksa WHERE sebelum menjalankan UPDATE atau DELETE.", explainWrongByOption: ["UPDATE tidak berhenti di baris pertama; tanpa penyaring, semua baris yang ada diubah.", null, "SQL tidak mewajibkan WHERE. Hanya mode pengaman tertentu (mis. safe updates di klien MySQL) yang menolaknya, sehingga jangan mengandalkannya.", "Dalam mode autocommit (bawaan), perubahan langsung permanen tanpa perlu COMMIT."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Menghapus Satu Baris", question: "Perintah mana yang menghapus HANYA mahasiswa dengan student_id = 10?", options: ["DELETE FROM students;", "DROP TABLE students;", "UPDATE students SET student_id = NULL WHERE student_id = 10;", "DELETE FROM students WHERE student_id = 10;"], correctIndex: 3, explainCorrect: "Benar — DELETE FROM ... WHERE menghapus baris yang memenuhi kondisi saja.", explainWrongByOption: ["Tanpa WHERE, DELETE menghapus seluruh baris pada tabel.", "DROP TABLE menghapus seluruh tabel beserta strukturnya, bukan satu baris.", "UPDATE tidak menghapus baris; ia hanya mengubah nilai kolom, dan primary key tidak boleh dikosongkan.", null], xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: Perbarui GPA", graded: true, weight: 1, xp: 30,
        instruction: "Perbarui GPA mahasiswa dengan student_id = 4 (Dewi Lestari) menjadi 3.20.",
        starterSql: "UPDATE students SET ____ WHERE ____;",
        requiredConstructs: ["UPDATE", "WHERE"],
        validate: (sandbox) => {
          const rows = sandbox.query("SELECT gpa FROM students WHERE student_id=4");
          const ok = rows.length && Math.abs(rows[0].gpa - 3.2) < 0.001;
          return { passed: !!ok, message: ok ? "GPA berhasil diperbarui." : "GPA mahasiswa student_id=4 belum menjadi 3.20." };
        },
        hints: ["Gunakan UPDATE students SET gpa = ... WHERE student_id = ...", "Jangan lupa klausa WHERE agar hanya baris ini yang berubah.", "Coba: UPDATE students SET gpa = 3.20 WHERE student_id = 4;"],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Registrasi & Pengunduran Diri", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Tambahkan mahasiswa baru: student_id=11, full_name 'Kirana Ayu Wibowo', email 'kirana@asia.ac.id', dept_id 2, gpa 3.35, enrollment_year 2026, city 'Malang'. Setelah itu hapus mahasiswa dengan student_id = 10 (mengundurkan diri).",
        starterSql: "-- 1) INSERT mahasiswa baru\n\n-- 2) DELETE mahasiswa yang mengundurkan diri\n",
        requiredConstructs: ["INSERT INTO", "DELETE FROM"],
        validate: (sandbox) => {
          const inserted = rowCountWhere(sandbox, "students", "student_id=11 AND full_name='Kirana Ayu Wibowo' AND email='kirana@asia.ac.id' AND dept_id=2 AND enrollment_year=2026 AND city='Malang'");
          if (inserted < 1) return { passed: false, message: "Data mahasiswa baru (student_id=11) belum sesuai spesifikasi." };
          const stillThere = rowCountWhere(sandbox, "students", "student_id=10");
          if (stillThere > 0) return { passed: false, message: "Mahasiswa student_id=10 masih ada — pastikan DELETE berhasil dijalankan." };
          return { passed: true };
        },
        hints: [
          "Kerjakan dua perintah: INSERT untuk mahasiswa baru, DELETE untuk yang mengundurkan diri.",
          "Hati-hati: DELETE tanpa WHERE akan menghapus seluruh baris tabel — selalu sertakan WHERE student_id = ...",
          "INSERT INTO students (student_id, full_name, email, dept_id, gpa, enrollment_year, city) VALUES (11, 'Kirana Ayu Wibowo', 'kirana@asia.ac.id', 2, 3.35, 2026, 'Malang');",
          "DELETE FROM students WHERE student_id = 10;",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- L5
  {
    id: 5,
    code: "L05",
    title: "Query Hunter",
    questTitle: "Find the Hidden Data",
    cpmk: "CPMK-4",
    subCpmk: "SubCPMK-4.2",
    competency: "SELECT, WHERE, ORDER BY, LIMIT",
    badgeIcon: "🏹",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses"],
    datasetSql: F.departments + F.students + F.courses,
    story: "Query Hunter berburu data tersembunyi di antara ratusan baris. Kuasai WHERE untuk menyaring, ORDER BY untuk mengurutkan, dan LIMIT untuk membatasi hasil buruan Anda.",
    microlearning: [
      { heading: "WHERE", body: "Menyaring baris berdasarkan kondisi, mis. WHERE gpa > 3.3." },
      { heading: "ORDER BY & LIMIT", body: "ORDER BY kolom [ASC|DESC] mengurutkan hasil. LIMIT n membatasi jumlah baris yang ditampilkan." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Inspect All", instruction: "Lihat seluruh data mahasiswa dahulu.", starterSql: "SELECT * FROM students;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: Urutan Klausa", question: "Manakah urutan penulisan klausa yang benar?", options: ["SELECT ... FROM ... ORDER BY ... WHERE ... LIMIT ...", "SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...", "SELECT ... WHERE ... FROM ... ORDER BY ...", "SELECT ... FROM ... LIMIT ... WHERE ... ORDER BY ..."], correctIndex: 1, explainCorrect: "Tepat — baris disaring dulu (WHERE), lalu diurutkan (ORDER BY), lalu dibatasi jumlahnya (LIMIT).", explainWrongByOption: ["WHERE harus ditulis sebelum ORDER BY; menyaring baris dilakukan sebelum pengurutan.", null, "FROM harus mendahului WHERE karena tabel sumber ditentukan lebih dulu.", "LIMIT selalu di bagian paling akhir setelah WHERE dan ORDER BY."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: ORDER BY + LIMIT", question: "Apa hasil SELECT full_name FROM students ORDER BY gpa DESC LIMIT 3;", options: ["3 mahasiswa dengan GPA terendah", "3 mahasiswa pertama menurut urutan input, tanpa memperhatikan GPA", "3 mahasiswa dengan GPA tertinggi", "Semua mahasiswa terurut, LIMIT diabaikan"], correctIndex: 2, explainCorrect: "Benar — data diurutkan menurun berdasarkan GPA (DESC) lebih dulu, baru 3 baris teratas diambil.", explainWrongByOption: ["DESC berarti menurun (tertinggi dulu); untuk terendah gunakan ASC.", "ORDER BY diproses sebelum LIMIT, jadi 3 baris yang diambil adalah 3 teratas setelah diurutkan.", null, "LIMIT tidak pernah diabaikan; ia membatasi jumlah baris hasil."], xp: 10, graded: false },
      { id: "p1", type: "quiz", title: "Prediksi: Siapa Pertama?", code: "SELECT full_name\nFROM students\nWHERE city = 'Malang' AND gpa >= 3.4\nORDER BY full_name;", question: "Nama siapa yang muncul di BARIS PERTAMA hasil query ini?", options: ["Gita Ramadhani", "Andi Saputra", "Citra Ayu", "Budi Santoso"], correctIndex: 1, explainCorrect: "Tepat — filter menyisakan Andi Saputra, Citra Ayu, dan Gita Ramadhani (Malang dengan GPA ≥ 3,4). ORDER BY full_name mengurutkan A–Z, sehingga Andi tampil pertama.", explainWrongByOption: ["Gita memang ber-GPA tertinggi, tetapi urutan di sini berdasarkan nama (ORDER BY full_name), bukan GPA.", null, "Citra ikut dalam hasil, tetapi secara alfabet \"Andi\" mendahului \"Citra\".", "Budi Santoso berasal dari Surabaya, jadi tersaring oleh city = 'Malang'."], expect: {"rowCount": 3, "cells": [[0, 0, "Andi Saputra"]]}, answer: "Andi Saputra", xp: 10, graded: false },
      { id: "p2", type: "quiz", title: "Prediksi: Kota Unik", code: "SELECT DISTINCT city\nFROM students\nWHERE gpa >= 3.3;", question: "Berapa BARIS yang dihasilkan query ini?", options: ["4", "2", "10", "1"], correctIndex: 1, explainCorrect: "Benar — empat mahasiswa lolos filter (Andi, Citra, Gita dari Malang dan Fajar dari Surabaya), tetapi DISTINCT membuang kota yang berulang sehingga hanya tersisa Malang dan Surabaya.", explainWrongByOption: ["4 adalah jumlah mahasiswa yang lolos filter (dan kebetulan juga jumlah kota unik seluruh kampus), tetapi DISTINCT menghitung kota unik dari mahasiswa yang lolos filter saja.", null, "10 adalah seluruh mahasiswa; WHERE menyaring lebih dulu dan DISTINCT membuang duplikat, jadi hasilnya jauh lebih sedikit.", "Ada mahasiswa dari dua kota berbeda yang lolos filter (Malang dan Surabaya), jadi hasilnya lebih dari satu baris."], expect: {"rowCount": 2}, answer: "2", xp: 10, graded: false },
      {
        id: "z1", type: "parsons", title: "Susun: Kota Berprestasi", graded: false, xp: 15,
        instruction: "Susun potongan berikut menjadi query yang menampilkan full_name dan city mahasiswa ber-GPA ≥ 3,4, diurutkan dari GPA tertinggi ke terendah. Tidak semua potongan dipakai — ada pengecoh.",
        pieces: ["ORDER BY gpa DESC;", "WHERE gpa >= 3.4", "SELECT full_name, city", "GROUP BY city", "FROM students", "ORDER BY gpa ASC;"],
        solution: [2, 4, 1, 0],
        referenceSql: "SELECT full_name, city FROM students WHERE gpa >= 3.4 ORDER BY gpa DESC;",
        orderSensitive: true,
        explainCorrect: "Tepat — urutan penulisan klausa: SELECT → FROM → WHERE → ORDER BY. GROUP BY mengelompokkan baris (bukan yang diminta) dan ASC akan mengurutkan dari GPA terendah.",
      },
      {
        id: "d1", type: "sql", title: "Debug: Terbalik", graded: false, xp: 30, debug: true,
        instruction: "Query ini seharusnya menampilkan 3 mahasiswa dengan GPA TERENDAH (full_name dan gpa), tetapi yang muncul justru mahasiswa dengan GPA tertinggi. Temukan bug-nya lalu perbaiki.",
        starterSql: "SELECT full_name, gpa\nFROM students\nORDER BY gpa DESC\nLIMIT 3;",
        referenceSql: "SELECT full_name, gpa FROM students ORDER BY gpa ASC LIMIT 3;",
        orderSensitive: true,
        hints: ["Bandingkan hasil query dengan yang diminta: urutannya berlawanan.", "ORDER BY punya dua arah: ASC (naik) dan DESC (turun).", "Untuk mengambil yang terendah, urutkan menaik (ASC) sebelum dibatasi LIMIT."],
      },
      {
        id: "d2", type: "sql", title: "Debug: Error Aneh", graded: false, xp: 30, debug: true,
        instruction: "Query ini seharusnya menampilkan full_name mahasiswa dari kota Batu, tetapi malah error. Baca pesan errornya, lalu perbaiki.",
        starterSql: "SELECT full_name\nFROM students\nWHERE city = Batu;",
        referenceSql: "SELECT full_name FROM students WHERE city = 'Batu';",
        hints: ["Pesan error menyebut kolom \"Batu\" tidak ditemukan — padahal Batu bukan nama kolom.", "Nilai teks harus diapit tanda kutip; tanpa kutip, SQL mengira itu nama kolom.", "Ganti Batu menjadi 'Batu' (dengan kutip tunggal)."],
      },
      {
        id: "s2", type: "sql", title: "Mini Quest: GPA di Atas 3.3", graded: true, weight: 1, xp: 30,
        instruction: "Tampilkan full_name dan gpa mahasiswa dengan gpa di atas 3.3, diurutkan dari gpa tertinggi ke terendah.",
        starterSql: "SELECT full_name, gpa FROM students\nWHERE ____\nORDER BY ____;",
        referenceSql: "SELECT full_name, gpa FROM students WHERE gpa > 3.3 ORDER BY gpa DESC;",
        requiredConstructs: ["WHERE", "ORDER BY"],
        hints: ["Gunakan WHERE gpa > 3.3.", "Tambahkan ORDER BY gpa DESC agar urut dari tertinggi.", "Coba: SELECT full_name, gpa FROM students WHERE gpa > 3.3 ORDER BY gpa DESC;"],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Top 3 Kampus", graded: true, weight: 2, xp: 50, noHintBonus: true, perfectBonus: true, portfolio: true,
        instruction: "Query Hunter butuh 3 mahasiswa dengan GPA tertinggi se-kampus. Tampilkan full_name, gpa, dan city — urutkan dari tertinggi, batasi hanya 3 baris.",
        starterSql: "-- gunakan ORDER BY dan LIMIT\n",
        referenceSql: "SELECT full_name, gpa, city FROM students ORDER BY gpa DESC LIMIT 3;",
        requiredConstructs: ["ORDER BY", "LIMIT"],
        hints: ["Urutkan berdasarkan gpa secara menurun (DESC).", "Batasi hasil dengan LIMIT 3.", "Coba: SELECT full_name, gpa, city FROM students ORDER BY gpa DESC LIMIT 3;"],
      },
    ],
  },

  // ---------------------------------------------------------------- L6
  {
    id: 6,
    code: "L06",
    title: "Data Analyst",
    questTitle: "Analytics Quest",
    cpmk: "CPMK-5",
    subCpmk: "SubCPMK-5.1",
    competency: "Aggregate, GROUP BY, HAVING",
    badgeIcon: "📊",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses", "enrollments"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments,
    story: "Manajemen kampus butuh angka, bukan baris mentah. Data Analyst merangkum ratusan nilai enrollments menjadi insight: rata-rata nilai per mata kuliah, jumlah mahasiswa per department, dan department mana yang butuh perhatian.",
    microlearning: [
      { heading: "Fungsi Agregat", body: "COUNT(*), SUM(kolom), AVG(kolom), MIN/MAX(kolom) meringkas banyak baris menjadi satu nilai." },
      { heading: "GROUP BY & HAVING", body: "GROUP BY mengelompokkan baris berdasarkan kolom tertentu sebelum agregasi dihitung per kelompok. HAVING menyaring hasil SETELAH agregasi (berbeda dari WHERE yang menyaring SEBELUM agregasi) — kesalahan umum adalah memakai WHERE untuk menyaring hasil agregat." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Rata-rata per Course", instruction: "Amati pola dasar agregasi berikut.", starterSql: "SELECT course_id, AVG(score) AS avg_score\nFROM enrollments\nGROUP BY course_id;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: WHERE vs HAVING", question: "Apa beda WHERE dan HAVING?", options: ["WHERE menyaring baris sebelum pengelompokan, HAVING menyaring kelompok setelah GROUP BY", "Keduanya identik, hanya berbeda nama", "HAVING menyaring baris sebelum GROUP BY, WHERE sesudahnya", "WHERE khusus untuk angka, HAVING khusus untuk teks"], correctIndex: 0, explainCorrect: "Tepat — gunakan WHERE untuk kondisi pada baris, dan HAVING untuk kondisi pada hasil agregat seperti COUNT(*) atau AVG(...).", explainWrongByOption: [null, "Keduanya berbeda: HAVING dapat memakai fungsi agregat, WHERE tidak.", "Urutannya terbalik: WHERE bekerja sebelum GROUP BY, HAVING setelahnya.", "Bedanya bukan pada tipe data, melainkan pada tahap penyaringan (baris vs kelompok)."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: COUNT dan NULL", question: "Jika beberapa mahasiswa memiliki city = NULL, apa beda COUNT(*) dan COUNT(city)?", options: ["Keduanya selalu sama", "COUNT(city) ikut menghitung baris yang city-nya NULL", "COUNT(*) melewatkan baris yang mengandung NULL", "COUNT(*) menghitung semua baris, sedangkan COUNT(city) melewatkan baris yang city-nya NULL"], correctIndex: 3, explainCorrect: "Benar — COUNT(*) menghitung seluruh baris, sedangkan COUNT(kolom) hanya menghitung nilai yang tidak NULL.", explainWrongByOption: ["Keduanya berbeda ketika ada NULL pada kolom yang dihitung.", "COUNT(kolom) justru mengabaikan NULL.", "COUNT(*) menghitung baris apa adanya, termasuk yang berisi NULL.", null], xp: 10, graded: false },
      { id: "p1", type: "quiz", title: "Prediksi: WHERE Sebelum GROUP BY", code: "SELECT dept_id, COUNT(*) AS n\nFROM students\nWHERE gpa >= 3.4\nGROUP BY dept_id;", question: "Berapa nilai kolom n pada baris dengan dept_id = 2?", options: ["3", "1", "2", "0"], correctIndex: 1, explainCorrect: "Tepat — WHERE menyaring baris SEBELUM dikelompokkan. Di dept 2 hanya Fajar Nugroho (3,55) yang ber-GPA ≥ 3,4, sehingga COUNT(*) = 1.", explainWrongByOption: ["3 adalah jumlah seluruh mahasiswa dept 2 tanpa filter, tetapi WHERE bekerja sebelum GROUP BY sehingga COUNT hanya menghitung yang lolos.", null, "Hanya satu mahasiswa dept 2 yang ber-GPA ≥ 3,4 (Fajar Nugroho), bukan dua.", "Baris dept 2 tetap muncul karena ada satu mahasiswa yang memenuhi filter; kelompok tanpa baris tidak terbentuk sama sekali, jadi n = 0 tidak akan pernah tampil."], expect: {"rowCount": 2, "cells": [[1, 0, 2], [1, 1, 1]]}, answer: "1", xp: 10, graded: false },
      { id: "p2", type: "quiz", title: "Prediksi: Rata-rata dengan NULL", code: "SELECT AVG(x) AS rata_rata\nFROM (\n  SELECT 10 AS x\n  UNION ALL SELECT 20\n  UNION ALL SELECT NULL\n) AS t;", question: "Berapa nilai rata_rata?", options: ["10", "15", "20", "30"], correctIndex: 1, explainCorrect: "Benar — AVG mengabaikan NULL: (10 + 20) / 2 = 15, bukan dibagi 3.", explainWrongByOption: ["10 didapat bila NULL dianggap 0 dan hasil dibagi 3 (30 / 3), padahal AVG mengabaikan NULL sepenuhnya.", null, "20 adalah nilai terbesar (MAX), bukan rata-rata.", "30 adalah jumlah semua nilai (SUM), bukan rata-rata."], expect: {"rowCount": 1, "cells": [[0, 0, 15]]}, answer: "15", xp: 10, graded: false },
      {
        id: "z1", type: "parsons", title: "Susun: Rata-rata per Department", graded: false, xp: 15,
        instruction: "Susun potongan berikut menjadi query yang menampilkan dept_id dan rata-rata GPA (alias rata_gpa) untuk setiap department, hanya untuk department dengan rata-rata di atas 3,2.",
        pieces: ["HAVING AVG(gpa) > 3.2;", "SELECT dept_id, AVG(gpa) AS rata_gpa", "WHERE AVG(gpa) > 3.2", "GROUP BY dept_id", "FROM students", "GROUP BY gpa"],
        solution: [1, 4, 3, 0],
        referenceSql: "SELECT dept_id, AVG(gpa) AS rata_gpa FROM students GROUP BY dept_id HAVING AVG(gpa) > 3.2;",
        checkColumnNames: true,
        explainCorrect: "Tepat — kondisi pada hasil agregat ditulis dengan HAVING setelah GROUP BY; WHERE tidak boleh memuat fungsi agregat, dan GROUP BY gpa akan mengelompokkan per nilai GPA, bukan per department.",
      },
      {
        id: "d1", type: "sql", title: "Debug: Agregat di WHERE", graded: false, xp: 30, debug: true,
        instruction: "Query ini seharusnya menampilkan course_id dan rata-rata skornya, hanya untuk course dengan rata-rata di atas 75. Sayangnya query-nya error. Temukan penyebabnya dan perbaiki.",
        starterSql: "SELECT course_id, AVG(score) AS rata_rata\nFROM enrollments\nWHERE AVG(score) > 75\nGROUP BY course_id;",
        referenceSql: "SELECT course_id, AVG(score) AS rata_rata FROM enrollments GROUP BY course_id HAVING AVG(score) > 75;",
        requiredConstructs: ["HAVING"],
        hints: ["Pesan error menyebut penyalahgunaan fungsi agregat (misuse of aggregate).", "WHERE bekerja pada baris sebelum pengelompokan, sehingga belum ada hasil AVG yang bisa dicek.", "Kondisi pada hasil agregat ditulis dengan HAVING, setelah GROUP BY."],
      },
      {
        id: "s2", type: "sql", title: "Mini Quest: Rata-rata Skor per Course", graded: true, weight: 1, xp: 30,
        instruction: "Hitung rata-rata skor untuk setiap course_id pada tabel enrollments (kolom: course_id, rata-rata skor).",
        starterSql: "SELECT course_id, ____ FROM enrollments GROUP BY ____;",
        referenceSql: "SELECT course_id, AVG(score) AS avg_score FROM enrollments GROUP BY course_id;",
        requiredConstructs: ["GROUP BY"],
        hints: ["Gunakan AVG(score) untuk menghitung rata-rata.", "Kelompokkan dengan GROUP BY course_id.", "Coba: SELECT course_id, AVG(score) AS avg_score FROM enrollments GROUP BY course_id;"],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Department Ramai", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Tampilkan dept_id dan jumlah mahasiswa (COUNT) untuk tiap department pada tabel students, tetapi hanya department dengan LEBIH DARI 2 mahasiswa yang ditampilkan.",
        starterSql: "-- Ingat: WHERE menyaring sebelum agregasi, HAVING menyaring sesudahnya\n",
        referenceSql: "SELECT dept_id, COUNT(*) AS total_mahasiswa FROM students GROUP BY dept_id HAVING COUNT(*) > 2;",
        requiredConstructs: ["GROUP BY", "HAVING"],
        hints: [
          "Kelompokkan mahasiswa berdasarkan dept_id.",
          "Hitung jumlah baris tiap kelompok dengan COUNT(*).",
          "Gunakan HAVING (bukan WHERE) untuk menyaring hasil COUNT — WHERE tidak bisa menyaring hasil agregat.",
          "Coba: SELECT dept_id, COUNT(*) AS total_mahasiswa FROM students GROUP BY dept_id HAVING COUNT(*) > 2;",
        ],
      },
      {
        id: "s4", type: "reflect", title: "Reflection", graded: false, xp: 15, portfolio: true,
        instruction: "Dari hasil Challenge, department mana yang jumlah mahasiswanya paling sedikit dan mengapa informasi ini penting bagi dosen/prodi dalam pengambilan keputusan?",
        placeholder: "Tulis interpretasi Anda di sini (minimal 20 karakter)...",
        minLength: 20,
      },
    ],
  },

  // ---------------------------------------------------------------- L7
  {
    id: 7,
    code: "L07",
    title: "Join Master",
    questTitle: "Join Battle",
    cpmk: "CPMK-5",
    subCpmk: "SubCPMK-5.2",
    competency: "INNER/LEFT/RIGHT/multi-table JOIN",
    badgeIcon: "🔗",
    masteryThreshold: 80,
    bossBattle: true,
    bossLabel: "Boss A",
    tables: ["departments", "students", "courses", "enrollments"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments,
    story: "Data tersebar di banyak tabel: mahasiswa, mata kuliah, dan department masing-masing berdiri sendiri. Join Master menghubungkannya untuk menjawab pertanyaan bisnis nyata. Ini Boss Battle yang menggabungkan CRUD, SELECT, aggregate, dan JOIN.",
    microlearning: [
      { heading: "INNER JOIN", body: "Menggabungkan baris dari dua tabel yang memiliki pasangan cocok di kedua sisi, berdasarkan kondisi ON." },
      { heading: "LEFT JOIN", body: "Mengembalikan seluruh baris dari tabel kiri, meskipun tidak ada pasangan di tabel kanan (kolom kanan akan NULL)." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Join Sederhana", instruction: "Amati pola dasar JOIN tiga tabel.", starterSql: "SELECT s.full_name, c.course_name\nFROM students s\nJOIN enrollments e ON s.student_id = e.student_id\nJOIN courses c ON e.course_id = c.course_id\nLIMIT 5;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: INNER vs LEFT JOIN", question: "Apa beda INNER JOIN dan LEFT JOIN?", options: ["Tidak ada beda, hasilnya selalu sama", "INNER JOIN hanya menampilkan baris yang punya pasangan di kedua tabel, LEFT JOIN mempertahankan semua baris tabel kiri", "LEFT JOIN hanya menampilkan baris tabel kanan", "INNER JOIN menghasilkan semua kombinasi baris tanpa syarat"], correctIndex: 1, explainCorrect: "Tepat — pada LEFT JOIN, baris kiri tanpa pasangan tetap tampil dengan kolom kanan bernilai NULL.", explainWrongByOption: ["Hasilnya berbeda saat ada baris tanpa pasangan: INNER JOIN membuangnya, LEFT JOIN mempertahankannya.", null, "LEFT JOIN mempertahankan tabel kiri, bukan hanya tabel kanan.", "Semua kombinasi tanpa syarat adalah CROSS JOIN; INNER JOIN memakai kondisi ON."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Mencari yang Tidak Punya Pasangan", question: "Mahasiswa yang belum pernah mengambil mata kuliah apa pun paling tepat dicari dengan...", options: ["students INNER JOIN enrollments lalu WHERE enrollments.student_id IS NULL", "students CROSS JOIN enrollments", "students LEFT JOIN enrollments lalu WHERE enrollments.student_id IS NULL", "students INNER JOIN enrollments lalu GROUP BY student_id"], correctIndex: 2, explainCorrect: "Benar — LEFT JOIN mempertahankan mahasiswa tanpa pasangan, dan kolom enrollments-nya bernilai NULL sehingga bisa disaring dengan IS NULL.", explainWrongByOption: ["INNER JOIN membuang baris tanpa pasangan, sehingga tidak ada baris dengan NULL yang tersisa untuk disaring.", "CROSS JOIN mengombinasikan setiap mahasiswa dengan setiap enrollment, bukan mencari yang tidak berpasangan.", null, "INNER JOIN hanya menampilkan mahasiswa yang punya enrollment — kebalikan dari yang dicari."], xp: 10, graded: false },
      { id: "p1", type: "quiz", title: "Prediksi: LEFT JOIN + Syarat ON", code: "SELECT s.full_name, e.score\nFROM students s\nLEFT JOIN enrollments e\n  ON s.student_id = e.student_id\n AND e.score >= 90;", question: "Berapa BARIS yang dihasilkan query ini? (Ada 10 mahasiswa dan 20 enrollment; 7 enrollment bernilai ≥ 90.)", options: ["7", "10", "13", "20"], correctIndex: 2, explainCorrect: "Benar — LEFT JOIN mempertahankan ke-10 mahasiswa. Syarat score ≥ 90 ada di ON, jadi hanya menentukan pasangan: mahasiswa tanpa nilai ≥ 90 tampil sekali dengan NULL, sedangkan yang punya beberapa nilai ≥ 90 tampil sekali per nilai (Citra 2 baris, Gita 3 baris) → 10 + 3 = 13.", explainWrongByOption: ["7 adalah jumlah enrollment bernilai ≥ 90, tetapi LEFT JOIN juga mempertahankan mahasiswa yang tidak punya pasangan.", "10 adalah jumlah mahasiswa, namun mahasiswa dengan lebih dari satu nilai ≥ 90 muncul lebih dari sekali.", null, "20 adalah seluruh enrollment. Syarat di ON menyaring pasangan, sehingga hasilnya tidak mungkin sebanyak itu."], expect: {"rowCount": 13}, answer: "13", xp: 10, graded: false },
      {
        id: "z1", type: "parsons", title: "Susun: Mahasiswa dan Departemennya", graded: false, xp: 15,
        instruction: "Susun potongan berikut menjadi query yang menampilkan full_name setiap mahasiswa beserta dept_name department-nya. Perhatikan kondisi penghubung JOIN-nya.",
        pieces: ["ON s.dept_id = d.dept_id;", "SELECT s.full_name, d.dept_name", "JOIN departments d", "FROM students s", "ON s.student_id = d.dept_id;", "GROUP BY d.dept_name"],
        solution: [1, 3, 2, 0],
        referenceSql: "SELECT s.full_name, d.dept_name FROM students s JOIN departments d ON s.dept_id = d.dept_id;",
        explainCorrect: "Tepat — JOIN menghubungkan foreign key (students.dept_id) dengan primary key-nya (departments.dept_id). Menghubungkan student_id dengan dept_id akan mencocokkan dua hal yang tidak berhubungan.",
      },
      {
        id: "d1", type: "sql", title: "Debug: Hasil Membengkak", graded: false, xp: 30, debug: true,
        instruction: "Query ini seharusnya menampilkan full_name dan jumlah mata kuliah yang diambil (total_mk) tiap mahasiswa. Namun semua mahasiswa mendapat angka yang sama dan terlalu besar. Temukan bug-nya.",
        starterSql: "SELECT s.full_name, COUNT(*) AS total_mk\nFROM students s\nJOIN enrollments e\nGROUP BY s.student_id, s.full_name;",
        referenceSql: "SELECT s.full_name, COUNT(*) AS total_mk FROM students s JOIN enrollments e ON s.student_id = e.student_id GROUP BY s.student_id, s.full_name;",
        hints: ["Angka yang sama untuk semua mahasiswa berarti setiap mahasiswa dipasangkan dengan SEMUA enrollment.", "JOIN tanpa kondisi ON menghasilkan semua kombinasi baris (Cartesian product).", "Tambahkan kondisi penghubung: ON s.student_id = e.student_id."],
      },
      {
        id: "s2", type: "sql", title: "Mini Quest: Nilai per Mahasiswa", graded: true, weight: 1, xp: 30,
        instruction: "Tampilkan full_name mahasiswa beserta course_name dan score untuk setiap enrollment mereka.",
        starterSql: "SELECT s.full_name, c.course_name, e.score\nFROM enrollments e\nJOIN ____\nJOIN ____;",
        referenceSql: "SELECT s.full_name, c.course_name, e.score FROM enrollments e INNER JOIN students s ON e.student_id = s.student_id INNER JOIN courses c ON e.course_id = c.course_id;",
        requiredConstructs: ["JOIN"],
        hints: ["Anda perlu menghubungkan enrollments ke students dan ke courses.", "Gunakan ON untuk menyatakan kondisi penghubung (student_id, course_id).", "Coba: ...FROM enrollments e JOIN students s ON e.student_id=s.student_id JOIN courses c ON e.course_id=c.course_id;"],
      },
      {
        id: "s3", type: "sql", title: "⚔ Boss Battle: Mahasiswa Berprestasi", graded: true, weight: 2, xp: 100, noHintBonus: true, portfolio: true, bossBattle: true,
        instruction: "Temukan full_name mahasiswa, dept_name, dan rata-rata skor mereka (beri alias avg_score), untuk mahasiswa dengan rata-rata skor DI ATAS 85. Urutkan dari rata-rata tertinggi.",
        starterSql: "-- Gabungkan enrollments + students + departments\n-- lalu GROUP BY per mahasiswa dan HAVING rata-rata > 85\n",
        referenceSql: `SELECT s.full_name, d.dept_name, AVG(e.score) AS avg_score
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
JOIN departments d ON s.dept_id = d.dept_id
GROUP BY s.student_id
HAVING AVG(e.score) > 85
ORDER BY avg_score DESC;`,
        requiredConstructs: ["JOIN", "GROUP BY", "HAVING"],
        hints: [
          "Gabungkan tiga tabel: enrollments, students, departments.",
          "Kelompokkan per mahasiswa (GROUP BY student_id) sebelum menghitung rata-rata.",
          "Gunakan HAVING AVG(e.score) > 85 untuk menyaring hasil agregat.",
          "Jangan lupa ORDER BY avg_score DESC di akhir.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- L8
  {
    id: 8,
    code: "L08",
    title: "Query Strategist",
    questTitle: "Secret Query Mission",
    cpmk: "CPMK-5",
    subCpmk: "SubCPMK-5.3",
    competency: "Subquery / nested query",
    badgeIcon: "🧠",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses", "enrollments"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments,
    story: "Sebagian misi tidak bisa diselesaikan dengan satu lapis SELECT. Query Strategist menyisipkan query di dalam query — subquery — untuk menjawab pertanyaan yang bergantung pada hasil query lain.",
    microlearning: [
      { heading: "Subquery pada WHERE", body: "Subquery adalah SELECT di dalam SELECT lain, mis. WHERE gpa > (SELECT AVG(gpa) FROM students) — subquery dieksekusi lebih dulu, hasilnya dipakai query luar." },
      { heading: "Subquery vs JOIN", body: "Beberapa kebutuhan bisa diselesaikan baik dengan subquery maupun JOIN. Subquery sering lebih mudah dibaca untuk kondisi perbandingan seperti 'di atas rata-rata' atau 'tidak termasuk dalam daftar tertentu'." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Di Atas Rata-rata", instruction: "Amati subquery sederhana berikut.", starterSql: "SELECT full_name FROM students\nWHERE gpa > (SELECT AVG(gpa) FROM students);", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: Subquery Skalar", question: "Pada WHERE gpa > (SELECT AVG(gpa) FROM students), subquery-nya sebaiknya menghasilkan...", options: ["Satu nilai tunggal (satu baris, satu kolom)", "Seluruh tabel students beserta semua kolomnya", "Banyak baris; operator > otomatis membandingkan ke semuanya", "Teks apa pun"], correctIndex: 0, explainCorrect: "Tepat — operator perbandingan seperti > membutuhkan satu nilai. Untuk membandingkan dengan banyak nilai, gunakan IN.", explainWrongByOption: [null, "Subquery yang mengembalikan tabel utuh tidak bisa dibandingkan dengan satu angka gpa.", "Operator > tidak membandingkan ke semua baris. MySQL menolak subquery banyak baris di sini, sedangkan SQLite diam-diam memakai baris pertama sehingga hasilnya menyesatkan.", "Yang dibandingkan dengan gpa adalah angka, bukan teks."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: NOT IN dan NULL", question: "Query WHERE student_id NOT IN (SELECT student_id FROM enrollments) bisa mengembalikan hasil kosong walau ada mahasiswa tanpa enrollment. Penyebab yang paling mungkin?", options: ["NOT IN hanya boleh dipakai bersama JOIN", "Subquery wajib memakai ORDER BY agar NOT IN bekerja", "Subquery menghasilkan nilai NULL, sehingga NOT IN menjadi tidak pasti (UNKNOWN) untuk semua baris", "NOT IN tidak dikenal dalam SQL standar"], correctIndex: 2, explainCorrect: "Benar — jika daftar hasil subquery mengandung NULL, perbandingan NOT IN tidak pernah bernilai TRUE. Saring NULL di subquery atau gunakan NOT EXISTS / LEFT JOIN ... IS NULL.", explainWrongByOption: ["NOT IN dapat dipakai tanpa JOIN.", "ORDER BY tidak berpengaruh pada logika NOT IN.", null, "NOT IN adalah bagian dari SQL standar."], xp: 10, graded: false },
      { id: "p1", type: "quiz", title: "Prediksi: Subquery MAX", code: "SELECT full_name\nFROM students\nWHERE gpa = (\n  SELECT MAX(gpa)\n  FROM students\n  WHERE dept_id = 3\n);", question: "Siapa yang muncul di hasil?", options: ["Dewi Lestari", "Gita Ramadhani", "Hendra Wijaya", "Tidak ada baris"], correctIndex: 0, explainCorrect: "Tepat — subquery mengembalikan GPA tertinggi di dept 3 (2,95, milik Dewi Lestari); query luar lalu mencari mahasiswa dengan GPA persis itu.", explainWrongByOption: [null, "Gita ber-GPA tertinggi se-kampus (3,9), tetapi subquery hanya melihat mahasiswa dept 3.", "Hendra (2,8) memang di dept 3, tetapi GPA-nya bukan yang tertinggi di sana.", "Ada satu baris: nilai yang dihasilkan subquery selalu berasal dari salah satu barisnya, sehingga pasti ada mahasiswa dengan GPA itu."], expect: {"rowCount": 1, "cells": [[0, 0, "Dewi Lestari"]]}, answer: "Dewi Lestari", xp: 10, graded: false },
      { id: "p2", type: "quiz", title: "Prediksi: NOT IN dan NULL", code: "SELECT full_name\nFROM students\nWHERE student_id NOT IN (1, 2, NULL);", question: "Berapa BARIS yang dihasilkan query ini? (Tabel students berisi 10 mahasiswa.)", options: ["8", "10", "0", "2"], correctIndex: 2, explainCorrect: "Benar — karena ada NULL di dalam daftar, perbandingan NOT IN tidak pernah bernilai TRUE (hasilnya UNKNOWN) untuk baris mana pun, sehingga tidak ada yang lolos. Ini jebakan klasik NOT IN + NULL.", explainWrongByOption: ["8 adalah hasil yang Anda harapkan (10 dikurangi 2 mahasiswa) bila tidak ada NULL; NULL dalam daftar membuat hasilnya kosong.", "NOT IN pasti mengeluarkan sesuatu dari hasil, sehingga tidak mungkin seluruh 10 baris muncul.", null, "2 adalah jumlah nilai yang justru dikecualikan (1 dan 2), bukan jumlah hasilnya."], expect: {"rowCount": 0}, answer: "0", xp: 10, graded: false },
      {
        id: "z1", type: "parsons", title: "Susun: Di Bawah Rata-rata", graded: false, xp: 15,
        instruction: "Susun potongan berikut menjadi query yang menampilkan full_name mahasiswa yang GPA-nya LEBIH RENDAH dari rata-rata GPA mahasiswa department 1. Ada dua pengecoh.",
        pieces: ["(SELECT AVG(gpa)", "WHERE gpa <", "FROM students", "SELECT full_name", "WHERE dept_id = 1);", "FROM students", "WHERE gpa >", "(SELECT MAX(gpa)"],
        solution: [3, 2, 1, 0, 5, 4],
        referenceSql: "SELECT full_name FROM students WHERE gpa < (SELECT AVG(gpa) FROM students WHERE dept_id = 1);",
        explainCorrect: "Tepat — query luar membandingkan gpa dengan satu nilai dari subquery (rata-rata dept 1). Tanda > akan menampilkan yang lebih tinggi, dan MAX bukan rata-rata.",
      },
      {
        id: "d1", type: "sql", title: "Debug: Subquery Menipu", graded: false, xp: 30, debug: true,
        instruction: "Query ini seharusnya menampilkan mahasiswa yang GPA-nya lebih tinggi dari SEMUA mahasiswa department Sistem Informasi (dept_id = 2). Hasilnya terlalu banyak. Temukan bug-nya.",
        starterSql: "SELECT full_name, gpa\nFROM students\nWHERE gpa > (SELECT gpa FROM students WHERE dept_id = 2);",
        referenceSql: "SELECT full_name, gpa FROM students WHERE gpa > (SELECT MAX(gpa) FROM students WHERE dept_id = 2);",
        hints: ["Subquery-nya mengembalikan lebih dari satu baris, padahal > membutuhkan satu nilai.", "SQLite diam-diam memakai baris pertama saja; MySQL akan menolak query seperti ini.", "Lebih tinggi dari SEMUA berarti lebih tinggi dari nilai terbesarnya: gunakan MAX(gpa) di subquery."],
      },
      {
        id: "s2", type: "sql", title: "Mini Quest: GPA Melebihi Rata-rata", graded: true, weight: 1, xp: 30,
        instruction: "Tampilkan full_name dan gpa mahasiswa yang GPA-nya lebih tinggi dari rata-rata GPA seluruh mahasiswa.",
        starterSql: "SELECT full_name, gpa FROM students\nWHERE gpa > (____);",
        referenceSql: "SELECT full_name, gpa FROM students WHERE gpa > (SELECT AVG(gpa) FROM students);",
        requiredConstructs: ["SUBQUERY"],
        hints: ["Buat subquery yang menghitung AVG(gpa) dari seluruh students.", "Bandingkan gpa tiap mahasiswa terhadap hasil subquery tersebut.", "Coba: SELECT full_name, gpa FROM students WHERE gpa > (SELECT AVG(gpa) FROM students);"],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Belum Pernah Ambil SI", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Cari mahasiswa yang belum pernah mengambil satu pun mata kuliah dari department Sistem Informasi (dept_id = 2). Gunakan subquery. Tampilkan full_name dan dept_id mereka.",
        starterSql: "SELECT full_name, dept_id FROM students\nWHERE student_id NOT IN (____);",
        referenceSql: `SELECT full_name, dept_id FROM students
WHERE student_id NOT IN (
  SELECT e.student_id FROM enrollments e
  JOIN courses c ON e.course_id = c.course_id
  WHERE c.dept_id = 2
);`,
        requiredConstructs: ["SUBQUERY"],
        hints: [
          "Buat subquery yang menghasilkan daftar student_id yang PERNAH mengambil mata kuliah dept_id=2.",
          "Subquery itu perlu JOIN enrollments ke courses agar bisa memfilter berdasarkan dept_id.",
          "Gunakan NOT IN pada query utama untuk mengecualikan mahasiswa dalam daftar tersebut.",
          "Struktur: SELECT full_name, dept_id FROM students WHERE student_id NOT IN (SELECT e.student_id FROM enrollments e JOIN courses c ON e.course_id=c.course_id WHERE c.dept_id=2);",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- L9
  {
    id: 9,
    code: "L09",
    title: "Data Guardian",
    questTitle: "Protect the Database",
    cpmk: "CPMK-6",
    subCpmk: "SubCPMK-6.1",
    competency: "Constraints & data integrity",
    badgeIcon: "🛡️",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses"],
    datasetSql: `PRAGMA foreign_keys = ON;\n` + F.departments + F.students + F.courses,
    story: "Data Guardian menjaga agar database tidak menerima data yang rusak atau tidak valid. Constraint seperti NOT NULL, UNIQUE, dan FOREIGN KEY adalah baris pertahanan pertama.",
    microlearning: [
      { heading: "NOT NULL & UNIQUE", body: "NOT NULL memastikan kolom wajib diisi. UNIQUE memastikan tidak ada nilai kembar pada kolom tersebut." },
      { heading: "FOREIGN KEY", body: "FOREIGN KEY memastikan nilai suatu kolom benar-benar ada pada tabel induknya — mencegah data \"yatim\" yang merujuk ke sesuatu yang tidak ada." },
    ],
    stages: [
      {
        id: "s1", type: "practice", title: "Percobaan yang Sengaja Gagal", expectError: true,
        instruction: "Coba tambahkan mahasiswa baru TANPA mengisi full_name (kolom ini NOT NULL). Amati pesan error yang muncul — ini pertahanan Data Guardian bekerja.",
        starterSql: "INSERT INTO students (student_id, dept_id, gpa, enrollment_year, city)\nVALUES (12, 1, 3.0, 2026, 'Malang');",
        xp: 10, graded: false,
      },
      { id: "q1", type: "quiz", title: "Cek Konsep: PRIMARY KEY vs UNIQUE", question: "Apa beda PRIMARY KEY dan UNIQUE?", options: ["Keduanya identik", "PRIMARY KEY boleh berisi nilai yang sama pada banyak baris", "PRIMARY KEY unik dan tidak boleh NULL (satu per tabel), sedangkan UNIQUE bisa dipasang pada beberapa kolom dan umumnya boleh NULL", "UNIQUE tidak boleh ada pada tabel yang sudah punya primary key"], correctIndex: 2, explainCorrect: "Tepat — sebuah tabel punya satu primary key, tetapi bisa punya beberapa constraint UNIQUE (mis. pada email).", explainWrongByOption: ["Keduanya berbeda: primary key tidak boleh NULL dan hanya satu per tabel.", "Primary key justru menjamin nilai tidak berulang.", null, "Tabel boleh memiliki primary key dan UNIQUE sekaligus, mis. UNIQUE pada email."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Integritas Referensial", question: "Foreign key aktif. Apa yang terjadi bila Anda INSERT enrollment dengan student_id yang tidak ada di tabel students?", options: ["Diterima, dan student_id dibuat otomatis di tabel students", "Diterima, dan baris itu dibiarkan tanpa induk", "Ditolak karena melanggar integritas referensial", "Diterima, tetapi student_id diubah menjadi NULL"], correctIndex: 2, explainCorrect: "Benar — foreign key mencegah baris 'yatim' yang merujuk ke data yang tidak ada.", explainWrongByOption: ["Foreign key tidak membuat baris induk secara otomatis.", "Membiarkan baris tanpa induk justru yang dicegah oleh foreign key.", null, "Nilai tidak diubah menjadi NULL; INSERT itu sendiri ditolak."], xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: Perbaiki Insert", graded: true, weight: 1, xp: 30,
        instruction: "Tambahkan mahasiswa tersebut dengan benar kali ini: student_id=12, full_name='Mahasiswa Sembilan Belas', dept_id=1, gpa=3.0, enrollment_year=2026, city='Malang'.",
        starterSql: "INSERT INTO students (student_id, full_name, dept_id, gpa, enrollment_year, city)\nVALUES (____);",
        requiredConstructs: ["INSERT INTO"],
        validate: (sandbox) => {
          const c = rowCountWhere(sandbox, "students", "student_id=12 AND full_name='Mahasiswa Sembilan Belas' AND dept_id=1 AND enrollment_year=2026 AND city='Malang'");
          return { passed: c > 0, message: c > 0 ? "Data berhasil disimpan." : "Data mahasiswa student_id=12 belum sesuai spesifikasi." };
        },
        hints: ["Kali ini sertakan full_name.", "Pastikan seluruh kolom NOT NULL terisi.", "INSERT INTO students (student_id, full_name, dept_id, gpa, enrollment_year, city) VALUES (12, 'Mahasiswa Sembilan Belas', 1, 3.0, 2026, 'Malang');"],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Tabel Review Terlindungi", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Buat tabel course_reviews untuk mencegah data rating tidak valid: review_id (INTEGER PRIMARY KEY), course_id (INTEGER NOT NULL), rating (INTEGER NOT NULL), reviewer_name (TEXT NOT NULL). Setelah tabel dibuat, masukkan satu review valid: course_id=101, rating=5, reviewer_name='Mahasiswa TI'.",
        starterSql: "-- 1) CREATE TABLE course_reviews (...)\n\n-- 2) INSERT satu review valid\n",
        requiredConstructs: ["CREATE TABLE", "NOT NULL", "INSERT INTO"],
        validate: (sandbox) => {
          const shape = tableShapeOk(sandbox, "course_reviews", [
            { name: "review_id", pk: true },
            { name: "course_id", notnull: true },
            { name: "rating", notnull: true },
            { name: "reviewer_name", notnull: true },
          ]);
          if (!shape.passed) return shape;
          const c = rowCountWhere(sandbox, "course_reviews", "course_id=101 AND rating=5 AND reviewer_name='Mahasiswa TI'");
          return { passed: c > 0, message: c > 0 ? "Tabel dan data review valid." : "Baris review yang diminta belum ditemukan." };
        },
        hints: [
          "Definisikan keempat kolom dengan tipe dan constraint yang diminta.",
          "review_id INTEGER PRIMARY KEY, lalu tiga kolom lain masing-masing NOT NULL.",
          "Setelah CREATE TABLE berhasil, tambahkan INSERT INTO course_reviews (...) VALUES (...);",
          "Contoh: CREATE TABLE course_reviews (review_id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL, rating INTEGER NOT NULL, reviewer_name TEXT NOT NULL);",
        ],
      },
    ],
  },

  // --------------------------------------------------------------- L10
  {
    id: 10,
    code: "L10",
    title: "Normalization Master",
    questTitle: "Normalization Puzzle",
    cpmk: "CPMK-6",
    subCpmk: "SubCPMK-6.2",
    competency: "1NF, 2NF, 3NF",
    badgeIcon: "🧬",
    masteryThreshold: 80,
    bossBattle: true,
    bossLabel: "Boss B",
    tables: ["raw_registrations"],
    datasetSql: F.rawRegistrations,
    story: "Tabel raw_registrations peninggalan sistem lama penuh redundansi: nama dan kota mahasiswa terulang setiap kali mereka mengambil mata kuliah baru. Normalization Master mendekomposisinya menjadi struktur relasional yang bersih. Ini Boss Battle penutup kompetensi Level 8–10.",
    microlearning: [
      { heading: "1NF", body: "Setiap kolom berisi nilai atomik (tidak ada grup berulang/daftar dalam satu sel)." },
      { heading: "2NF & 3NF", body: "2NF menghapus dependensi parsial (atribut hanya bergantung pada sebagian primary key). 3NF menghapus dependensi transitif (atribut non-key yang bergantung pada atribut non-key lain) — misalnya student_city yang sebenarnya bergantung pada mahasiswa, bukan pada baris registrasi." },
    ],
    stages: [
      { id: "s1", type: "quiz", title: "Masalah Desain", question: "Pada raw_registrations, nilai student_city berulang setiap kali mahasiswa mengambil mata kuliah baru. Apa masalah desain ini?", options: ["Redundansi data akibat belum ternormalisasi", "Tabel sudah dalam bentuk 3NF", "Kesalahan tipe data", "Kekurangan primary key"], correctIndex: 0, explainWrongByOption: [null, "Justru sebaliknya: 3NF berarti tidak ada redundansi/ketergantungan transitif. Tabel yang mengulang student_city menandakan belum ternormalisasi.", "Tipe data bukan masalahnya; yang bermasalah adalah nilai yang sama tersimpan berulang (redundansi).", "Primary key bukan sumber masalah di sini; tabel bisa punya PK dan tetap redundan karena student_city bergantung pada mahasiswa, bukan pada baris pendaftaran."], explainCorrect: "Tepat — mengulang student_city pada setiap baris adalah redundansi data; tabel seperti ini belum ternormalisasi sehingga rawan anomali saat update/insert/delete.", xp: 10, graded: false },
      { id: "s2", type: "quiz", title: "Langkah Perbaikan", question: "Langkah paling tepat memperbaiki tabel ini adalah...", options: ["Memecah menjadi beberapa tabel terpisah (mahasiswa, mata kuliah) dan menghubungkannya dengan foreign key", "Menghapus semua baris duplikat course_name", "Mengubah course_credits menjadi TEXT", "Menggabungkan seluruh kolom menjadi satu kolom teks panjang"], correctIndex: 0, explainWrongByOption: [null, "Menghapus baris duplikat membuang data pendaftaran yang sah dan tidak menghilangkan penyebab redundansi; struktur tabelnya yang perlu dipecah.", "Mengubah tipe kolom tidak berhubungan dengan redundansi, dan credits sebagai angka memang lebih tepat bertipe numerik.", "Satu kolom teks panjang melanggar 1NF (nilai harus atomik) dan memperburuk pencarian serta konsistensi data."], explainCorrect: "Benar — memecah tabel menurut entity-nya lalu menghubungkannya dengan foreign key menghilangkan redundansi, inilah inti normalisasi.", xp: 10, graded: false },
      {
        id: "s3", type: "sql", title: "Mini Quest: Ekstrak Mahasiswa Unik", graded: true, weight: 1, xp: 30,
        instruction: "Buat tabel students_norm (student_id INTEGER PRIMARY KEY, student_name TEXT NOT NULL, student_city TEXT), lalu isi dengan data mahasiswa UNIK (tanpa duplikat nama) dari raw_registrations. Anda boleh menentukan sendiri nomor student_id (mis. 1,2,3,...).",
        starterSql: "CREATE TABLE students_norm (\n  \n);\n\nINSERT INTO students_norm (student_id, student_name, student_city) VALUES\n  ;",
        requiredConstructs: ["CREATE TABLE", "INSERT INTO"],
        validate: (sandbox) => {
          const shape = tableShapeOk(sandbox, "students_norm", [{ name: "student_id", pk: true }, { name: "student_name", notnull: true }, { name: "student_city" }]);
          if (!shape.passed) return shape;
          const rows = sandbox.query("SELECT COUNT(DISTINCT student_name) AS c FROM students_norm");
          const distinctSource = sandbox.query("SELECT COUNT(DISTINCT student_name) AS c FROM raw_registrations")[0].c;
          const totalRows = sandbox.query("SELECT COUNT(*) AS c FROM students_norm")[0].c;
          const ok = rows[0].c === distinctSource && totalRows === distinctSource;
          return { passed: ok, message: ok ? "Ekstraksi mahasiswa unik berhasil." : `Tabel students_norm seharusnya berisi ${distinctSource} mahasiswa unik tanpa duplikat.` };
        },
        hints: [
          "Lihat dulu berapa nama unik pada raw_registrations, mis. SELECT DISTINCT student_name, student_city FROM raw_registrations;",
          "Buat tabel students_norm dengan struktur yang diminta.",
          "Isi dengan INSERT manual berdasarkan hasil DISTINCT tadi — jangan sampai ada nama yang terulang.",
        ],
      },
      {
        id: "s4", type: "sql", title: "⚔ Boss Battle: Lengkapi Dekomposisi", graded: true, weight: 2, xp: 100, noHintBonus: true, portfolio: true, bossBattle: true,
        instruction: "Lengkapi dekomposisi: buat tabel courses_norm (course_id INTEGER PRIMARY KEY, course_name TEXT NOT NULL, credits INTEGER, lecturer_name TEXT) diisi mata kuliah UNIK, dan tabel enrollments_norm (enrollment_id INTEGER PRIMARY KEY, student_id INTEGER, course_id INTEGER) yang menghubungkan students_norm dan courses_norm sesuai data asal raw_registrations (6 baris registrasi asli → 6 baris enrollments_norm).",
        starterSql: "CREATE TABLE courses_norm ( ... );\nINSERT INTO courses_norm ...;\n\nCREATE TABLE enrollments_norm ( ... );\nINSERT INTO enrollments_norm ...;",
        requiredConstructs: ["CREATE TABLE", "INSERT INTO"],
        validate: (sandbox) => {
          const shapeC = tableShapeOk(sandbox, "courses_norm", [{ name: "course_id", pk: true }, { name: "course_name", notnull: true }]);
          if (!shapeC.passed) return shapeC;
          const shapeE = tableShapeOk(sandbox, "enrollments_norm", [{ name: "enrollment_id", pk: true }, { name: "student_id" }, { name: "course_id" }]);
          if (!shapeE.passed) return shapeE;
          const distinctCourses = sandbox.query("SELECT COUNT(DISTINCT course_name) AS c FROM raw_registrations")[0].c;
          const coursesNormCount = sandbox.query("SELECT COUNT(*) AS c FROM courses_norm")[0].c;
          if (coursesNormCount !== distinctCourses) return { passed: false, message: `courses_norm seharusnya berisi ${distinctCourses} mata kuliah unik (ditemukan ${coursesNormCount}).` };
          const originalRows = sandbox.query("SELECT COUNT(*) AS c FROM raw_registrations")[0].c;
          const enrollCount = sandbox.query("SELECT COUNT(*) AS c FROM enrollments_norm")[0].c;
          if (enrollCount !== originalRows) return { passed: false, message: `enrollments_norm seharusnya berisi ${originalRows} baris (satu per registrasi asli), ditemukan ${enrollCount}.` };
          return { passed: true, message: "Dekomposisi terlihat lengkap. Catatan: validasi otomatis memeriksa jumlah tabel/baris — pastikan relasi FK Anda juga benar secara konsep, bukan hanya lolos jumlah baris." };
        },
        hints: [
          "Gunakan pola yang sama seperti students_norm: SELECT DISTINCT dulu untuk melihat data unik mata kuliah.",
          "courses_norm harus memiliki jumlah baris sama dengan jumlah course_name unik pada raw_registrations.",
          "enrollments_norm menghubungkan tiap baris asli raw_registrations ke student_id dan course_id yang sesuai — jumlah barisnya harus sama dengan jumlah baris raw_registrations (6 baris).",
          "Kerjakan bertahap: buat & isi courses_norm dahulu, baru buat & isi enrollments_norm sambil mencocokkan nama mahasiswa/mata kuliah ke ID yang sudah dibuat.",
        ],
      },
    ],
  },

  // --------------------------------------------------------------- L11
  {
    id: 11,
    code: "L11",
    title: "Database Engineer",
    questTitle: "Performance Quest I",
    cpmk: "CPMK-7",
    subCpmk: "SubCPMK-7.1",
    competency: "View & Index",
    badgeIcon: "⚙️",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses", "enrollments"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments,
    story: "Query yang sama akan sering dipakai berulang kali oleh dashboard kampus, dan tabel students akan terus bertambah. Database Engineer membangun VIEW agar query kompleks bisa dipakai ulang, dan INDEX agar pencarian tetap cepat.",
    microlearning: [
      { heading: "VIEW", body: "CREATE VIEW nama_view AS SELECT ...; membungkus sebuah query menjadi \"tabel virtual\" yang bisa di-SELECT seperti tabel biasa." },
      { heading: "INDEX & EXPLAIN QUERY PLAN", body: "CREATE INDEX mempercepat pencarian pada kolom yang sering dipakai di WHERE/JOIN. EXPLAIN QUERY PLAN menampilkan strategi eksekusi yang dipakai database untuk suatu query, termasuk index mana yang digunakan." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "View Sederhana", instruction: "Coba buat dan gunakan view sederhana.", starterSql: "CREATE VIEW v_test AS\nSELECT full_name, gpa FROM students WHERE gpa >= 3.5;\n\nSELECT * FROM v_test;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: Manfaat VIEW", question: "Apa manfaat utama sebuah VIEW?", options: ["Menyalin data ke tabel fisik baru agar query lebih cepat", "Menyimpan sebuah query sebagai tabel virtual yang bisa dipakai ulang, dan dapat menyembunyikan kolom atau baris tertentu", "Menggantikan kebutuhan primary key", "Membuat cadangan (backup) data otomatis"], correctIndex: 1, explainCorrect: "Tepat — view tidak menyimpan data sendiri; ia menjalankan query yang disimpan setiap kali dipakai, berguna untuk menyederhanakan query dan membatasi data yang terlihat.", explainWrongByOption: ["View tidak menyalin data, sehingga tidak dengan sendirinya mempercepat query.", null, "View tidak berhubungan dengan primary key.", "View bukan mekanisme backup; ia hanya query yang disimpan."], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Trade-off Index", question: "Apa trade-off dari membuat INDEX pada sebuah kolom?", options: ["Mempercepat pencarian, tetapi memakai ruang tambahan dan memperlambat INSERT/UPDATE/DELETE", "Mempercepat semua operasi tanpa biaya apa pun", "Mengubah isi data tabel menjadi terurut permanen", "Tidak perlu dibuat karena database membuat index untuk semua kolom otomatis"], correctIndex: 0, explainCorrect: "Benar — index adalah struktur bantu; setiap perubahan data juga harus memperbarui index. Buat index untuk kolom yang sering dipakai mencari, menggabungkan, atau mengurutkan.", explainWrongByOption: [null, "Index punya biaya: ruang penyimpanan dan waktu tambahan saat data berubah.", "Index tidak mengubah isi data; ia hanya struktur bantu untuk pencarian.", "Database hanya membuat index otomatis untuk primary key dan constraint UNIQUE, bukan untuk semua kolom."], xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: View Mahasiswa Teladan", graded: true, weight: 1, xp: 30,
        instruction: "Buat VIEW bernama view_mahasiswa_teladan yang menampilkan full_name, gpa, city dari mahasiswa dengan gpa >= 3.5. Lalu tampilkan seluruh isinya dengan SELECT * FROM view_mahasiswa_teladan;.",
        starterSql: "CREATE VIEW view_mahasiswa_teladan AS\nSELECT ____ FROM students WHERE ____;\n\nSELECT * FROM view_mahasiswa_teladan;",
        referenceSql: "SELECT full_name, gpa, city FROM students WHERE gpa >= 3.5;",
        requiredConstructs: ["CREATE VIEW"],
        hints: ["CREATE VIEW nama AS SELECT ...;", "Kolom yang diminta: full_name, gpa, city dengan syarat gpa >= 3.5.", "Setelah CREATE VIEW, jangan lupa SELECT * FROM view_mahasiswa_teladan; agar ada hasil yang dinilai."],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Index Pencarian Department", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true, efficiencyHint: "expect-index",
        instruction: "Buat INDEX bernama idx_students_dept pada kolom dept_id di tabel students. Setelah itu jalankan EXPLAIN QUERY PLAN SELECT * FROM students WHERE dept_id = 2; agar Anda bisa mengamati apakah index tersebut digunakan.",
        starterSql: "CREATE INDEX ____ ON students(____);\n\nEXPLAIN QUERY PLAN SELECT * FROM students WHERE dept_id = 2;",
        requiredConstructs: ["CREATE INDEX", "EXPLAIN"],
        validate: (sandbox) => {
          const idx = sandbox.query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_students_dept' AND tbl_name='students'");
          return { passed: idx.length > 0, message: idx.length > 0 ? "Index ditemukan pada tabel students." : "Index idx_students_dept pada tabel students belum ditemukan." };
        },
        hints: [
          "CREATE INDEX nama_index ON tabel(kolom);",
          "Nama index harus persis idx_students_dept pada kolom dept_id.",
          "Setelah membuat index, coba EXPLAIN QUERY PLAN SELECT * FROM students WHERE dept_id = 2; dan amati apakah baris hasil menyebut index Anda (\"USING INDEX\").",
        ],
      },
    ],
  },

  // --------------------------------------------------------------- L12
  {
    id: 12,
    code: "L12",
    title: "Transaction Guardian",
    questTitle: "Transaction Crisis",
    cpmk: "CPMK-6",
    subCpmk: "SubCPMK-6.3",
    competency: "ACID, COMMIT, ROLLBACK",
    badgeIcon: "💳",
    masteryThreshold: 80,
    tables: ["departments", "students", "courses", "enrollments", "payments"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments + F.payments,
    story: "Sistem pembayaran ASIA Smart Campus tidak boleh setengah-tersimpan. Transaction Guardian memastikan setiap perubahan bersifat atomik — sepenuhnya berhasil (COMMIT) atau sepenuhnya dibatalkan (ROLLBACK), tidak pernah setengah jalan.",
    microlearning: [
      { heading: "ACID", body: "Atomicity (semua-atau-tidak-sama-sekali), Consistency (data tetap valid), Isolation (transaksi tidak saling mengganggu), Durability (perubahan yang sudah commit tidak hilang)." },
      { heading: "BEGIN, COMMIT, ROLLBACK", body: "BEGIN TRANSACTION memulai blok transaksi. COMMIT menyimpan seluruh perubahan secara permanen. ROLLBACK membatalkan seluruh perubahan sejak BEGIN, mengembalikan data seperti semula." },
    ],
    stages: [
      { id: "s1", type: "practice", title: "Rollback Demo", instruction: "Amati bagaimana ROLLBACK mengembalikan data seperti semula.", starterSql: "BEGIN TRANSACTION;\nUPDATE payments SET status='paid' WHERE payment_id=2;\nROLLBACK;\nSELECT * FROM payments WHERE payment_id=2;", xp: 10, graded: false },
      { id: "q1", type: "quiz", title: "Cek Konsep: Atomicity", question: "Dalam ACID, apa arti huruf A (Atomicity)?", options: ["Data tetap tersimpan setelah listrik padam", "Transaksi tidak terlihat oleh transaksi lain sebelum selesai", "Data selalu memenuhi seluruh aturan constraint", "Semua langkah dalam transaksi berhasil seluruhnya, atau dibatalkan seluruhnya"], correctIndex: 3, explainCorrect: "Tepat — atomicity berarti 'semua atau tidak sama sekali'.", explainWrongByOption: ["Itu Durability (D).", "Itu Isolation (I).", "Itu Consistency (C).", null], xp: 10, graded: false },
      { id: "q2", type: "quiz", title: "Cek Konsep: Transfer Saldo Gagal", question: "Pada transfer saldo, UPDATE yang mengurangi saldo A sudah berhasil, tetapi UPDATE yang menambah saldo B gagal. Apa yang sebaiknya dilakukan?", options: ["COMMIT agar pengurangan saldo A tersimpan dulu", "ROLLBACK agar seluruh perubahan dalam transaksi dibatalkan", "Abaikan error dan perbaiki saldo B secara manual besok", "Hapus baris milik A"], correctIndex: 1, explainCorrect: "Benar — ROLLBACK mengembalikan data ke kondisi sebelum transaksi, sehingga uang tidak 'hilang' di tengah jalan.", explainWrongByOption: ["COMMIT akan mengesahkan pengurangan saldo A tanpa penambahan di B, sehingga data menjadi tidak konsisten.", null, "Membiarkan data setengah jadi melanggar atomicity dan berisiko tidak konsisten.", "Menghapus baris tidak memperbaiki transfer, dan justru menghilangkan data."], xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: Konfirmasi Pembayaran", graded: true, weight: 1, xp: 30,
        instruction: "Gunakan transaksi: mulai transaksi, ubah status payment_id=2 menjadi 'paid', lalu COMMIT agar perubahan permanen.",
        starterSql: "BEGIN TRANSACTION;\nUPDATE payments SET status='paid' WHERE payment_id=2;\n____;",
        requiredConstructs: ["BEGIN", "COMMIT"],
        validate: (sandbox) => {
          const rows = sandbox.query("SELECT status FROM payments WHERE payment_id=2");
          const ok = rows.length && rows[0].status === "paid";
          return { passed: !!ok, message: ok ? "Pembayaran berhasil dikonfirmasi permanen." : "Status payment_id=2 belum 'paid'." };
        },
        hints: ["Awali dengan BEGIN TRANSACTION;", "Lakukan UPDATE seperti biasa.", "Akhiri dengan COMMIT; agar perubahan permanen."],
      },
      {
        id: "s3", type: "sql", title: "Challenge: Batalkan Transaksi Gagal", graded: true, weight: 2, xp: 50, noHintBonus: true, portfolio: true,
        instruction: "Simulasikan kegagalan sistem: mulai transaksi, tambahkan pembayaran baru (payment_id=7, student_id=8, amount=1200000, payment_date='2025-08-10', status='paid'), lalu batalkan seluruh transaksi tersebut dengan ROLLBACK sehingga payment_id=7 TIDAK pernah tersimpan permanen.",
        starterSql: "BEGIN TRANSACTION;\nINSERT INTO payments (payment_id, student_id, amount, payment_date, status)\nVALUES (7, 8, 1200000, '2025-08-10', 'paid');\n____;",
        requiredConstructs: ["BEGIN", "INSERT INTO", "ROLLBACK"],
        validate: (sandbox) => {
          const c = rowCountWhere(sandbox, "payments", "payment_id=7");
          return { passed: c === 0, message: c === 0 ? "Transaksi berhasil dibatalkan — payment_id=7 tidak tersimpan." : "payment_id=7 masih tersimpan — pastikan Anda mengakhiri dengan ROLLBACK, bukan COMMIT." };
        },
        hints: [
          "Struktur: BEGIN TRANSACTION; ... INSERT ...; ROLLBACK;",
          "ROLLBACK membatalkan seluruh perubahan sejak BEGIN, termasuk INSERT yang baru dilakukan.",
          "Jangan gunakan COMMIT pada quest ini — tujuannya justru membatalkan transaksi.",
        ],
      },
    ],
  },

  // --------------------------------------------------------------- L13
  {
    id: 13,
    code: "L13",
    title: "Database Wizard",
    questTitle: "Automation Quest",
    cpmk: "CPMK-6",
    subCpmk: "SubCPMK-6.4",
    competency: "Procedure, function, trigger",
    badgeIcon: "🪄",
    masteryThreshold: 80,
    bossBattle: true,
    bossLabel: "Boss C",
    tables: ["departments", "students", "courses", "enrollments", "payments", "payment_audit"],
    datasetSql: F.departments + F.students + F.courses + F.enrollments + F.payments + F.paymentAudit,
    story: "Database Wizard mengotomasi aturan bisnis langsung di dalam database menggunakan TRIGGER, sehingga aturan tetap berlaku siapa pun yang mengubah data. Ini Boss Battle penutup kompetensi Level 11–13.",
    microlearning: [
      {
        heading: "Catatan Sandbox: PROCEDURE/FUNCTION di MySQL",
        body: "MySQL mendukung CREATE PROCEDURE dan CREATE FUNCTION untuk logika otomatis di sisi database, biasa diapit DELIMITER agar titik koma di dalamnya tidak memutus blok. Sandbox latihan ini memakai SQLite (agar dapat berjalan langsung di browser tanpa server) yang tidak mendukung stored procedure — sintaks berikut hanya referensi, tidak dieksekusi:",
        code: "DELIMITER //\nCREATE PROCEDURE naikkan_gpa(IN p_student_id INT, IN p_kenaikan DECIMAL(3,2))\nBEGIN\n  UPDATE students SET gpa = gpa + p_kenaikan WHERE student_id = p_student_id;\nEND //\nDELIMITER ;",
      },
      { heading: "TRIGGER", body: "TRIGGER (didukung SQLite maupun MySQL) menjalankan aksi otomatis SEBELUM/SESUDAH (BEFORE/AFTER) suatu INSERT/UPDATE/DELETE terjadi pada tabel tertentu — level ini fokus berlatih TRIGGER secara langsung." },
    ],
    stages: [
      { id: "s1", type: "quiz", title: "Sintaks MySQL Procedure", question: "Pada MySQL, blok logika prosedur biasanya diapit perintah apa agar titik koma di dalamnya tidak memutus blok?", options: ["DELIMITER (umumnya diubah sementara menjadi //)", "COMMIT", "ROLLBACK", "EXPLAIN"], correctIndex: 0, explainWrongByOption: [null, "COMMIT mengesahkan transaksi; tidak mengubah cara MySQL membaca titik koma di dalam blok prosedur.", "ROLLBACK membatalkan transaksi, bukan untuk membungkus blok prosedur.", "EXPLAIN menampilkan rencana eksekusi query; tidak terkait penulisan blok prosedur."], explainCorrect: "Tepat — di MySQL, perintah DELIMITER (mis. diubah menjadi //) dipakai sementara agar titik koma di dalam blok prosedur tidak dianggap akhir perintah.", xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Mini Quest: Trigger Validasi Skor", graded: true, weight: 1, xp: 30, expectFailure: true,
        instruction: "Buat TRIGGER bernama trg_min_score yang menolak (RAISE ABORT) penyisipan ke enrollments jika score < 0 atau score > 100. Lalu UJI dengan mencoba menyisipkan enrollment_id=999, student_id=1, course_id=101, semester='Ganjil 2025/2026', score=150 — percobaan INSERT ini SEHARUSNYA gagal karena ditolak trigger Anda (itulah tanda sukses pada quest ini).",
        starterSql: "CREATE TRIGGER ____\nBEFORE INSERT ON enrollments\nWHEN NEW.score < 0 OR NEW.score ____ 100\nBEGIN\n  SELECT RAISE(ABORT, 'Skor tidak valid');\nEND;\n\nINSERT INTO enrollments (enrollment_id, student_id, course_id, semester, score)\nVALUES (999, 1, 101, 'Ganjil 2025/2026', 150);",
        requiredConstructs: ["CREATE TRIGGER"],
        validate: (sandbox) => {
          const trg = sandbox.query("SELECT name FROM sqlite_master WHERE type='trigger' AND name='trg_min_score'");
          return { passed: trg.length > 0, message: trg.length > 0 ? "Trigger trg_min_score aktif dan berhasil menolak data tidak valid." : "Trigger trg_min_score belum terdeteksi." };
        },
        hints: [
          "Gunakan CREATE TRIGGER nama BEFORE INSERT ON tabel WHEN kondisi BEGIN ... END;",
          "Kondisi WHEN NEW.score < 0 OR NEW.score > 100 menentukan kapan trigger aktif.",
          "Di dalam BEGIN...END, gunakan SELECT RAISE(ABORT, 'pesan'); untuk menolak operasi.",
          "Setelah trigger dibuat, coba INSERT dengan score=150 — jika trigger benar, INSERT ini akan gagal dengan pesan error, dan itu artinya quest berhasil.",
        ],
      },
      {
        id: "s3", type: "sql", title: "⚔ Boss Battle: Audit Otomatis Pembayaran", graded: true, weight: 2, xp: 100, noHintBonus: true, portfolio: true, bossBattle: true,
        instruction: "Buat TRIGGER bernama trg_log_payment yang otomatis menyisipkan baris ke tabel payment_audit (payment_id, action, changed_at) setiap kali ada UPDATE pada tabel payments — isi action dengan 'updated'. Uji dengan mengubah status payment_id=1 menjadi 'refunded', lalu tampilkan isi payment_audit.",
        starterSql: "CREATE TRIGGER ____\nAFTER UPDATE ON payments\nBEGIN\n  INSERT INTO payment_audit (payment_id, action, changed_at)\n  VALUES (____.payment_id, 'updated', datetime('now'));\nEND;\n\nUPDATE payments SET status='refunded' WHERE payment_id=1;\n\nSELECT * FROM payment_audit;",
        requiredConstructs: ["CREATE TRIGGER", "UPDATE"],
        validate: (sandbox) => {
          const trg = sandbox.query("SELECT name FROM sqlite_master WHERE type='trigger' AND name='trg_log_payment'");
          if (!trg.length) return { passed: false, message: "Trigger trg_log_payment belum terdeteksi." };
          const c = rowCountWhere(sandbox, "payment_audit", "payment_id=1 AND action='updated'");
          return { passed: c > 0, message: c > 0 ? "Audit otomatis tercatat dengan benar." : "Belum ada baris audit untuk payment_id=1." };
        },
        hints: [
          "CREATE TRIGGER nama AFTER UPDATE ON payments BEGIN ... END;",
          "Di dalam trigger, gunakan NEW.payment_id untuk mengambil nilai baris yang baru diubah.",
          "INSERT INTO payment_audit (payment_id, action, changed_at) VALUES (NEW.payment_id, 'updated', datetime('now'));",
          "Jangan lupa jalankan UPDATE payments SET status='refunded' WHERE payment_id=1; agar trigger benar-benar terpicu.",
        ],
      },
    ],
  },

  // --------------------------------------------------------------- L14
  {
    id: 14,
    code: "L14",
    title: "Database Architect",
    questTitle: "FINAL BOSS",
    cpmk: "CPMK-8",
    subCpmk: "SubCPMK-8.1",
    competency: "Security, EXPLAIN, optimization, integration",
    badgeIcon: "👑",
    masteryThreshold: 80,
    bossBattle: true,
    bossLabel: "Final Boss",
    tables: ["departments", "students", "courses", "lecturers", "classes", "enrollments", "payments"],
    datasetSql: F.departments + F.students + F.courses + F.lecturers + F.classes + F.enrollments + F.payments,
    story: "Seluruh kompetensi bermuara di sini. Sebagai Database Architect, Anda menyusun laporan lintas tabel untuk manajemen kampus, sekaligus mempertimbangkan keamanan dan performa — bukan hanya \"query yang jalan\", tetapi solusi database yang lengkap.",
    microlearning: [
      { heading: "Keamanan Query di Produksi", body: "Sandbox latihan ini berjalan di browser Anda sendiri sehingga aman untuk bereksperimen bebas. Di aplikasi produksi sungguhan, query TIDAK PERNAH dirangkai langsung dari input pengguna (rawan SQL Injection) — gunakan parameterized query/prepared statement, dan akun database aplikasi memakai privilege paling minimum yang diperlukan." },
      { heading: "EXPLAIN QUERY PLAN", body: "Sebelum submit, Anda bisa mencoba (lewat tombol Run saja) menjalankan EXPLAIN QUERY PLAN <query Anda> untuk melihat rencana eksekusi — apakah database melakukan full table scan atau memanfaatkan index." },
    ],
    stages: [
      { id: "s1", type: "quiz", title: "Mengapa Parameterized Query?", question: "Mengapa aplikasi produksi sebaiknya menggunakan parameterized query/prepared statement, bukan menggabungkan input pengguna langsung ke string SQL?", options: ["Mencegah SQL Injection", "Membuat query berjalan lebih lambat", "Supaya tabel otomatis ternormalisasi", "Agar index otomatis terbentuk"], correctIndex: 0, explainWrongByOption: [null, "Parameterized query tidak membuat query lebih lambat secara berarti; tujuan utamanya keamanan, bukan kecepatan.", "Normalisasi adalah soal desain tabel, tidak berkaitan dengan cara aplikasi mengirim query.", "Index dibuat dengan CREATE INDEX, bukan otomatis oleh parameterized query; manfaat utamanya adalah mencegah SQL Injection."], explainCorrect: "Benar — parameterized query memisahkan kode SQL dari data input sehingga input berbahaya tidak bisa mengubah struktur query; inilah pertahanan utama terhadap SQL Injection.", xp: 10, graded: false },
      {
        id: "s2", type: "sql", title: "Final Boss — Bagian 1: Jadwal Mahasiswa", graded: true, weight: 1, xp: 50,
        instruction: "Tampilkan full_name mahasiswa, dept_name, lecturer_name (nama dosen pengampu), dan room untuk setiap enrollment pada semester 'Ganjil 2025/2026' (gabungkan enrollments → students → departments → classes → lecturers, hubungkan classes ke enrollments berdasarkan course_id DAN semester yang sama).",
        starterSql: "-- Gabungkan 5 tabel: enrollments, students, departments, classes, lecturers\n",
        referenceSql: `SELECT s.full_name, d.dept_name, l.full_name AS lecturer_name, cl.room
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
JOIN departments d ON s.dept_id = d.dept_id
JOIN classes cl ON cl.course_id = e.course_id AND cl.semester = e.semester
JOIN lecturers l ON cl.lecturer_id = l.lecturer_id;`,
        requiredConstructs: ["JOIN"],
        hints: [
          "Mulai dari enrollments, lalu JOIN ke students, departments, classes, dan lecturers.",
          "classes dihubungkan ke enrollments lewat DUA kondisi: course_id yang sama DAN semester yang sama.",
          "lecturers dihubungkan lewat classes.lecturer_id = lecturers.lecturer_id.",
        ],
      },
      {
        id: "s3", type: "sql", title: "⚔ Final Boss — Bagian 2: Laporan Performa Department", graded: true, weight: 2, xp: 100, noHintBonus: true, portfolio: true, bossBattle: true,
        instruction: "Susun laporan performa department: untuk setiap department tampilkan dept_name, jumlah mahasiswa unik (alias jumlah_mahasiswa), dan rata-rata skor seluruh enrollment mahasiswa department tersebut (alias rata_rata_skor) — hanya department dengan rata-rata skor DI BAWAH 80 (butuh reinforcement). Urutkan dari rata-rata terendah. (Opsional, hanya lewat Run: coba EXPLAIN QUERY PLAN untuk query ini guna mengamati rencana eksekusinya — tidak perlu disertakan saat Submit.)",
        starterSql: "-- JOIN departments + students + enrollments\n-- GROUP BY department, HAVING rata-rata < 80, ORDER BY rata-rata ASC\n",
        referenceSql: `SELECT d.dept_name, COUNT(DISTINCT s.student_id) AS jumlah_mahasiswa, AVG(e.score) AS rata_rata_skor
FROM departments d
JOIN students s ON s.dept_id = d.dept_id
JOIN enrollments e ON e.student_id = s.student_id
GROUP BY d.dept_id
HAVING AVG(e.score) < 80
ORDER BY rata_rata_skor ASC;`,
        requiredConstructs: ["JOIN", "GROUP BY", "HAVING"],
        hints: [
          "Gabungkan departments, students, dan enrollments.",
          "Kelompokkan per department (GROUP BY dept_id), gunakan COUNT(DISTINCT student_id) untuk jumlah mahasiswa.",
          "HAVING AVG(e.score) < 80 menyaring department yang butuh reinforcement.",
          "Tutup dengan ORDER BY rata_rata_skor ASC.",
        ],
      },
      {
        id: "s4", type: "reflect", title: "Reflection: Evaluasi Akhir", graded: false, xp: 25, portfolio: true,
        instruction: "Sebagai Database Architect, jelaskan mengapa laporan performa department pada Bagian 2 berguna bagi dosen/prodi dalam pengambilan keputusan remedial, dan satu langkah optimasi apa yang akan Anda pertimbangkan jika tabel enrollments memiliki jutaan baris.",
        placeholder: "Tulis refleksi akhir Anda di sini (minimal 30 karakter)...",
        minLength: 30,
      },
    ],
  },
];

export function getLevelById(id) {
  return LEVELS.find((l) => l.id === Number(id));
}

export function getNextLevel(id) {
  const idx = LEVELS.findIndex((l) => l.id === Number(id));
  return LEVELS[idx + 1] || null;
}
