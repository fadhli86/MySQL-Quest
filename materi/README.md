# Materi Mata Kuliah Database MySQL — 14 Pertemuan

Modul ajar lengkap untuk mata kuliah **Database MySQL**, disusun mengikuti *Learning Journey 14 Pertemuan* pada Grand Design MYSQL QUEST. Setiap pertemuan memetakan satu level di game [MYSQL QUEST](../index.html), memakai studi kasus yang **sama persis**: **ASIA Smart Campus**.

Bedanya dengan microlearning singkat di dalam game:

| | Microlearning (di dalam game) | Materi di sini |
|---|---|---|
| Tujuan | Pengingat cepat sebelum latihan | Bahan ajar lengkap untuk kelas/dibaca mandiri |
| Panjang | 2–3 paragraf pendek | Lengkap: konsep, contoh, best practice, latihan |
| Sintaks SQL | Disesuaikan sandbox SQLite (browser) | **MySQL 8.0+ asli** (DDL/DML resmi MySQL) |
| Format | Kartu di layar HP/desktop | Markdown — bisa dibaca di GitHub, dicetak, atau diimpor ke slide |

> ⚠️ **Catatan penting soal dialek SQL.** Game MYSQL QUEST menjalankan sandbox di browser memakai SQLite (via WebAssembly) supaya bisa berjalan tanpa server/instalasi. Sintaks inti (SELECT/JOIN/GROUP BY/subquery/dll) identik dengan MySQL, tetapi contoh DDL di modul ini memakai sintaks **MySQL asli** (`AUTO_INCREMENT`, `ENGINE=InnoDB`, tipe data MySQL, dll) karena itulah yang berlaku di ujian praktikum/lab MySQL sesungguhnya (XAMPP, MySQL Workbench, phpMyAdmin, atau server MySQL kelas). Perbedaan kecil selalu disebutkan di catatan tiap pertemuan bila relevan.

## Daftar Pertemuan

| # | Judul | Kompetensi Inti | Materi |
|---|---|---|---|
| 1 | Database Rookie | Konsep Database, DBMS, RDBMS, MySQL | [pertemuan-01.md](pertemuan-01-database-rookie.md) |
| 2 | Data Architect | Entity, Attribute, Relationship, ERD | [pertemuan-02.md](pertemuan-02-data-architect.md) |
| 3 | Schema Builder | Database, Table, Data Type, DDL | [pertemuan-03.md](pertemuan-03-schema-builder.md) |
| 4 | CRUD Ranger | INSERT, UPDATE, DELETE | [pertemuan-04.md](pertemuan-04-crud-ranger.md) |
| 5 | Query Hunter | SELECT, WHERE, ORDER BY, LIMIT | [pertemuan-05.md](pertemuan-05-query-hunter.md) |
| 6 | Data Analyst | Aggregate, GROUP BY, HAVING | [pertemuan-06.md](pertemuan-06-data-analyst.md) |
| 7 | Join Master | INNER/LEFT/RIGHT JOIN | [pertemuan-07.md](pertemuan-07-join-master.md) |
| 8 | Query Strategist | Subquery / Nested Query | [pertemuan-08.md](pertemuan-08-query-strategist.md) |
| 9 | Data Guardian | Constraint & Data Integrity | [pertemuan-09.md](pertemuan-09-data-guardian.md) |
| 10 | Normalization Master | 1NF, 2NF, 3NF | [pertemuan-10.md](pertemuan-10-normalization-master.md) |
| 11 | Database Engineer | View & Index | [pertemuan-11.md](pertemuan-11-database-engineer.md) |
| 12 | Transaction Guardian | ACID, COMMIT, ROLLBACK | [pertemuan-12.md](pertemuan-12-transaction-guardian.md) |
| 13 | Database Wizard | Procedure, Function, Trigger | [pertemuan-13.md](pertemuan-13-database-wizard.md) |
| 14 | Database Architect | Security, EXPLAIN, Optimization (Final Boss) | [pertemuan-14.md](pertemuan-14-database-architect.md) |

## Struktur Tiap Pertemuan

Setiap file mengikuti struktur yang sama:

1. **Tujuan Pembelajaran** — dipetakan ke CPMK/Sub-CPMK.
2. **Pengantar & Konteks** — kaitan dengan studi kasus ASIA Smart Campus.
3. **Materi Inti** — konsep, sintaks, dan penjelasan mendalam.
4. **Studi Kasus: ASIA Smart Campus** — contoh query nyata memakai skema yang sama dengan game.
5. **Praktik Terbaik & Update MySQL Terkini** — tips modern, fitur MySQL 8.0+, keamanan, performa.
6. **Kesalahan Umum (Misconception Alert)** — jebakan yang sering terjadi.
7. **Rangkuman**.
8. **Latihan Mandiri** — soal untuk dicoba sendiri (lanjutkan ke SQL Playground atau level terkait di game).

## Skema Basis Data: ASIA Smart Campus

Dataset berkembang bertahap sepanjang 14 pertemuan (sama seperti alur di game):

```
Pertemuan 1     : (belum ada tabel — observasi konsep)
Pertemuan 2–3   : departments, students, courses
Pertemuan 4–9   : + lecturers, classes, enrollments
Pertemuan 10    : latihan dekomposisi tabel (normalisasi)
Pertemuan 12–14 : + payments, payment_audit
```

Kredensial dan detail koneksi server MySQL kelas (bila praktikum memakai server bersama, phpMyAdmin, atau XAMPP lokal) ditentukan oleh dosen pengampu sesuai kebijakan laboratorium — tidak dicakup modul ini.

## Selaras dengan RPS

Rumusan CPMK/Sub-CPMK dan bobot penilaian pada modul ini mengikuti draft Grand Design MYSQL QUEST dan **perlu diselaraskan** dengan RPS resmi program studi sebelum digunakan sebagai acuan penilaian akhir.
