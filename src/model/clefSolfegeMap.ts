/** Clef ids and fixed-do mapping: position + clef -> pitch class / syllable (B = si). */

export type Clef = "treble" | "bass" | "alto" | "tenor";

export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type Solfege = "do" | "re" | "mi" | "fa" | "sol" | "la" | "si";

export const CLEFS: readonly Clef[] = ["treble", "bass", "alto", "tenor"];

/** Pitch class: C=0 .. B=6. */
export const LETTERS: readonly Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

export const SYLLABLES: readonly Solfege[] = ["do", "re", "mi", "fa", "sol", "la", "si"];

/** Middle-line (pos 10) pitch class per clef; tenor also has C on pos 12. */
const CLEF_REF: Record<Clef, { refPos: number; refPc: number }> = {
  treble: { refPos: 10, refPc: 6 }, // B
  bass: { refPos: 10, refPc: 1 }, // D
  alto: { refPos: 10, refPc: 0 }, // C (middle C)
  tenor: { refPos: 10, refPc: 5 }, // A; C on position 12
};

function mod7(n: number): number {
  return ((n % 7) + 7) % 7;
}

export function pitchClassFor(position: number, clef: Clef): number {
  const { refPos, refPc } = CLEF_REF[clef];
  return mod7(refPc + (position - refPos));
}

export function letterFor(position: number, clef: Clef): Letter {
  return LETTERS[pitchClassFor(position, clef)] as Letter;
}

export function solfegeFor(position: number, clef: Clef): Solfege {
  return SYLLABLES[pitchClassFor(position, clef)] as Solfege;
}

export function isDo(position: number, clef: Clef): boolean {
  return pitchClassFor(position, clef) === 0;
}
