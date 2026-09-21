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
  // Cap the stack: XP toasts + feedback toasts arriving together used to
  // pile up over the header/tabs on small screens.
  while (root.children.length >= 2) root.firstElementChild.remove();
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let dialogCounter = 0;

// Turns an overlay + box into an accessible modal dialog: dialog semantics,
// focus moved inside and trapped (Tab / Shift+Tab cycle within the box),
// Escape support, and focus restored to the opener on close. Returns close().
// `onEscape` is optional; without it Escape does nothing (used for dialogs
// that require an answer).
export function openDialog(overlay, box, { onEscape = null, initialFocus = null } = {}) {
  const opener = document.activeElement;
  const heading = box.querySelector("h3, .celebrate-title");
  if (heading) {
    if (!heading.id) heading.id = `dialog-title-${++dialogCounter}`;
    box.setAttribute("aria-labelledby", heading.id);
  }
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");

  const onKey = (e) => {
    if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...box.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  };
  overlay.addEventListener("keydown", onKey);

  setTimeout(() => {
    const target = initialFocus || box.querySelector(FOCUSABLE);
    if (target) target.focus();
  }, 30);

  return function close() {
    overlay.removeEventListener("keydown", onKey);
    overlay.remove();
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
  };
}

export function confirmModal({ title, body, confirmLabel = "Ya", cancelLabel = "Batal", danger = false }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const box = el("div", { class: "modal-box" }, [
      el("h3", {}, title),
      el("p", {}, body),
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-ghost" }, cancelLabel),
        el("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}` }, confirmLabel),
      ]),
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    let close;
    const finish = (value) => { close(); resolve(value); };
    close = openDialog(overlay, box, { onEscape: () => finish(false) });
    box.querySelectorAll("button")[0].onclick = () => finish(false);
    box.querySelectorAll("button")[1].onclick = () => finish(true);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(false); });
  });
}

export function promptModal({ title, body, placeholder = "", defaultValue = "", maxLength = null }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const input = el("input", {
      type: "text", value: defaultValue, placeholder, "aria-label": title,
      maxlength: maxLength || null,
      style: "width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-size:16px;margin-top:10px;",
    });
    const box = el("div", { class: "modal-box" }, [
      el("h3", {}, title),
      el("p", {}, body),
      input,
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn btn-primary btn-block" }, "Lanjutkan"),
      ]),
    ]);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    let close;
    const finish = () => { close(); resolve(input.value.trim()); };
    close = openDialog(overlay, box, { initialFocus: input });
    box.querySelector("button").onclick = finish;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(); });
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
