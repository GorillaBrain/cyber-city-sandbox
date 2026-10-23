/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32 + FNV-1a seed hash).
 * Guarantees that identical string or numeric seeds produce identical cities,
 * network topologies, vulnerability placements, and traffic samples.
 */

export function hashSeed(seedInput) {
  const str = String(seedInput ?? 'NEON-GRID-2088').trim() || 'NEON-GRID-2088';
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createPRNG(seedInput) {
  let state = hashSeed(seedInput);

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min = 0, max = 1) {
      return min + next() * (max - min);
    },
    pick(array) {
      if (!array || array.length === 0) return undefined;
      return array[Math.floor(next() * array.length)];
    },
    shuffle(array) {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    chance(probability) {
      return next() < probability;
    },
  };
}
