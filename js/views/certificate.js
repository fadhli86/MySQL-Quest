import { getState, isCourseComplete, getCompletionStats, setStudentName } from "../state.js";
import { LEVELS } from "../levels.js";
import { el, promptModal, toast } from "../ui.js";
import { ensureCertificateFonts, drawCertificate, downloadCanvasAsPng, makeCertId, LECTURER_NAME, LECTURER_ROLE } from "../certificate.js";

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export async function renderCertificate({ navigate }) {
  const s = getState();
  const complete = isCourseComplete();

  if (!complete) {
    const stats = getCompletionStats();
    const remaining = LEVELS.filter((lv) => s.levels[lv.id].status !== "completed");
    return el("div", { class: "page page-narrow" }, [
      el("h2", {}, "🎓 Sertifikat Kelulusan"),
      el("div", { class: "empty-state" }, [
        el("div", { class: "ic" }, "🔒"),
        el("p", {}, `Sertifikat terbuka setelah seluruh ${stats.total} level selesai (mastery ≥ 80%). Saat ini: ${stats.completedCount}/${stats.total} level selesai.`),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "section-title" }, "Course Progress"),
        el("div", { class: "progress-track" }, [el("div", { class: "progress-fill good", style: `width:${Math.round((stats.completedCount / stats.total) * 100)}%` })]),
        el("div", { style: "margin-top:10px;font-size:12.5px;color:var(--text-dim);" }, remaining.length ? `Level tersisa: ${remaining.map((l) => `Lv.${l.id} ${l.title}`).join(", ")}` : ""),
      ]),
      el("button", { class: "btn btn-primary btn-block", style: "margin-top:14px;", onclick: () => navigate("journey") }, "Lanjutkan Journey →"),
    ]);
  }

  const stats = getCompletionStats();
  const certId = makeCertId(s.studentName || "Junior Engineer", stats.completedAt);

  const greeting = el("p", {}, `Selamat, ${s.studentName || "Junior Engineer"}! Anda telah menyelesaikan seluruh perjalanan MYSQL QUEST. Sertifikat di bawah ditandatangani oleh ${LECTURER_NAME} (${LECTURER_ROLE}).`);

  const page = el("div", { class: "page page-narrow" }, [el("h2", {}, "🎓 Sertifikat Kelulusan"), greeting]);

  const canvasWrap = el("div", { style: "border-radius:14px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border-soft);" });
  const canvas = el("canvas", { style: "display:block;width:100%;height:auto;" });
  canvasWrap.appendChild(canvas);
  page.appendChild(canvasWrap);

  const actions = el("div", { class: "stat-row", style: "margin-top:14px;" }, [
    el("button", { class: "btn btn-primary btn-block" }, "⬇ Unduh Sertifikat (PNG)"),
    el("button", { class: "btn btn-block" }, "✏️ Ubah Nama pada Sertifikat"),
  ]);
  page.appendChild(actions);

  page.appendChild(
    el("div", { class: "tag-note", style: "margin-top:14px;" }, "Sertifikat ini digenerate otomatis oleh sistem berdasarkan progres pembelajaran yang tersimpan di browser/perangkat ini — bukan dokumen resmi terverifikasi kampus. Simpan file PNG hasil unduhan sebagai bukti/portofolio Anda.")
  );

  async function render() {
    greeting.textContent = `Selamat, ${s.studentName || "Junior Engineer"}! Anda telah menyelesaikan seluruh perjalanan MYSQL QUEST. Sertifikat di bawah ditandatangani oleh ${LECTURER_NAME} (${LECTURER_ROLE}).`;
    await ensureFontsAndDraw();
  }

  async function ensureFontsAndDraw() {
    ensureCertificateFonts();
    await drawCertificate(canvas, {
      studentName: s.studentName || "Junior Engineer",
      completedDateStr: fmtDate(stats.completedAt),
      avgMastery: stats.avgMastery,
      xp: stats.xp,
      badgeCount: stats.badgeCount,
      completedCount: stats.completedCount,
      total: stats.total,
      certId,
    });
  }

  const [downloadBtn, editNameBtn] = actions.children;
  downloadBtn.addEventListener("click", () => {
    downloadCanvasAsPng(canvas, `Sertifikat-MYSQLQUEST-${(s.studentName || "peserta").replace(/\s+/g, "_")}.png`);
    toast("Sertifikat berhasil diunduh.");
  });
  editNameBtn.addEventListener("click", async () => {
    const name = await promptModal({
      title: "Ubah Nama pada Sertifikat",
      body: "Nama ini juga dipakai di seluruh tampilan game (bukan hanya sertifikat). Pastikan penulisan sudah sesuai untuk dicantumkan pada sertifikat.",
      placeholder: "Nama lengkap Anda",
      defaultValue: s.studentName || "",
    });
    if (name && name.trim()) {
      setStudentName(name.trim());
      s.studentName = name.trim();
      render();
    }
  });

  render();

  return page;
}
