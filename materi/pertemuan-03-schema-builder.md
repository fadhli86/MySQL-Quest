# Pertemuan 3 — Schema Builder
### Database, Table, Data Type, dan DDL

**CPMK-3** • Sub-CPMK-3.1 — Mengimplementasikan struktur database menggunakan MySQL dan DDL.
**Level game terkait:** Lv.3 Schema Builder — Quest *Build the Kingdom* (⚔ Mini Boss A)

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Membuat database dan tabel menggunakan perintah DDL (`CREATE DATABASE`, `CREATE TABLE`).
- Memilih tipe data MySQL yang tepat untuk setiap kolom.
- Menerapkan `PRIMARY KEY` dan `FOREIGN KEY` sesuai rancangan ERD Pertemuan 2.
- Mengubah struktur tabel dengan `ALTER TABLE` dan menghapusnya dengan `DROP TABLE`.

## 2. Pengantar & Konteks

ERD ASIA Smart Campus sudah dirancang di Pertemuan 2. Sekarang saatnya *Schema Builder* menerjemahkan rancangan itu menjadi struktur nyata di MySQL menggunakan **DDL (Data Definition Language)** — kelompok perintah SQL yang mendefinisikan struktur/skema, bukan mengisi data (itu **DML**, dimulai Pertemuan 4).

## 3. Materi Inti

### 3.1 CREATE DATABASE

```sql
CREATE DATABASE IF NOT EXISTS asia_smart_campus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE asia_smart_campus;
```

`IF NOT EXISTS` mencegah error bila database sudah pernah dibuat sebelumnya. `USE` memilih database yang akan menjadi target perintah-perintah selanjutnya dalam sesi tersebut.

### 3.2 Tipe Data MySQL yang Umum Dipakai

| Kategori | Tipe Data | Kapan Dipakai |
|---|---|---|
| Bilangan bulat | `INT`, `SMALLINT`, `BIGINT` | ID, jumlah, tahun |
| Bilangan desimal presisi | `DECIMAL(p,s)` | Uang, GPA — **hindari `FLOAT`/`DOUBLE` untuk nilai finansial** karena rawan galat pembulatan biner |
| Teks pendek | `VARCHAR(n)` | Nama, email, kode — panjang bervariasi, maksimum n karakter |
| Teks panjang | `TEXT` | Deskripsi, catatan panjang tak terbatas |
| Tanggal/waktu | `DATE`, `DATETIME`, `TIMESTAMP`, `YEAR` | Tanggal lahir, waktu transaksi |
| Boolean | `BOOLEAN` (alias `TINYINT(1)`) | Status aktif/nonaktif |
| Enumerasi | `ENUM('a','b','c')` | Status dengan pilihan tetap, mis. `'pending','paid'` |
| Modern (MySQL 5.7+/8.0) | `JSON` | Data semi-terstruktur, mis. preferensi/metadata fleksibel |

> **Tips memilih `VARCHAR` vs `CHAR`:** `CHAR(n)` selalu memakai ruang tetap sepanjang n karakter (cocok untuk data berpanjang tetap seperti kode pos 5 digit); `VARCHAR(n)` memakai ruang sesuai panjang data aktual (lebih hemat untuk data bervariasi seperti nama).

### 3.3 CREATE TABLE, PRIMARY KEY, FOREIGN KEY

```sql
CREATE TABLE departments (
  dept_id    INT AUTO_INCREMENT PRIMARY KEY,
  dept_name  VARCHAR(100) NOT NULL,
  dept_code  VARCHAR(10)  NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE students (
  student_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(100) UNIQUE,
  dept_id          INT NOT NULL,
  gpa              DECIMAL(3,2),
  enrollment_year  YEAR,
  city             VARCHAR(50),
  CONSTRAINT fk_students_dept
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
) ENGINE=InnoDB;
```

Penjelasan elemen penting:
- `AUTO_INCREMENT` — MySQL otomatis mengisi nilai berikutnya yang belum terpakai setiap kali INSERT tanpa menyebutkan kolom ini. Umum dipakai bersama `PRIMARY KEY`.
- `NOT NULL` — kolom wajib diisi.
- `UNIQUE` — nilai kolom tidak boleh kembar antar baris (tapi berbeda dari PRIMARY KEY: satu tabel boleh punya banyak kolom UNIQUE, tapi hanya satu PRIMARY KEY).
- `CONSTRAINT fk_students_dept FOREIGN KEY (...) REFERENCES ...` — memberi nama eksplisit pada constraint foreign key. Memberi nama (bukan mengandalkan nama otomatis) memudahkan saat perlu menghapus/mengubah constraint tersebut nanti.
- `ENGINE=InnoDB` — storage engine yang mendukung foreign key dan transaksi (lihat Pertemuan 1 & 12).

### 3.4 ALTER TABLE dan DROP TABLE

```sql
-- Menambah kolom baru
ALTER TABLE students ADD COLUMN phone VARCHAR(20);

-- Mengubah tipe data kolom
ALTER TABLE students MODIFY COLUMN phone VARCHAR(25);

-- Mengganti nama kolom (MySQL 8.0+)
ALTER TABLE students RENAME COLUMN phone TO phone_number;

-- Menghapus kolom
ALTER TABLE students DROP COLUMN phone_number;

-- Menghapus tabel (HATI-HATI: menghapus seluruh data & struktur secara permanen)
DROP TABLE IF EXISTS students;
```

## 4. Studi Kasus: ASIA Smart Campus

Melanjutkan ERD Pertemuan 2, tabel `courses` dibangun dengan foreign key ke `departments`:

```sql
CREATE TABLE courses (
  course_id    INT AUTO_INCREMENT PRIMARY KEY,
  course_name  VARCHAR(100) NOT NULL,
  credits      TINYINT NOT NULL,
  dept_id      INT NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
) ENGINE=InnoDB;

INSERT INTO departments (dept_name, dept_code) VALUES
('Teknik Informatika', 'TI'),
('Sistem Informasi', 'SI'),
('Manajemen', 'MJ'),
('Akuntansi', 'AK');

INSERT INTO courses (course_name, credits, dept_id) VALUES
('Basis Data', 3, 1),
('Pemrograman Web', 3, 1),
('Struktur Data', 3, 1);
```

(Perintah `INSERT` dibahas mendalam di Pertemuan 4 — di sini hanya untuk mengisi contoh data agar tabel tidak kosong.)

## 5. Praktik Terbaik & Update Terkini

- **Selalu definisikan foreign key secara eksplisit** di level database (bukan hanya "diketahui" oleh aplikasi) — ini memastikan integritas data terjaga meski ada bug di kode aplikasi atau input langsung ke database.
- **Gunakan `utf8mb4`**, bukan `utf8` (lihat catatan Pertemuan 1), sebagai default character set database sejak awal — mengubahnya belakangan pada tabel berisi data besar cukup merepotkan.
- MySQL 8.0 mendukung kolom **`GENERATED ALWAYS AS`** (*generated/computed columns*) — kolom yang nilainya dihitung otomatis dari kolom lain, misalnya `full_name_upper VARCHAR(100) GENERATED ALWAYS AS (UPPER(full_name)) STORED`. Berguna untuk menghindari duplikasi logika di banyak query.
- Pertimbangkan menuliskan skema sebagai **file migrasi** (mis. dengan tools seperti Flyway, Laravel Migration, Prisma Migrate) di proyek nyata, alih-alih menjalankan DDL manual satu per satu — memudahkan tim bekerja sama dan skema mudah dilacak riwayat perubahannya (versioning).

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"FLOAT cocok untuk menyimpan nilai uang/IPK."** `FLOAT`/`DOUBLE` menyimpan angka desimal dalam representasi biner yang bisa menghasilkan galat pembulatan kecil (mis. `0.1 + 0.2` tidak persis `0.3`). Untuk nilai presisi seperti uang atau GPA, gunakan `DECIMAL(p,s)`.
- ❌ **"DROP TABLE bisa dibatalkan seperti Ctrl+Z."** DDL seperti `DROP TABLE` dan `TRUNCATE` bersifat permanen dan (pada MySQL) melakukan *implicit commit* — tidak bisa di-ROLLBACK. Selalu pastikan backup sebelum menjalankan perintah destruktif di database produksi.
- ❌ **"Foreign key otomatis membuat index."** Di MySQL/InnoDB, mendefinisikan FOREIGN KEY memang otomatis membuatkan index pada kolom tersebut — namun ini spesifik InnoDB, jangan diasumsikan berlaku sama di semua RDBMS.

## 7. Rangkuman

- DDL mendefinisikan struktur: `CREATE DATABASE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`.
- Pemilihan tipe data yang tepat (`DECIMAL` untuk uang/nilai presisi, `VARCHAR` vs `TEXT`, dsb.) memengaruhi akurasi dan efisiensi penyimpanan.
- `PRIMARY KEY` mengidentifikasi baris secara unik; `FOREIGN KEY` menegakkan integritas relasi antar tabel sesuai rancangan ERD.

## 8. Latihan Mandiri

1. Tuliskan `CREATE TABLE` untuk entity `rooms` dari latihan Pertemuan 2 (kapasitas dan lokasi gedung), lengkap dengan tipe data yang sesuai.
2. Jelaskan mengapa `DECIMAL(3,2)` cocok untuk kolom `gpa` (rentang 0.00–4.00) — apa yang terjadi bila memasukkan nilai 5.00?
3. Tuliskan perintah `ALTER TABLE` untuk menambahkan kolom `phone VARCHAR(20)` pada tabel `lecturers`.
4. Lanjutkan ke **Lv.3 Schema Builder** (Mini Boss A) di MYSQL QUEST untuk membangun tabel `courses` secara langsung dan diuji otomatis oleh sistem.
