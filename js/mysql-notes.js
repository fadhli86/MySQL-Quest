// "Beda dengan MySQL sungguhan" notes, one list per level.
//
// The sandbox runs SQLite (sql.js) in the browser, not MySQL. Most of the
// SQL taught is shared, but a student who only ever sees the sandbox can
// later be surprised by real MySQL. Each note contrasts what happens here
// (`sandbox`) with real MySQL 8 (`mysql`), optionally with a MySQL snippet
// (`code`). Snippets deliberately use different tables than the quests so
// they explain syntax without being the answer to a graded stage.
//
// Shown in the quest panel as a collapsible section; edit this file to
// adjust the wording — no other code depends on the text.

export const MYSQL_NOTES = {
  1: [
    {
      topic: "Server vs. sandbox",
      sandbox: "Database berjalan di browser Anda dan sudah terpilih otomatis.",
      mysql: "MySQL berjalan sebagai server. Anda login dulu, lalu memilih database sebelum membuat query.",
      code: "mysql -u root -p\nUSE asia_smart_campus;\nSHOW TABLES;",
    },
    {
      topic: "Melihat struktur tabel",
      sandbox: "Gunakan panel Schema.",
      mysql: "Pakai DESCRIBE atau SHOW CREATE TABLE.",
      code: "DESCRIBE students;\nSHOW CREATE TABLE students;",
    },
  ],
  2: [
    {
      topic: "Relasi ditegakkan oleh FOREIGN KEY",
      sandbox: "Relasi students.dept_id ke departments.dept_id di level ini hanya konsep pada ERD.",
      mysql: "Di MySQL relasi dibuat dengan FOREIGN KEY dan ditegakkan oleh engine InnoDB (default). Tabel dengan engine lain (mis. MyISAM) tidak menegakkan foreign key.",
    },
  ],
  3: [
    {
      topic: "AUTO_INCREMENT dan tipe data",
      sandbox: "SQLite memakai INTEGER PRIMARY KEY untuk kolom yang naik otomatis, dan bertipe dinamis: panjang VARCHAR(n) tidak ditegakkan dan teks bisa masuk ke kolom INTEGER.",
      mysql: "MySQL bertipe ketat: INT menolak teks, VARCHAR(n) menolak/memotong nilai yang lebih panjang (tergantung sql_mode), dan kolom naik otomatis ditulis AUTO_INCREMENT.",
      code: "CREATE TABLE rooms (\n  room_id INT AUTO_INCREMENT PRIMARY KEY,\n  room_name VARCHAR(50) NOT NULL,\n  capacity SMALLINT\n) ENGINE=InnoDB;",
    },
    {
      topic: "CREATE DATABASE",
      sandbox: "Tidak diperlukan; database sandbox sudah disiapkan.",
      mysql: "Di MySQL Anda membuat database sendiri, sebaiknya dengan charset utf8mb4.",
      code: "CREATE DATABASE asia_smart_campus\n  CHARACTER SET utf8mb4;",
    },
  ],
  4: [
    {
      topic: "LIMIT pada UPDATE / DELETE",
      sandbox: "SQLite bawaan tidak mendukung LIMIT pada UPDATE atau DELETE.",
      mysql: "MySQL mendukungnya, berguna sebagai pengaman.",
      code: "DELETE FROM logs WHERE level = 'debug' LIMIT 100;",
    },
    {
      topic: "Safe updates",
      sandbox: "UPDATE/DELETE tanpa WHERE langsung dijalankan.",
      mysql: "MySQL Workbench dan klien dengan sql_safe_updates=1 menolak UPDATE/DELETE tanpa WHERE pada kolom key. Biasakan selalu memakai WHERE.",
    },
    {
      topic: "Upsert",
      sandbox: "INSERT ... ON CONFLICT (...) DO UPDATE.",
      mysql: "INSERT ... ON DUPLICATE KEY UPDATE.",
      code: "INSERT INTO stock (sku, qty) VALUES ('A1', 5)\nON DUPLICATE KEY UPDATE qty = qty + VALUES(qty);",
    },
  ],
  5: [
    {
      topic: "Huruf besar/kecil pada perbandingan teks",
      sandbox: "Operator = membedakan huruf besar/kecil: 'malang' tidak sama dengan 'Malang'.",
      mysql: "Collation default MySQL (utf8mb4_0900_ai_ci) tidak membedakan huruf besar/kecil, jadi city = 'malang' juga cocok dengan 'Malang'.",
    },
    {
      topic: "Menggabungkan teks",
      sandbox: "Operator || (mis. first_name || ' ' || last_name); fungsi CONCAT() baru tersedia di SQLite versi terbaru.",
      mysql: "Pakai fungsi CONCAT(); di MySQL || berarti OR secara default.",
      code: "SELECT CONCAT(first_name, ' ', last_name) FROM people;",
    },
    {
      topic: "LIMIT dengan offset",
      sandbox: "LIMIT 5 OFFSET 10.",
      mysql: "Bentuk yang sama berlaku, dan MySQL juga menerima LIMIT 10, 5 (offset dulu, baru jumlah).",
    },
  ],
  6: [
    {
      topic: "ONLY_FULL_GROUP_BY",
      sandbox: "SQLite menerima kolom non-agregat yang tidak ada di GROUP BY dan memilih nilai sembarang.",
      mysql: "MySQL 8 secara default menolak query seperti itu (ERROR 1055). Semua kolom non-agregat pada SELECT harus muncul di GROUP BY.",
    },
    {
      topic: "Pembagian bilangan bulat",
      sandbox: "Di SQLite 7 / 2 menghasilkan 3 (integer).",
      mysql: "Di MySQL 7 / 2 menghasilkan 3.5000; gunakan DIV untuk pembagian bulat.",
      code: "SELECT 7 / 2, 7 DIV 2;",
    },
  ],
  7: [
    {
      topic: "FULL OUTER JOIN",
      sandbox: "SQLite versi baru dapat menerima FULL OUTER JOIN.",
      mysql: "MySQL tidak memilikinya. Gabungkan LEFT JOIN dan RIGHT JOIN dengan UNION.",
      code: "SELECT * FROM a LEFT JOIN b ON a.id = b.a_id\nUNION\nSELECT * FROM a RIGHT JOIN b ON a.id = b.a_id;",
    },
  ],
  8: [
    {
      topic: "Derived table wajib beri alias",
      sandbox: "FROM (SELECT ...) tanpa alias diterima.",
      mysql: "MySQL menolaknya (ERROR 1248: Every derived table must have its own alias).",
      code: "SELECT t.dept_id\nFROM (SELECT dept_id, COUNT(*) AS n FROM students GROUP BY dept_id) AS t;",
    },
    {
      topic: "LIMIT di dalam subquery IN",
      sandbox: "Diterima.",
      mysql: "MySQL menolak LIMIT di dalam subquery IN/ALL/ANY/SOME. Bungkus subquery-nya sebagai derived table.",
    },
  ],
  9: [
    {
      topic: "Foreign key",
      sandbox: "SQLite baru menegakkan foreign key bila PRAGMA foreign_keys = ON; sandbox mengaktifkannya untuk level yang membutuhkannya.",
      mysql: "Di MySQL InnoDB foreign key selalu aktif, tanpa PRAGMA.",
    },
    {
      topic: "CHECK constraint",
      sandbox: "CHECK ditegakkan.",
      mysql: "MySQL baru menegakkan CHECK sejak versi 8.0.16. Pada versi lama sintaksnya diterima tetapi diabaikan diam-diam.",
    },
  ],
  10: [
    {
      topic: "Konsep sama, DDL berbeda",
      sandbox: "Normalisasi (1NF/2NF/3NF) adalah konsep desain, bukan fitur mesin.",
      mysql: "Konsepnya identik di MySQL. Bedanya hanya di DDL: tipe data eksplisit, AUTO_INCREMENT, dan FOREIGN KEY dengan aksi ON DELETE / ON UPDATE pada InnoDB.",
      code: "CREATE TABLE enroll_norm (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  student_id INT NOT NULL,\n  course_id INT NOT NULL,\n  FOREIGN KEY (student_id) REFERENCES students(student_id)\n    ON DELETE CASCADE\n) ENGINE=InnoDB;",
    },
  ],
  11: [
    {
      topic: "Mengganti VIEW",
      sandbox: "Tidak ada CREATE OR REPLACE VIEW; hapus dulu dengan DROP VIEW IF EXISTS.",
      mysql: "MySQL mendukung CREATE OR REPLACE VIEW.",
      code: "CREATE OR REPLACE VIEW view_kelas_aktif AS\nSELECT class_id, room FROM classes WHERE active = 1;",
    },
    {
      topic: "EXPLAIN dan melihat index",
      sandbox: "EXPLAIN QUERY PLAN menampilkan teks seperti SEARCH ... USING INDEX.",
      mysql: "EXPLAIN menampilkan tabel (kolom type, key, rows); EXPLAIN ANALYZE (8.0.18+) juga mengukur eksekusi nyata. Index dilihat dengan SHOW INDEX.",
      code: "EXPLAIN SELECT * FROM students WHERE dept_id = 2;\nSHOW INDEX FROM students;",
    },
  ],
  12: [
    {
      topic: "Memulai transaksi",
      sandbox: "BEGIN TRANSACTION diterima.",
      mysql: "Di MySQL gunakan START TRANSACTION atau BEGIN. BEGIN TRANSACTION adalah syntax error.",
      code: "START TRANSACTION;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;",
    },
    {
      topic: "DDL tidak bisa di-ROLLBACK",
      sandbox: "CREATE/ALTER/DROP ikut dalam transaksi dan dapat dibatalkan.",
      mysql: "Di MySQL perintah DDL memicu implicit commit: transaksi yang berjalan otomatis di-COMMIT dan tidak bisa di-ROLLBACK.",
    },
    {
      topic: "Engine dan isolation level",
      sandbox: "Satu engine, satu pengguna, tanpa konkurensi.",
      mysql: "Transaksi hanya untuk InnoDB (bukan MyISAM). Isolation level default MySQL adalah REPEATABLE READ.",
    },
  ],
  13: [
    {
      topic: "Sintaks TRIGGER",
      sandbox: "Memakai WHEN ... dan SELECT RAISE(ABORT, 'pesan') untuk menolak operasi; FOR EACH ROW tidak wajib.",
      mysql: "Memakai FOR EACH ROW, IF ... END IF, dan SIGNAL SQLSTATE '45000' untuk menolak operasi, dengan DELIMITER agar titik koma di dalam blok tidak memutus perintah.",
      code: "DELIMITER //\nCREATE TRIGGER trg_price_check\nBEFORE INSERT ON products\nFOR EACH ROW\nBEGIN\n  IF NEW.price < 0 THEN\n    SIGNAL SQLSTATE '45000'\n      SET MESSAGE_TEXT = 'Harga tidak valid';\n  END IF;\nEND//\nDELIMITER ;",
    },
    {
      topic: "PROCEDURE dan FUNCTION",
      sandbox: "Tidak didukung SQLite, sehingga level ini berlatih dengan TRIGGER.",
      mysql: "Stored procedure dan function adalah fitur MySQL; dipanggil dengan CALL (procedure) atau dipakai di dalam query (function).",
    },
  ],
  14: [
    {
      topic: "User dan hak akses",
      sandbox: "Tidak ada konsep user atau privilege.",
      mysql: "MySQL mengatur akses per user dengan CREATE USER, GRANT, dan REVOKE. Prinsipnya: berikan hak minimum yang dibutuhkan.",
      code: "CREATE USER 'asisten'@'localhost' IDENTIFIED BY '...';\nGRANT SELECT ON asia_smart_campus.* TO 'asisten'@'localhost';",
    },
    {
      topic: "Prepared statement",
      sandbox: "Query dijalankan langsung dari editor.",
      mysql: "Aplikasi sebaiknya memakai prepared statement (di pustaka pemrograman atau lewat PREPARE/EXECUTE) agar input tidak bisa mengubah struktur query.",
      code: "PREPARE stmt FROM 'SELECT * FROM students WHERE student_id = ?';\nSET @id = 1;\nEXECUTE stmt USING @id;",
    },
  ],
};
