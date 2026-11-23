// Seeded random numbers for Ember Pact.
//
// One small generator drives every shuffle and every Rook decision, so a
// fixed seed replays a match exactly. The browser game and the logic test
// share this file, which is why it stays free of any DOM or timing code.

/** mulberry32: a tiny fast seeded PRNG. Returns a function yielding [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A seeded RNG bundle: next() plus the helpers the game actually needs.
 * Every draw comes from the same stream, in call order, so replays match.
 */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Integer in [0, n). */
    int(n) {
      return Math.floor(next() * n);
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** A random element of a non-empty array. */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** Fisher-Yates shuffle, in place, returning the array. */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },
  };
}
