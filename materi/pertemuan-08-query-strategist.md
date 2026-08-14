# Pertemuan 8 — Query Strategist
### Subquery dan Nested Query

**CPMK-5** • Sub-CPMK-5.3 — Menyelesaikan kebutuhan data dengan query kompleks.
**Level game terkait:** Lv.8 Query Strategist — Quest *Secret Query Mission*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan konsep subquery (query di dalam query) dan kapan ia diperlukan.
- Menulis subquery pada klausa `WHERE`, `FROM`, dan `SELECT`.
- Membedakan subquery skalar, subquery kolom-tunggal, dan subquery berkorelasi.
- Memilih antara subquery atau JOIN untuk kebutuhan yang sama.

## 2. Pengantar & Konteks

Beberapa pertanyaan tidak bisa dijawab hanya dengan satu lapis `SELECT ... WHERE` karena kondisi penyaringannya sendiri **bergantung pada hasil query lain** — misalnya *"Mahasiswa mana yang GPA-nya di atas rata-rata GPA seluruh kampus?"* Nilai *rata-rata* itu sendiri adalah hasil query, bukan angka tetap yang bisa ditulis manual. Di sinilah *Query Strategist* menyisipkan query di dalam query — **subquery**.

## 3. Materi Inti

### 3.1 Subquery Skalar (Menghasilkan Satu Nilai)

```sql
SELECT full_name, gpa
FROM students
WHERE gpa > (SELECT AVG(gpa) FROM students);
```

Subquery `(SELECT AVG(gpa) FROM students)` dieksekusi lebih dulu, menghasilkan satu angka (skalar), yang kemudian dibandingkan terhadap `gpa` setiap baris pada query utama (*outer query*).

### 3.2 Subquery Kolom-Tunggal dengan IN / NOT IN

```sql
-- Mahasiswa yang PERNAH mengambil mata kuliah dept Sistem Informasi (dept_id = 2)
SELECT full_name FROM students
WHERE student_id IN (
  SELECT e.student_id FROM enrollments e
  JOIN courses c ON e.course_id = c.course_id
  WHERE c.dept_id = 2
);

-- Kebalikannya: yang BELUM PERNAH mengambil
SELECT full_name, dept_id FROM students
WHERE student_id NOT IN (
  SELECT e.student_id FROM enrollments e
  JOIN courses c ON e.course_id = c.course_id
  WHERE c.dept_id = 2
);
```

> ⚠️ **Hati-hati dengan `NOT IN` dan NULL.** Bila subquery pada `NOT IN` menghasilkan **satu saja** nilai `NULL`, seluruh query utama akan mengembalikan **hasil kosong** (bukan error, sehingga sering tidak disadari) — akibat logika tiga-nilai SQL. Bila kolom yang dipakai dalam subquery memungkinkan `NULL`, pertimbangkan `NOT EXISTS` (§3.4) yang lebih aman.

### 3.3 Subquery pada FROM (Derived Table)

Hasil subquery dapat diperlakukan seperti tabel biasa di klausa `FROM`, umum disebut *derived table* — wajib diberi alias.

```sql
SELECT dept_id, rata_rata
FROM (
  SELECT dept_id, AVG(gpa) AS rata_rata
  FROM students
  GROUP BY dept_id
) AS ringkasan_dept
WHERE rata_rata > 3.2;
```

### 3.4 Subquery Berkorelasi (Correlated Subquery) & EXISTS

Subquery berkorelasi **merujuk kolom dari query luar**, sehingga dieksekusi berulang untuk setiap baris outer query (berbeda dari subquery biasa yang cukup dieksekusi sekali).

```sql
-- EXISTS: cek keberadaan, sering lebih efisien & lebih aman dari NULL dibanding IN
SELECT s.full_name FROM students s
WHERE EXISTS (
  SELECT 1 FROM enrollments e
  WHERE e.student_id = s.student_id   -- merujuk kolom dari outer query
);
```

`EXISTS` hanya peduli **ada/tidaknya** baris yang cocok (karena itu lazim ditulis `SELECT 1` di dalamnya — nilai kolomnya tidak relevan), sehingga MySQL dapat berhenti mencari begitu satu kecocokan ditemukan.

### 3.5 Subquery vs. JOIN — Kapan Pakai yang Mana?

| Situasi | Rekomendasi |
|---|---|
| Butuh kolom dari kedua tabel di hasil akhir | `JOIN` |
| Hanya butuh **memfilter** berdasarkan keberadaan/nilai agregat di tabel lain | Subquery (`IN`/`EXISTS`) sering lebih mudah dibaca |
| Kondisi "tidak memiliki" (mis. belum pernah enroll) | `NOT EXISTS` atau `LEFT JOIN ... WHERE ... IS NULL` — keduanya valid, `NOT EXISTS` lebih eksplisit maksudnya |

Optimizer MySQL modern (8.0+) umumnya cukup pintar mengubah subquery menjadi rencana eksekusi yang mirip JOIN secara internal — jadi pilihan antara keduanya lebih soal **keterbacaan** dibanding selalu soal performa, meski tetap baik diverifikasi dengan `EXPLAIN` (Pertemuan 14) untuk query yang kritis.

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Mahasiswa dengan GPA di atas rata-rata kampus
SELECT full_name, gpa FROM students
WHERE gpa > (SELECT AVG(gpa) FROM students);

-- Mata kuliah dengan rata-rata skor tertinggi (subquery pada FROM)
SELECT course_id, avg_score
FROM (
  SELECT course_id, AVG(score) AS avg_score
  FROM enrollments
  GROUP BY course_id
) t
ORDER BY avg_score DESC
LIMIT 1;

-- Dosen yang belum mengampu kelas apa pun semester ini (NOT EXISTS)
SELECT l.full_name FROM lecturers l
WHERE NOT EXISTS (
  SELECT 1 FROM classes c
  WHERE c.lecturer_id = l.lecturer_id AND c.semester = 'Ganjil 2025/2026'
);
```

## 5. Praktik Terbaik & Update Terkini

- **CTE (Common Table Expression)** dengan `WITH ... AS (...)`, tersedia sejak **MySQL 8.0**, sering menjadi alternatif yang lebih terbaca dibanding subquery bersarang dalam (nested berlapis-lapis):
  ```sql
  WITH ringkasan_dept AS (
    SELECT dept_id, AVG(gpa) AS rata_rata
    FROM students
    GROUP BY dept_id
  )
  SELECT * FROM ringkasan_dept WHERE rata_rata > 3.2;
  ```
  CTE didefinisikan sekali di awal dan bisa dirujuk berkali-kali di query utama, membuat query panjang jauh lebih mudah dipecah dan dibaca — sangat direkomendasikan untuk query analitik yang kompleks.
- **CTE Rekursif** (`WITH RECURSIVE`) — fitur MySQL 8.0 lainnya — memungkinkan query hierarkis (mis. struktur organisasi berlapis), di luar cakupan dasar mata kuliah ini tapi baik diketahui keberadaannya.
- Prefer `EXISTS`/`NOT EXISTS` dibanding `IN`/`NOT IN` ketika berurusan dengan subquery yang kolomnya berpotensi `NULL`, demi keamanan logika sekaligus performa.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"NOT IN dan NOT EXISTS selalu setara."** Seperti dijelaskan §3.2, `NOT IN` bisa diam-diam mengembalikan hasil kosong bila subquery menghasilkan `NULL`. `NOT EXISTS` tidak memiliki jebakan ini.
- ❌ **"Subquery selalu lebih lambat dari JOIN."** Tidak selalu benar — MySQL optimizer modern sering menyusun ulang subquery menjadi rencana eksekusi yang setara JOIN. Ukur dulu dengan `EXPLAIN` sebelum berasumsi.
- ❌ **"Subquery pada FROM tidak perlu alias."** Wajib — MySQL akan menolak *derived table* tanpa alias dengan pesan error.

## 7. Rangkuman

- Subquery adalah query di dalam query, dieksekusi lebih dulu (kecuali subquery berkorelasi) untuk menyediakan nilai/kondisi bagi query utama.
- `IN`/`NOT IN` untuk kolom tunggal, `EXISTS`/`NOT EXISTS` untuk sekadar mengecek keberadaan (lebih aman terhadap `NULL`), subquery pada `FROM` untuk memperlakukan hasil query sebagai tabel sementara.
- CTE (`WITH ... AS`) di MySQL 8.0 sering menjadi alternatif yang lebih terbaca dibanding subquery bersarang.

## 8. Latihan Mandiri

1. Tulis subquery untuk menemukan mata kuliah dengan `credits` di atas rata-rata seluruh mata kuliah.
2. Tulis ulang query `NOT IN` pada §4 (dosen yang belum mengampu kelas) menggunakan pola `LEFT JOIN ... WHERE ... IS NULL`, lalu bandingkan hasilnya.
3. Jelaskan dengan kata sendiri mengapa `WHERE kolom NOT IN (subquery_yang_bisa_NULL)` berisiko, dan bagaimana `NOT EXISTS` menghindarinya.
4. Lanjutkan ke **Lv.8 Query Strategist** di MYSQL QUEST untuk misi rahasia berbasis subquery.
