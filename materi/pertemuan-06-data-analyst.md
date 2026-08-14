# Pertemuan 6 — Data Analyst
### Aggregate Function, GROUP BY, HAVING

**CPMK-5** • Sub-CPMK-5.1 — Menggunakan query lanjutan untuk menyelesaikan permasalahan data.
**Level game terkait:** Lv.6 Data Analyst — Quest *Analytics Quest*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Meringkas data menggunakan fungsi agregat (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`).
- Mengelompokkan baris dengan `GROUP BY` sebelum agregasi dihitung per kelompok.
- Menyaring hasil agregasi dengan `HAVING`, dan membedakannya dari `WHERE`.

## 2. Pengantar & Konteks

Manajemen ASIA Smart Campus tidak butuh melihat ratusan baris data nilai mahasiswa satu per satu — mereka butuh **angka ringkasan**: rata-rata nilai per mata kuliah, jumlah mahasiswa per department, department mana yang butuh perhatian lebih. Inilah peran *Data Analyst*: mengubah data mentah tabel `enrollments` (yang mulai terisi banyak baris sejak pertemuan ini) menjadi insight yang bisa ditindaklanjuti.

## 3. Materi Inti

### 3.1 Fungsi Agregat

| Fungsi | Fungsi | Contoh |
|---|---|---|
| `COUNT(*)` | Menghitung jumlah baris | `SELECT COUNT(*) FROM students;` |
| `COUNT(kolom)` | Menghitung baris dengan nilai kolom **tidak NULL** | `COUNT(phone)` |
| `COUNT(DISTINCT kolom)` | Menghitung nilai unik | `COUNT(DISTINCT city)` |
| `SUM(kolom)` | Menjumlahkan nilai numerik | `SUM(amount)` |
| `AVG(kolom)` | Rata-rata | `AVG(score)` |
| `MIN(kolom)` / `MAX(kolom)` | Nilai terkecil/terbesar | `MIN(gpa)`, `MAX(gpa)` |

```sql
SELECT COUNT(*) AS total_mahasiswa FROM students;
SELECT AVG(gpa) AS rata_rata_ipk FROM students;
```

### 3.2 GROUP BY — Mengelompokkan Sebelum Agregasi

Tanpa `GROUP BY`, fungsi agregat meringkas **seluruh tabel** menjadi satu baris. Dengan `GROUP BY`, agregasi dihitung **per kelompok**.

```sql
-- Rata-rata skor PER mata kuliah (satu baris hasil per course_id)
SELECT course_id, AVG(score) AS avg_score
FROM enrollments
GROUP BY course_id;
```

**Aturan penting:** setiap kolom pada `SELECT` yang **bukan** hasil fungsi agregat **harus** muncul di `GROUP BY`. MySQL (dalam mode `ONLY_FULL_GROUP_BY`, default sejak versi 5.7) akan menolak query yang melanggar aturan ini — berbeda dari beberapa RDBMS/versi MySQL lama yang secara diam-diam mengizinkannya dengan hasil yang tidak terdefinisi.

```sql
-- SALAH pada MySQL modern (ONLY_FULL_GROUP_BY): full_name bukan agregat & tidak di GROUP BY
SELECT full_name, dept_id, COUNT(*) FROM students GROUP BY dept_id;

-- BENAR
SELECT dept_id, COUNT(*) AS jumlah FROM students GROUP BY dept_id;
```

### 3.3 HAVING — Menyaring Hasil Agregasi

Ini adalah salah satu konsep yang paling sering membingungkan pemula: **`WHERE` menyaring baris SEBELUM agregasi**, **`HAVING` menyaring hasil SETELAH agregasi**.

```sql
-- WHERE: filter baris mentah dulu, baru dihitung rata-ratanya per course
SELECT course_id, AVG(score) AS avg_score
FROM enrollments
WHERE semester = 'Ganjil 2025/2026'
GROUP BY course_id;

-- HAVING: hitung dulu jumlah mahasiswa per department, baru saring yang > 2
SELECT dept_id, COUNT(*) AS total_mahasiswa
FROM students
GROUP BY dept_id
HAVING COUNT(*) > 2;
```

```sql
-- SALAH — WHERE tidak bisa langsung memakai hasil fungsi agregat
SELECT dept_id, COUNT(*) AS total_mahasiswa
FROM students
WHERE COUNT(*) > 2   -- ❌ error!
GROUP BY dept_id;
```

Alasan teknisnya kembali ke *urutan eksekusi logis* (Pertemuan 5): `WHERE` dievaluasi sebelum `GROUP BY`/agregasi terbentuk, sehingga pada tahap itu hasil `COUNT(*)` belum ada untuk dibandingkan. `HAVING` dievaluasi setelah `GROUP BY`, sehingga bisa mengakses hasil agregat.

**Urutan klausa lengkap (ditulis maupun dieksekusi logis):**
```
SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT ...
              ↑ 1. filter baris     ↑ 2. kelompokkan  ↑ 3. filter kelompok
```

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Jumlah mahasiswa dan rata-rata GPA per department
SELECT dept_id,
       COUNT(*)   AS jumlah_mahasiswa,
       AVG(gpa)   AS rata_rata_gpa,
       MIN(gpa)   AS gpa_terendah,
       MAX(gpa)   AS gpa_tertinggi
FROM students
GROUP BY dept_id;

-- Department dengan lebih dari 2 mahasiswa saja yang ditampilkan
SELECT dept_id, COUNT(*) AS total_mahasiswa
FROM students
GROUP BY dept_id
HAVING COUNT(*) > 2;

-- Rata-rata skor tiap mahasiswa (butuh reinforcement bila di bawah 75)
SELECT student_id, AVG(score) AS rata_rata_skor
FROM enrollments
GROUP BY student_id
HAVING AVG(score) < 75;
```

## 5. Praktik Terbaik & Update Terkini

- Beri **alias yang jelas** (`AS jumlah_mahasiswa`, bukan `AS c`) pada hasil agregat — laporan/dashboard yang dibaca orang lain (dosen, manajemen) jauh lebih mudah dipahami.
- MySQL 8.0 memperkenalkan **Window Functions** (`SUM() OVER (PARTITION BY ...)`) yang memungkinkan menampilkan nilai agregat **tanpa** meringkas jumlah baris (berbeda dari `GROUP BY` yang selalu mengurangi baris menjadi satu per kelompok) — misalnya menampilkan skor tiap mahasiswa **beserta** rata-rata department-nya di baris yang sama. Ini topik lanjutan yang baik diketahui keberadaannya, meski praktik intensifnya di luar cakupan dasar mata kuliah ini.
- Untuk laporan yang sering diakses berulang (mis. dashboard rata-rata nilai per department setiap hari), pertimbangkan menyimpannya sebagai **VIEW** (dibahas Pertemuan 11) agar query kompleks bisa dipakai ulang tanpa menulis ulang.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"WHERE dan HAVING bisa dipakai bergantian, tidak ada bedanya."** Keduanya berbeda tahap eksekusi (lihat §3.3) — memakai `WHERE` untuk menyaring hasil agregat akan menghasilkan error.
- ❌ **"COUNT(kolom) dan COUNT(*) selalu menghasilkan angka yang sama."** `COUNT(*)` menghitung **seluruh baris** termasuk yang memiliki `NULL` pada kolom manapun; `COUNT(kolom)` hanya menghitung baris di mana **kolom tersebut** tidak `NULL`. Bila kolom `phone` punya beberapa nilai `NULL`, `COUNT(phone)` akan lebih kecil dari `COUNT(*)`.
- ❌ **"GROUP BY mengurutkan hasil."** `GROUP BY` hanya **mengelompokkan**, tidak menjamin urutan tampil. Selalu tambahkan `ORDER BY` eksplisit bila urutan hasil penting.

## 7. Rangkuman

- Fungsi agregat (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) meringkas banyak baris menjadi satu nilai.
- `GROUP BY` mengelompokkan baris sebelum agregasi dihitung per kelompok; setiap kolom non-agregat di `SELECT` wajib ada di `GROUP BY`.
- `HAVING` menyaring hasil **setelah** agregasi; `WHERE` menyaring baris **sebelum** agregasi — perbedaan paling sering menjadi sumber kesalahan pemula.

## 8. Latihan Mandiri

1. Tampilkan total pendapatan (`SUM`) per status pembayaran dari tabel `payments` (dibahas skema lengkapnya di Pertemuan 12; untuk latihan awal, asumsikan tabel `payments(student_id, amount, status)` sudah ada).
2. Tampilkan mata kuliah (`course_id`) yang diambil oleh lebih dari 3 mahasiswa.
3. Jelaskan dengan kata-kata sendiri mengapa query berikut menghasilkan error: `SELECT dept_id, full_name, COUNT(*) FROM students GROUP BY dept_id;`
4. Lanjutkan ke **Lv.6 Data Analyst** di MYSQL QUEST, termasuk sesi refleksi singkat tentang department mana yang butuh reinforcement.
