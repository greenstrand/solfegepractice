import { describe, expect, it } from "vitest";
import { CLEFS, type Clef } from "./clefSolfegeMap";
import { type DrillNote, type Rng, SEQUENCE_LENGTH, generateDrill } from "./generate";
import { MAX_POSITION, MIN_POSITION } from "./staffWindow";

/** Deterministic mulberry32 in [0, 1). */
function seededRng(seed: number): Rng {
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

function meanAbsDelta(notes: DrillNote[]): number {
  let sum = 0;
  for (let i = 1; i < notes.length; i++) {
    sum += Math.abs(notes[i].position - notes[i - 1].position);
  }
  return sum / (notes.length - 1);
}

function stepRate(notes: DrillNote[]): number {
  let steps = 0;
  for (let i = 1; i < notes.length; i++) {
    if (Math.abs(notes[i].position - notes[i - 1].position) === 1) {
      steps += 1;
    }
  }
  return steps / (notes.length - 1);
}

function clefRuns(notes: DrillNote[]): { clef: Clef; length: number }[] {
  const runs: { clef: Clef; length: number }[] = [];
  for (const note of notes) {
    const last = runs[runs.length - 1];
    if (last && last.clef === note.clef) {
      last.length += 1;
    } else {
      runs.push({ clef: note.clef, length: 1 });
    }
  }
  return runs;
}

describe("generateDrill", () => {
  it("returns SEQUENCE_LENGTH notes with positions in [0,20] and no consecutive unisons", () => {
    const notes = generateDrill({ clefs: ["treble"], difficulty: 5 }, seededRng(42));
    expect(notes).toHaveLength(SEQUENCE_LENGTH);
    for (let i = 0; i < notes.length; i++) {
      expect(notes[i].position).toBeGreaterThanOrEqual(MIN_POSITION);
      expect(notes[i].position).toBeLessThanOrEqual(MAX_POSITION);
      expect(Number.isInteger(notes[i].position)).toBe(true);
      if (i > 0) {
        expect(notes[i].position).not.toBe(notes[i - 1].position);
      }
    }
  });

  it("single clef => all notes same clef", () => {
    for (const clef of CLEFS) {
      const notes = generateDrill({ clefs: [clef], difficulty: 3 }, seededRng(7));
      expect(notes.every((n) => n.clef === clef)).toBe(true);
    }
  });

  it("multi-clef produces clef changes; run lengths respect remainder rules", () => {
    const notes = generateDrill(
      { clefs: ["treble", "bass", "alto"], difficulty: 4 },
      seededRng(99),
    );
    const runs = clefRuns(notes);
    expect(runs.length).toBeGreaterThan(1);
    const total = runs.reduce((acc, r) => acc + r.length, 0);
    expect(total).toBe(SEQUENCE_LENGTH);

    // Min run length is 2 except the extend-previous remainder rule may only
    // increase a prior run; never a new sampled run of length 1 in the middle.
    for (let i = 0; i < runs.length; i++) {
      if (i < runs.length - 1) {
        expect(runs[i].length).toBeGreaterThanOrEqual(2);
      } else {
        // Final run may be 1 only if remainder forced extend into a new illegal
        // sample that was clamped; plan prefers extending previous, so final
        // should also be >= 2 when SEQUENCE_LENGTH allows.
        expect(runs[i].length).toBeGreaterThanOrEqual(1);
      }
    }
    // With remainder rule, at most one run of length 1 should never appear as a
    // brand-new sample when remaining was 1 - that case extends previous, so
    // after a full 256 cover with min sample 2, all runs should be >= 2.
    expect(runs.every((r) => r.length >= 2)).toBe(true);
    // Sampled L is at most 16; remainder extend may bump previous by 1 => 17.
    expect(runs.every((r) => r.length <= 17)).toBe(true);
  });

  it("diff 1 has higher step rate and smaller mean abs delta than diff 10", () => {
    const easy = generateDrill({ clefs: ["treble"], difficulty: 1 }, seededRng(123));
    const hard = generateDrill({ clefs: ["treble"], difficulty: 10 }, seededRng(123));
    expect(stepRate(easy)).toBeGreaterThan(stepRate(hard));
    expect(meanAbsDelta(hard)).toBeGreaterThan(meanAbsDelta(easy));
    expect(stepRate(easy)).toBeGreaterThan(0.7);
    expect(meanAbsDelta(easy)).toBeLessThan(2);
  });

  it("throws when clefs is empty", () => {
    expect(() => generateDrill({ clefs: [], difficulty: 3 }, seededRng(1))).toThrow(
      /at least one clef/i,
    );
  });
});
