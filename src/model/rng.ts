/** Shared RNG helpers for generation and tests. */

/** Uniform random in [0, 1). */
export type Rng = {
  next(): number;
};

export function mathRng(): Rng {
  return { next: () => Math.random() };
}

/** Deterministic mulberry32 in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const seededRng = mulberry32;
