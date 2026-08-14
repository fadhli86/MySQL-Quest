# Pertemuan 1 — Database Rookie
### Konsep Database, DBMS, RDBMS, dan MySQL

**CPMK-1** • Sub-CPMK-1.1 — Memahami konsep basis data, DBMS, relational database, tabel, atribut, record, primary key, dan foreign key.
**Level game terkait:** Lv.1 Database Rookie — Quest *Database Detective*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan perbedaan data, informasi, dan basis data (database).
- Membedakan DBMS dan RDBMS, serta menyebutkan contoh produk populer.
- Mengidentifikasi komponen tabel: baris (record), kolom (attribute/field), dan primary key.
- Menjelaskan mengapa MySQL banyak dipakai di industri.

## 2. Pengantar & Konteks

Bayangkan kampus **ASIA Smart Campus** baru saja beralih dari mencatat data mahasiswa di spreadsheet Excel yang dikelola manual oleh staf akademik, ke sebuah sistem informasi akademik. Di balik layar sistem itu, ada satu komponen yang menyimpan dan mengelola seluruh data: **basis data (database)**.

Sepanjang 14 pertemuan ke depan, kalian akan berperan sebagai *Junior Database Engineer* yang membangun dan merawat basis data ASIA Smart Campus — mulai dari satu tabel sederhana di pertemuan ini, sampai sistem multi-tabel yang lengkap dengan transaksi, automasi, dan optimasi performa di pertemuan terakhir.

## 3. Materi Inti

### 3.1 Data vs. Informasi vs. Basis Data

- **Data** adalah fakta mentah yang belum diolah — misalnya `"Andi Saputra"`, `3.42`, `"Malang"`.
- **Informasi** adalah data yang telah diproses menjadi sesuatu yang bermakna — misalnya *"Andi Saputra adalah mahasiswa dengan IPK 3.42 asal Malang."*
- **Basis data (database)** adalah kumpulan data yang terorganisir, saling berhubungan, disimpan secara sistematis di media elektronik, dan dapat diakses/diolah oleh program komputer.

### 3.2 DBMS vs. RDBMS

**DBMS (Database Management System)** adalah perangkat lunak yang mengelola pembuatan, penyimpanan, pengambilan, dan keamanan data pada suatu basis data. DBMS menjadi perantara antara pengguna/aplikasi dan data fisik yang tersimpan di disk.

**RDBMS (Relational DBMS)** adalah DBMS yang menyimpan data dalam bentuk **tabel-tabel relasional** yang saling terhubung melalui kunci (key), berlandaskan model relasional yang diperkenalkan Edgar F. Codd (1970). Hampir seluruh sistem informasi modern — akademik, perbankan, e-commerce — memakai RDBMS sebagai fondasi datanya.

| Contoh RDBMS | Karakteristik |
|---|---|
| **MySQL** | Open-source, sangat populer untuk web (WordPress, banyak startup), kini dikembangkan Oracle. |
| **PostgreSQL** | Open-source, dikenal sangat patuh pada standar SQL & fitur lanjutan (JSON, GIS). |
| **Microsoft SQL Server** | Berbayar, umum di lingkungan enterprise berbasis Windows/.NET. |
| **Oracle Database** | Berbayar, dominan di perusahaan besar dan sistem legacy skala enterprise. |
| **SQLite** | Ringan, tanpa server terpisah (file-based) — dipakai di aplikasi mobile/embedded, dan juga menjadi mesin sandbox di game MYSQL QUEST karena bisa berjalan langsung di browser. |

> Bukan RDBMS: basis data NoSQL seperti **MongoDB** (dokumen), **Redis** (key-value), atau **Neo4j** (graph) — sengaja tidak memakai model tabel relasional karena kebutuhan skalabilitas/struktur data yang berbeda. Di luar cakupan mata kuliah ini, tetapi baik untuk diketahui bahwa RDBMS bukan satu-satunya paradigma.

### 3.3 Mengapa MySQL?

MySQL adalah salah satu RDBMS paling banyak dipakai di dunia, terutama untuk aplikasi web, karena:
- **Open-source** dan gratis untuk sebagian besar penggunaan.
- Performa baik untuk beban baca (*read-heavy*) yang umum pada aplikasi web/akademik.
- Ekosistem besar: dukungan luas di hosting, framework (Laravel, Django, Express), dan tooling (phpMyAdmin, MySQL Workbench).
- Kini juga tersedia sebagai layanan terkelola di cloud (Amazon RDS for MySQL, Google Cloud SQL, Azure Database for MySQL, PlanetScale) — relevan karena banyak startup modern menjalankan MySQL tanpa mengelola server sendiri.

### 3.4 Anatomi Tabel Relasional

Sebuah tabel (*table*) dalam RDBMS tersusun dari:

```
                    KOLOM (attribute/field)
                 ┌─────────┬──────────────┬──────────┐
                 │student_id│  full_name   │   gpa    │
                 ├─────────┼──────────────┼──────────┤
  BARIS (record) │    1    │ Andi Saputra │   3.42   │ ← satu record = satu mahasiswa
                 ├─────────┼──────────────┼──────────┤
                 │    2    │ Budi Santoso │   3.10   │
                 └─────────┴──────────────┴──────────┘
```

- **Tabel (table)** merepresentasikan satu jenis entitas, misalnya `students`.
- **Baris (row/record)** merepresentasikan satu instance nyata dari entitas tersebut — satu mahasiswa.
- **Kolom (column/attribute/field)** merepresentasikan satu properti dari entitas — nama, GPA, kota, dst.
- **Primary Key (PK)** adalah kolom (atau kombinasi kolom) yang nilainya **unik** dan **tidak boleh kosong (NOT NULL)** untuk setiap baris, dipakai untuk mengidentifikasi record secara pasti. Pada tabel `students`, `student_id` adalah kandidat PK yang ideal — bukan `full_name`, karena nama bisa kembar.
- **Foreign Key (FK)** adalah kolom yang merujuk ke primary key tabel lain, dipakai untuk membangun relasi antar tabel (akan dibahas mendalam di Pertemuan 2–3).

## 4. Studi Kasus: ASIA Smart Campus

Pada pertemuan ini kita baru mengamati satu tabel sederhana (belum dibuat sendiri — praktik `CREATE TABLE` dimulai Pertemuan 3):

```sql
-- Ilustrasi: tabel students versi awal (belum ternormalisasi)
student_id | full_name       | email                | department          | gpa  | city
-----------+------------------+----------------------+---------------------+------+---------
1          | Andi Saputra     | andi@asia.ac.id      | Teknik Informatika  | 3.42 | Malang
2          | Budi Santoso     | budi@asia.ac.id      | Sistem Informasi    | 3.10 | Surabaya
3          | Citra Ayu        | citra@asia.ac.id     | Teknik Informatika  | 3.78 | Malang
```

Diskusi kelas: dari tabel ini, tunjukkan mana yang layak menjadi *primary key*, dan perhatikan bahwa kolom `department` berisi teks bebas yang berulang — ini akan menjadi motivasi topik **Entity-Relationship** di Pertemuan 2.

## 5. Praktik Terbaik & Update MySQL Terkini

- **MySQL 8.0** (rilis stabil yang jadi acuan modul ini) membawa banyak perbaikan dibanding MySQL 5.7: dukungan **Window Functions**, **Common Table Expressions (CTE)** dengan `WITH`, tipe data `JSON` native, serta *default* karakter set `utf8mb4` (mendukung emoji dan seluruh karakter Unicode) — topik-topik ini akan disentuh di pertemuan-pertemuan berikutnya saat relevan.
- Selalu tentukan **storage engine** tabel secara eksplisit; `InnoDB` (default modern) mendukung transaksi (ACID) dan foreign key, berbeda dari engine lama `MyISAM` yang tidak mendukung keduanya — penting untuk diketahui sejak awal karena akan berpengaruh besar di Pertemuan 12 (Transaction).
- Gunakan `utf8mb4` alih-alih `utf8` biasa saat membuat database, karena `utf8` di MySQL secara historis hanya mendukung karakter hingga 3 byte (tidak mencakup emoji/karakter tertentu).

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"DBMS dan database itu sama."** DBMS adalah *perangkat lunak pengelola*; database adalah *kumpulan datanya sendiri*. MySQL adalah DBMS; `asia_smart_campus` adalah database yang dikelola MySQL.
- ❌ **"Primary key harus berupa angka."** Primary key hanya wajib unik dan tidak kosong — bisa berupa kode teks (mis. NIM, kode produk) selama nilainya benar-benar unik per baris, meski angka auto-increment lebih umum karena praktis.
- ❌ **"Semakin banyak data, harus pindah ke NoSQL."** Volume data besar bukan alasan tunggal berpindah paradigma — RDBMS modern (termasuk MySQL) mampu menangani miliaran baris dengan indexing dan optimasi yang tepat (dibahas Pertemuan 11 & 14).

## 7. Rangkuman

- Basis data menyimpan data secara terorganisir; DBMS adalah perangkat lunak pengelolanya; RDBMS adalah DBMS berbasis tabel relasional.
- MySQL populer karena open-source, berkinerja baik untuk web, dan didukung ekosistem luas termasuk layanan cloud terkelola.
- Tabel tersusun dari baris (record) dan kolom (attribute); primary key mengidentifikasi setiap baris secara unik.
- InnoDB adalah storage engine default modern MySQL yang mendukung transaksi dan foreign key.

## 8. Latihan Mandiri

1. Sebutkan tiga aplikasi/sistem yang kalian pakai sehari-hari yang kemungkinan besar didukung RDBMS di baliknya, dan jelaskan alasannya.
2. Dari tabel `students` pada studi kasus di atas, sebutkan kandidat primary key beserta alasan mengapa kolom lain tidak layak.
3. Cari tahu (dari dokumentasi resmi MySQL atau sumber terpercaya) satu perbedaan utama antara storage engine `InnoDB` dan `MyISAM`, lalu tuliskan dalam 2–3 kalimat.
4. Lanjutkan ke **Lv.1 Database Rookie** di MYSQL QUEST untuk mempraktikkan identifikasi komponen tabel secara interaktif.
