// Tamper-evidence for exported progress files — WITHOUT a backend.
//
// Read this before trusting it: the app is a static site, so the signing key
// below is shipped to every browser. Anyone willing to read the source can
// sign a forged file. What this does give the lecturer:
//   - a casually edited file (XP bumped, a stage flipped to "passed") no
//     longer matches its signature and is flagged;
//   - the file carries the SQL that passed each stage, so the lecturer can
//     re-grade it (js/verify-progress.js) — forging a pass then requires a
//     real, working answer, not just an edited number.
// It is a deterrent and an audit aid, not proof. Real proof needs a server.
//
// The key is a plain constant; change it if you want files signed by an
// earlier deployment to stop verifying (and re-issue files to students).

const KEY = "mysqlquest-integrity-v1/ASIA-2026";

// Canonical JSON: object keys sorted, so the same data always yields the same string.
export function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

// The fields that decide a grade. Drafts, portfolio copies and the review
// queue are deliberately left out — they don't affect nilai.
export function integrityPayload(state) {
  const levels = {};
  for (const [id, ls] of Object.entries(state.levels || {})) {
    const stages = {};
    for (const [sid, sp] of Object.entries((ls && ls.stages) || {})) {
      stages[sid] = {
        status: sp.status,
        best: sp.bestScore,
        attempts: sp.attempts,
        hints: sp.hintsUsed || 0,
        sql: sp.passedSql || "",
        at: sp.passedAt || 0,
        first: sp.firstAt || 0,
      };
    }
    levels[id] = { status: ls && ls.status, mastery: ls && ls.mastery, stages };
  }
  return {
    v: 1,
    name: state.studentName || "",
    nim: state.studentNim || "",
    xp: state.xp || 0,
    badges: (state.badges || []).map((b) => b.id).sort(),
    levels,
  };
}

async function hmacHex(message) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return null; // e.g. an insecure (non-https) context
  const enc = new TextEncoder();
  const key = await subtle.importKey("raw", enc.encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// JSON for the student's Export button: the state plus an `integrity` block.
export async function signedExportJson(state) {
  const sig = await hmacHex(stable(integrityPayload(state)));
  const integrity = sig ? { v: 1, alg: "HMAC-SHA256", sig, signedAt: Date.now() } : { v: 1, alg: "none" };
  return JSON.stringify({ ...state, integrity }, null, 2);
}

// "valid" | "invalid" | "missing" | "unavailable"
export async function verifySignature(file) {
  if (!file || !file.integrity || !file.integrity.sig) return file && file.integrity && file.integrity.alg === "none" ? "unavailable" : "missing";
  const sig = await hmacHex(stable(integrityPayload(file)));
  if (!sig) return "unavailable";
  return sig === file.integrity.sig ? "valid" : "invalid";
}

// Every XP point is added through the XP log, so the two must agree.
export function checkXpConsistency(file) {
  const logged = (file.xpLog || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  return { ok: logged === (file.xp || 0), xp: file.xp || 0, logged };
}

export function hasEvidence(file) {
  return Object.values((file && file.levels) || {}).some((ls) => Object.values((ls && ls.stages) || {}).some((sp) => sp && sp.passedSql));
}
