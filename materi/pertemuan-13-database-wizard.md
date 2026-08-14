# Pertemuan 13 — Database Wizard
### Procedure, Function, Trigger

**CPMK-6** • Sub-CPMK-6.4 — Menerapkan database object (procedure, function, trigger) untuk automasi logika bisnis.
**Level game terkait:** Lv.13 Database Wizard — Quest *Automation Quest* (⚔ Boss C)

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan kapan logika bisnis layak diautomasi di level database.
- Membuat `STORED PROCEDURE` dan `FUNCTION` sederhana dengan `DELIMITER`.
- Membuat `TRIGGER` yang bereaksi otomatis terhadap `INSERT`/`UPDATE`/`DELETE`.
- Menjelaskan trade-off menaruh logika di database vs. di aplikasi.

## 2. Pengantar & Konteks

Bayangkan aturan bisnis *"skor nilai mahasiswa tidak boleh di luar rentang 0–100"* atau *"setiap kali status pembayaran berubah, catat ke log audit"*. Aturan seperti ini bisa ditulis di kode aplikasi — tapi bila ada 5 aplikasi berbeda (web, mobile, admin panel, skrip batch) yang semuanya menulis ke database yang sama, aturan itu harus **diduplikasi di lima tempat**, dan rawan lupa di salah satunya. *Database Wizard* memindahkan otomasi seperti ini **langsung ke database**, sehingga berlaku **di mana pun** data ditulis.

## 3. Materi Inti

### 3.1 DELIMITER — Mengapa Diperlukan

Blok `PROCEDURE`/`FUNCTION`/`TRIGGER` berisi banyak statement yang masing-masing diakhiri titik koma (`;`). Tanpa penyesuaian, MySQL client akan menganggap titik koma pertama sebagai akhir seluruh perintah. `DELIMITER` mengubah karakter pemisah statement **sementara**, biasanya menjadi `//`, sehingga seluruh blok dianggap satu kesatuan.

```sql
DELIMITER //

CREATE PROCEDURE contoh()
BEGIN
  SELECT 'halo';
END //

DELIMITER ;   -- kembalikan delimiter ke ; setelah selesai
```

### 3.2 STORED PROCEDURE

*Procedure* adalah kumpulan statement SQL yang disimpan di database dan dapat dipanggil dengan `CALL`, boleh menerima parameter, dan **tidak** mengembalikan nilai lewat `RETURN` (procedure bisa mengembalikan result set lewat `SELECT` biasa di dalamnya).

```sql
DELIMITER //

CREATE PROCEDURE naikkan_gpa(
  IN p_student_id INT,
  IN p_kenaikan DECIMAL(3,2)
)
BEGIN
  UPDATE students
  SET gpa = LEAST(gpa + p_kenaikan, 4.00)   -- jangan sampai melebihi 4.00
  WHERE student_id = p_student_id;
END //

DELIMITER ;

CALL naikkan_gpa(1, 0.10);
```

Parameter procedure bisa bertipe `IN` (input saja, default), `OUT` (output saja), atau `INOUT` (keduanya).

### 3.3 FUNCTION

*Function* mirip procedure, tapi **wajib** mengembalikan tepat satu nilai lewat `RETURN`, dan dapat dipanggil langsung di dalam ekspresi `SELECT` — layaknya fungsi bawaan seperti `AVG()` atau `UPPER()`.

```sql
DELIMITER //

CREATE FUNCTION huruf_mutu(p_score DECIMAL(5,2))
RETURNS CHAR(1)
DETERMINISTIC
BEGIN
  DECLARE hasil CHAR(1);
  IF p_score >= 85 THEN SET hasil = 'A';
  ELSEIF p_score >= 75 THEN SET hasil = 'B';
  ELSEIF p_score >= 65 THEN SET hasil = 'C';
  ELSE SET hasil = 'D';
  END IF;
  RETURN hasil;
END //

DELIMITER ;

SELECT student_id, score, huruf_mutu(score) AS grade
FROM enrollments;
```

`DETERMINISTIC` menandakan function selalu menghasilkan output yang sama untuk input yang sama — penting untuk optimasi query dan replikasi data.

### 3.4 TRIGGER

*Trigger* adalah blok logika yang **otomatis dijalankan** oleh MySQL saat event tertentu terjadi pada suatu tabel (`BEFORE`/`AFTER` × `INSERT`/`UPDATE`/`DELETE`) — tanpa perlu dipanggil manual.

```sql
DELIMITER //

-- BEFORE INSERT: menolak data tidak valid SEBELUM tersimpan
CREATE TRIGGER trg_validasi_skor
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Skor harus di antara 0 dan 100';
  END IF;
END //

-- AFTER UPDATE: mencatat audit trail SETELAH data berubah
CREATE TRIGGER trg_log_payment
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  INSERT INTO payment_audit (payment_id, action, changed_at)
  VALUES (NEW.payment_id, 'updated', NOW());
END //

DELIMITER ;
```

- `NEW.kolom` merujuk nilai **baru** (tersedia pada `INSERT`/`UPDATE`).
- `OLD.kolom` merujuk nilai **lama** (tersedia pada `UPDATE`/`DELETE`).
- `SIGNAL SQLSTATE '45000'` adalah cara standar MySQL untuk **menolak** operasi dari dalam trigger dengan pesan error kustom — mirip semangat `RAISE`/`THROW` pada bahasa pemrograman umum.

```sql
DROP TRIGGER IF EXISTS trg_validasi_skor;
DROP PROCEDURE IF EXISTS naikkan_gpa;
DROP FUNCTION IF EXISTS huruf_mutu;
```

## 4. Studi Kasus: ASIA Smart Campus

```sql
DELIMITER //
CREATE TRIGGER trg_min_score
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Skor tidak valid';
  END IF;
END //
DELIMITER ;

-- Percobaan yang SENGAJA ditolak trigger — membuktikan proteksi bekerja
INSERT INTO enrollments (student_id, course_id, semester, score)
VALUES (1, 101, 'Ganjil 2025/2026', 150);
-- ERROR 1644 (45000): Skor tidak valid
```

## 5. Praktik Terbaik & Update Terkini

- **Jangan mengotomasi semua logika bisnis di database.** Aturan yang murni terkait integritas data (validasi rentang nilai, audit trail) cocok di trigger; aturan yang sering berubah atau melibatkan sistem eksternal (mis. kirim notifikasi email, panggil API pembayaran) lebih tepat di aplikasi — logika di trigger yang kompleks & tersembunyi justru menyulitkan debugging ("magic" yang tidak terlihat dari kode aplikasi).
- **Dokumentasikan setiap trigger dengan jelas** — trigger yang "tidak terlihat" dari kode aplikasi adalah sumber kebingungan klasik saat developer baru bergabung dan bertanya-tanya "kenapa data ini berubah sendiri?".
- Gunakan `SHOW TRIGGERS`, `SHOW PROCEDURE STATUS`, dan `SHOW FUNCTION STATUS` untuk mengaudit seluruh automasi yang ada di suatu database sebelum melakukan perubahan besar.
- Stored procedure/function berjalan **di server database**, sehingga bisa mengurangi round-trip jaringan untuk operasi kompleks — tapi juga memindahkan beban komputasi ke server database yang mungkin lebih sulit di-scale horizontal dibanding server aplikasi. Pertimbangkan beban kerja sebelum memindahkan banyak logika ke sana.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Trigger dan Constraint (CHECK) itu sama fungsinya."** `CHECK` (Pertemuan 9) lebih sederhana dan dievaluasi otomatis oleh engine; `TRIGGER` lebih fleksibel (bisa melibatkan tabel lain, logika bercabang kompleks) tapi juga lebih mudah membuat efek samping tak terduga bila tidak hati-hati. Gunakan `CHECK` untuk validasi sederhana, `TRIGGER` untuk logika lintas-tabel/audit.
- ❌ **"Procedure bisa dipanggil di dalam SELECT seperti function."** Salah — hanya `FUNCTION` yang bisa dipanggil di dalam ekspresi `SELECT`. `PROCEDURE` hanya bisa dijalankan lewat `CALL`.
- ❌ **"Trigger BEFORE dan AFTER bisa saling menggantikan bebas."** `BEFORE` dipakai untuk **memvalidasi/memodifikasi** data sebelum tersimpan (bisa mengubah `NEW.kolom`); `AFTER` dipakai untuk **efek samping** setelah data pasti tersimpan (mis. audit log) — memilih yang salah bisa membuat logika gagal atau tidak efisien.

## 7. Rangkuman

- `DELIMITER` sementara mengubah pemisah statement agar blok procedure/function/trigger dianggap satu kesatuan oleh client.
- `PROCEDURE` dipanggil manual dengan `CALL`; `FUNCTION` mengembalikan satu nilai dan bisa dipakai langsung di `SELECT`; `TRIGGER` berjalan otomatis merespons event `INSERT`/`UPDATE`/`DELETE`.
- Automasi di database sangat kuat untuk menegakkan aturan yang harus berlaku di mana pun data ditulis, tapi harus didokumentasikan dengan baik agar tidak menjadi "magic" tersembunyi.

## 8. Latihan Mandiri

1. Buat `FUNCTION` bernama `status_kelulusan(p_gpa DECIMAL)` yang mengembalikan `'Lulus'` bila GPA ≥ 2.0, atau `'Tidak Lulus'` bila di bawahnya.
2. Buat `TRIGGER AFTER DELETE` pada tabel `students` yang mencatat `student_id` dan waktu penghapusan ke tabel `student_deletion_log`.
3. Jelaskan skenario nyata di ASIA Smart Campus di mana logika **sebaiknya tetap ditaruh di aplikasi**, bukan di trigger/procedure — dan alasannya.
4. Lanjutkan ke **Lv.13 Database Wizard** (Boss C) di MYSQL QUEST untuk berlatih TRIGGER secara langsung (catatan: sandbox game memakai SQLite yang tidak mendukung stored procedure, sehingga latihan interaktif berfokus pada TRIGGER — sintaks `PROCEDURE` di atas tetap berlaku penuh untuk MySQL sungguhan).
