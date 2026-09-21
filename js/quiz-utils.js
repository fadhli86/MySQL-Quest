// Deterministic option shuffling for quiz stages.
//
// Every authored quiz lists its correct answer first, so showing options
// in authored order would let anyone score by always picking "A". The
// order is shuffled per (level, stage, student) with a seeded PRNG so it
// stays stable across re-renders and sessions for one student (no options
// jumping around mid-question) but differs between students and stages.
// Grading still uses the original option index — only display order moves.

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, good enough for a display shuffle.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns a permutation of [0..count-1]: order[displayPosition] = original index.
export function shuffledOptionOrder(count, seedString) {
  const order = Array.from({ length: count }, (_, i) => i);
  const rand = prng(hashString(seedString));
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
