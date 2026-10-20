import { describe, expect, it } from "vitest";
import { type Clef, isDo, letterFor, solfegeFor } from "./clefSolfegeMap";
import { STAFF_LINES } from "./staffWindow";

/** Expected letter on each staff line (bottom to top) per clef. */
const STAFF_LINE_LETTERS: Record<Clef, readonly string[]> = {
  treble: ["E", "G", "B", "D", "F"],
  bass: ["G", "B", "D", "F", "A"],
  alto: ["F", "A", "C", "E", "G"],
  tenor: ["D", "F", "A", "C", "E"],
};

const LETTER_TO_SOLFEGE: Record<string, string> = {
  C: "do",
  D: "re",
  E: "mi",
  F: "fa",
  G: "sol",
  A: "la",
  B: "si",
};

describe("ClefSolfegeMap", () => {
  it("maps each clef five staff lines to correct letters and syllables", () => {
    for (const clef of Object.keys(STAFF_LINE_LETTERS) as Clef[]) {
      const expected = STAFF_LINE_LETTERS[clef];
      STAFF_LINES.forEach((position, i) => {
        const letter = letterFor(position, clef);
        const syllable = solfegeFor(position, clef);
        expect(letter).toBe(expected[i]);
        expect(syllable).toBe(LETTER_TO_SOLFEGE[letter]);
      });
    }
  });

  it("alto pos 10 = do", () => {
    expect(letterFor(10, "alto")).toBe("C");
    expect(solfegeFor(10, "alto")).toBe("do");
    expect(isDo(10, "alto")).toBe(true);
  });

  it("tenor pos 12 = do", () => {
    expect(letterFor(12, "tenor")).toBe("C");
    expect(solfegeFor(12, "tenor")).toBe("do");
    expect(isDo(12, "tenor")).toBe(true);
  });

  it("treble first ledger below staff: pos 4 = do (middle C)", () => {
    expect(letterFor(4, "treble")).toBe("C");
    expect(solfegeFor(4, "treble")).toBe("do");
    expect(isDo(4, "treble")).toBe(true);
  });

  it("bass first ledger above staff: pos 16 = do (middle C)", () => {
    expect(letterFor(16, "bass")).toBe("C");
    expect(solfegeFor(16, "bass")).toBe("do");
    expect(isDo(16, "bass")).toBe(true);
  });

  it("B maps to si (not ti)", () => {
    expect(solfegeFor(10, "treble")).toBe("si");
    expect(letterFor(10, "treble")).toBe("B");
    expect(solfegeFor(8, "bass")).toBe("si");
    expect(letterFor(8, "bass")).toBe("B");
  });
});
