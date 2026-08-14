import { getState } from "../state.js";
import { el, timeAgo, escapeHtml } from "../ui.js";

export async function renderPortfolio({ navigate }) {
  const s = getState();
  const items = [...s.portfolio].reverse();

  const list = items.length
    ? el("div", {}, items.map((it) =>
        el("div", { class: "portfolio-item" }, [
          el("div", { class: "pi-score" }, it.score === null ? "📝" : `${it.score}%`),
          el("div", { class: "pi-body" }, [
            el("div", { class: "pi-title" }, it.title),
            el("div", { class: "pi-meta" }, timeAgo(it.at)),
            it.sql ? el("pre", { class: "code-block" }, it.sql) : null,
            it.note ? el("p", { style: "margin:6px 0 0;font-size:12.5px;" }, it.note) : null,
          ]),
        ])
      ))
    : el("div", { class: "empty-state" }, [el("div", { class: "ic" }, "📁"), el("p", {}, "Belum ada evidence. Selesaikan Challenge/Boss Battle pertama Anda untuk mulai mengisi portfolio."), el("button", { class: "btn btn-primary", onclick: () => navigate("journey") }, "Mulai Journey")]);

  return el("div", { class: "page page-narrow" }, [
    el("h2", {}, "My Portfolio"),
    el("p", {}, "Kumpulan evidence pembelajaran: query challenge yang lolos, hasil boss battle, dan refleksi — dapat digunakan sebagai bukti capaian kompetensi (evidence OBE)."),
    el("div", { class: "card" }, [list]),
  ]);
}
