# Pertemuan 9 — Data Guardian
### Constraint dan Data Integrity

**CPMK-6** • Sub-CPMK-6.1 — Menerapkan integrity, normalization, transaction, dan database object.
**Level game terkait:** Lv.9 Data Guardian — Quest *Protect the Database*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan pentingnya integritas data dan risiko bila diabaikan.
- Menerapkan constraint `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`, dan `FOREIGN KEY`.
- Menjelaskan perilaku `ON DELETE`/`ON UPDATE` pada foreign key (`CASCADE`, `RESTRICT`, `SET NULL`).
- Membaca dan menafsirkan pesan error saat constraint dilanggar.

## 2. Pengantar & Konteks

Sejauh ini query kita berasumsi data yang masuk selalu "bersih" dan benar. Di dunia nyata, itu asumsi yang berbahaya — input bisa datang dari formulir web yang salah isi, proses migrasi data yang tidak sempurna, atau bug di aplikasi. *Data Guardian* memastikan **database itu sendiri** menolak data yang tidak valid, terlepas dari apakah aplikasi di atasnya memvalidasi dengan benar atau tidak — inilah lapisan pertahanan terakhir (*last line of defense*) integritas data.

## 3. Materi Inti

### 3.1 NOT NULL dan DEFAULT

```sql
CREATE TABLE payments (
  payment_id    INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  payment_date  DATE NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
);
```

`NOT NULL` mewajibkan kolom diisi. `DEFAULT` mengisi nilai otomatis bila tidak disebutkan saat `INSERT` — pada contoh di atas, `status` akan otomatis bernilai `'pending'` bila tidak ditentukan.

### 3.2 UNIQUE

```sql
ALTER TABLE students ADD CONSTRAINT uq_students_email UNIQUE (email);
```

Mencegah nilai kembar pada kolom (atau kombinasi kolom, mis. `UNIQUE(student_id, course_id, semester)` untuk mencegah mahasiswa yang sama enroll dua kali di mata kuliah dan semester yang identik).

### 3.3 CHECK Constraint (MySQL 8.0.16+)

```sql
CREATE TABLE enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  course_id     INT NOT NULL,
  score         DECIMAL(5,2),
  CONSTRAINT chk_score_range CHECK (score BETWEEN 0 AND 100)
);
```

`CHECK` menolak data yang melanggar kondisi logika yang didefinisikan. **Penting:** dukungan `CHECK` yang benar-benar ditegakkan (bukan hanya diterima secara sintaks tapi diabaikan) baru tersedia mulai **MySQL 8.0.16** — versi MySQL yang lebih lama akan menerima sintaksnya tapi diam-diam tidak menegakkannya. Selalu verifikasi versi MySQL yang dipakai laboratorium/server sebelum mengandalkan `CHECK`.

### 3.4 FOREIGN KEY dan Aksi Referensial

```sql
CREATE TABLE enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  course_id     INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
    ON DELETE RESTRICT
);
```

| Aksi | Perilaku saat baris induk dihapus/diubah |
|---|---|
| `RESTRICT` (default) | Menolak DELETE/UPDATE pada induk bila masih ada anak yang merujuknya |
| `CASCADE` | Ikut menghapus/mengubah baris anak secara otomatis |
| `SET NULL` | Kolom FK pada anak diisi `NULL` (kolom FK harus mengizinkan NULL) |
| `NO ACTION` | Serupa `RESTRICT` pada MySQL |

**Pilih aksi dengan hati-hati sesuai makna bisnis:** `ON DELETE CASCADE` pada `enrollments` saat `students` dihapus masuk akal (riwayat enrollment mahasiswa yang dihapus permanen ikut tidak relevan) — tapi `CASCADE` pada data finansial seperti `payments` bisa berbahaya bila diterapkan sembarangan (kehilangan jejak audit pembayaran).

### 3.5 Membaca Pesan Error Constraint

```
ERROR 1048 (23000): Column 'full_name' cannot be null
ERROR 1062 (23000): Duplicate entry 'andi@asia.ac.id' for key 'students.uq_email'
ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails
ERROR 3819 (HY000): Check constraint 'chk_score_range' is violated
```

Kode error `23000` menandakan pelanggaran integritas data secara umum (standar SQLSTATE) — kebiasaan membaca pesan error dengan tenang (bukan langsung mencoba-coba) akan sangat menghemat waktu debugging.

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Tabel review mata kuliah dengan proteksi berlapis
CREATE TABLE course_reviews (
  review_id      INT AUTO_INCREMENT PRIMARY KEY,
  course_id      INT NOT NULL,
  rating         TINYINT NOT NULL,
  reviewer_name  VARCHAR(100) NOT NULL,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

-- Percobaan yang SENGAJA gagal — menunjukkan proteksi bekerja
INSERT INTO course_reviews (course_id, rating, reviewer_name)
VALUES (101, 7, 'Mahasiswa TI');
-- ERROR 3819: Check constraint 'chk_rating_range' is violated

-- Percobaan valid
INSERT INTO course_reviews (course_id, rating, reviewer_name)
VALUES (101, 5, 'Mahasiswa TI');
```

## 5. Praktik Terbaik & Update Terkini

- **Jangan hanya mengandalkan validasi di sisi aplikasi (JavaScript/backend).** Aplikasi bisa memiliki bug, di-bypass lewat API langsung, atau ada proses lain (skrip migrasi, admin panel) yang menulis langsung ke database tanpa lewat validasi aplikasi. Constraint di level database adalah jaring pengaman terakhir.
- Beri **nama eksplisit** pada setiap constraint (`CONSTRAINT nama_constraint ...`) — memudahkan identifikasi saat membaca pesan error atau saat perlu `ALTER TABLE ... DROP CONSTRAINT`.
- Gunakan `ENUM` atau tabel referensi terpisah (mis. `payment_status(status_id, status_name)`) untuk nilai kategori yang tetap, alih-alih mengandalkan konvensi string bebas yang mudah salah ketik (`'Paid'` vs `'paid'` vs `'PAID'`).
- Sejak MySQL 8.0, kolom bisa dibuat **`INVISIBLE`** (`ALTER TABLE t ALTER COLUMN kolom SET INVISIBLE`) — kolom tetap ada dan constraint-nya tetap berlaku, tapi tidak muncul di `SELECT *`, berguna untuk migrasi skema bertahap tanpa mematahkan kode lama yang memakai `SELECT *`.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Constraint hanya memperlambat, sebaiknya divalidasi di aplikasi saja."** Justru sebaliknya — constraint di level database memastikan integritas terjaga **apa pun** jalur masuknya data, dan overhead performanya pada umumnya sangat kecil dibanding risiko data korup.
- ❌ **"UNIQUE dan PRIMARY KEY itu sama."** Keduanya sama-sama menegakkan keunikan, tapi satu tabel hanya boleh punya **satu** PRIMARY KEY (yang juga otomatis `NOT NULL`), sementara boleh punya **banyak** kolom `UNIQUE` (yang tetap bisa `NULL`, kecuali dikombinasikan `NOT NULL` secara eksplisit).
- ❌ **"CHECK constraint pasti berfungsi di semua versi MySQL yang saya pakai."** Seperti dijelaskan §3.3, versi sebelum 8.0.16 menerima sintaksnya tapi tidak menegakkannya — selalu verifikasi versi server yang dipakai.

## 7. Rangkuman

- Constraint (`NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY`) adalah pertahanan integritas data di level database, tidak bergantung pada validasi aplikasi.
- Aksi referensial (`CASCADE`, `RESTRICT`, `SET NULL`) menentukan apa yang terjadi pada baris anak saat baris induk diubah/dihapus — pilih sesuai makna bisnis, bukan sembarangan.
- Membaca pesan error constraint dengan cermat mempercepat proses debugging.

## 8. Latihan Mandiri

1. Rancang constraint yang sesuai untuk kolom `gpa` pada tabel `students` agar nilainya selalu berada di rentang 0.00–4.00.
2. Jelaskan aksi referensial (`CASCADE`/`RESTRICT`/`SET NULL`) apa yang paling tepat untuk foreign key `enrollments.course_id → courses.course_id` bila suatu mata kuliah dihapus dari kurikulum, dan jelaskan alasannya.
3. Coba jalankan `INSERT` yang melanggar constraint `NOT NULL` pada suatu kolom, salin pesan error yang muncul, dan jelaskan artinya dengan kata sendiri.
4. Lanjutkan ke **Lv.9 Data Guardian** di MYSQL QUEST untuk membangun dan menguji proteksi constraint secara langsung.
