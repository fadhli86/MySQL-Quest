# Pertemuan 11 — Database Engineer
### View dan Index

**CPMK-7** • Sub-CPMK-7.1 — Menganalisis performa dan keamanan database.
**Level game terkait:** Lv.11 Database Engineer — Quest *Performance Quest I*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Membuat dan menggunakan `VIEW` untuk menyederhanakan query kompleks yang sering dipakai ulang.
- Menjelaskan cara kerja index B-Tree secara konseptual.
- Membuat `INDEX` pada kolom yang tepat untuk mempercepat pencarian.
- Membaca output `EXPLAIN` secara dasar untuk memverifikasi index terpakai.

## 2. Pengantar & Konteks

Tabel `students` ASIA Smart Campus baru berisi belasan baris di sandbox latihan — pencarian apa pun terasa instan. Tapi bayangkan sistem produksi sungguhan dengan **puluhan ribu mahasiswa** dan **jutaan baris** riwayat nilai selama bertahun-tahun. Query yang tadinya instan bisa melambat drastis. *Database Engineer* mulai berpikir tentang **performa**: bagaimana query kompleks bisa dipakai ulang dengan mudah (`VIEW`), dan bagaimana pencarian tetap cepat meski data terus bertambah (`INDEX`).

## 3. Materi Inti

### 3.1 VIEW — "Tabel Virtual" dari Sebuah Query

```sql
CREATE VIEW view_mahasiswa_teladan AS
SELECT full_name, gpa, city
FROM students
WHERE gpa >= 3.5;

-- Dipakai persis seperti tabel biasa
SELECT * FROM view_mahasiswa_teladan
ORDER BY gpa DESC;
```

`VIEW` **tidak menyimpan data sendiri** (berbeda dari tabel) — setiap kali di-`SELECT`, MySQL menjalankan ulang query di baliknya terhadap data tabel dasar yang terbaru. Manfaat utama:
- **Menyederhanakan query kompleks** yang sering dipakai berulang (mis. laporan JOIN 4 tabel) menjadi satu nama pendek.
- **Membatasi akses** — mis. memberi tim non-teknis akses hanya ke `VIEW` tertentu (kolom terbatas), tanpa mengekspos seluruh tabel dasar dan kolom sensitif di dalamnya.
- **Abstraksi** — bila struktur tabel dasar berubah, `VIEW` bisa disesuaikan sekali tanpa mengubah seluruh query aplikasi yang memakainya.

```sql
DROP VIEW IF EXISTS view_mahasiswa_teladan;  -- menghapus view (tidak memengaruhi data asli)
```

> Ada juga **Materialized View** di beberapa RDBMS (mis. PostgreSQL) yang benar-benar menyimpan hasil query secara fisik untuk kecepatan baca. MySQL tidak memiliki materialized view native — kebutuhan serupa biasanya disiasati dengan tabel ringkasan yang diperbarui berkala (mis. lewat `EVENT` terjadwal atau proses ETL).

### 3.2 Mengapa Index Diperlukan

Tanpa index, MySQL harus melakukan **full table scan** — memeriksa **setiap baris** satu per satu untuk menemukan yang cocok dengan `WHERE`. Pada tabel kecil ini tidak masalah; pada tabel jutaan baris, ini sangat lambat.

**Index** adalah struktur data tambahan (umumnya **B-Tree**) yang menyimpan nilai kolom yang diindeks beserta "penunjuk" ke lokasi baris aslinya, terurut sedemikian rupa sehingga database bisa langsung "melompat" ke lokasi yang relevan — mirip daftar isi buku yang membantu menemukan halaman tanpa membaca seluruh buku dari awal.

```
Tanpa index: periksa SEMUA baris ➜ O(n)
Dengan index B-Tree: langsung menuju posisi yang relevan ➜ O(log n)
```

### 3.3 Membuat Index

```sql
CREATE INDEX idx_students_dept ON students(dept_id);

-- Index pada kombinasi kolom (composite index) — urutan kolom penting!
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);

-- Melihat index yang ada pada suatu tabel
SHOW INDEX FROM students;

-- Menghapus index
DROP INDEX idx_students_dept ON students;
```

Kolom yang **layak diindeks**: kolom yang sering dipakai di `WHERE`, `JOIN ... ON`, atau `ORDER BY` pada tabel besar — misalnya foreign key (`dept_id`), atau kolom pencarian yang sering dipakai (`email`).

### 3.4 EXPLAIN — Memverifikasi Index Terpakai

```sql
EXPLAIN SELECT * FROM students WHERE dept_id = 2;
```

Kolom `type` dan `key` pada output `EXPLAIN` menunjukkan apakah MySQL memakai index (`key` berisi nama index) atau melakukan full scan (`type = ALL`, `key = NULL`). Pembahasan `EXPLAIN` yang lebih mendalam (`EXPLAIN ANALYZE`, strategi optimasi lanjutan) ada di Pertemuan 14.

### 3.5 Index Bukan Tanpa Biaya

Index mempercepat **pembacaan** (`SELECT`), tapi memperlambat **penulisan** (`INSERT`/`UPDATE`/`DELETE`) sedikit — karena setiap perubahan data juga harus memperbarui struktur index-nya, dan index memakan ruang penyimpanan tambahan. Ini adalah trade-off klasik *read vs. write performance* — jangan mengindeks kolom yang jarang dicari hanya karena "kelihatannya bagus".

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- VIEW: ringkasan nilai per mahasiswa, siap dipakai ulang oleh dashboard akademik
CREATE VIEW view_ringkasan_nilai AS
SELECT s.student_id, s.full_name, AVG(e.score) AS rata_rata_skor
FROM students s
JOIN enrollments e ON s.student_id = e.student_id
GROUP BY s.student_id;

SELECT * FROM view_ringkasan_nilai WHERE rata_rata_skor < 75;

-- INDEX untuk mempercepat pencarian mahasiswa per department (sering dipakai staf akademik)
CREATE INDEX idx_students_dept ON students(dept_id);

EXPLAIN SELECT * FROM students WHERE dept_id = 2;
```

## 5. Praktik Terbaik & Update Terkini

- **Foreign key otomatis terindeks di InnoDB** (lihat Pertemuan 3) — tapi kolom lain yang sering dipakai di `WHERE`/`ORDER BY` tetap perlu diindeks manual.
- **Composite index** urutan kolomnya penting: index `(student_id, course_id)` efektif untuk query yang memfilter `student_id` saja atau `student_id AND course_id`, tapi **tidak** efektif untuk query yang hanya memfilter `course_id` saja (aturan *leftmost prefix*).
- MySQL 8.0 mendukung **Invisible Index** (`ALTER TABLE t ALTER INDEX idx_nama INVISIBLE`) — index tetap ada dan terus diperbarui, tapi optimizer diinstruksikan mengabaikannya, berguna untuk menguji dampak penghapusan index sebelum benar-benar menghapusnya secara permanen.
- Untuk pencarian kata dalam teks panjang, index biasa kurang efektif — gunakan index **`FULLTEXT`** (disinggung Pertemuan 5) yang dirancang khusus untuk pencarian teks.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Semakin banyak index, semakin cepat database."** Index berlebihan justru memperlambat `INSERT`/`UPDATE`/`DELETE` dan memboroskan ruang penyimpanan. Indeks secukupnya, berdasarkan pola query nyata.
- ❌ **"VIEW menyimpan data seperti tabel biasa sehingga lebih cepat dari query langsung."** Sebaliknya — VIEW biasa di MySQL hanyalah "query tersimpan", dieksekusi ulang setiap dipanggil; tidak otomatis lebih cepat, hanya lebih ringkas ditulis.
- ❌ **"Index pada kolom apa pun pasti dipakai optimizer."** Optimizer MySQL memutuskan sendiri apakah index dipakai berdasarkan estimasi biaya — pada tabel sangat kecil atau saat kondisi `WHERE` mencocokkan sebagian besar baris, full scan terkadang justru lebih cepat daripada memakai index. Verifikasi selalu dengan `EXPLAIN`.

## 7. Rangkuman

- `VIEW` membungkus query kompleks menjadi "tabel virtual" yang dapat dipakai ulang dan membatasi akses ke kolom tertentu.
- `INDEX` (umumnya struktur B-Tree) mempercepat pencarian pada tabel besar, dengan trade-off memperlambat operasi tulis dan menambah ruang penyimpanan.
- `EXPLAIN` membantu memverifikasi apakah suatu query benar-benar memanfaatkan index yang telah dibuat.

## 8. Latihan Mandiri

1. Buat `VIEW` bernama `view_kelas_penuh` yang menampilkan `course_name` beserta jumlah mahasiswa yang mengambilnya (memakai `JOIN` + `GROUP BY`).
2. Jelaskan mengapa index pada kolom `gender` (yang hanya punya 2 kemungkinan nilai) umumnya kurang bermanfaat dibanding index pada kolom `email` (yang hampir seluruhnya unik).
3. Jalankan `EXPLAIN` pada dua versi query yang sama — satu tanpa index, satu dengan index pada kolom yang difilter — bandingkan nilai `type` dan `key` pada hasilnya.
4. Lanjutkan ke **Lv.11 Database Engineer** di MYSQL QUEST untuk membangun VIEW dan INDEX secara langsung, lalu amati `EXPLAIN QUERY PLAN`-nya.
