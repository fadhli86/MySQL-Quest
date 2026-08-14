# Pertemuan 7 — Join Master
### INNER JOIN, LEFT JOIN, RIGHT JOIN, Multi-table JOIN

**CPMK-5** • Sub-CPMK-5.2 — Menggabungkan data lintas tabel berdasarkan relasi.
**Level game terkait:** Lv.7 Join Master — Quest *Join Battle* (⚔ Boss A)

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan mengapa data dipisah ke banyak tabel ternormalisasi memerlukan JOIN untuk digabungkan kembali.
- Menggunakan `INNER JOIN`, `LEFT JOIN`, dan `RIGHT JOIN` dengan tepat sesuai kebutuhan.
- Menggabungkan lebih dari dua tabel dalam satu query.
- Mengombinasikan JOIN dengan `GROUP BY`/`HAVING` untuk analisis lintas tabel.

## 2. Pengantar & Konteks

Sejak Pertemuan 2–3, data ASIA Smart Campus sengaja dipecah menjadi tabel-tabel terpisah (`students`, `departments`, `courses`, `enrollments`) untuk menghindari redundansi. Konsekuensinya: untuk menjawab pertanyaan seperti *"Tampilkan nama mahasiswa beserta nama department dan mata kuliah yang diambilnya"*, data harus **digabungkan kembali** saat query — inilah tugas `JOIN`.

## 3. Materi Inti

### 3.1 INNER JOIN

`INNER JOIN` menggabungkan baris dari dua tabel **hanya jika** ada pasangan yang cocok di kedua sisi, berdasarkan kondisi `ON`.

```sql
SELECT s.full_name, d.dept_name
FROM students s
INNER JOIN departments d ON s.dept_id = d.dept_id;
```

```
students                    departments
┌────┬──────┬─────────┐     ┌────┬──────────┐
│ id │ name │ dept_id │     │ id │   name   │
├────┼──────┼─────────┤     ├────┼──────────┤
│ 1  │ Andi │    1    │ ──┐ │ 1  │   TI     │◄─┐
│ 2  │ Budi │    2    │ ──┼─┼►│ 2  │   SI     │◄─┤
└────┴──────┴─────────┘   │ └────┴──────────┘  │
                           └─────────────────────┘
     Hanya baris dengan dept_id yang cocok di KEDUA tabel yang muncul di hasil.
```

Menggunakan **alias tabel** (`s` untuk `students`, `d` untuk `departments`) adalah praktik standar agar query tetap ringkas dan jelas, terutama saat menggabungkan banyak tabel.

### 3.2 LEFT JOIN (LEFT OUTER JOIN)

`LEFT JOIN` mengembalikan **seluruh baris dari tabel kiri**, meskipun tidak ada pasangan di tabel kanan (kolom dari tabel kanan akan bernilai `NULL`).

```sql
-- Tampilkan SEMUA mahasiswa, termasuk yang belum pernah mengambil mata kuliah apa pun
SELECT s.full_name, e.course_id, e.score
FROM students s
LEFT JOIN enrollments e ON s.student_id = e.student_id;
```

Kasus penggunaan klasik: mencari data yang **tidak memiliki** pasangan — mahasiswa yang belum pernah enroll ke mata kuliah manapun.

```sql
SELECT s.full_name
FROM students s
LEFT JOIN enrollments e ON s.student_id = e.student_id
WHERE e.enrollment_id IS NULL;  -- baris tanpa pasangan akan NULL di sini
```

### 3.3 RIGHT JOIN

`RIGHT JOIN` adalah kebalikan `LEFT JOIN` — mengembalikan seluruh baris dari tabel **kanan**. Secara praktik, `RIGHT JOIN` jarang dipakai karena query yang sama selalu bisa ditulis ulang sebagai `LEFT JOIN` dengan menukar urutan tabel — kebanyakan tim memilih konsisten memakai `LEFT JOIN` demi keterbacaan.

```sql
-- Setara dengan LEFT JOIN dengan urutan tabel ditukar
SELECT s.full_name, e.score
FROM enrollments e
RIGHT JOIN students s ON s.student_id = e.student_id;
```

### 3.4 Menggabungkan Lebih dari Dua Tabel

```sql
SELECT s.full_name, c.course_name, e.score
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
JOIN courses  c ON e.course_id = c.course_id;
```

`JOIN` tanpa awalan dianggap sama dengan `INNER JOIN`. Bisa dirangkai sebanyak yang diperlukan — MySQL memproses secara bertahap, menggabungkan hasil JOIN sebelumnya dengan tabel berikutnya.

### 3.5 Ringkasan Perbandingan

| Jenis JOIN | Baris yang dihasilkan |
|---|---|
| `INNER JOIN` | Hanya baris yang cocok di **kedua** tabel |
| `LEFT JOIN` | Seluruh baris tabel **kiri**, dipasangkan bila ada; `NULL` bila tidak |
| `RIGHT JOIN` | Seluruh baris tabel **kanan**, dipasangkan bila ada; `NULL` bila tidak |

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Nilai setiap mahasiswa beserta nama mata kuliah
SELECT s.full_name, c.course_name, e.score
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
JOIN courses  c ON e.course_id = c.course_id;

-- Boss Battle: mahasiswa berprestasi (rata-rata skor > 85), lintas 3 tabel + agregasi
SELECT s.full_name, d.dept_name, AVG(e.score) AS avg_score
FROM enrollments e
JOIN students s     ON e.student_id = s.student_id
JOIN departments d  ON s.dept_id = d.dept_id
GROUP BY s.student_id
HAVING AVG(e.score) > 85
ORDER BY avg_score DESC;
```

## 5. Praktik Terbaik & Update Terkini

- **Selalu beri alias tabel** dan **qualify nama kolom** (`s.full_name`, bukan `full_name` saja) begitu query melibatkan lebih dari satu tabel — mencegah ambiguitas bila dua tabel punya nama kolom sama (mis. kedua tabel punya kolom `name`).
- **JOIN membutuhkan index** pada kolom yang dipakai di `ON` (biasanya foreign key) agar performa tetap baik saat data membesar — MySQL/InnoDB otomatis membuat index untuk foreign key (lihat Pertemuan 3), tapi tetap penting dipahami dampaknya di Pertemuan 11 (Index).
- Sintaks JOIN lama bergaya `SELECT * FROM a, b WHERE a.id = b.a_id` (*implicit join*) **tidak disarankan** dibanding `JOIN ... ON ...` (*explicit join*) — sintaks eksplisit lebih jelas membedakan kondisi penggabungan dari kondisi penyaringan, dan menjadi standar modern di seluruh RDBMS.
- MySQL 8.0 juga mendukung **CTE (`WITH ... AS (...)`)**, yang sering dipakai bersama JOIN kompleks untuk memecah query panjang menjadi bagian-bagian yang lebih mudah dibaca — dikenalkan sekilas di Pertemuan 8.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"INNER JOIN dan JOIN itu berbeda."** `JOIN` tanpa kata kunci tambahan **adalah** `INNER JOIN` — sinonim, bukan jenis berbeda.
- ❌ **"LEFT JOIN selalu lebih aman dipakai daripada INNER JOIN."** Bila kebutuhan memang hanya baris yang punya pasangan di kedua tabel (mis. laporan nilai — mahasiswa yang belum enroll tidak relevan ditampilkan), `INNER JOIN` justru lebih tepat dan lebih murah secara performa.
- ❌ **"Menggabungkan banyak tabel dengan koma (`FROM a, b, c`) sama baiknya dengan JOIN eksplisit."** Selain rawan menghasilkan *cartesian product* (baris meledak) bila lupa satu kondisi `WHERE`, gaya ini sudah dianggap usang (deprecated dalam praktik) dibanding `JOIN ... ON`.

## 7. Rangkuman

- `INNER JOIN` hanya mengambil baris yang cocok di kedua tabel; `LEFT`/`RIGHT JOIN` mempertahankan seluruh baris salah satu sisi meski tidak ada pasangan.
- JOIN dapat dirangkai untuk menggabungkan banyak tabel sekaligus, dan sering dikombinasikan dengan `GROUP BY`/`HAVING` untuk analisis lintas tabel.
- Alias tabel dan qualifikasi kolom (`tabel.kolom`) adalah praktik wajib begitu lebih dari satu tabel terlibat.

## 8. Latihan Mandiri

1. Tampilkan nama mahasiswa yang **belum pernah** mengambil mata kuliah apa pun (petunjuk: `LEFT JOIN` + `WHERE ... IS NULL`).
2. Tampilkan nama dosen beserta jumlah mata kuliah yang diampu (menggabungkan `lecturers` dan `classes` — diperkenalkan di Pertemuan 12–14).
3. Jelaskan perbedaan hasil antara `INNER JOIN` dan `LEFT JOIN` pada query yang sama, menggunakan contoh konkret dari data `students` dan `enrollments`.
4. Lanjutkan ke **Lv.7 Join Master** (Boss A) di MYSQL QUEST — pertempuran gabungan CRUD, SELECT, aggregate, dan JOIN.
