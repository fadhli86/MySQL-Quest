# Pertemuan 10 — Normalization Master
### 1NF, 2NF, 3NF

**CPMK-6** • Sub-CPMK-6.2 — Menerapkan normalization sebagai bagian dari integritas desain database.
**Level game terkait:** Lv.10 Normalization Master — Quest *Normalization Puzzle* (⚔ Boss B)

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan tujuan normalisasi: mengurangi redundansi dan mencegah anomali data.
- Mengidentifikasi pelanggaran 1NF, 2NF, dan 3NF pada suatu tabel.
- Mendekomposisi tabel yang belum ternormalisasi menjadi struktur relasional yang benar.
- Menjelaskan trade-off antara normalisasi penuh dan denormalisasi untuk performa.

## 2. Pengantar & Konteks

Bayangkan tim IT lama ASIA Smart Campus mewariskan satu tabel besar `raw_registrations` yang mencampur data mahasiswa, mata kuliah, dan dosen dalam satu tabel — mirip file Excel yang "praktis" tapi penuh data berulang. Setiap kali mahasiswa mengambil mata kuliah baru, **nama dan kota mahasiswa yang sama ditulis ulang**. *Normalization Master* bertugas membedah tabel bermasalah ini menjadi struktur yang bersih.

## 3. Materi Inti

### 3.1 Mengapa Normalisasi?

Tabel yang tidak ternormalisasi rawan tiga jenis **anomali**:

- **Anomali Insert** — tidak bisa menyimpan data department baru sebelum ada mahasiswa yang terdaftar di dalamnya (karena data department "menempel" pada baris mahasiswa).
- **Anomali Update** — mengubah nama department mengharuskan update di **banyak baris** sekaligus; kalau terlewat satu, data jadi tidak konsisten.
- **Anomali Delete** — menghapus satu-satunya mahasiswa di suatu department secara tidak sengaja **ikut menghapus** informasi department itu sendiri.

### 3.2 Contoh Tabel Bermasalah

```
raw_registrations
┌────────┬──────────────┬──────────────┬─────────────────────┬────────────────┬────────────────────┐
│ reg_id │ student_name │ student_city │     course_name      │ course_credits │   lecturer_name     │
├────────┼──────────────┼──────────────┼─────────────────────┼────────────────┼────────────────────┤
│   1    │ Andi Saputra │    Malang    │      Basis Data      │        3       │  Dr. Rina Marlina   │
│   2    │ Andi Saputra │    Malang    │   Pemrograman Web    │        3       │ Bambang Sutrisno    │
│   3    │ Citra Ayu    │    Malang    │      Basis Data      │        3       │  Dr. Rina Marlina   │
└────────┴──────────────┴──────────────┴─────────────────────┴────────────────┴────────────────────┘
     ↑ "Andi Saputra" & "Malang" berulang setiap kali dia ambil mata kuliah baru
     ↑ "Basis Data", "3 sks", "Dr. Rina Marlina" berulang setiap kali ada mahasiswa yang mengambilnya
```

### 3.3 First Normal Form (1NF)

**Syarat:** setiap kolom hanya berisi nilai **atomik** (tunggal, tidak bisa dipecah lagi) — tidak boleh ada daftar/grup nilai berulang dalam satu sel.

```
-- PELANGGARAN 1NF: satu sel menyimpan banyak nilai
student_name | courses_taken
Andi Saputra | "Basis Data, Pemrograman Web, Struktur Data"

-- SESUAI 1NF: satu baris per pasangan (student, course)
student_name | course_name
Andi Saputra | Basis Data
Andi Saputra | Pemrograman Web
Andi Saputra | Struktur Data
```

### 3.4 Second Normal Form (2NF)

**Syarat:** sudah 1NF, **dan** setiap atribut non-key bergantung penuh pada **seluruh** primary key (bukan hanya sebagian). Pelanggaran 2NF hanya mungkin terjadi bila primary key terdiri dari **lebih dari satu kolom** (composite key).

```
-- Primary key komposit (student_id, course_id)
-- course_credits hanya bergantung pada course_id (SEBAGIAN key) -> pelanggaran 2NF
enrollments(student_id, course_id, course_credits, score)
```

Solusi: pindahkan `course_credits` ke tabel `courses` tersendiri, karena ia adalah properti mata kuliah, bukan properti dari kombinasi (mahasiswa, mata kuliah).

```
courses(course_id PK, course_credits)
enrollments(student_id FK, course_id FK, score)   -- primary key: (student_id, course_id)
```

### 3.5 Third Normal Form (3NF)

**Syarat:** sudah 2NF, **dan** tidak ada **dependensi transitif** — atribut non-key tidak boleh bergantung pada atribut non-key lainnya (harus bergantung langsung pada primary key).

```
-- Pelanggaran 3NF: lecturer_name bergantung pada lecturer_id,
-- BUKAN langsung pada course_id (dependensi transitif: course_id -> lecturer_id -> lecturer_name)
courses(course_id PK, course_name, lecturer_id, lecturer_name)
```

Solusi: pisahkan `lecturer_name` ke tabel `lecturers` sendiri.

```
lecturers(lecturer_id PK, lecturer_name)
courses(course_id PK, course_name, lecturer_id FK)
```

### 3.6 Rangkuman Visual Dekomposisi

```
raw_registrations (belum ternormalisasi)
        │
        │ pisahkan atribut berulang per entity
        ▼
┌─────────────────┐   ┌──────────────────┐   ┌───────────────────┐
│  students_norm   │   │  courses_norm     │   │  enrollments_norm  │
│  student_id  PK  │   │  course_id   PK   │   │  enrollment_id PK  │
│  student_name    │   │  course_name      │   │  student_id   FK   │
│  student_city    │   │  credits          │   │  course_id    FK   │
└─────────────────┘   │  lecturer_name    │   └───────────────────┘
                       └──────────────────┘
```

## 4. Studi Kasus: ASIA Smart Campus

```sql
CREATE TABLE students_norm (
  student_id   INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL,
  student_city VARCHAR(50)
);

CREATE TABLE courses_norm (
  course_id     INT AUTO_INCREMENT PRIMARY KEY,
  course_name   VARCHAR(100) NOT NULL,
  credits       TINYINT,
  lecturer_name VARCHAR(100)
);

CREATE TABLE enrollments_norm (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  course_id     INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students_norm(student_id),
  FOREIGN KEY (course_id) REFERENCES courses_norm(course_id)
);

-- Migrasi data unik dari tabel lama ke tabel baru
INSERT INTO students_norm (student_name, student_city)
SELECT DISTINCT student_name, student_city FROM raw_registrations;
```

## 5. Praktik Terbaik & Update Terkini

- **3NF adalah target praktis** untuk mayoritas sistem transaksional (OLTP) seperti sistem akademik — cukup untuk menghilangkan sebagian besar anomali tanpa kompleksitas berlebihan. Bentuk normal lebih tinggi (BCNF, 4NF, 5NF) ada, tapi jarang dibutuhkan di luar kasus akademik/khusus.
- **Denormalisasi yang disengaja** kadang dilakukan demi performa pada sistem analitik/pelaporan (data warehouse) — misalnya menyimpan `dept_name` langsung di tabel fakta agar laporan tidak perlu JOIN berkali-kali. Ini trade-off sadar antara kecepatan baca vs. risiko redundansi, bukan kesalahan desain — dilakukan **setelah** memahami bentuk normalnya, bukan sebagai alasan untuk tidak pernah menormalisasi.
- Tools **MySQL Workbench** dapat melakukan *reverse engineering* dari database yang sudah ada menjadi diagram EER, membantu memvisualisasikan struktur sebelum memutuskan dekomposisi lebih lanjut.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Normalisasi berarti sebanyak mungkin tabel."** Tujuannya bukan jumlah tabel, tapi **menghilangkan dependensi yang salah tempat**. Memecah tabel tanpa alasan dependensi yang jelas hanya menambah kompleksitas JOIN tanpa manfaat integritas.
- ❌ **"1NF, 2NF, 3NF harus dicek berurutan secara manual tiap saat."** Pada praktiknya, merancang ERD yang baik sejak awal (Pertemuan 2) — satu entity per tabel, atribut yang benar-benar melekat pada entity tersebut — secara alami akan menghasilkan skema yang sudah 3NF, tanpa perlu proses dekomposisi belakangan.
- ❌ **"Semakin ternormalisasi, query selalu semakin cepat."** Sebaliknya — normalisasi penuh berarti lebih banyak JOIN untuk merekonstruksi data, yang bisa memperlambat query analitik skala besar. Normalisasi mengoptimalkan **integritas dan konsistensi**, bukan selalu kecepatan baca.

## 7. Rangkuman

- Normalisasi mengurangi redundansi dan mencegah anomali insert/update/delete.
- 1NF: nilai atomik. 2NF: bergantung penuh pada seluruh primary key (relevan untuk composite key). 3NF: tidak ada dependensi transitif antar atribut non-key.
- 3NF adalah target praktis untuk sistem transaksional; denormalisasi adalah trade-off sadar untuk kebutuhan performa tertentu, bukan cara menghindari normalisasi.

## 8. Latihan Mandiri

1. Diberikan tabel `payments_raw(payment_id, student_name, student_email, amount, payment_date)` di mana `student_email` berulang setiap mahasiswa membayar lebih dari sekali — pelanggaran bentuk normal apa yang terjadi, dan bagaimana dekomposisinya?
2. Jelaskan dengan contoh konkret perbedaan antara pelanggaran 2NF dan pelanggaran 3NF.
3. Rancang ulang tabel `raw_registrations` (§3.2) menjadi struktur 3NF lengkap, termasuk foreign key-nya.
4. Lanjutkan ke **Lv.10 Normalization Master** (Boss B) di MYSQL QUEST untuk mendekomposisi tabel bermasalah secara langsung.
