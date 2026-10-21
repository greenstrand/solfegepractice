/** Clef glyphs from Bravura (SMuFL). Placement only; meaning in clefSolfegeMap. */

import type { Clef } from "../model/clefSolfegeMap";
import { STAFF_SPACING } from "./staffLayout";

/** U+E050 gClef (Bravura / SIL OFL; see src/assets/fonts/OFL.txt). */
const G_CLEF_CHAR = "\uE050";
/** U+E062 fClef */
const F_CLEF_CHAR = "\uE062";
/** U+E05C cClef */
const C_CLEF_CHAR = "\uE05C";

/** Staff position of each clef's reference pitch (G / F / C / C). */
export const CLEF_REF_POSITION: Record<Clef, number> = {
  treble: 8,
  bass: 12,
  alto: 10,
  tenor: 12,
};

const CLEF_CHAR: Record<Clef, string> = {
  treble: G_CLEF_CHAR,
  bass: F_CLEF_CHAR,
  alto: C_CLEF_CHAR,
  tenor: C_CLEF_CHAR,
};

export type ClefGlyphProps = {
  clef: Clef;
  /** Left edge of the glyph (SMuFL origin x). */
  x: number;
  /** Screen y of the clef's reference staff line (SMuFL origin y). */
  refY: number;
  staffSpacing?: number;
  className?: string;
};

/**
 * Draw a Bravura clef. SMuFL: em = 4 staff spaces; glyph origin on the
 * reference pitch line. fontSize = 4 * staffSpacing matches the staff.
 */
export function ClefGlyph({
  clef,
  x,
  refY,
  staffSpacing = STAFF_SPACING,
  className = "clef-glyph",
}: ClefGlyphProps) {
  return (
    <text
      className={className}
      data-clef={clef}
      x={x}
      y={refY}
      fontSize={staffSpacing * 4}
      direction="ltr"
    >
      {CLEF_CHAR[clef]}
    </text>
  );
}
