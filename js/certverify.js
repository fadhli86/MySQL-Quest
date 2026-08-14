// Shared between js/certificate.js (encoding, into the QR/URL) and
// verify.html (decoding, to display + check consistency) — kept as one
// module so the signature algorithm can never drift out of sync between
// the two sides.
//
// IMPORTANT — read before trusting this as "security": MYSQL QUEST has no
// backend/server. This checksum is computed entirely in public,
// downloadable client-side code, salt included. It catches accidental or
// casual edits to the verification link (typos, a digit changed by hand),
// it does NOT stop someone with basic JS knowledge from forging a value
// deliberately. Treat a "valid" result as "internally consistent with
// itself", not as "confirmed by an institution's database". This is
// stated plainly on the verify page too.
const SALT = "MYSQLQUEST-ASIA-SMART-CAMPUS-2026";

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase();
}

function computeSig(fields) {
  return fnv1a(`${SALT}|${fields.join("|")}`);
}

// data: { name, certId, completedAt(ms), mastery, xp, badgeCount }
export function buildVerifyParams(data) {
  const fields = [data.name, data.certId, String(data.completedAt), String(data.mastery), String(data.xp), String(data.badgeCount)];
  const sig = computeSig(fields);
  return new URLSearchParams({
    n: data.name,
    id: data.certId,
    d: String(data.completedAt),
    m: String(data.mastery),
    x: String(data.xp),
    b: String(data.badgeCount),
    s: sig,
  });
}

// Returns { valid, data } — valid is true only if the recomputed
// signature matches the one carried in the link.
export function verifyParams(params) {
  const data = {
    name: params.get("n") || "",
    certId: params.get("id") || "",
    completedAt: Number(params.get("d") || 0),
    mastery: Number(params.get("m") || 0),
    xp: Number(params.get("x") || 0),
    badgeCount: Number(params.get("b") || 0),
  };
  const sig = params.get("s") || "";
  const expected = computeSig([data.name, data.certId, String(data.completedAt), String(data.mastery), String(data.xp), String(data.badgeCount)]);
  const hasAllFields = data.name && data.certId && data.completedAt;
  return { valid: hasAllFields && sig === expected, data };
}
