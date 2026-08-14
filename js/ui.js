// Small DOM + UI helpers shared across views: element builder, toast,
// modal (confirm / prompt).

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
export function toast(message, type = "") {
  const root = document.getElementById("toast-root");
  const t = el("div", { class: `toast ${type}` }, message);
  root.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

export function showXpToast(amount, reason) {
  if (!amount) return;
  toast(`+${amount} XP — ${reason}`, "xp");
}

export function confirmModal({ title, body, confirmLabel = "Ya", cancelLabel = "Batal", danger = false }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const box = el("div", { class: "modal-box" }, [
      el("h3", {}, title),
      el("p", {}, body),
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost", onclick: () => { overlay.remove(); resolve(false); } }, cancelLabel),
        el("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}`, onclick: () => { overlay.remove(); resolve(true); } }, confirmLabel),
      ]),
    ]);
    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    document.body.appendChild(overlay);
  });
}

export function promptModal({ title, body, placeholder = "", defaultValue = "" }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const input = el("input", {
      type: "text", value: defaultValue, placeholder,
      style: "width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-size:15px;margin-top:10px;",
    });
    const box = el("div", { class: "modal-box" }, [
      el("h3", {}, title),
      el("p", {}, body),
      input,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-primary btn-block", onclick: () => { overlay.remove(); resolve(input.value.trim()); } }, "Lanjutkan"),
      ]),
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 50);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { overlay.remove(); resolve(input.value.trim()); } });
  });
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function fmtNum(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function timeAgo(ts) {
  if (!ts) return "-";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
