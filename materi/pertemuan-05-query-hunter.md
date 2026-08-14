# Pertemuan 5 — Query Hunter
### SELECT, WHERE, ORDER BY, LIMIT

**CPMK-4** • Sub-CPMK-4.2 — Melakukan retrieval data berdasarkan kondisi.
**Level game terkait:** Lv.5 Query Hunter — Quest *Find the Hidden Data*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Mengambil data dengan `SELECT`, memilih kolom tertentu.
- Menyaring baris dengan `WHERE` dan berbagai operator perbandingan/logika.
- Mengurutkan hasil dengan `ORDER BY` dan membatasi jumlah baris dengan `LIMIT`.
- Menangani nilai `NULL` dengan benar.

## 2. Pengantar & Konteks

Data ASIA Smart Campus mulai terisi sejak Pertemuan 4. Sekarang giliran *Query Hunter* berburu informasi spesifik dari data yang ada — bukan sekadar melihat seluruh tabel, tapi menjawab pertanyaan bisnis konkret: *"Siapa saja mahasiswa dengan GPA di atas 3.5?"*, *"Tampilkan 5 mahasiswa dengan IPK tertinggi."* `SELECT` adalah perintah **DQL (Data Query Language)** — meski secara praktik sering disebut bagian dari DML karena sama-sama beroperasi pada data (bukan struktur).

## 3. Materi Inti

### 3.1 SELECT Dasar

```sql
-- Mengambil seluruh kolom (hindari di aplikasi produksi, lihat §5)
SELECT * FROM students;

-- Memilih kolom tertentu — lebih efisien dan eksplisit
SELECT full_name, gpa FROM students;

-- Alias kolom untuk hasil yang lebih mudah dibaca
SELECT full_name AS nama, gpa AS ipk FROM students;
```

### 3.2 WHERE — Menyaring Baris

```sql
SELECT full_name, gpa, city FROM students
WHERE city = 'Malang';
```

Operator perbandingan & logika yang umum dipakai:

| Operator | Arti | Contoh |
|---|---|---|
| `=`, `!=` / `<>` | sama dengan, tidak sama dengan | `WHERE dept_id = 1` |
| `>`, `<`, `>=`, `<=` | perbandingan numerik | `WHERE gpa > 3.5` |
| `AND`, `OR`, `NOT` | kombinasi logika | `WHERE gpa > 3.5 AND city = 'Malang'` |
| `BETWEEN a AND b` | rentang inklusif | `WHERE gpa BETWEEN 3.0 AND 3.5` |
| `IN (...)` | salah satu dari daftar | `WHERE city IN ('Malang','Surabaya')` |
| `LIKE` | pencocokan pola teks | `WHERE full_name LIKE 'A%'` (diawali huruf A) |
| `IS NULL` / `IS NOT NULL` | mengecek nilai kosong | `WHERE phone IS NULL` |

### 3.3 Wildcard pada LIKE

- `%` mewakili nol atau lebih karakter apa pun — `'A%'` = diawali A, `'%a'` = diakhiri a, `'%ta%'` = mengandung "ta".
- `_` mewakili tepat satu karakter — `'A_a'` cocok dengan "Ana" tapi bukan "Aina".

### 3.4 NULL Bukan "Kosong" atau "Nol"

`NULL` merepresentasikan **ketiadaan nilai**, bukan string kosong `''` atau angka `0`. Konsekuensi pentingnya:

```sql
-- SALAH — tidak akan pernah menemukan baris NULL, walau terlihat logis
SELECT * FROM students WHERE phone = NULL;

-- BENAR
SELECT * FROM students WHERE phone IS NULL;
SELECT * FROM students WHERE phone IS NOT NULL;
```

Ini karena secara logika tiga-nilai SQL, `NULL = NULL` menghasilkan `NULL` (bukan `TRUE`), bukan `TRUE` — sehingga kondisi `WHERE phone = NULL` tidak pernah cocok dengan baris manapun.

### 3.5 ORDER BY dan LIMIT

```sql
-- Urutkan dari GPA tertinggi ke terendah
SELECT full_name, gpa FROM students
ORDER BY gpa DESC;

-- Urutkan berdasarkan beberapa kolom
SELECT full_name, city, gpa FROM students
ORDER BY city ASC, gpa DESC;

-- Batasi hanya 5 baris teratas — kombinasi umum untuk "Top N"
SELECT full_name, gpa FROM students
ORDER BY gpa DESC
LIMIT 5;

-- LIMIT dengan OFFSET, untuk pagination (halaman ke-2, 10 baris per halaman)
SELECT full_name, gpa FROM students
ORDER BY gpa DESC
LIMIT 10 OFFSET 10;
```

`ASC` (ascending, default bila tidak ditulis) mengurutkan naik; `DESC` (descending) mengurutkan turun.

### 3.6 Urutan Eksekusi Logis Klausa SELECT

Meski kita **menulis** query dengan urutan `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...`, MySQL **mengeksekusi** secara logis dengan urutan berbeda:

```
FROM  →  WHERE  →  SELECT  →  ORDER BY  →  LIMIT
```

Ini menjelaskan mengapa alias kolom dari `SELECT` (mis. `AS ipk`) **tidak** dapat dipakai di klausa `WHERE` (karena `WHERE` dievaluasi sebelum `SELECT`), tapi **bisa** dipakai di `ORDER BY` (dievaluasi setelah `SELECT`).

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Mahasiswa asal Malang dengan GPA di atas 3.3, terurut dari tertinggi
SELECT full_name, gpa FROM students
WHERE city = 'Malang' AND gpa > 3.3
ORDER BY gpa DESC;

-- 3 mahasiswa dengan GPA tertinggi se-kampus
SELECT full_name, gpa, city FROM students
ORDER BY gpa DESC
LIMIT 3;

-- Mahasiswa dengan nama diawali huruf 'C' atau 'D'
SELECT full_name FROM students
WHERE full_name LIKE 'C%' OR full_name LIKE 'D%';
```

## 5. Praktik Terbaik & Update Terkini

- **Hindari `SELECT *` di kode aplikasi produksi.** Selain mengirim data yang tidak dibutuhkan (boros bandwidth), `SELECT *` rentan rusak diam-diam bila struktur tabel berubah, dan mencegah database melakukan *covering index* (optimasi performa yang dibahas Pertemuan 11).
- MySQL 8.0 mendukung **Window Functions** (`RANK() OVER (...)`, `ROW_NUMBER() OVER (...)`) yang jauh lebih ekspresif dibanding `LIMIT` untuk kasus seperti "top-N per kelompok" (mis. mahasiswa GPA tertinggi *per department*) — topik lanjutan di luar cakupan dasar mata kuliah ini, tapi baik diketahui keberadaannya untuk pembelajaran mandiri.
- Untuk pencarian teks yang lebih canggih dari `LIKE` (mis. pencarian relevansi, typo-tolerant), MySQL menyediakan **Full-Text Search** (`MATCH() AGAINST()`) pada kolom bertipe `TEXT`/`VARCHAR` dengan index `FULLTEXT`.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"`WHERE kolom = NULL` akan menemukan baris ber-NULL."** Seperti dijelaskan §3.4, harus memakai `IS NULL`.
- ❌ **"LIMIT tanpa ORDER BY memberi hasil yang konsisten."** Tanpa `ORDER BY`, urutan baris yang dikembalikan database **tidak dijamin** (bisa berbeda antar eksekusi, terutama pada tabel besar). Selalu sertakan `ORDER BY` bila urutan hasil penting, termasuk saat memakai `LIMIT`.
- ❌ **"`LIKE '%kata%'` selalu cepat."** Wildcard di **awal** pola (`'%kata'` atau `'%kata%'`) mencegah MySQL memanfaatkan index B-Tree biasa secara optimal, karena database tidak bisa "melompat" ke posisi awal yang cocok. Untuk pencarian teks skala besar, pertimbangkan Full-Text Search.

## 7. Rangkuman

- `SELECT` mengambil data; `WHERE` menyaring baris; `ORDER BY` mengurutkan; `LIMIT` membatasi jumlah hasil.
- `NULL` memerlukan operator khusus (`IS NULL`/`IS NOT NULL`), tidak bisa dibandingkan dengan `=`.
- Urutan eksekusi logis (`FROM → WHERE → SELECT → ORDER BY → LIMIT`) menjelaskan aturan penggunaan alias.

## 8. Latihan Mandiri

1. Tampilkan nama dan email mahasiswa yang terdaftar pada tahun 2023, diurutkan berdasarkan nama A-Z.
2. Tampilkan 5 mahasiswa dengan GPA terendah (petunjuk: `ORDER BY ... ASC LIMIT 5`).
3. Tuliskan query untuk menemukan mahasiswa yang alamat emailnya belum diisi (`NULL`).
4. Lanjutkan ke **Lv.5 Query Hunter** di MYSQL QUEST untuk misi pencarian data interaktif.
