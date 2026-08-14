const KEY = "mysqlquest_theme"; // stored value: "light" | "dark" — absent means "follow system"

export function getStoredTheme() {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
}

export function setTheme(theme) {
  if (theme === "light" || theme === "dark") localStorage.setItem(KEY, theme);
  else localStorage.removeItem(KEY);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function currentEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme() {
  const next = currentEffectiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
