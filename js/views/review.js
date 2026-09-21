// Review Konsep: re-asks concept quizzes the student got wrong (or struggled
// around), on a spaced schedule — see js/review.js for the scheduling rules.
import { getState, getReviewSummary, getReviewItems, answerReview, REVIEW_XP } from "../state.js";
import { gradeQuizStage } from "../grader.js";
import { shuffledOptionOrder } from "../quiz-utils.js";
import { DAY_MS } from "../review.js";
import { el, clear, showXpToast } from "../ui.js";

const SESSION_SIZE = 5;

function fmtDue(ts) {
  const days = Math.ceil((ts - Date.now()) / DAY_MS);
  if (days <= 1) return "besok atau lebih cepat";
  return `sekitar ${days} hari lagi`;
}

export async function renderReview({ navigate }) {
  const body = el("div", {});
  const page = el("div", { class: "page" }, [
    el("div", { class: "card" }, [
      el("div", { class: "section-title" }, "🔁 Review Konsep"),
      el("p", { style: "margin:0;color:var(--text-dim);font-size:13.5px;" }, "Soal konsep yang sebelumnya Anda jawab salah, atau berasal dari level yang terasa sulit, diulang dengan jeda bertahap (1, 3, lalu 7 hari). Tiga kali benar berturut-turut = konsep dianggap dikuasai."),
    ]),
    el("div", { style: "margin-top:14px;" }, body),
  ]);

  function showHome() {
    clear(body);
    const sum = getReviewSummary();
    const due = getReviewItems();
    const card = el("div", { class: "card" });
    if (due.length) {
      card.append(
        el("div", { class: "section-title" }, `${due.length} soal siap diulang`),
        el("p", { style: "margin:0 0 10px;color:var(--text-dim);font-size:13.5px;" }, `Satu sesi berisi maksimal ${SESSION_SIZE} soal. Jawaban benar memberi ${REVIEW_XP} XP.`),
        el("button", { class: "btn btn-primary btn-block", onclick: () => startSession(due.slice(0, SESSION_SIZE), false) }, "Mulai Review ▶")
      );
    } else if (sum.active > 0) {
      card.append(
        el("div", { class: "section-title" }, "Belum ada yang jatuh tempo"),
        el("p", { style: "margin:0 0 10px;color:var(--text-dim);font-size:13.5px;" }, `Soal berikutnya siap ${fmtDue(sum.nextDueAt)}. Anda tetap bisa berlatih sekarang — sesi latihan tidak mengubah jadwal dan tidak memberi XP.`),
        el("button", { class: "btn btn-ghost btn-block", onclick: () => startSession(getReviewItems({ all: true }).slice(0, SESSION_SIZE), true) }, "Latihan Sekarang")
      );
    } else {
      card.append(
        el("div", { class: "empty-state" }, [
          el("div", { class: "ic" }, sum.retired ? "🏆" : "🌱"),
          el("p", {}, sum.retired ? "Semua soal review sudah Anda kuasai. Kerja bagus!" : "Belum ada soal untuk diulang. Soal muncul di sini otomatis ketika Anda salah menjawab kuis konsep atau kesulitan di sebuah level."),
        ]),
        el("button", { class: "btn btn-ghost btn-block", onclick: () => navigate("journey") }, "Ke Journey →")
      );
    }
    if (sum.retired && sum.active > 0) card.appendChild(el("div", { class: "tag-note", style: "margin-top:10px;" }, `✅ ${sum.retired} konsep sudah dikuasai`));
    body.appendChild(card);
  }

  function startSession(items, practice) {
    if (!items.length) return showHome();
    ask({ items, index: 0, practice, correct: 0, xp: 0 });
  }

  function ask(session) {
    clear(body);
    const { key, level, stage } = session.items[session.index];
    const card = el("div", { class: "card" }, [
      el("div", { class: "tag-note" }, `Soal ${session.index + 1} dari ${session.items.length}${session.practice ? " • mode latihan" : ""} • Lv.${level.id} ${level.title}`),
      stage.code ? el("pre", { class: "code-block", style: "margin:10px 0 0;" }, stage.code) : null,
      el("div", { class: "quiz-question", style: "margin:10px 0;font-weight:700;" }, stage.question),
    ]);
    const opts = el("div", { class: "quiz-opts" });
    const feedback = el("div", { role: "status", "aria-live": "polite" });
    const seed = `${key}:${getState().studentName}:${Math.floor(Date.now() / DAY_MS)}`;
    const order = shuffledOptionOrder(stage.options.length, seed);

    function draw(chosen) {
      clear(opts);
      order.forEach((i) => {
        const btn = el("button", { class: "quiz-opt", disabled: chosen !== undefined }, stage.options[i]);
        if (chosen !== undefined) {
          if (i === stage.correctIndex) {
            btn.classList.add("correct");
            btn.appendChild(el("span", { class: "sr-only" }, " (jawaban benar)"));
          } else if (i === chosen) {
            btn.classList.add("wrong");
            btn.appendChild(el("span", { class: "sr-only" }, " (jawaban Anda, salah)"));
          }
        }
        btn.addEventListener("click", () => onAnswer(i));
        opts.appendChild(btn);
      });
    }

    function onAnswer(i) {
      const result = gradeQuizStage(stage, i);
      const r = answerReview(key, result.passed, { practice: session.practice });
      if (result.passed) session.correct += 1;
      if (r.xp) {
        session.xp += r.xp;
        showXpToast(r.xp, "Review konsep");
      }
      draw(i);
      const isLast = session.index === session.items.length - 1;
      const box = el("div", { class: `feedback-box ${result.passed ? "pass" : "fail"}`, style: "margin-top:10px;" }, [
        el("div", { class: "fb-title" }, result.passed ? "✅ Benar" : "❌ Belum Tepat"),
        el("p", { style: "margin:0;" }, result.message),
      ]);
      if (!result.passed) box.appendChild(el("p", { style: "margin:8px 0 0;" }, [el("b", {}, "Jawaban benar: "), stage.options[stage.correctIndex], ". ", stage.explainCorrect || ""]));
      if (!session.practice && result.passed && r.retired) box.appendChild(el("p", { style: "margin:8px 0 0;font-weight:700;" }, "🏆 Konsep ini sekarang Anda kuasai!"));
      box.appendChild(
        el("button", { class: "btn btn-submit btn-sm", style: "margin-top:10px;", onclick: () => (isLast ? done(session) : ask({ ...session, index: session.index + 1 })) }, isLast ? "Selesai" : "Soal Berikutnya →")
      );
      clear(feedback);
      feedback.appendChild(box);
    }

    draw(undefined);
    card.append(opts, feedback);
    body.appendChild(card);
  }

  function done(session) {
    clear(body);
    const sum = getReviewSummary();
    body.appendChild(
      el("div", { class: "card" }, [
        el("div", { class: "section-title" }, "Sesi selesai"),
        el("p", { style: "margin:0 0 6px;font-size:15px;font-weight:700;" }, `${session.correct} dari ${session.items.length} soal benar${session.xp ? ` • +${session.xp} XP` : ""}`),
        el("p", { style: "margin:0 0 12px;color:var(--text-dim);font-size:13.5px;" }, sum.due ? `Masih ada ${sum.due} soal yang jatuh tempo.` : sum.nextDueAt ? `Soal berikutnya siap ${fmtDue(sum.nextDueAt)}.` : "Tidak ada soal yang tersisa."),
        el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;" }, [
          sum.due ? el("button", { class: "btn btn-primary", onclick: showHome }, "Lanjut Review") : null,
          el("button", { class: "btn btn-ghost", onclick: () => navigate("dashboard") }, "Kembali ke Home"),
        ]),
      ])
    );
  }

  showHome();
  return page;
}
