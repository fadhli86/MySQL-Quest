import { el } from "../ui.js";

function step(title, body) {
  return el("li", {}, [el("div", { class: "num" }), el("div", { class: "body" }, [el("b", {}, title), body ? el("div", {}, body) : null])]);
}

function faq(q, a) {
  return el("details", { class: "faq-item" }, [el("summary", {}, q), el("p", {}, a)]);
}

export async function renderHelp({ navigate }) {
  return el("div", { class: "page page-narrow" }, [
    el("div", { class: "help-hero" }, [el("span", { class: "ic" }, "🧭"), el("h2", { style: "margin:0;" }, "Panduan Bermain")]),
    el("p", {}, "Ringkasan singkat supaya Anda tidak bingung — baca sekali di awal, lalu jadikan referensi kapan pun. Tombol ❓ di pojok kanan bawah selalu membawa Anda kembali ke halaman ini, termasuk saat sedang mengerjakan quest."),

    el("div", { class: "card" }, [
      el("div", { class: "section-title" }, "Apa itu MYSQL QUEST?"),
      el("p", { style: "margin:0;" }, "Game belajar Database MySQL. Anda berperan sebagai Junior Database Engineer yang naik level dari Database Rookie sampai Database Architect (14 level) dengan menulis SQL sungguhan pada sandbox yang aman — bukan sekadar pilihan ganda. Setiap query yang Anda tulis dinilai otomatis oleh sistem."),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Alur Bermain, Langkah demi Langkah"),
      el("ol", { class: "guide-steps" }, [
        step("Buka Journey", "Lihat peta 14 level. Level 1 selalu terbuka; level berikutnya terbuka otomatis setelah level sebelumnya Anda selesaikan (mastery ≥ 80%)."),
        step("Pilih level yang berstatus Available / In Progress", "Level yang masih 🔒 Locked belum bisa dimainkan — selesaikan level sebelumnya dulu."),
        step("Baca tab Quest", "Ada cerita/konteks soal, Microlearning (materi singkat, wajib dibaca dulu), dan daftar tahapan (pill) seperti \"1. ...\", \"2. ...\", dst. Klik salah satu tahapan untuk mengerjakannya."),
        step("Buka tab Editor untuk tahapan bertipe SQL", "Tulis query MySQL Anda di editor (ada syntax highlight). Tahapan bertipe Quiz/Reflect dijawab langsung di tab Quest, tidak perlu Editor."),
        step("Tekan Run untuk mencoba", "Run hanya menjalankan query dan menampilkan hasilnya di tab Result — TIDAK dinilai, boleh dicoba berkali-kali sepuasnya."),
        step("Tekan Submit kalau sudah yakin", "Submit BARU dinilai oleh sistem (auto-grading) dan tercatat sebagai bukti pengerjaan (evidence). Kalau lolos, Anda dapat XP dan lanjut ke tahapan berikutnya."),
        step("Kalau belum lolos", "Baca pesan feedback di tab Result, buka Hint kalau tersedia (tombol \"Tampilkan Hint Berikutnya\" di tab Quest), lalu perbaiki query dan Submit lagi. Tidak ada batas percobaan."),
        step("Selesaikan seluruh tahapan level", "Setelah semua tahapan bernilai (Mini Quest, Challenge) lolos dengan mastery ≥ 80%, level otomatis Completed — Anda dapat badge dan level berikutnya terbuka."),
      ]),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Bagian-Bagian Layar Quest"),
      el("div", { class: "info-table-wrap" }, [
        el("table", { class: "info-table" }, [
          el("tbody", {}, [
            el("tr", {}, [el("td", {}, "📜 Quest"), el("td", {}, "Cerita/konteks soal, materi Microlearning, dan daftar tahapan yang harus dikerjakan.")]),
            el("tr", {}, [el("td", {}, "⌨️ Editor"), el("td", {}, "Tempat menulis query SQL untuk tahapan yang sedang aktif, lengkap dengan tombol Run / Submit.")]),
            el("tr", {}, [el("td", {}, "🗂️ Schema"), el("td", {}, "Struktur tabel yang tersedia (nama kolom, tipe data, PK/FK) beserta contoh datanya — buka ini kalau lupa nama kolom/tabel.")]),
            el("tr", {}, [el("td", {}, "📊 Result"), el("td", {}, "Hasil eksekusi query terakhir (tabel data, pesan error, atau feedback penilaian setelah Submit).")]),
          ]),
        ]),
      ]),
      el("p", { style: "margin:10px 0 0;" }, "Di HP, keempat bagian ini muncul sebagai tab yang bisa digeser/ditekan bergantian, dengan tombol Run/Submit selalu menempel di bawah layar. Di laptop/desktop, keempatnya tampil bersamaan dalam satu layar."),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Run vs Submit — Perbedaan Penting"),
      el("div", { class: "info-table-wrap" }, [
        el("table", { class: "info-table" }, [
          el("thead", {}, [el("tr", {}, [el("th", {}, ""), el("th", {}, "▶ Run"), el("th", {}, "✓ Submit")])]),
          el("tbody", {}, [
            el("tr", {}, [el("td", {}, "Tujuan"), el("td", {}, "Coba-coba / debugging"), el("td", {}, "Penilaian resmi")]),
            el("tr", {}, [el("td", {}, "Dinilai?"), el("td", {}, "Tidak"), el("td", {}, "Ya, sesuai kriteria quest")]),
            el("tr", {}, [el("td", {}, "Boleh berkali-kali?"), el("td", {}, "Ya, sepuasnya"), el("td", {}, "Ya, tidak ada batas percobaan")]),
            el("tr", {}, [el("td", {}, "Tersimpan sebagai bukti?"), el("td", {}, "Tidak"), el("td", {}, "Ya, kalau lolos (masuk Portfolio)")]),
          ]),
        ]),
      ]),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "XP, Badge, Rank vs Mastery"),
      el("p", { style: "margin:0 0 8px;" }, [el("b", {}, "XP, Badge, dan Rank"), " mengukur semangat bermain (engagement) — bukan nilai akademik."]),
      el("p", { style: "margin:0;" }, [el("b", {}, "Mastery"), " (persen di tiap level, dan rata-ratanya per CPMK di halaman Progress) itulah yang mencerminkan penguasaan kompetensi Anda. Level dianggap selesai kalau mastery ≥ 80%."]),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Hal Lain yang Perlu Diketahui"),
      el("ul", { style: "margin:0;padding-left:18px;font-size:13.5px;color:var(--text-dim);line-height:1.7;" }, [
        el("li", {}, [el("b", { style: "color:var(--text);" }, "Reset Sandbox"), " — kalau data di level tersebut jadi berantakan gara-gara latihan INSERT/UPDATE/DELETE/DROP, tombol ini mengembalikan data ke kondisi awal level tanpa menghapus progress/nilai Anda."]),
        el("li", {}, [el("b", { style: "color:var(--text);" }, "Kode Anda tersimpan otomatis"), " — draft query di Editor tersimpan sendiri, aman kalau berpindah tab atau menutup halaman sebentar."]),
        el("li", {}, [el("b", { style: "color:var(--text);" }, "Progress tersimpan di perangkat/browser ini saja"), " (belum ada akun login sungguhan). Kalau ganti HP/laptop/browser, atau membuka mode Incognito/Private, progress akan mulai dari awal lagi."]),
        el("li", {}, [el("b", { style: "color:var(--text);" }, "SQL Playground"), " — menu bebas latihan tanpa quest/penilaian, memakai seluruh data kampus, cocok untuk eksplorasi bebas."]),
      ]),
    ]),

    el("div", { class: "card", style: "margin-top:12px;" }, [
      el("div", { class: "section-title" }, "Pertanyaan yang Sering Muncul"),
      faq("Kenapa Submit saya gagal padahal hasilnya terlihat benar?", "Beberapa quest mewajibkan penggunaan konstruksi SQL tertentu (misalnya wajib pakai JOIN atau GROUP BY) — lihat label \"wajib: ...\" di bawah instruksi. Kalau query Anda tidak memakainya walau hasilnya kebetulan benar, Submit tetap dianggap belum lolos. Urutan/nama kolom hasil juga harus sesuai yang diminta soal."),
      faq("Saya lupa nama tabel atau kolom, harus lihat di mana?", "Buka tab/panel Schema — semua tabel yang tersedia untuk level itu beserta kolom dan contoh isinya ditampilkan di sana."),
      faq("Data di sandbox saya rusak setelah saya coba DELETE/DROP TABLE, gimana?", "Tekan tombol \"🗄 Reset Sandbox\" di tab Editor. Ini hanya mengembalikan data level tersebut, nilai/progress Anda tidak ikut hilang."),
      faq("Kenapa level berikutnya masih terkunci?", "Level terbuka berurutan — selesaikan level saat ini sampai mastery ≥ 80% dulu (semua tahapan Mini Quest & Challenge harus Submit dan lolos)."),
      faq("Pakai hint apakah mengurangi nilai?", "Tidak mengurangi nilai kelulusan. Hanya saja beberapa quest memberi bonus XP tambahan kalau Anda lolos TANPA membuka hint sama sekali."),
      faq("Kalau saya ganti laptop, progress saya hilang?", "Ya, karena progress tersimpan lokal di browser tersebut, bukan di akun online. Gunakan perangkat/browser yang sama secara konsisten. Anda juga bisa mengekspor progress (JSON) dari halaman Progress sebagai cadangan/bukti ke dosen bila diperlukan."),
    ]),

    el("button", { class: "btn btn-primary btn-block", style: "margin-top:16px;", onclick: () => navigate("journey") }, "Mulai / Lanjutkan Bermain →"),
  ]);
}
