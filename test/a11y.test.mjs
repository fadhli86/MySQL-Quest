// Static accessibility guard for the colour tokens in css/style.css:
// text tokens must reach WCAG AA (4.5:1) on the surfaces they are used on,
// and button labels must be readable on every stop of their gradient.
// (A full rendered-page audit was run in a browser when these were tuned;
// this keeps future palette edits from silently regressing it.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");

function block(startMarker) {
  const i = css.indexOf(startMarker);
  assert.ok(i >= 0, `${startMarker} block exists`);
  let depth = 0;
  for (let j = css.indexOf("{", i); j < css.length; j++) {
    if (css[j] === "{") depth++;
    if (css[j] === "}" && --depth === 0) return css.slice(css.indexOf("{", i) + 1, j);
  }
  throw new Error("unterminated block");
}
const tokens = (text) => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].replace(/\/\*.*?\*\//g, "").trim()]));

const light = tokens(block(":root {"));
const dark = tokens(block(':root[data-theme="dark"] {'));
const darkMedia = tokens(block(':root:not([data-theme="light"]) {'));

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (top, alpha, bottom) => top.map((v, i) => v * alpha + bottom[i] * (1 - alpha));
const gradientStops = (v) => [...v.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => hex(m[0]));

const SURFACES = ["bg", "bg-panel", "bg-panel-2", "bg-elevated"];
const TEXT_TOKENS = ["text", "text-dim", "text-faint", "brand", "good", "warn", "bad", "xp", "locked"];

for (const [name, t] of [["light", light], ["dark", dark]]) {
  test(`${name} theme: text tokens reach 4.5:1 on all surfaces`, () => {
    for (const tok of TEXT_TOKENS) {
      for (const surface of SURFACES) {
        const r = ratio(hex(t[tok]), hex(t[surface]));
        assert.ok(r >= 4.5, `--${tok} ${t[tok]} on --${surface} ${t[surface]} is ${r.toFixed(2)}:1 (< 4.5)`);
      }
    }
  });

  test(`${name} theme: status colours stay readable on their own tinted backgrounds`, () => {
    const panel = hex(t["bg-panel"]);
    for (const tok of ["good", "warn", "bad", "brand", "xp"]) {
      const tinted = over(hex(t[tok]), 0.12, panel);
      const r = ratio(hex(t[tok]), tinted);
      assert.ok(r >= 4.5, `--${tok} on its 12% tint is ${r.toFixed(2)}:1`);
    }
  });

  test(`${name} theme: button labels are readable on every gradient stop`, () => {
    for (const kind of ["primary", "submit"]) {
      const fg = hex(t[`btn-${kind}-fg`]);
      for (const stop of gradientStops(t[`btn-${kind}-bg`])) {
        const r = ratio(fg, stop);
        assert.ok(r >= 4.5, `btn-${kind}: label on a gradient stop is ${r.toFixed(2)}:1`);
      }
    }
  });
}

test("the OS-preference dark palette matches the explicit dark palette", () => {
  for (const key of Object.keys(dark)) {
    if (key.startsWith("btn-") || TEXT_TOKENS.includes(key) || SURFACES.includes(key)) {
      assert.equal(darkMedia[key], dark[key], `--${key} differs between the two dark blocks`);
    }
  }
});
