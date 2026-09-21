// Shared "Schema" panel body for the quest and playground screens: a title, a
// List | Diagram switch, and either the existing table list or the ER diagram.
// The chosen view is remembered per browser as a convenience only.
import { el, clear, openDialog } from "../ui.js";
import { buildErdModel, renderErd, focusTables } from "../erd.js";

const KEY = "mysqlquest_schema_view"; // "list" | "erd"

function readMode() {
  try {
    return localStorage.getItem(KEY) === "erd" ? "erd" : "list";
  } catch (e) {
    return "list";
  }
}

function writeMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch (e) {
    /* private mode etc. — the choice just isn't remembered */
  }
}

// The side panel is narrow, so the diagram can be opened in a near-full-screen dialog.
function openLargeDiagram(model) {
  const overlay = el("div", { class: "modal-overlay" });
  const closeBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Tutup");
  const box = el("div", { class: "modal-box modal-full" }, [
    el("div", { class: "cheat-head" }, [el("h3", {}, "🔗 Diagram ERD"), closeBtn]),
    el("div", { class: "table-scroll erd-scroll" }, renderErd(model)),
    el("p", { class: "tag-note" }, "Klik atau tekan Enter pada tabel untuk menyorot relasinya. “1” = satu, “N” = banyak."),
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  let close;
  const finish = () => close();
  close = openDialog(overlay, box, { onEscape: finish });
  closeBtn.addEventListener("click", finish);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(); });
}

// panel: the container to fill (cleared first)
// renderList(): returns a Node with the table list
// getErdSchema(): returns the tables for the diagram (see Sandbox.getErdSchema)
export function mountSchemaPanel(panel, { title, renderList, getErdSchema }) {
  clear(panel);
  let mode = readMode();
  let focus = ""; // "" = every table; otherwise a table name (its neighbours only)
  const body = el("div", {});
  const listBtn = el("button", { class: "seg-btn" }, "📋 Daftar");
  const erdBtn = el("button", { class: "seg-btn" }, "🔗 Diagram");

  function draw() {
    listBtn.classList.toggle("active", mode === "list");
    erdBtn.classList.toggle("active", mode === "erd");
    listBtn.setAttribute("aria-pressed", String(mode === "list"));
    erdBtn.setAttribute("aria-pressed", String(mode === "erd"));
    clear(body);
    if (mode === "list") {
      body.appendChild(renderList());
      return;
    }
    const allTables = getErdSchema();
    if (!allTables.length) {
      body.appendChild(el("div", { class: "empty-hint" }, "Belum ada tabel untuk digambar."));
      return;
    }
    if (focus && !allTables.some((t) => t.name === focus)) focus = "";
    const tables = focus ? focusTables(allTables, focus) : allTables;
    const model = buildErdModel(tables);
    const select = el("select", { class: "erd-focus", "aria-label": "Tabel yang difokuskan" }, [
      el("option", { value: "" }, "Semua tabel"),
      ...allTables.map((t) => el("option", { value: t.name }, `Fokus: ${t.name}`)),
    ]);
    select.value = focus;
    select.addEventListener("change", () => { focus = select.value; draw(); });
    body.appendChild(
      el("div", { class: "erd-toolbar" }, [
        allTables.length > 2 ? select : null,
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => openLargeDiagram(buildErdModel(allTables)) }, "⛶ Perbesar diagram"),
      ])
    );
    body.appendChild(el("div", { class: "table-scroll erd-scroll" }, renderErd(model)));
    const hasInferred = model.edges.some((e) => e.inferred);
    body.appendChild(
      el("p", { class: "tag-note" }, [
        "Garis menghubungkan foreign key (FK) ke primary key (PK); “1” berarti satu, “N” berarti banyak. ",
        hasInferred ? "Garis putus-putus = relasi diperkirakan dari nama kolom (belum dideklarasikan sebagai FOREIGN KEY). " : "",
        "Klik atau tekan Enter pada tabel untuk menyorot relasinya. Geser ke samping bila diagram lebih lebar dari layar, atau pilih “Fokus” untuk melihat satu tabel beserta tetangganya.",
      ])
    );
  }

  listBtn.addEventListener("click", () => { mode = "list"; writeMode(mode); draw(); });
  erdBtn.addEventListener("click", () => { mode = "erd"; writeMode(mode); draw(); });

  panel.append(
    el("div", { class: "schema-head" }, [
      el("div", { class: "section-title", style: "margin:0;" }, title),
      el("div", { class: "seg", role: "group", "aria-label": "Tampilan schema" }, [listBtn, erdBtn]),
    ]),
    body
  );
  draw();
}
