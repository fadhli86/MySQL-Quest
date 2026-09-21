# 🗄️ MYSQL QUEST

Interactive Database Learning Game untuk Mata Kuliah **Database MySQL** (kurikulum Outcome-Based Education/OBE) — dikembangkan berdasarkan *Grand Design MYSQL QUEST* dan *Blueprint Gameplay MYSQL QUEST*.

Mahasiswa berperan sebagai **Junior Database Engineer** dan naik level melalui 14 level (Database Rookie → Database Architect), mengerjakan quest berbasis studi kasus **ASIA Smart Campus**: menulis SQL sungguhan di sandbox yang aman, dinilai otomatis (auto-grading), mendapat hint bertingkat, XP, badge, dan portfolio evidence.

**100% berjalan di browser** — tanpa server, tanpa database sungguhan, tanpa login. Cocok untuk di-hosting gratis di GitHub Pages dan diakses dari desktop maupun HP.

## ▶️ Coba Sekarang

Buka `index.html` lewat static server (lihat [Menjalankan Secara Lokal](#-menjalankan-secara-lokal)), atau kunjungi URL GitHub Pages setelah di-deploy (lihat di bawah).

## ✨ Fitur

- **14 level penuh**: Database Rookie, Data Architect, Schema Builder, CRUD Ranger, Query Hunter, Data Analyst, Join Master, Query Strategist, Data Guardian, Normalization Master, Database Engineer, Transaction Guardian, Database Wizard, Database Architect (Final Boss).
- **SQL Sandbox nyata di browser** — memakai [sql.js](https://sql.js.org) (SQLite dikompilasi ke WebAssembly), setiap level mendapat database terisolasi sendiri, bisa di-reset kapan saja tanpa risiko.
- **Auto-grading** berbasis hasil eksekusi (bukan membandingkan teks query), plus pengecekan konsep SQL wajib/terlarang (mis. wajib pakai `JOIN`).
- **Feedback yang menjelaskan**: saat query salah, panel Result membandingkan hasil Anda dengan target (kolom, baris yang kurang/berlebih, atau hanya urutan yang berbeda); kuis mengacak urutan opsi per mahasiswa dan menjelaskan *mengapa* opsi yang dipilih salah. Komponen skor yang tidak bisa dinilai pada suatu tahap (mis. Efficiency/Interpretation) tidak ditampilkan dan tidak ikut dihitung.
- **Tantangan Debug 🐞** (Level 5–8): query yang sudah ditulis tetapi salah — hasilnya terbalik, error karena kutip hilang, agregat di `WHERE`, `JOIN` tanpa `ON`, subquery yang mengembalikan banyak baris. Mahasiswa harus menemukan dan memperbaiki bug-nya. Bersifat opsional (tidak memengaruhi mastery), tetapi memberi XP.
- **Review Konsep 🔁** (spaced repetition): kuis konsep yang dijawab salah — atau berasal dari level yang terasa sulit (3+ percobaan / 2+ hint) — diulang dengan jeda 1, 3, lalu 7 hari; tiga kali benar berturut-turut = dikuasai (+5 XP per jawaban benar). Kartu muncul di Home setelah ada soal untuk diulang; mode "Latihan Sekarang" tidak mengubah jadwal maupun XP. Jadwal tersimpan di progress (ikut Export/Import).
- **Hint ladder bertingkat**, XP economy, badge, rank, dan portfolio evidence — sesuai blueprint gameplay.
- **Boss Battle checkpoint** di Level 3, 7, 10, 13, dan Final Boss di Level 14.
- **Responsive mobile-first**: navigasi tab (Quest–Editor–Schema–Result) + sticky action bar di HP, workspace 3 panel simultan di desktop — satu basis kode yang sama untuk kedua form factor.
- **Progress tersimpan otomatis** di `localStorage` browser (autosave draft kode, attempt, mastery, XP, badge) — bisa dikerjakan perlahan, berhenti kapan saja, dan lanjut lagi nanti dari titik terakhir (ada kartu "Continue Playing" di dashboard).
- **Export/Import Progress (JSON)** di halaman Learning Progress — karena progress terikat per-browser, gunakan Export lalu Import untuk memindahkan/melanjutkan progress di device atau browser lain. Di HP, tombol Export otomatis membuka menu "Bagikan" native (Web Share API) supaya file bisa langsung dikirim ke WhatsApp/Email/Drive sendiri tanpa perlu mencari file di folder Download.
- **Learning Progress dashboard**: mastery per CPMK/Sub-CPMK, mirip §14 Grand Design.
- **Sertifikat kelulusan** (setelah 14 level selesai) — dirender ke `<canvas>`, diunduh sebagai PNG, ditandatangani dosen pengampu, dilengkapi **QR code tanda tangan digital** yang mengarah ke halaman verifikasi (`verify.html`) untuk memeriksa konsistensi data sertifikat.
- **SQL Playground** bebas dengan seluruh dataset kampus, untuk eksplorasi di luar quest.
- **Materi kuliah lengkap 14 pertemuan** (folder [`materi/`](materi/README.md)) — modul ajar mendalam bergaya diktat/handout per pertemuan (konsep, sintaks MySQL 8 asli, studi kasus, best practice terkini, latihan mandiri), terhubung ke masing-masing level lewat halaman Panduan Bermain di dalam game. Tersedia juga sebagai satu dokumen Word siap cetak: [`Modul_Ajar_Database_MySQL_14_Pertemuan.docx`](materi/Modul_Ajar_Database_MySQL_14_Pertemuan.docx). Lihat perbedaannya dengan microlearning di dalam game pada [materi/README.md](materi/README.md).
- **Bisa dibuka offline & di-install (PWA)**: setelah dibuka sekali dengan internet, aset (termasuk sql.js dan CodeMirror dari CDN) di-cache oleh service worker ([sw.js](sw.js)) sehingga game tetap jalan saat koneksi putus atau CDN kampus lambat/terblokir, dan bisa dipasang ke layar utama HP. Kunjungan *pertama* tetap membutuhkan akses ke CDN. File aplikasi memakai strategi network-first, jadi versi terbaru selalu dipakai bila online.
- **Tahan gangguan jaringan/CDN**: kalau koneksi lambat atau CDN (sql.js/CodeMirror) terblokir jaringan kampus, aplikasi menampilkan pesan error yang jelas dengan tombol "Coba Lagi" alih-alih macet di layar kosong. Progress juga tetap aman kalau `localStorage` browser tidak bisa dipakai (mis. mode private) — mahasiswa diberi tahu lewat notifikasi, bukan kehilangan data secara diam-diam. Aset CDN dilengkapi Subresource Integrity (SRI) untuk keamanan tambahan.

## 🧱 Arsitektur & Batasan yang Disengaja

Dokumen blueprint asli merancang arsitektur dengan backend penuh: SQL Execution Service, sandbox MySQL terisolasi per mahasiswa, auth multi-user, dan dashboard dosen real-time. Karena target deploy di sini adalah **GitHub Pages (hosting statis, tanpa server)**, versi ini adalah MVP yang disesuaikan:

| Aspek | Blueprint asli | Implementasi saat ini |
|---|---|---|
| SQL engine | MySQL server, sandbox per mahasiswa | **SQLite via sql.js (WebAssembly)**, berjalan di browser masing-masing. Sintaks inti (SELECT/JOIN/GROUP BY/subquery/VIEW/INDEX/TRIGGER/transaction) sama dengan MySQL; `PROCEDURE`/`FUNCTION` MySQL tidak didukung SQLite — Level 13 memakai `TRIGGER` (didukung keduanya) untuk latihan langsung, sintaks `PROCEDURE` ditampilkan sebagai referensi saja. |
| Progress & auth | Login, akun, sinkron lintas perangkat via server | **localStorage per-browser**, tanpa akun sungguhan (nama hanya untuk personalisasi tampilan). Progress **tidak** sinkron otomatis lintas perangkat/browser — pindah device pakai Export/Import JSON manual (halaman Learning Progress). |
| Efficiency & Interpretation (rubrik mastery) | Analisis query plan mendalam + NLP | Heuristik ringan (mis. deteksi query tanpa `WHERE`) — didokumentasikan di `js/grader.js`. |
| Dashboard Dosen / OBE analytics kelas | Live, multi-mahasiswa | Belum ada di versi ini (butuh backend). Learning Progress yang ada bersifat per-mahasiswa (device lokal). |

Struktur data (`js/state.js`, `js/levels.js`) sudah dirancang agar bagian ini bisa ditambahkan di fase berikutnya begitu ada backend (lihat §16/§23 Grand Design & Blueprint untuk roadmap MVP → Full Product).

## 📁 Struktur Proyek

```
index.html              Shell SPA (memuat CodeMirror & sql.js dari CDN)
sw.js, manifest.webmanifest, icons/   PWA: cache offline + installable
css/style.css            Seluruh styling, responsive breakpoints
js/
  app.js                 Router hash-based + shell (topbar/sidebar/bottom-nav)
  state.js                Persistence (localStorage), XP/mastery/rank, unlock rule
  sandbox.js              Wrapper sql.js (SQLite sandbox per level)
  grader.js               Auto-grading engine
  levels.js                Konten 14 level + dataset "ASIA Smart Campus"
  ui.js                    Helper DOM/toast/modal
  views/
    dashboard.js, journey.js, quest.js, achievements.js,
    portfolio.js, progress.js, playground.js, help.js
materi/                  Materi kuliah lengkap: 14 file Markdown (sumber utama) + index,
                          Modul_Ajar_Database_MySQL_14_Pertemuan.docx (versi Word gabungan),
                          build_docx.py (skrip regenerasi versi Word dari Markdown)
```

Tanpa build step — murni HTML/CSS/JS (ES modules), dependency (CodeMirror, sql.js) dimuat dari CDN jsDelivr.

## 💻 Menjalankan Secara Lokal

Perlu HTTP server lokal (ES modules tidak bisa dibuka langsung lewat `file://`). Pilih salah satu:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Lalu buka `http://localhost:8080`.

## 🧪 Menjalankan Tes

Situs tetap tanpa build step; `package.json` hanya untuk tes developer (memakai Node 18+ dan `sql.js` lokal):

```bash
npm install
npm test
```

Tes memainkan seluruh 14 level dengan sandbox dan grader yang sama seperti di browser: solusi benar harus lolos (termasuk submit ulang), starter code atau `SELECT 1;` tidak boleh lolos, dan struktur konten level divalidasi. Stage yang dinilai lewat `validate()` butuh solusi model dari folder rahasia `RAHASIA-kunci-jawaban/` (tidak ada di repo publik), sehingga di GitHub Actions stage tersebut dilewati sedangkan sisanya tetap diuji penuh.

## 🚀 Deploy ke GitHub Pages

1. Buat repository baru di GitHub (bisa public), lalu push folder ini sebagai isi root repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: MYSQL QUEST"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, pilih branch `main` dan folder `/ (root)`, klik **Save**.
3. Tunggu 1–2 menit, URL publik akan muncul di halaman yang sama (`https://<username>.github.io/<repo>/`).
4. Bagikan URL tersebut ke mahasiswa — bisa diakses dari desktop maupun HP tanpa instalasi apa pun.

Tidak perlu langkah build/Actions apa pun — repo ini murni file statis.

## 🔒 Privasi & Data

Tidak ada data yang dikirim ke server mana pun selain memuat asset statis (HTML/CSS/JS/CDN). Seluruh progress belajar (XP, jawaban, mastery) tersimpan di `localStorage` browser mahasiswa sendiri. Tombol **Export Progress (JSON)** di halaman *Learning Progress* memungkinkan mahasiswa menyimpan/mengirimkan bukti progress secara manual bila dosen memerlukannya sebagai evidence sebelum tersedia backend terpusat, dan tombol **Import Progress (JSON)** di halaman yang sama memungkinkan mahasiswa memuat kembali file tersebut untuk melanjutkan progress di device/browser lain (menggantikan seluruh progress lokal yang ada — akan diminta konfirmasi sebelum diterapkan).

## 📚 Sumber

Dikembangkan berdasarkan dua dokumen perancangan:
- *Grand Design MYSQL QUEST — Interactive Database Learning Game Berbasis Website* (v1.0, Agustus 2026)
- *Blueprint Gameplay System MYSQL QUEST — Interactive Database Learning Game Berbasis Website Responsif* (v1.0, Agustus 2026)
