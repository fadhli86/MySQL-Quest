# Pertemuan 4 — CRUD Ranger
### INSERT, UPDATE, DELETE

**CPMK-4** • Sub-CPMK-4.1 — Melakukan manipulasi dan retrieval data menggunakan DML dan DQL.
**Level game terkait:** Lv.4 CRUD Ranger — Quest *CRUD Mission*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menyisipkan data baru dengan `INSERT INTO`.
- Mengubah data yang sudah ada dengan `UPDATE ... WHERE`.
- Menghapus data dengan `DELETE FROM ... WHERE` secara aman.
- Menjelaskan mengapa klausa `WHERE` sangat krusial pada `UPDATE`/`DELETE`.

## 2. Pengantar & Konteks

Tabel `departments`, `students`, dan `courses` sudah berdiri sejak Pertemuan 3, tapi masih kosong atau berisi sedikit data contoh. Operasional harian ASIA Smart Campus penuh dengan perubahan data: mahasiswa baru mendaftar, nilai IPK diperbarui tiap semester, dan sesekali data perlu dihapus (mis. mahasiswa mengundurkan diri). Ketiga jenis operasi ini — **Create, Update, Delete** (bersama *Read* yang dibahas Pertemuan 5, membentuk **CRUD**) — masuk kelompok **DML (Data Manipulation Language)**, berbeda dari DDL (Pertemuan 3) yang mengubah struktur, bukan isi.

## 3. Materi Inti

### 3.1 INSERT — Menambah Data

```sql
-- Menyisipkan satu baris, menyebutkan kolom secara eksplisit (praktik yang disarankan)
INSERT INTO students (full_name, email, dept_id, gpa, enrollment_year, city)
VALUES ('Kirana Ayu Wibowo', 'kirana@asia.ac.id', 2, 3.35, 2026, 'Malang');

-- Menyisipkan banyak baris sekaligus (lebih efisien daripada banyak INSERT terpisah)
INSERT INTO students (full_name, email, dept_id, gpa, enrollment_year, city) VALUES
('Eka Prasetyo', 'eka@asia.ac.id', 4, 3.25, 2022, 'Batu'),
('Fajar Nugroho', 'fajar@asia.ac.id', 2, 3.55, 2023, 'Surabaya');
```

> **Selalu sebutkan nama kolom secara eksplisit** pada `INSERT INTO tabel (kolom...) VALUES (...)`. Menulis `INSERT INTO students VALUES (...)` tanpa menyebut kolom memang lebih pendek, tapi sangat rapuh — bila struktur tabel berubah (kolom ditambah/urutan berubah), query lama bisa gagal atau, lebih berbahaya, berhasil namun mengisi kolom yang salah.

### 3.2 UPDATE — Mengubah Data

```sql
UPDATE students
SET gpa = 3.20
WHERE student_id = 4;

-- Boleh mengubah beberapa kolom sekaligus
UPDATE students
SET gpa = 3.20, city = 'Malang'
WHERE student_id = 4;
```

### 3.3 DELETE — Menghapus Data

```sql
DELETE FROM students
WHERE student_id = 10;
```

### 3.4 ⚠️ Klausa WHERE adalah Segalanya

```sql
-- BAHAYA: tanpa WHERE, ini mengubah/menghapus SELURUH baris di tabel!
UPDATE students SET gpa = 0.0;
DELETE FROM students;
```

Ini adalah salah satu kesalahan operasional paling umum (dan paling mahal) dalam pekerjaan sehari-hari seorang database engineer. Kebiasaan aman yang disarankan industri:

1. **Jalankan dulu sebagai `SELECT` dengan kondisi `WHERE` yang sama**, pastikan baris yang terpengaruh sudah tepat, baru ubah menjadi `UPDATE`/`DELETE`.
   ```sql
   -- Langkah 1: cek dulu
   SELECT * FROM students WHERE student_id = 10;
   -- Langkah 2: baru eksekusi, dengan WHERE yang identik
   DELETE FROM students WHERE student_id = 10;
   ```
2. Di lingkungan produksi, MySQL Workbench memiliki **Safe Update Mode** yang menolak `UPDATE`/`DELETE` tanpa `WHERE` pada kolom key — aktifkan selama latihan.
3. Untuk operasi berisiko tinggi, bungkus dalam **transaksi** (`BEGIN` ... `ROLLBACK`/`COMMIT`, dibahas mendalam di Pertemuan 12) sehingga masih bisa dibatalkan sebelum permanen.

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Registrasi mahasiswa baru
INSERT INTO students (full_name, email, dept_id, gpa, enrollment_year, city)
VALUES ('Kirana Ayu Wibowo', 'kirana@asia.ac.id', 2, 3.35, 2026, 'Malang');

-- Update GPA setelah nilai semester keluar
UPDATE students
SET gpa = 3.60
WHERE student_id = 3;

-- Mahasiswa mengundurkan diri — hapus data (di sistem nyata umumnya
-- di-nonaktifkan lewat kolom status, bukan dihapus permanen — lihat §5)
DELETE FROM students
WHERE student_id = 10;
```

## 5. Praktik Terbaik & Update Terkini

- **Soft delete lebih disarankan daripada hard delete** untuk data penting: tambahkan kolom `is_active BOOLEAN DEFAULT TRUE` atau `deleted_at DATETIME NULL`, lalu "hapus" data dengan `UPDATE ... SET is_active = FALSE` alih-alih `DELETE`. Data historis (mis. untuk laporan/audit akademik) tetap tersimpan dan bisa dipulihkan bila diperlukan.
- Pada MySQL, `INSERT ... ON DUPLICATE KEY UPDATE` (fitur khas MySQL, tidak ada di semua RDBMS) memungkinkan "insert atau update jika sudah ada" dalam satu perintah — berguna untuk skenario sinkronisasi data.
  ```sql
  INSERT INTO students (student_id, full_name, gpa)
  VALUES (3, 'Citra Ayu', 3.80)
  ON DUPLICATE KEY UPDATE gpa = VALUES(gpa);
  ```
- Untuk import data massal (ribuan baris) dari file, `LOAD DATA INFILE` jauh lebih cepat dibanding ribuan perintah `INSERT` terpisah.
- Aplikasi produksi **tidak pernah** merangkai nilai input pengguna langsung ke string SQL (rawan SQL Injection) — gunakan *prepared statement*/*parameterized query* di sisi aplikasi. Topik keamanan ini diperdalam di Pertemuan 14.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"UPDATE/DELETE tanpa WHERE aman kalau tabelnya kecil."** Ukuran tabel tidak relevan — risikonya sama: seluruh baris berubah/hilang. Selalu biasakan disiplin `WHERE` sejak tabel masih kecil.
- ❌ **"INSERT selalu menambah baris baru walau ID sudah ada."** Jika kolom `student_id` adalah PRIMARY KEY dan Anda mencoba INSERT dengan ID yang sudah dipakai, MySQL akan menolak dengan error *duplicate entry* — ini adalah proteksi integritas, bukan bug (didalami di Pertemuan 9).
- ❌ **"DELETE lebih cepat dibanding TRUNCATE untuk mengosongkan tabel."** Sebaliknya — `TRUNCATE TABLE` jauh lebih cepat karena menghapus seluruh data tanpa mencatat log per baris, tapi konsekuensinya **tidak bisa di-ROLLBACK** dan me-reset nilai `AUTO_INCREMENT`. Gunakan `DELETE FROM tabel WHERE ...` bila hanya sebagian data yang perlu dihapus atau butuh kemungkinan rollback.

## 7. Rangkuman

- `INSERT`, `UPDATE`, `DELETE` (bersama `SELECT`) adalah operasi DML dasar yang menjadi fondasi CRUD.
- Klausa `WHERE` pada `UPDATE`/`DELETE` bersifat wajib secara praktik — lupa menuliskannya adalah kesalahan destruktif paling umum.
- Soft delete (menandai nonaktif) sering lebih aman daripada hard delete untuk data yang bernilai historis.

## 8. Latihan Mandiri

1. Tuliskan `INSERT` untuk menambahkan mata kuliah baru "Kecerdasan Buatan" (3 SKS) pada department Teknik Informatika.
2. Tuliskan `UPDATE` untuk menaikkan GPA seluruh mahasiswa department Sistem Informasi sebesar 0.1 poin — lalu jelaskan mengapa skenario ini **berbahaya** bila salah menuliskan `WHERE`.
3. Rancang skema soft delete untuk tabel `students` (tambahkan kolom apa, dan bagaimana query `DELETE` diganti).
4. Lanjutkan ke **Lv.4 CRUD Ranger** di MYSQL QUEST — bila sandbox latihan Anda berantakan setelah bereksperimen, gunakan tombol **Reset Sandbox**, bukan panik!
