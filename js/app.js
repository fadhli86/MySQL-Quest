import { getState, subscribe, getRank, setStudentName, isPersistBroken } from "./state.js";
import { el, clear, promptModal, toast } from "./ui.js";
import { initTheme, toggleTheme, currentEffectiveTheme } from "./theme.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderJourney } from "./views/journey.js";
import { renderQuest } from "./views/quest.js";
import { renderAchievements } from "./views/achievements.js";
import { renderPortfolio } from "./views/portfolio.js";
import { renderProgress } from "./views/progress.js";
import { renderPlayground } from "./views/playground.js";
import { renderHelp } from "./views/help.js";
import { renderCertificate } from "./views/certificate.js";

const NAV_ITEMS = [
  { route: "dashboard", icon: "🏠", label: "Home" },
  { route: "journey", icon: "🗺️", label: "Journey" },
  { route: "playground", icon: "⌨️", label: "Play" },
  { route: "progress", icon: "📈", label: "Progress" },
  { route: "achievements", icon: "🏅", label: "More", extraRoutes: ["achievements", "portfolio", "certificate"] },
];

const app = document.getElementById("app");

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", param: parts[1] || null };
}

function navigate(route, param) {
  location.hash = param ? `#/${route}/${param}` : `#/${route}`;
}
window.mqNavigate = navigate;

function buildShell() {
  clear(app);

  const topbar = el("div", { class: "topbar", id: "topbar" });
  const shell = el("div", { class: "shell" });
  const sidebar = el("div", { class: "sidebar", id: "sidebar" });
  const content = el("div", { class: "content", id: "content" });
  shell.appendChild(sidebar);
  shell.appendChild(content);
  const bottomNav = el("div", { class: "bottom-nav", id: "bottom-nav" });

  const helpFab = el("button", { class: "help-fab", title: "Panduan Bermain", onclick: () => navigate("help") }, "❓");
  const themeFab = el("button", { class: "theme-fab", title: "Ganti Tema Terang/Gelap", onclick: onToggleTheme }, "🌙");

  app.appendChild(topbar);
  app.appendChild(shell);
  app.appendChild(bottomNav);
  app.appendChild(helpFab);
  app.appendChild(themeFab);

  return { topbar, sidebar, content, bottomNav, helpFab, themeFab };
}

function themeIcon(effectiveTheme) {
  return effectiveTheme === "dark" ? "☀️" : "🌙";
}

function updateThemeButtons() {
  const icon = themeIcon(currentEffectiveTheme());
  if (refs.themeFab) refs.themeFab.textContent = icon;
  const topbarBtn = document.getElementById("topbar-theme-btn");
  if (topbarBtn) topbarBtn.textContent = icon;
  const sidebarBtn = document.getElementById("sidebar-theme-btn");
  if (sidebarBtn) sidebarBtn.querySelector(".ic").textContent = icon;
}

function onToggleTheme() {
  toggleTheme();
  updateThemeButtons();
}

const refs = buildShell();
let lastRenderedXp = null;

function renderTopbar(activeRoute) {
  clear(refs.topbar);
  const s = getState();
  const rank = getRank(s.xp);
  const isQuest = activeRoute === "quest";
  refs.topbar.classList.toggle("force-hide", isQuest);
  if (isQuest) return;

  const xpWentUp = lastRenderedXp !== null && s.xp > lastRenderedXp;
  lastRenderedXp = s.xp;

  refs.topbar.appendChild(
    el("div", { class: "brand" }, [el("span", { class: "logo" }, "🗄️"), "MYSQL QUEST"])
  );
  refs.topbar.appendChild(el("div", { class: "spacer" }));
  refs.topbar.appendChild(el("div", { class: "rank-pill" }, rank.name));
  refs.topbar.appendChild(el("div", { class: `xp-pill${xpWentUp ? " bump" : ""}` }, [el("span", { class: "dot" }, "★"), `${s.xp} XP`]));
  refs.topbar.appendChild(
    el("button", { class: "btn btn-icon btn-ghost btn-sm", id: "topbar-theme-btn", title: "Ganti Tema Terang/Gelap", onclick: onToggleTheme }, themeIcon(currentEffectiveTheme()))
  );
  refs.topbar.appendChild(el("button", { class: "btn btn-icon btn-ghost btn-sm", title: "Panduan Bermain", onclick: () => navigate("help") }, "❓"));
}

function renderSidebar(activeRoute) {
  clear(refs.sidebar);
  for (const item of NAV_ITEMS) {
    const isActive = (item.extraRoutes || [item.route]).includes(activeRoute);
    refs.sidebar.appendChild(
      el("button", { class: `nav-item${isActive ? " active" : ""}`, onclick: () => navigate(item.route) }, [
        el("span", { class: "ic" }, item.icon),
        item.label === "More" ? "Achievement" : item.label,
      ])
    );
  }
  refs.sidebar.appendChild(el("div", { style: "flex:1" }));
  refs.sidebar.appendChild(
    el("button", { class: "nav-item", onclick: () => navigate("portfolio") }, [el("span", { class: "ic" }, "📁"), "Portfolio"])
  );
  refs.sidebar.appendChild(
    el("button", { class: `nav-item${activeRoute === "certificate" ? " active" : ""}`, onclick: () => navigate("certificate") }, [el("span", { class: "ic" }, "🎓"), "Sertifikat"])
  );
  refs.sidebar.appendChild(
    el("button", { class: `nav-item${activeRoute === "help" ? " active" : ""}`, onclick: () => navigate("help") }, [el("span", { class: "ic" }, "❓"), "Panduan"])
  );
  refs.sidebar.appendChild(
    el("button", { class: "nav-item", id: "sidebar-theme-btn", onclick: onToggleTheme }, [
      el("span", { class: "ic" }, themeIcon(currentEffectiveTheme())),
      "Tema",
    ])
  );
}

function renderBottomNav(activeRoute) {
  clear(refs.bottomNav);
  const isQuest = activeRoute === "quest";
  refs.bottomNav.classList.toggle("force-hide", isQuest);
  if (isQuest) return;
  for (const item of NAV_ITEMS) {
    const isActive = (item.extraRoutes || [item.route]).includes(activeRoute);
    refs.bottomNav.appendChild(
      el("button", { class: `nav-item${isActive ? " active" : ""}`, onclick: () => navigate(item.route) }, [
        el("span", { class: "ic" }, item.icon),
        el("span", {}, item.label),
      ])
    );
  }
}

function renderLoadingState() {
  return el("div", { class: "page" }, [
    el("div", { class: "empty-state" }, [el("div", { class: "spinner" }), el("p", {}, "Memuat...")]),
  ]);
}

// CDN/network failures (sql.js, CodeMirror, ...) and timeouts surface here
// with a message a student can act on; anything else falls back to a
// generic "coba lagi" so a bug in one view never leaves a blank page.
function errorMessageFor(err) {
  const msg = String((err && err.message) || err || "");
  if (/sql\.js|initSqlJs|sql-wasm|timeout|waktu memuat/i.test(msg)) {
    return "Gagal memuat komponen SQL Sandbox. Ini biasanya karena koneksi internet lambat/terputus, atau jaringan (mis. WiFi kampus) memblokir akses ke CDN. Periksa koneksi Anda, lalu coba lagi.";
  }
  if (/failed to fetch|networkerror|net::/i.test(msg)) {
    return "Gagal memuat data — periksa koneksi internet Anda, lalu coba lagi.";
  }
  return "Terjadi kendala tak terduga saat memuat halaman ini. Coba lagi — jika masih gagal, muat ulang (refresh) browser.";
}

function renderErrorState(err, onRetry) {
  console.error("Render error:", err);
  return el("div", { class: "page page-narrow" }, [
    el("div", { class: "empty-state" }, [
      el("div", { class: "ic" }, "⚠️"),
      el("h3", {}, "Terjadi Kendala"),
      el("p", {}, errorMessageFor(err)),
      el("button", { class: "btn btn-primary", onclick: onRetry }, "🔄 Coba Lagi"),
    ]),
  ]);
}

async function renderRoute() {
  const { route, param } = parseHash();
  renderTopbar(route);
  renderSidebar(route);
  renderBottomNav(route);
  refs.helpFab.classList.toggle("force-hide", route === "help");

  clear(refs.content);
  refs.content.classList.toggle("no-bottom-pad", route === "quest");
  refs.content.scrollTop = 0;
  window.scrollTo(0, 0);
  refs.content.style.padding = "";
  refs.content.appendChild(renderLoadingState());

  const mount = (node) => {
    clear(refs.content);
    node.classList.add("page-enter");
    refs.content.appendChild(node);
  };

  try {
    switch (route) {
      case "journey":
        mount(await renderJourney({ navigate }));
        break;
      case "quest":
        refs.content.style.padding = "0";
        mount(await renderQuest({ navigate, levelId: Number(param) }));
        break;
      case "achievements":
        mount(await renderAchievements({ navigate }));
        break;
      case "portfolio":
        mount(await renderPortfolio({ navigate }));
        break;
      case "progress":
        mount(await renderProgress({ navigate }));
        break;
      case "playground":
        refs.content.style.padding = "0";
        mount(await renderPlayground({ navigate }));
        break;
      case "help":
        mount(await renderHelp({ navigate }));
        break;
      case "certificate":
        mount(await renderCertificate({ navigate }));
        break;
      case "dashboard":
      default:
        mount(await renderDashboard({ navigate }));
        break;
    }
    if (route !== "quest" && route !== "playground") refs.content.style.padding = "";
  } catch (err) {
    refs.content.style.padding = "";
    mount(renderErrorState(err, () => renderRoute()));
  }
}

async function ensureOnboarding() {
  const s = getState();
  if (s.studentName) return false;
  const name = await promptModal({
    title: "Selamat datang di MYSQL QUEST 👋",
    body: "Siapa nama/panggilan Anda? (opsional — hanya untuk personalisasi tampilan, disimpan di browser ini saja, bukan akun/login).",
    placeholder: "Nama Anda",
    maxLength: 40,
  });
  setStudentName(name || "Junior Engineer");
  return true;
}

let persistWarningShown = false;
subscribe(() => {
  const { route } = parseHash();
  renderTopbar(route);
  if (isPersistBroken() && !persistWarningShown) {
    persistWarningShown = true;
    toast("⚠ Progress tidak bisa disimpan di browser ini (mode private/storage penuh). Jangan tutup tab ini sebelum selesai.", "err");
  }
});

window.addEventListener("hashchange", renderRoute);

// Safety net for errors that happen outside the render flow above (e.g. an
// async click handler like "Reset Sandbox" hitting a CDN/network failure
// after the page already mounted) — surface a toast instead of failing
// silently in the console.
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e.reason);
  toast(errorMessageFor(e.reason), "err");
});

(async function init() {
  initTheme();
  updateThemeButtons();
  const isFirstVisit = await ensureOnboarding();
  if (isFirstVisit && !location.hash) location.hash = "#/help";
  renderRoute();
})();
