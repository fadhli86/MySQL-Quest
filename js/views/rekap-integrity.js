// Integrity pieces of the lecturer's Rekap Kelas: the per-student badge, the
// findings dialog, "verify all" (re-grading), and the similarity list.
// See js/integrity.js and js/verify-progress.js for what these checks mean —
// they flag things for the lecturer to look at; they are not proof.
import { el, openDialog } from "../ui.js";
import { verifySignature, checkXpConsistency, hasEvidence } from "../integrity.js";
import { replayVerify, timingFindings, findSimilar, integrityStatus } from "../verify-progress.js";
import { LEVELS } from "../levels.js";

// Computed once when a progress file is imported (signature needs the whole file).
export async function integrityOfFile(parsed) {
  const xp = checkXpConsistency(parsed);
  return { signature: await verifySignature(parsed), xpOk: xp.ok, xp: xp.xp, xpLogged: xp.logged, hasEvidence: hasEvidence(parsed) };
}

const BADGE_CLASS = { review: "bad", ok: "good", pending: "warn", legacy: "warn" };

export function integrityBadge(record) {
  const status = integrityStatus(record);
  return el("span", { class: `grade-pill ${BADGE_CLASS[status.code]}`, title: status.reasons.join(" ") || status.label, style: "white-space:nowrap;font-size:11.5px;" }, status.label);
}

const levelTitle = (id) => {
  const l = LEVELS.find((x) => x.id === id);
  return l ? `Lv.${l.id} ${l.title}` : `Lv.${id}`;
};

export function openIntegrityDetail(record) {
  const status = integrityStatus(record);
  const integ = record.integrity || {};
  const overlay = el("div", { class: "modal-overlay" });
  const closeBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Tutup");
  const rows = [];
  rows.push(["Tanda tangan file", { valid: "✔ Cocok", invalid: "✖ Tidak cocok", missing: "Tidak ada", unavailable: "Tidak dapat diperiksa" }[integ.signature] || "—"]);
  rows.push(["XP vs catatan XP", integ.xpOk === false ? `✖ XP ${integ.xp}, catatan ${integ.xpLogged}` : "✔ Sesuai"]);
  rows.push(["Bukti SQL di file", integ.hasEvidence ? "Ada" : "Tidak ada (file versi lama)"]);
  if (record.verify) {
    const s = record.verify.summary;
    rows.push(["Penilaian ulang", `${s.ok} lolos, ${s.fail} gagal, ${s.noEvidence} tanpa bukti (dari ${s.checked} tahap lulus)`]);
  } else {
    rows.push(["Penilaian ulang", "Belum dijalankan"]);
  }

  const box = el("div", { class: "modal-box modal-wide" }, [
    el("div", { class: "cheat-head" }, [el("h3", {}, `Integritas — ${record.studentName}`), closeBtn]),
    el("p", { style: "margin:6px 0 10px;font-weight:700;" }, status.label),
    el("table", { class: "report-table" }, [el("tbody", {}, rows.map(([k, v]) => el("tr", {}, [el("td", { style: "font-weight:700;" }, k), el("td", {}, v)])))]),
  ]);
  if (status.reasons.length) {
    box.appendChild(el("div", { class: "section-title", style: "margin-top:14px;" }, "Alasan ditandai"));
    box.appendChild(el("ul", { style: "margin:0;padding-left:20px;" }, status.reasons.map((r) => el("li", {}, r))));
  }
  const findings = (record.verify && record.verify.findings) || [];
  if (findings.length) {
    box.appendChild(el("div", { class: "section-title", style: "margin-top:14px;" }, "Tahap yang bermasalah"));
    box.appendChild(el("ul", { style: "margin:0;padding-left:20px;" }, findings.map((f) => el("li", {}, `${levelTitle(f.levelId)} — ${f.title}: ${f.message}`))));
  }
  const timing = (record.verify && record.verify.timing) || [];
  if (timing.length) {
    box.appendChild(el("div", { class: "section-title", style: "margin-top:14px;" }, "Catatan waktu (informasi saja)"));
    box.appendChild(el("ul", { style: "margin:0;padding-left:20px;" }, timing.map((t) => el("li", {}, `${levelTitle(t.levelId)} — ${t.title}: lulus hanya ${t.seconds} detik setelah tahap sebelumnya.`))));
  }
  box.appendChild(el("p", { class: "tag-note", style: "margin-top:14px;" }, "Penanda ini alat bantu untuk ditinjau, bukan bukti kecurangan: penilaian ulang dimulai dari data awal level, sedangkan sandbox mahasiswa juga menyimpan percobaan Run mereka."));

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  let close;
  const finish = () => close();
  close = openDialog(overlay, box, { onEscape: finish });
  closeBtn.addEventListener("click", finish);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(); });
}

// Re-grades every record. `onProgress(done, total, name)` lets the page show progress.
// Returns the updated records (caller persists them).
export async function verifyAll(records, onProgress) {
  const out = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    onProgress && onProgress(i, records.length, r.studentName);
    const { findings, summary } = await replayVerify(r.levels);
    out.push({ ...r, verify: { at: Date.now(), summary, findings, timing: timingFindings(r.levels) } });
  }
  onProgress && onProgress(records.length, records.length, "");
  return out;
}

export function similarityCard(records) {
  const groups = findSimilar(records);
  const card = el("div", { class: "card no-print", style: "margin-top:12px;" }, [el("div", { class: "section-title" }, "Jawaban Identik Antar Mahasiswa")]);
  if (!groups.length) {
    card.appendChild(el("div", { class: "empty-hint" }, "Tidak ada jawaban panjang (≥ 60 karakter) yang identik antar mahasiswa."));
    return card;
  }
  card.appendChild(el("p", { style: "margin:0 0 10px;font-size:12.5px;color:var(--text-dim);" }, "Jawaban yang sama persis (setelah huruf besar/kecil dan spasi diabaikan) pada tahap yang solusinya cukup panjang. Untuk soal dengan jawaban yang memang hampir tunggal ini wajar — anggap sebagai petunjuk untuk ditinjau."));
  for (const g of groups) {
    card.appendChild(
      el("div", { style: "margin-bottom:12px;" }, [
        el("div", { style: "font-weight:700;font-size:13px;" }, `${levelTitle(g.levelId)} — ${g.title}: ${[...new Set(g.students)].join(", ")}`),
        el("pre", { class: "code-block", style: "white-space:pre-wrap;margin-top:4px;" }, g.sql),
      ])
    );
  }
  return card;
}

// A card with the "verify all" button; `onDone(updatedRecords)` persists and re-renders.
export function verifyCard(records, onDone) {
  const status = el("div", { class: "tag-note", role: "status", "aria-live": "polite", style: "margin-top:8px;" });
  const btn = el("button", { class: "btn btn-primary btn-sm" }, "🔍 Verifikasi Ulang Semua");
  const pending = records.filter((r) => integrityStatus(r).code === "pending").length;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const updated = await verifyAll(records, (i, n, name) => { status.textContent = name ? `Menilai ulang ${i + 1} dari ${n}: ${name}…` : "Selesai."; });
      onDone(updated);
    } catch (e) {
      console.error(e);
      status.textContent = "Gagal memuat SQL sandbox (periksa koneksi ke CDN), lalu coba lagi.";
      btn.disabled = false;
    }
  });
  return el("div", { class: "card no-print", style: "margin-top:12px;" }, [
    el("div", { class: "section-title" }, "Integritas & Verifikasi"),
    el("p", { style: "margin:0 0 10px;font-size:12.5px;color:var(--text-dim);" }, "File Export yang baru menyimpan SQL yang meloloskan tiap tahap dan bertanda tangan. Tombol ini menjalankan ulang SQL itu dengan penilai yang sama untuk memastikan nilai yang tercatat benar-benar bisa dicapai. Ini alat bantu deteksi, bukan bukti mutlak: aplikasi tanpa server tidak bisa mencegah pemalsuan oleh orang yang membaca kode sumbernya."),
    el("div", {}, [btn, pending ? el("span", { class: "tag-note", style: "margin-left:10px;" }, `${pending} mahasiswa belum diverifikasi`) : null]),
    status,
  ]);
}

