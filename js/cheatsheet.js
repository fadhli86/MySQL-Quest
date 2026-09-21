// SQL cheat sheet, opened from the quest header and the playground.
//
// Content is generic syntax with placeholder names (tabel, kolom, ...) — it
// is a reference, not the answer to any quest, and deliberately goes no
// further than each level's own hints. `fromLevel` is the level that
// introduces a section; later sections are shown but marked so students know
// it is not needed yet. Where MySQL and the SQLite sandbox differ, the item
// says so (see also js/mysql-notes.js).
import { el, clear, openDialog } from "./ui.js";

export const CHEATSHEET = [
  {
    title: "SELECT dasar",
    fromLevel: 1,
    items: [
      { syntax: "SELECT * FROM tabel;", desc: "Tampilkan semua kolom dan baris." },
      { syntax: "SELECT kolom1, kolom2 FROM tabel;", desc: "Tampilkan hanya kolom tertentu." },
      { syntax: "SELECT DISTINCT kolom FROM tabel;", desc: "Buang baris hasil yang nilainya berulang." },
      { syntax: "SELECT kolom AS alias FROM tabel;", desc: "Beri nama lain pada kolom hasil." },
    ],
  },
  {
    title: "Membuat tabel (DDL)",
    fromLevel: 3,
    items: [
      { syntax: "CREATE TABLE tabel (\n  id INTEGER PRIMARY KEY,\n  nama TEXT NOT NULL,\n  nilai REAL\n);", desc: "Buat tabel. Sandbox memakai tipe SQLite (INTEGER, TEXT, REAL); MySQL memakai INT, VARCHAR(n), DECIMAL(p,s)." },
      { syntax: "FOREIGN KEY (kolom) REFERENCES tabel_induk(kolom_induk)", desc: "Hubungkan kolom ke primary key tabel lain (ditulis di dalam CREATE TABLE)." },
      { syntax: "ALTER TABLE tabel ADD COLUMN kolom TEXT;", desc: "Tambah kolom ke tabel yang sudah ada." },
      { syntax: "DROP TABLE tabel;", desc: "Hapus tabel beserta seluruh isinya — hati-hati." },
    ],
  },
  {
    title: "Mengubah data (DML)",
    fromLevel: 4,
    items: [
      { syntax: "INSERT INTO tabel (kolom1, kolom2) VALUES (nilai1, nilai2);", desc: "Tambah satu baris. Beberapa baris: pisahkan tanda kurung dengan koma." },
      { syntax: "UPDATE tabel SET kolom = nilai WHERE kondisi;", desc: "Ubah baris yang memenuhi kondisi. Tanpa WHERE, SEMUA baris berubah." },
      { syntax: "DELETE FROM tabel WHERE kondisi;", desc: "Hapus baris yang memenuhi kondisi. Tanpa WHERE, SEMUA baris terhapus." },
    ],
  },
  {
    title: "Menyaring & mengurutkan",
    fromLevel: 5,
    items: [
      { syntax: "WHERE kolom = 'teks' AND kolom2 > 10", desc: "Saring baris. Operator: =  <>  >  <  >=  <=  ; gabungkan dengan AND / OR / NOT. Teks diapit kutip tunggal." },
      { syntax: "WHERE kolom IN (a, b, c)", desc: "Cocok dengan salah satu nilai dalam daftar." },
      { syntax: "WHERE kolom BETWEEN 10 AND 20", desc: "Nilai dalam rentang (batas ikut dihitung)." },
      { syntax: "WHERE kolom LIKE 'A%'", desc: "Pencocokan pola: % = sembarang karakter, _ = satu karakter." },
      { syntax: "WHERE kolom IS NULL", desc: "Cek nilai kosong. Jangan pakai = NULL." },
      { syntax: "ORDER BY kolom DESC", desc: "Urutkan hasil. ASC = naik (bawaan), DESC = turun." },
      { syntax: "LIMIT 5", desc: "Batasi jumlah baris hasil (setelah pengurutan)." },
    ],
  },
  {
    title: "Agregat & pengelompokan",
    fromLevel: 6,
    items: [
      { syntax: "COUNT(*)  COUNT(kolom)  SUM(kolom)  AVG(kolom)  MIN(kolom)  MAX(kolom)", desc: "Fungsi agregat. COUNT(*) menghitung semua baris; COUNT(kolom) melewatkan NULL." },
      { syntax: "SELECT kolom, COUNT(*) FROM tabel GROUP BY kolom;", desc: "Kelompokkan baris, lalu hitung per kelompok. Kolom non-agregat di SELECT harus ada di GROUP BY." },
      { syntax: "GROUP BY kolom HAVING COUNT(*) > 2", desc: "Saring KELOMPOK setelah dihitung. WHERE menyaring baris sebelum dikelompokkan; HAVING sesudahnya." },
    ],
  },
  {
    title: "JOIN",
    fromLevel: 7,
    items: [
      { syntax: "FROM a JOIN b ON a.kolom = b.kolom", desc: "INNER JOIN: hanya baris yang punya pasangan di kedua tabel. Jangan lupa kondisi ON." },
      { syntax: "FROM a LEFT JOIN b ON a.kolom = b.kolom", desc: "Semua baris tabel kiri; kolom kanan bernilai NULL bila tidak ada pasangan." },
      { syntax: "FROM tabel_panjang AS t JOIN lain AS l ON ...", desc: "Alias tabel memperpendek penulisan: t.kolom, l.kolom." },
      { syntax: "FROM a JOIN b ON ... JOIN c ON ...", desc: "Gabungkan lebih dari dua tabel dengan menambah JOIN berurutan." },
    ],
  },
  {
    title: "Subquery",
    fromLevel: 8,
    items: [
      { syntax: "WHERE kolom > (SELECT AVG(kolom) FROM tabel)", desc: "Subquery yang menghasilkan SATU nilai bisa dibandingkan dengan > < =." },
      { syntax: "WHERE kolom IN (SELECT kolom FROM tabel2)", desc: "Subquery yang menghasilkan banyak nilai dipakai dengan IN." },
      { syntax: "WHERE kolom NOT IN (SELECT kolom FROM tabel2)", desc: "Awas: jika subquery berisi NULL, NOT IN tidak menghasilkan baris apa pun. Saring NULL di subquery atau pakai NOT EXISTS." },
    ],
  },
  {
    title: "Constraint",
    fromLevel: 9,
    items: [
      { syntax: "kolom TEXT NOT NULL", desc: "Kolom wajib diisi." },
      { syntax: "kolom TEXT UNIQUE", desc: "Nilai tidak boleh kembar antar baris." },
      { syntax: "kolom INTEGER DEFAULT 0", desc: "Nilai bawaan bila tidak diisi saat INSERT." },
      { syntax: "kolom INTEGER CHECK (kolom BETWEEN 1 AND 5)", desc: "Nilai harus memenuhi kondisi; jika tidak, INSERT/UPDATE ditolak." },
    ],
  },
  {
    title: "View & Index",
    fromLevel: 11,
    items: [
      { syntax: "CREATE VIEW nama_view AS\nSELECT ... FROM ...;", desc: "Simpan sebuah query sebagai tabel virtual; pakai seperti tabel: SELECT * FROM nama_view;" },
      { syntax: "CREATE INDEX nama_index ON tabel(kolom);", desc: "Percepat pencarian pada kolom, dengan biaya ruang dan INSERT/UPDATE yang sedikit lebih lambat." },
      { syntax: "EXPLAIN QUERY PLAN SELECT ...;", desc: "Lihat cara database menjalankan query (SQLite). Di MySQL cukup EXPLAIN SELECT ...;" },
    ],
  },
  {
    title: "Transaksi",
    fromLevel: 12,
    items: [
      { syntax: "BEGIN;\n...perintah...\nCOMMIT;", desc: "Kelompokkan beberapa perintah; COMMIT menyimpan semuanya. Di MySQL: START TRANSACTION; ... COMMIT;" },
      { syntax: "ROLLBACK;", desc: "Batalkan semua perubahan sejak BEGIN — semuanya atau tidak sama sekali." },
    ],
  },
  {
    title: "Trigger",
    fromLevel: 13,
    items: [
      { syntax: "CREATE TRIGGER nama\nBEFORE INSERT ON tabel\nWHEN kondisi\nBEGIN\n  SELECT RAISE(ABORT, 'pesan');\nEND;", desc: "Jalankan aksi otomatis saat data berubah (sintaks SQLite). NEW.kolom = nilai baris baru. MySQL memakai FOR EACH ROW dan SIGNAL." },
    ],
  },
];

function matches(query, section, item) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${section.title} ${item.syntax} ${item.desc}`.toLowerCase().includes(q);
}

// currentLevel: the level being played (0 for the free playground = everything relevant).
export function openCheatSheet({ currentLevel = 0 } = {}) {
  const overlay = el("div", { class: "modal-overlay" });
  const search = el("input", { type: "search", class: "cheat-search", placeholder: "Cari (mis. JOIN, LIKE)…", "aria-label": "Cari di cheat sheet" });
  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });
  const list = el("div", { class: "cheat-list" });
  const closeBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Tutup");
  const box = el("div", { class: "modal-box modal-wide" }, [
    el("div", { class: "cheat-head" }, [el("h3", {}, "📖 Cheat Sheet SQL"), closeBtn]),
    el("p", { class: "tag-note", style: "margin:4px 0 10px;" }, "Sintaks umum dengan nama contoh (tabel, kolom). Bagian yang belum dibahas di level Anda diberi label."),
    search,
    status,
    list,
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function render() {
    clear(list);
    let shown = 0;
    for (const section of CHEATSHEET) {
      const items = section.items.filter((it) => matches(search.value, section, it));
      if (!items.length) continue;
      shown += items.length;
      const later = currentLevel > 0 && section.fromLevel > currentLevel;
      list.appendChild(
        el("section", { class: `cheat-section${later ? " later" : ""}` }, [
          el("h4", {}, [section.title, later ? el("span", { class: "cheat-badge" }, `Level ${section.fromLevel}`) : null]),
          ...items.map((it) => el("div", { class: "cheat-item" }, [el("pre", { class: "code-block" }, it.syntax), el("p", {}, it.desc)])),
        ])
      );
    }
    if (!shown) list.appendChild(el("div", { class: "empty-hint" }, "Tidak ada yang cocok. Coba kata kunci lain."));
    status.textContent = `${shown} hasil`;
  }

  search.addEventListener("input", render);
  render();

  let close;
  const finish = () => close();
  close = openDialog(overlay, box, { onEscape: finish, initialFocus: search });
  closeBtn.addEventListener("click", finish);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(); });
}
