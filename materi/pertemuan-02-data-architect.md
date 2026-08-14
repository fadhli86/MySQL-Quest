# Pertemuan 2 — Data Architect
### Entity, Attribute, Relationship, dan ERD

**CPMK-2** • Sub-CPMK-2.1 — Merancang model basis data berdasarkan kebutuhan sistem.
**Level game terkait:** Lv.2 Data Architect — Quest *ERD Puzzle*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Mengidentifikasi entity dan attribute dari deskripsi kebutuhan sistem.
- Menentukan jenis kardinalitas relasi (one-to-one, one-to-many, many-to-many).
- Menggambar Entity-Relationship Diagram (ERD) sederhana.
- Menjelaskan mengapa desain data yang buruk menyebabkan redundansi.

## 2. Pengantar & Konteks

Di Pertemuan 1 kita melihat tabel `students` yang menyimpan nama department sebagai teks bebas (`"Teknik Informatika"`, `"Sistem Informasi"`, dst.), berulang di banyak baris. Bila suatu saat nama department berubah (misalnya rebranding jadi *"Informatika"*), staf harus mengubah **setiap baris** yang menyebutnya — berisiko tinggi salah ketik dan data tidak konsisten.

Sebelum menulis satu baris DDL pun (itu baru dimulai Pertemuan 3), seorang Data Architect harus lebih dulu **merancang** struktur data yang benar di atas kertas (atau papan tulis) menggunakan **Entity-Relationship Diagram (ERD)**.

## 3. Materi Inti

### 3.1 Entity, Attribute, Relationship

- **Entity** adalah objek/konsep nyata yang datanya perlu disimpan — misalnya `Student`, `Department`, `Course`. Entity umumnya menjadi satu tabel saat diimplementasikan.
- **Attribute** adalah properti yang melekat pada entity — `full_name`, `gpa`, `dept_name`. Attribute menjadi kolom pada tabel.
- **Relationship** adalah hubungan antar entity — misalnya *"Student terdaftar pada Department"*, *"Student mengambil Course"*.

### 3.2 Kardinalitas Relasi

Kardinalitas menyatakan **berapa banyak** instance satu entity dapat berhubungan dengan instance entity lain.

| Kardinalitas | Contoh pada ASIA Smart Campus | Notasi umum |
|---|---|---|
| **One-to-One (1:1)** | Satu `student` memiliki tepat satu `student_card` (kartu identitas digital) | `1 ── 1` |
| **One-to-Many (1:N)** | Satu `department` memiliki banyak `student`, tapi satu `student` hanya di satu `department` | `1 ── N` |
| **Many-to-Many (M:N)** | Satu `student` dapat mengambil banyak `course`, dan satu `course` diambil banyak `student` | `M ── N` |

Kardinalitas M:N **tidak bisa** diimplementasikan langsung dengan satu foreign key — ia membutuhkan **tabel penghubung (junction/associative table)**, misalnya tabel `enrollments` yang menghubungkan `students` dan `courses` (akan dibangun di Pertemuan 4 dan dipakai intensif mulai Pertemuan 6).

```
  DEPARTMENT ──1───────N── STUDENT ──M───────N── COURSE
                                        │(via)│
                                    ENROLLMENT
                              (student_id, course_id, score)
```

### 3.3 Dari ERD ke Tabel Relasional

Aturan dasar menerjemahkan ERD ke skema tabel:

1. Setiap **entity** → satu **tabel**.
2. Setiap **attribute** → satu **kolom**.
3. Relasi **1:N** → tambahkan **foreign key** di sisi "banyak" (N), merujuk primary key di sisi "satu" (1). Contoh: `students.dept_id` merujuk `departments.dept_id`.
4. Relasi **M:N** → buat **tabel penghubung** baru berisi minimal dua foreign key yang merujuk kedua tabel terkait.

### 3.4 Notasi ERD yang Umum Dipakai

Beberapa notasi populer: **Chen Notation** (entity sebagai kotak, relationship sebagai diamond), **Crow's Foot Notation** (kardinalitas digambarkan sebagai simbol "kaki gagak" di ujung garis — paling umum dipakai tools modern seperti MySQL Workbench, dbdiagram.io, dan draw.io). Mata kuliah ini tidak menuntut satu notasi baku — yang terpenting mahasiswa mampu mengomunikasikan entity, attribute, dan kardinalitas dengan jelas.

## 4. Studi Kasus: ASIA Smart Campus

Skema relasional (setelah dirancang ulang dari tabel flat Pertemuan 1) yang akan diimplementasikan mulai Pertemuan 3:

```
departments (dept_id PK, dept_name, dept_code)
     │ 1
     │
     │ N
students (student_id PK, full_name, email, dept_id FK, gpa, enrollment_year, city)
     │ 1
     │
     │ N
enrollments (enrollment_id PK, student_id FK, course_id FK, semester, score)
     │ N
     │
     │ 1
courses (course_id PK, course_name, credits, dept_id FK)
```

**Latihan diskusi kelas:** Untuk kebutuhan baru *"setiap course diampu oleh satu dosen tetap, dan satu dosen bisa mengampu banyak course"* — entity dan relasi apa yang perlu ditambahkan? (Jawaban: entity `lecturers`, relasi 1:N dari `lecturers` ke `courses`/`classes` — inilah yang diimplementasikan di skema lanjutan pada pertemuan-pertemuan berikutnya.)

## 5. Praktik Terbaik & Update Terkini

- Gunakan tools ERD modern seperti **dbdiagram.io**, **MySQL Workbench (EER Diagram)**, atau **draw.io** untuk membuat diagram yang rapi dan mudah diperbarui — jauh lebih efisien dibanding menggambar manual saat proyek membesar.
- Sertakan **kardinalitas dan opsionalitas** (apakah relasi wajib atau boleh kosong) di diagram, bukan hanya menghubungkan kotak — ini mencegah ambiguitas saat implementasi.
- Libatkan calon pengguna sistem (mis. staf akademik) saat merancang ERD — kesalahan pemodelan data yang baru ketahuan setelah aplikasi berjalan jauh lebih mahal diperbaiki dibanding dikoreksi di tahap rancangan.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"Relasi many-to-many bisa langsung dibuat dengan menambahkan dua kolom foreign key di salah satu tabel."** Tidak bisa — satu kolom hanya dapat menyimpan satu nilai per baris, sehingga tidak mampu merepresentasikan "banyak ke banyak". Wajib menggunakan tabel penghubung.
- ❌ **"ERD hanya formalitas dokumentasi, boleh dilewati."** ERD yang salah di awal akan menular ke seluruh skema, query, dan aplikasi di atasnya — memperbaikinya belakangan jauh lebih mahal (butuh migrasi data) dibanding memperbaikinya di atas kertas.
- ❌ **"Semua attribute harus langsung dimasukkan ke satu entity besar."** Ini justru mengarah ke redundansi seperti kasus Pertemuan 1 — attribute yang bergantung pada entity lain (mis. nama department) seharusnya dipisah ke entity-nya sendiri. Topik ini diperdalam sebagai *normalisasi* di Pertemuan 10.

## 7. Rangkuman

- Entity → tabel, Attribute → kolom, Relationship → keterhubungan antar tabel via key.
- Tiga jenis kardinalitas: 1:1, 1:N, M:N — relasi M:N butuh tabel penghubung.
- ERD dirancang **sebelum** implementasi database untuk menghindari redundansi dan kesalahan struktural yang mahal diperbaiki belakangan.

## 8. Latihan Mandiri

1. Identifikasi entity dan attribute dari deskripsi berikut: *"Setiap ruang kelas (room) memiliki kapasitas dan lokasi gedung. Setiap sesi perkuliahan (class) diadakan di satu ruang, pada satu semester."*
2. Tentukan kardinalitas relasi antara `rooms` dan `classes` dari soal nomor 1, lalu gambarkan ERD sederhananya.
3. Jelaskan mengapa kolom `department` bertipe teks bebas pada tabel `students` (Pertemuan 1) merupakan indikasi masalah desain — kaitkan dengan konsep *redundansi data*.
4. Lanjutkan ke **Lv.2 Data Architect** di MYSQL QUEST untuk berlatih menentukan kardinalitas secara interaktif.
