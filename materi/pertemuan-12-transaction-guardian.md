# Pertemuan 12 — Transaction Guardian
### ACID, Transaction, COMMIT, ROLLBACK

**CPMK-6** • Sub-CPMK-6.3 — Menerapkan transaction sebagai bagian dari integritas database.
**Level game terkait:** Lv.12 Transaction Guardian — Quest *Transaction Crisis*

---

## 1. Tujuan Pembelajaran

Setelah pertemuan ini, mahasiswa mampu:
- Menjelaskan prinsip ACID dan pentingnya dalam sistem yang menangani data kritis.
- Menggunakan `START TRANSACTION`, `COMMIT`, dan `ROLLBACK`.
- Menjelaskan konsep `SAVEPOINT` untuk rollback parsial.
- Menjelaskan level isolasi transaksi secara konseptual dan risiko *race condition*.

## 2. Pengantar & Konteks

Sistem pembayaran ASIA Smart Campus mencatat pembayaran SPP mahasiswa. Bayangkan skenario: sistem mencatat pembayaran berhasil di tabel `payments`, tapi **sebelum** mencatat log auditnya, koneksi listrik server terputus. Apakah data pembayaran tadi tetap tersimpan dalam kondisi "setengah jadi" yang membingungkan? *Transaction Guardian* memastikan hal ini **tidak pernah terjadi** — setiap rangkaian operasi yang saling terkait diperlakukan sebagai satu unit kerja yang **utuh atau batal sepenuhnya**.

## 3. Materi Inti

### 3.1 Prinsip ACID

| Prinsip | Arti | Ilustrasi |
|---|---|---|
| **Atomicity** | Semua-atau-tidak-sama-sekali | Transfer saldo: baik pengurangan dari pengirim MAUPUN penambahan ke penerima terjadi bersamaan, atau tidak keduanya sama sekali |
| **Consistency** | Database berpindah dari satu keadaan valid ke keadaan valid lainnya | Transaksi tidak boleh melanggar constraint (Pertemuan 9) yang sudah ditetapkan |
| **Isolation** | Transaksi yang berjalan bersamaan tidak saling mengganggu | Dua staf yang memproses pembayaran di saat bersamaan tidak boleh saling menimpa data satu sama lain |
| **Durability** | Perubahan yang sudah `COMMIT` tidak boleh hilang, bahkan bila server mati sesaat setelahnya | Data tersimpan permanen ke disk, bukan hanya di memori |

Keempat prinsip ini adalah alasan utama mengapa storage engine **InnoDB** (bukan `MyISAM`) menjadi pilihan default MySQL modern — hanya InnoDB yang mendukung transaksi ACID penuh.

### 3.2 START TRANSACTION, COMMIT, ROLLBACK

```sql
START TRANSACTION;

UPDATE payments SET status = 'paid' WHERE payment_id = 2;

COMMIT;   -- menyimpan perubahan secara permanen
```

```sql
START TRANSACTION;

INSERT INTO payments (student_id, amount, payment_date, status)
VALUES (8, 1200000, '2025-08-10', 'paid');

-- Ternyata terjadi kesalahan sistem (mis. validasi gagal di tahap lain)
ROLLBACK;   -- membatalkan SELURUH perubahan sejak START TRANSACTION
```

Setelah `ROLLBACK`, seolah-olah transaksi tersebut **tidak pernah terjadi** — data kembali persis seperti sebelum `START TRANSACTION` dijalankan.

### 3.3 Contoh Kasus Nyata: Transfer/Pemindahan Dana

```sql
START TRANSACTION;

UPDATE wallets SET balance = balance - 100000 WHERE student_id = 1;  -- kurangi pengirim
UPDATE wallets SET balance = balance + 100000 WHERE student_id = 2;  -- tambah penerima

-- Jika salah satu UPDATE gagal (mis. saldo pengirim jadi negatif melanggar CHECK),
-- MySQL otomatis membatalkan statement yang gagal — aplikasi HARUS mengecek
-- dan memanggil ROLLBACK bila ada kegagalan, baru COMMIT bila keduanya sukses.
COMMIT;
```

Inilah esensi **Atomicity**: bila UPDATE kedua gagal setelah UPDATE pertama berhasil, sistem yang benar akan me-ROLLBACK keduanya — bukan membiarkan saldo pengirim sudah terpotong tanpa penerima menerimanya.

### 3.4 SAVEPOINT — Rollback Parsial

```sql
START TRANSACTION;

UPDATE students SET gpa = 3.5 WHERE student_id = 1;
SAVEPOINT sebelum_update_kedua;

UPDATE students SET gpa = 9.9 WHERE student_id = 2;  -- oops, salah nilai

ROLLBACK TO sebelum_update_kedua;  -- hanya batalkan sejak savepoint, bukan seluruhnya
UPDATE students SET gpa = 3.7 WHERE student_id = 2;  -- perbaikan

COMMIT;  -- yang tersimpan: student_id=1 jadi 3.5, student_id=2 jadi 3.7
```

### 3.5 Konsep Isolation Level (Pengantar)

Saat banyak transaksi berjalan **bersamaan**, empat level isolasi standar SQL mengatur seberapa "terlihat" perubahan transaksi lain terhadap transaksi yang sedang berjalan: `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ` (default MySQL/InnoDB), dan `SERIALIZABLE` (paling ketat, paling lambat). Level yang lebih ketat mencegah lebih banyak anomali (*dirty read*, *non-repeatable read*, *phantom read*) tapi mengorbankan konkurensi. Topik ini diperkenalkan secara konseptual di sini; eksplorasi mendalam relevan untuk mata kuliah lanjutan (mis. Sistem Basis Data Terdistribusi).

```sql
-- Melihat/mengatur level isolasi (hanya untuk pengenalan konsep)
SELECT @@transaction_isolation;
```

## 4. Studi Kasus: ASIA Smart Campus

```sql
-- Konfirmasi pembayaran secara permanen
START TRANSACTION;
UPDATE payments SET status = 'paid' WHERE payment_id = 2;
COMMIT;

-- Simulasi kegagalan sistem: batalkan transaksi sebelum permanen
START TRANSACTION;
INSERT INTO payments (student_id, amount, payment_date, status)
VALUES (8, 1200000, '2025-08-10', 'paid');
-- terjadi error tak terduga di proses berikutnya...
ROLLBACK;

SELECT COUNT(*) FROM payments WHERE student_id = 8;  -- membuktikan data tidak tersimpan
```

## 5. Praktik Terbaik & Update Terkini

- MySQL secara default berjalan dalam mode **`autocommit = 1`** — setiap statement tunggal otomatis di-`COMMIT`. `START TRANSACTION` menonaktifkan autocommit sementara sampai `COMMIT`/`ROLLBACK` dipanggil eksplisit.
- **Perhatikan statement yang melakukan implicit commit** — DDL seperti `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` di MySQL secara otomatis melakukan commit dan **tidak bisa** dibatalkan dengan `ROLLBACK`, meski dijalankan di dalam transaksi yang sedang berlangsung. Jangan pernah mengasumsikan DDL bisa "dibatalkan" seperti DML.
- Di aplikasi nyata, transaksi biasanya dikelola oleh **framework/ORM** (mis. Laravel `DB::transaction()`, Spring `@Transactional`) yang otomatis memanggil `COMMIT`/`ROLLBACK` berdasarkan ada-tidaknya exception — memahami mekanisme di baliknya (materi pertemuan ini) tetap penting agar tidak salah pakai fitur tersebut.
- Jaga **durasi transaksi sesingkat mungkin** — transaksi yang terbuka lama menahan *lock* pada baris terkait, berpotensi memblokir transaksi lain dan menurunkan konkurensi sistem.

## 6. Kesalahan Umum (Misconception Alert)

- ❌ **"ROLLBACK bisa membatalkan CREATE TABLE / DROP TABLE."** Salah — DDL bersifat *implicit commit* di MySQL, tidak dapat di-rollback (lihat §5). Selalu backup sebelum menjalankan DDL destruktif di produksi.
- ❌ **"Tanpa START TRANSACTION eksplisit, tidak ada transaksi sama sekali."** Setiap statement tunggal di MySQL (mode `autocommit=1`) sebenarnya **tetap** berjalan sebagai transaksi implisit satu-statement — hanya saja langsung ter-`COMMIT` otomatis tanpa perlu perintah eksplisit.
- ❌ **"Transaksi hanya relevan untuk aplikasi finansial."** Prinsip yang sama berlaku untuk operasi apa pun yang melibatkan **lebih dari satu perubahan yang saling bergantung** — mis. mendaftarkan mahasiswa baru sekaligus membuat akun emailnya di tabel lain; keduanya harus berhasil bersama atau gagal bersama.

## 7. Rangkuman

- ACID (Atomicity, Consistency, Isolation, Durability) adalah jaminan yang membuat transaksi database dapat diandalkan.
- `START TRANSACTION` ... `COMMIT` menyimpan perubahan permanen; `ROLLBACK` membatalkan seluruh perubahan sejak transaksi dimulai (atau sejak `SAVEPOINT` tertentu).
- DDL di MySQL bersifat implicit commit dan tidak dapat di-rollback — beda perlakuan dari DML.

## 8. Latihan Mandiri

1. Tuliskan transaksi yang memindahkan satu mahasiswa dari satu `class` ke `class` lain (hapus enrollment lama, tambah enrollment baru) sebagai satu unit atomik.
2. Jelaskan dengan skenario konkret mengapa Atomicity penting pada kasus "transfer dana antar wallet mahasiswa".
3. Jelaskan perbedaan efek `ROLLBACK` biasa dengan `ROLLBACK TO savepoint_tertentu`.
4. Lanjutkan ke **Lv.12 Transaction Guardian** di MYSQL QUEST untuk mensimulasikan skenario transaksi gagal dan berhasil.
