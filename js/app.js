import { getState, subscribe, getRank, setStudentName } from "./state.js";
import { el, clear, promptModal } from "./ui.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderJourney } from "./views/journey.js";
import { renderQuest } from "./views/quest.js";
import { renderAchievements } from "./views/achievements.js";
import { renderPortfolio } from "./views/portfolio.js";
import { renderProgress } from "./views/progress.js";
import { renderPlayground } from "./views/playground.js";
import { renderHelp } from "./views/help.js";

const NAV_ITEMS = [
  { route: "dashboard", icon: "🏠", label: "Home" },
  { route: "journey", icon: "🗺️", label: "Journey" },
  { route: "playground", icon: "⌨️", label: "Play" },
  { route: "progress", icon: "📈", label: "Progress" },
  { route: "achievements", icon: "🏅", label: "More", extraRoutes: ["achievements", "portfolio"] },
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

  app.appendChild(topbar);
  app.appendChild(shell);
  app.appendChild(bottomNav);
  app.appendChild(helpFab);

  return { topbar, sidebar, content, bottomNav, helpFab };
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
    el("button", { class: `nav-item${activeRoute === "help" ? " active" : ""}`, onclick: () => navigate("help") }, [el("span", { class: "ic" }, "❓"), "Panduan"])
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

  const mount = (node) => {
    node.classList.add("page-enter");
    refs.content.appendChild(node);
  };

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
    case "dashboard":
    default:
      mount(await renderDashboard({ navigate }));
      break;
  }
  if (route !== "quest" && route !== "playground") refs.content.style.padding = "";
}

async function ensureOnboarding() {
  const s = getState();
  if (s.studentName) return false;
  const name = await promptModal({
    title: "Selamat datang di MYSQL QUEST 👋",
    body: "Siapa nama/panggilan Anda? (opsional — hanya untuk personalisasi tampilan, disimpan di browser ini saja, bukan akun/login).",
    placeholder: "Nama Anda",
  });
  setStudentName(name || "Junior Engineer");
  return true;
}

subscribe(() => {
  const { route } = parseHash();
  renderTopbar(route);
});

window.addEventListener("hashchange", renderRoute);

(async function init() {
  const isFirstVisit = await ensureOnboarding();
  if (isFirstVisit && !location.hash) location.hash = "#/help";
  renderRoute();
})();
