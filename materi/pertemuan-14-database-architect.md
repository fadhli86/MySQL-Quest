# Pertemuan 14 — Database Architect (Final Boss)
### Security, EXPLAIN, Optimization, dan Integrasi

**CPMK-8** • Sub-CPMK-8.1 — Mengembangkan solusi database MySQL berdasarkan studi kasus secara terintegrasi.
**Level game terkait:** Lv.14 Database Architect — Quest *FINAL BOSS*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan risiko SQL Injection dan cara pencegahannya (parameterized query, privilege minimum).
- Menerapkan prinsip *least privilege* melalui role/user MySQL.
- Membaca output `EXPLAIN`/`EXPLAIN ANALYZE` untuk menilai dan mengoptimalkan performa query.
- Mengintegrasikan seluruh kompetensi 13 pertemuan sebelumnya menjadi satu solusi database yang utuh.

## 2. Pengantar & Konteks

Inilah pertemuan terakhir — *Final Boss* dari perjalanan 14 pertemuan. Seorang **Database Architect** tidak hanya menulis query yang menghasilkan jawaban benar, tapi memastikan solusinya **aman** dari serangan, **cepat** saat data membesar, dan **terintegrasi** sebagai satu sistem yang koheren — bukan kumpulan query lepas-lepas. Pertemuan ini merangkum dan mengintegrasikan seluruh kompetensi Pertemuan 1–13 ke dalam satu studi kasus utuh: laporan performa akademik ASIA Smart Campus.

## 3. Materi Inti

### 3.1 SQL Injection dan Pencegahannya

**SQL Injection** terjadi ketika input pengguna digabungkan **langsung** ke dalam string query, memungkinkan penyerang menyisipkan SQL berbahaya.

```php
// ❌ SANGAT BERBAHAYA — jangan pernah menulis kode seperti ini
$query = "SELECT * FROM students WHERE email = '" . $_POST['email'] . "'";
// Bila pengguna memasukkan: ' OR '1'='1
// Query menjadi: SELECT * FROM students WHERE email = '' OR '1'='1'
// -> mengembalikan SELURUH baris tabel students, melewati validasi apa pun!
```

**Solusi: Prepared Statement / Parameterized Query** — input pengguna dikirim **terpisah** dari struktur query, sehingga tidak pernah diperlakukan sebagai kode SQL, apa pun isinya.

```php
// ✅ AMAN — memakai prepared statement (contoh gaya PDO PHP)
$stmt = $pdo->prepare("SELECT * FROM students WHERE email = ?");
$stmt->execute([$_POST['email']]);
```

```sql
-- Konsep yang sama juga berlaku di level MySQL lewat prepared statement server-side
PREPARE stmt FROM 'SELECT * FROM students WHERE email = ?';
SET @email = 'andi@asia.ac.id';
EXECUTE stmt USING @email;
DEALLOCATE PREPARE stmt;
```

Ini bukan sekadar rekomendasi — SQL Injection secara konsisten menempati posisi teratas daftar kerentanan aplikasi web paling kritis (**OWASP Top 10**) selama lebih dari satu dekade, dan tetap relevan hingga hari ini.

### 3.2 Prinsip Least Privilege (Hak Akses Minimum)

```sql
-- Buat user khusus aplikasi dengan hak terbatas, JANGAN pakai akun root untuk aplikasi
CREATE USER 'app_akademik'@'%' IDENTIFIED BY 'kata-sandi-yang-kuat';

-- Berikan HANYA privilege yang benar-benar dibutuhkan
GRANT SELECT, INSERT, UPDATE ON asia_smart_campus.students TO 'app_akademik'@'%';
GRANT SELECT ON asia_smart_campus.departments TO 'app_akademik'@'%';
-- TIDAK diberi DROP, GRANT OPTION, atau akses ke tabel lain yang tidak relevan

FLUSH PRIVILEGES;

-- Audit privilege yang sudah diberikan
SHOW GRANTS FOR 'app_akademik'@'%';
```

Aplikasi web sehari-hari **tidak pernah** perlu privilege `DROP`, `CREATE USER`, atau akses ke seluruh database — akun aplikasi yang bocor kredensialnya (mis. lewat file konfigurasi yang tidak sengaja ter-publish) dengan privilege minimum jauh lebih kecil dampak kerusakannya dibanding akun dengan privilege penuh.

### 3.3 EXPLAIN dan EXPLAIN ANALYZE

```sql
EXPLAIN SELECT s.full_name, d.dept_name
FROM students s
JOIN departments d ON s.dept_id = d.dept_id
WHERE s.gpa > 3.5;
```

Kolom kunci pada output `EXPLAIN`:

| Kolom | Arti |
|---|---|
| `type` | Strategi akses: `ALL` (full table scan, paling lambat) hingga `const`/`eq_ref` (pencarian by key, tercepat) |
| `key` | Index yang benar-benar dipakai (`NULL` bila tidak ada index dipakai) |
| `rows` | Estimasi jumlah baris yang diperiksa — semakin kecil semakin baik |
| `Extra` | Info tambahan, mis. `"Using filesort"` (mengurutkan tanpa bantuan index — berpotensi lambat pada data besar) atau `"Using index"` (covering index — sangat baik) |

**`EXPLAIN ANALYZE`** (MySQL 8.0.18+) benar-benar **menjalankan** query dan menampilkan waktu eksekusi aktual per langkah — lebih akurat dibanding `EXPLAIN` biasa yang hanya berdasarkan estimasi optimizer.

```sql
EXPLAIN ANALYZE
SELECT s.full_name, AVG(e.score)
FROM students s
JOIN enrollments e ON s.student_id = e.student_id
GROUP BY s.student_id;
```

### 3.4 Strategi Optimasi Umum

1. **Index yang tepat sasaran** (Pertemuan 11) pada kolom `WHERE`/`JOIN`/`ORDER BY` yang sering dipakai.
2. **Hindari `SELECT *`** (Pertemuan 5) — ambil hanya kolom yang dibutuhkan.
3. **Batasi hasil dengan `LIMIT`** saat memungkinkan, terutama untuk pagination.
4. **Perhatikan `Using filesort`/`Using temporary`** pada `EXPLAIN` — sering menandakan `GROUP BY`/`ORDER BY` belum terbantu index.
5. **Pertimbangkan denormalisasi terukur** (Pertemuan 10) untuk laporan yang sangat sering diakses, setelah memahami trade-off-nya.
6. **Monitor query lambat** dengan `slow_query_log` MySQL di lingkungan produksi untuk menemukan kandidat optimasi berdasarkan data nyata, bukan tebakan.

## 4. Studi Kasus Terintegrasi: ASIA Smart Campus — Laporan Akhir

```sql
-- Bagian 1: Jadwal & konteks mahasiswa lintas 5 tabel
SELECT s.full_name, d.dept_name, l.full_name AS dosen, cl.room
FROM enrollments e
JOIN students s     ON e.student_id = s.student_id
JOIN departments d  ON s.dept_id = d.dept_id
JOIN classes cl     ON cl.course_id = e.course_id AND cl.semester = e.semester
JOIN lecturers l    ON cl.lecturer_id = l.lecturer_id;

-- Bagian 2: Laporan performa department yang butuh reinforcement
SELECT d.dept_name,
       COUNT(DISTINCT s.student_id) AS jumlah_mahasiswa,
       AVG(e.score)                 AS rata_rata_skor
FROM departments d
JOIN students s     ON s.dept_id = d.dept_id
JOIN enrollments e  ON e.student_id = s.student_id
GROUP BY d.dept_id
HAVING AVG(e.score) < 80
ORDER BY rata_rata_skor ASC;

-- Verifikasi performa query di atas sebelum dipakai di dashboard produksi
EXPLAIN ANALYZE
SELECT d.dept_name, COUNT(DISTINCT s.student_id), AVG(e.score)
FROM departments d
JOIN students s ON s.dept_id = d.dept_id
JOIN enrollments e ON e.student_id = s.student_id
GROUP BY d.dept_id;
```

## 5. Praktik Terbaik & Update Terkini

- **Selalu enkripsi koneksi ke database** (`REQUIRE SSL` pada user MySQL) bila server dan aplikasi berkomunikasi lewat jaringan yang tidak sepenuhnya tepercaya (termasuk kebanyakan koneksi ke database cloud).
- **Backup terjadwal dan teruji** (`mysqldump`, snapshot volume, atau layanan backup otomatis pada MySQL cloud terkelola) adalah bagian dari arsitektur, bukan pemikiran belakangan — backup yang tidak pernah dicoba dipulihkan sama saja dengan tidak punya backup.
- Layanan **MySQL terkelola di cloud** (Amazon RDS/Aurora MySQL-compatible, Google Cloud SQL, Azure Database for MySQL, PlanetScale) kini umum dipakai di industri — mengotomasi backup, patching keamanan, dan scaling, sehingga arsitek database modern perlu memahami trade-off antara mengelola server sendiri vs. memakai layanan terkelola.
- Terapkan **defense in depth**: constraint di database (Pertemuan 9) + prepared statement di aplikasi + privilege minimum (§3.2) + audit log — jangan bergantung pada satu lapisan pertahanan saja.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Aplikasi kami di jaringan internal, tidak perlu khawatir SQL Injection."** Ancaman bisa datang dari internal (karyawan tidak puas, akun yang diretas) maupun eksternal — prinsip *defense in depth* berlaku terlepas dari lokasi jaringan.
- ❌ **"EXPLAIN yang menunjukkan index terpakai berarti query sudah optimal."** Index terpakai adalah tanda baik, tapi tetap perlu diperiksa jumlah `rows` yang diperiksa dan `Extra` — index yang salah sasaran tetap bisa memeriksa jauh lebih banyak baris dari yang diperlukan.
- ❌ **"Karena aplikasi sudah divalidasi front-end (JavaScript), SQL Injection tidak mungkin terjadi."** Validasi front-end mudah dilewati (mis. request langsung ke API lewat tools seperti Postman/curl) — pertahanan yang benar-benar efektif selalu berada di **server**, khususnya di layer database melalui prepared statement.

## 7. Rangkuman

- SQL Injection dicegah dengan prepared statement/parameterized query — tidak pernah menggabungkan input pengguna langsung ke string SQL.
- Prinsip *least privilege*: akun aplikasi hanya diberi privilege yang benar-benar dibutuhkan.
- `EXPLAIN`/`EXPLAIN ANALYZE` membantu memverifikasi dan mengoptimalkan performa query berdasarkan data nyata, bukan tebakan.
- Database Architect mengintegrasikan seluruh kompetensi (skema, query, integritas, transaksi, automasi, keamanan, performa) menjadi satu solusi yang koheren — bukan sekadar kumpulan query yang berjalan.

## 8. Latihan Mandiri (Proyek Integratif)

Sebagai penutup mata kuliah, kerjakan studi kasus akhir berikut secara mandiri atau berkelompok:

1. **Requirement Analysis** — pilih satu domain baru (mis. sistem perpustakaan kampus, sistem parkir, atau sistem UKM mahasiswa) dan tuliskan kebutuhan datanya.
2. **ERD** — rancang entity, attribute, dan relasi (Pertemuan 2).
3. **Normalisasi** — pastikan skema minimal 3NF (Pertemuan 10).
4. **Implementasi** — `CREATE DATABASE`/`CREATE TABLE` lengkap dengan constraint (Pertemuan 3, 9).
5. **Data** — isi dengan data contoh yang realistis (Pertemuan 4).
6. **Query** — minimal satu query yang memakai JOIN + agregasi + subquery (Pertemuan 5–8).
7. **Automasi** — satu trigger atau function yang menegakkan aturan bisnis (Pertemuan 13).
8. **Keamanan & Performa** — rancang user dengan privilege terbatas, dan jalankan `EXPLAIN` pada query utama, jelaskan hasilnya.

Lanjutkan ke **Lv.14 Database Architect — FINAL BOSS** di MYSQL QUEST untuk menyelesaikan tantangan integratif terakhir secara interaktif, lalu kunjungi halaman **Portfolio** di game untuk melihat seluruh evidence pembelajaran yang telah Anda kumpulkan sepanjang 14 pertemuan. Selamat, Anda telah menyelesaikan perjalanan dari Database Rookie hingga Database Architect! 🎉
