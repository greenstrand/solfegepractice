/** Positions-first drill generation; clef schedule overlay; difficulty lerp; no unisons. Pure given rng. */

import { type Clef, isDo } from "./clefSolfegeMap";
import {
  DEFAULT_LEDGER_LINES,
  MIDDLE_LINE,
  clampLedgerLines,
  maxPosition,
  minPosition,
} from "./staffWindow";

export const SEQUENCE_LENGTH = 256;

export type DrillNote = {
  position: number;
  clef: Clef;
};

/** Uniform random in [0, 1). */
export type Rng = {
  next(): number;
};

type DifficultyParams = {
  maxLeap: number;
  pStep: number;
  runPersist: number;
  pFlip: number;
  pStartDo: number;
  pRecover: number;
  repeatPenalty: number;
  rangeHalf: number;
  /** Relative weights for leap sizes s=2..14; zeros disallowed. */
  leapWeights: number[];
};

type ScalarAnchor = {
  d: number;
  maxLeap: number;
  pStep: number;
  runPersist: number;
  pFlip: number;
  pStartDo: number;
  pRecover: number;
  repeatPenalty: number;
  rangeHalf: number;
};

/** Scalar difficulty anchors at d = 1, 3, 5, 7, 10 (lerp between neighbors). */
const SCALAR_ANCHORS: readonly ScalarAnchor[] = [
  {
    d: 1,
    maxLeap: 1,
    pStep: 0.95,
    runPersist: 0.88,
    pFlip: 0.08,
    pStartDo: 0.85,
    pRecover: 0.7,
    repeatPenalty: 1.0,
    rangeHalf: 3,
  },
  {
    d: 3,
    maxLeap: 4,
    pStep: 0.7,
    runPersist: 0.7,
    pFlip: 0.18,
    pStartDo: 0.65,
    pRecover: 0.75,
    repeatPenalty: 0.85,
    rangeHalf: 5,
  },
  {
    d: 5,
    maxLeap: 7,
    pStep: 0.5,
    runPersist: 0.5,
    pFlip: 0.28,
    pStartDo: 0.45,
    pRecover: 0.55,
    repeatPenalty: 0.55,
    rangeHalf: 7,
  },
  {
    d: 7,
    maxLeap: 10,
    pStep: 0.38,
    runPersist: 0.35,
    pFlip: 0.38,
    pStartDo: 0.3,
    pRecover: 0.35,
    repeatPenalty: 0.3,
    rangeHalf: 9,
  },
  {
    d: 10,
    maxLeap: 14,
    pStep: 0.25,
    runPersist: 0.22,
    pFlip: 0.48,
    pStartDo: 0.18,
    pRecover: 0.15,
    repeatPenalty: 0.1,
    rangeHalf: 10,
  },
];

/**
 * Relative leap weights for interval sizes s = 2..14 at the same difficulty anchors.
 * Buckets 8-10 and 11-14 are split evenly across their sizes.
 */
const LEAP_WEIGHT_ANCHORS: ReadonlyArray<{ d: number; weights: number[] }> = [
  { d: 1, weights: expandLeapRow(0, 0, 0, 0, 0, 0, 0, 0) },
  { d: 3, weights: expandLeapRow(0.45, 0.3, 0.25, 0, 0, 0, 0, 0) },
  { d: 5, weights: expandLeapRow(0.28, 0.22, 0.22, 0.12, 0.08, 0.08, 0, 0) },
  { d: 7, weights: expandLeapRow(0.18, 0.16, 0.16, 0.12, 0.1, 0.12, 0.1, 0.06) },
  { d: 10, weights: expandLeapRow(0.1, 0.1, 0.12, 0.1, 0.1, 0.14, 0.14, 0.2) },
];

/** Clef-run length PMF: L in 2..16 with peak probability at L = 8. */
const CLEF_RUN_LENGTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
const CLEF_RUN_PMF = [
  0.02, 0.04, 0.06, 0.08, 0.1, 0.14, 0.18, 0.14, 0.09, 0.06, 0.04, 0.02, 0.015, 0.01, 0.005,
] as const;

function expandLeapRow(
  w2: number,
  w3: number,
  w4: number,
  w5: number,
  w6: number,
  w7: number,
  w8to10: number,
  w11to14: number,
): number[] {
  const out = new Array<number>(15).fill(0);
  out[2] = w2;
  out[3] = w3;
  out[4] = w4;
  out[5] = w5;
  out[6] = w6;
  out[7] = w7;
  const share810 = w8to10 / 3;
  out[8] = share810;
  out[9] = share810;
  out[10] = share810;
  const share1114 = w11to14 / 4;
  out[11] = share1114;
  out[12] = share1114;
  out[13] = share1114;
  out[14] = share1114;
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function findAnchorBracket(
  d: number,
  ds: readonly number[],
): { i0: number; i1: number; t: number } {
  if (d <= ds[0]) {
    return { i0: 0, i1: 0, t: 0 };
  }
  const last = ds.length - 1;
  if (d >= ds[last]) {
    return { i0: last, i1: last, t: 0 };
  }
  for (let i = 0; i < last; i++) {
    const d0 = ds[i];
    const d1 = ds[i + 1];
    if (d >= d0 && d <= d1) {
      return { i0: i, i1: i + 1, t: (d - d0) / (d1 - d0) };
    }
  }
  return { i0: last, i1: last, t: 0 };
}

function lerpDifficulty(difficulty: number): DifficultyParams {
  const d = clamp(difficulty, 1, 10);
  const scalarDs = SCALAR_ANCHORS.map((a) => a.d);
  const { i0, i1, t } = findAnchorBracket(d, scalarDs);
  const a = SCALAR_ANCHORS[i0];
  const b = SCALAR_ANCHORS[i1];

  const leapDs = LEAP_WEIGHT_ANCHORS.map((row) => row.d);
  const leapBracket = findAnchorBracket(d, leapDs);
  const lw0 = LEAP_WEIGHT_ANCHORS[leapBracket.i0].weights;
  const lw1 = LEAP_WEIGHT_ANCHORS[leapBracket.i1].weights;
  const leapWeights = lw0.map((w, s) => lerp(w, lw1[s] ?? 0, leapBracket.t));

  return {
    maxLeap: Math.round(lerp(a.maxLeap, b.maxLeap, t)),
    pStep: clamp(lerp(a.pStep, b.pStep, t), 0, 1),
    runPersist: clamp(lerp(a.runPersist, b.runPersist, t), 0, 1),
    pFlip: clamp(lerp(a.pFlip, b.pFlip, t), 0, 1),
    pStartDo: clamp(lerp(a.pStartDo, b.pStartDo, t), 0, 1),
    pRecover: clamp(lerp(a.pRecover, b.pRecover, t), 0, 1),
    repeatPenalty: clamp(lerp(a.repeatPenalty, b.repeatPenalty, t), 0, 1),
    rangeHalf: lerp(a.rangeHalf, b.rangeHalf, t),
    leapWeights,
  };
}

function sampleCategorical(weights: number[], rng: Rng): number {
  let total = 0;
  for (const w of weights) {
    total += w;
  }
  if (total <= 0) {
    return -1;
  }
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) {
      return i;
    }
  }
  return weights.length - 1;
}

function sampleClefRunLength(rng: Rng): number {
  const idx = sampleCategorical([...CLEF_RUN_PMF], rng);
  return CLEF_RUN_LENGTHS[idx < 0 ? 0 : idx];
}

export type ClefRun = { clef: Clef; length: number };

/**
 * Sample clef-run lengths covering `length` notes (default SEQUENCE_LENGTH).
 * Remainder=1 extends the previous run; adjacent runs prefer different clefs.
 */
export function buildClefSchedule(
  clefs: readonly Clef[],
  rng: Rng,
  length: number = SEQUENCE_LENGTH,
): ClefRun[] {
  if (clefs.length < 1) {
    throw new Error("buildClefSchedule requires at least one clef");
  }
  if (length < 1) {
    return [];
  }
  if (clefs.length === 1) {
    return [{ clef: clefs[0], length }];
  }

  const lengths: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    if (remaining === 1) {
      if (lengths.length === 0) {
        lengths.push(1);
      } else {
        lengths[lengths.length - 1] += 1;
      }
      remaining = 0;
      break;
    }
    let L = sampleClefRunLength(rng);
    if (L > remaining) {
      L = remaining;
    }
    lengths.push(L);
    remaining -= L;
  }

  const runs: ClefRun[] = [];
  let prevClef: Clef | null = null;
  for (const runLength of lengths) {
    const clef = pickClef(clefs, prevClef, rng);
    runs.push({ clef, length: runLength });
    prevClef = clef;
  }
  return runs;
}

function pickClef(clefs: readonly Clef[], prev: Clef | null, rng: Rng): Clef {
  if (clefs.length === 1) {
    return clefs[0];
  }
  const options = prev === null ? [...clefs] : clefs.filter((c) => c !== prev);
  const pool = options.length > 0 ? options : [...clefs];
  const idx = Math.floor(rng.next() * pool.length);
  return pool[clamp(idx, 0, pool.length - 1)];
}

function phraseCenterFor(difficulty: number, rng: Rng, lo: number, hi: number): number {
  const d = clamp(difficulty, 1, 10);
  const jitterMax = Math.round(lerp(2, 4, (d - 1) / 9));
  const offset = Math.round((rng.next() * 2 - 1) * jitterMax);
  return clamp(MIDDLE_LINE + offset, lo, hi);
}

function rangeFalloff(position: number, center: number, rangeHalf: number): number {
  const dist = Math.abs(position - center);
  if (dist <= rangeHalf) {
    return 1;
  }
  const excess = dist - rangeHalf;
  return Math.exp(-excess);
}

function doPositions(clef: Clef, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let p = lo; p <= hi; p++) {
    if (isDo(p, clef)) {
      out.push(p);
    }
  }
  return out;
}

function sampleStartPosition(
  clef: Clef | null,
  params: DifficultyParams,
  phraseCenter: number,
  forbid: number | null,
  rng: Rng,
  lo: number,
  hi: number,
): number {
  const wantDo = clef !== null && rng.next() < params.pStartDo;
  let candidates = wantDo && clef !== null ? doPositions(clef, lo, hi) : null;
  if (candidates === null || candidates.length === 0) {
    candidates = [];
    for (let p = lo; p <= hi; p++) {
      candidates.push(p);
    }
  }
  if (forbid !== null) {
    candidates = candidates.filter((p) => p !== forbid);
  }
  if (candidates.length === 0) {
    // All do positions equal forbid; fall back to any other position.
    candidates = [];
    for (let p = lo; p <= hi; p++) {
      if (p !== forbid) {
        candidates.push(p);
      }
    }
  }
  const weights = candidates.map((p) => rangeFalloff(p, phraseCenter, params.rangeHalf));
  const idx = sampleCategorical(weights, rng);
  if (idx < 0) {
    return clamp(phraseCenter === forbid ? phraseCenter + 1 : phraseCenter, lo, hi);
  }
  return candidates[idx];
}

type MelodicState = {
  pitch: number;
  lastDir: number;
  lastAbs: number;
  lastLeap: boolean;
};

function forceStepTowardCenter(pitch: number, center: number, lo: number, hi: number): number {
  if (pitch < center && pitch < hi) {
    return pitch + 1;
  }
  if (pitch > center && pitch > lo) {
    return pitch - 1;
  }
  if (pitch < hi) {
    return pitch + 1;
  }
  if (pitch > lo) {
    return pitch - 1;
  }
  return pitch;
}

function sampleNextPitch(
  state: MelodicState,
  params: DifficultyParams,
  phraseCenter: number,
  rng: Rng,
  lo: number,
  hi: number,
): { pitch: number; delta: number } {
  const candidates: number[] = [];
  const weights: number[] = [];

  for (let s = 1; s <= params.maxLeap; s++) {
    for (const dir of [1, -1]) {
      const next = state.pitch + dir * s;
      if (next < lo || next > hi) {
        continue;
      }
      let w = s === 1 ? params.pStep : (1 - params.pStep) * (params.leapWeights[s] ?? 0);
      if (w <= 0) {
        continue;
      }
      if (state.lastAbs > 0 && s === 1 && dir === state.lastDir) {
        w *= lerp(1, 1 + 4 * params.runPersist, params.runPersist);
      }
      if (state.lastAbs > 0 && s === 1 && dir !== state.lastDir) {
        w *= params.pFlip + 0.15;
      }
      if (state.lastLeap && dir !== state.lastDir && s < state.lastAbs) {
        w *= 1 + 3 * params.pRecover;
      }
      if (state.lastAbs > 0 && s === state.lastAbs) {
        w *= params.repeatPenalty;
      }
      w *= rangeFalloff(next, phraseCenter, params.rangeHalf);
      candidates.push(dir * s);
      weights.push(w);
    }
  }

  const idx = sampleCategorical(weights, rng);
  if (idx < 0) {
    const pitch = forceStepTowardCenter(state.pitch, phraseCenter, lo, hi);
    const delta = pitch - state.pitch;
    return { pitch, delta };
  }
  const delta = candidates[idx];
  const pitch = clamp(state.pitch + delta, lo, hi);
  if (pitch === state.pitch) {
    const forced = forceStepTowardCenter(state.pitch, phraseCenter, lo, hi);
    return { pitch: forced, delta: forced - state.pitch };
  }
  return { pitch, delta };
}

/**
 * Sample one continuous staff-position stream. Clefs never influence intervals.
 * `startClefForDo` only biases the first note toward Do for that clef (whole-sequence start).
 */
export function samplePositions(
  length: number,
  difficulty: number,
  ledgerLines: number,
  rng: Rng,
  startClefForDo?: Clef,
): number[] {
  if (length < 1) {
    return [];
  }
  const n = clampLedgerLines(ledgerLines);
  const lo = minPosition(n);
  const hi = maxPosition(n);
  const params = lerpDifficulty(difficulty);
  const phraseCenter = phraseCenterFor(difficulty, rng, lo, hi);
  const positions: number[] = [];
  const pitch = sampleStartPosition(
    startClefForDo ?? null,
    params,
    phraseCenter,
    null,
    rng,
    lo,
    hi,
  );
  positions.push(pitch);

  let state: MelodicState = {
    pitch,
    lastDir: 0,
    lastAbs: 0,
    lastLeap: false,
  };

  for (let i = 1; i < length; i++) {
    const { pitch: next, delta } = sampleNextPitch(state, params, phraseCenter, rng, lo, hi);
    positions.push(next);
    const abs = Math.abs(delta);
    state = {
      pitch: next,
      lastDir: delta === 0 ? state.lastDir : Math.sign(delta),
      lastAbs: abs,
      lastLeap: abs >= 3,
    };
  }
  return positions;
}

/** Zip position stream with a clef-run schedule into DrillNotes. */
export function zipDrill(positions: readonly number[], schedule: readonly ClefRun[]): DrillNote[] {
  const clefs: Clef[] = [];
  for (const run of schedule) {
    for (let i = 0; i < run.length; i++) {
      clefs.push(run.clef);
    }
  }
  if (clefs.length !== positions.length) {
    throw new Error(
      `zipDrill length mismatch: ${positions.length} positions vs ${clefs.length} scheduled clefs`,
    );
  }
  return positions.map((position, i) => ({ position, clef: clefs[i] }));
}

/**
 * Overlay a fresh clef schedule on existing positions (same length).
 * Throws if `clefs` is empty or positions is empty.
 */
export function applyClefSchedule(
  positions: readonly number[],
  clefs: readonly Clef[],
  rng: Rng,
): DrillNote[] {
  if (clefs.length < 1) {
    throw new Error("applyClefSchedule requires at least one clef");
  }
  if (positions.length < 1) {
    throw new Error("applyClefSchedule requires at least one position");
  }
  const schedule = buildClefSchedule(clefs, rng, positions.length);
  return zipDrill(positions, schedule);
}

/**
 * Build a 256-note drill: one continuous position stream, then clef schedule overlay.
 * Throws if `settings.clefs` is empty.
 */
export function generateDrill(
  settings: {
    clefs: readonly Clef[];
    difficulty: number;
    ledgerLines?: number;
  },
  rng: Rng,
): DrillNote[] {
  if (settings.clefs.length < 1) {
    throw new Error("generateDrill requires at least one clef");
  }

  const ledgerLines = clampLedgerLines(settings.ledgerLines ?? DEFAULT_LEDGER_LINES);
  const schedule = buildClefSchedule(settings.clefs, rng, SEQUENCE_LENGTH);
  const startClefForDo = schedule[0]?.clef;
  const positions = samplePositions(
    SEQUENCE_LENGTH,
    settings.difficulty,
    ledgerLines,
    rng,
    startClefForDo,
  );
  return zipDrill(positions, schedule);
}
