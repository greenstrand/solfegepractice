/** SVG clef glyphs. Placement only; clef meaning lives in clefSolfegeMap. */

import type { Clef } from "../model/clefSolfegeMap";
import { STAFF_SPACING } from "./staffLayout";

/** Staff position of each clef's reference pitch (G / F / C / C). */
export const CLEF_REF_POSITION: Record<Clef, number> = {
  treble: 8,
  bass: 12,
  alto: 10,
  tenor: 12,
};

export type ClefGlyphProps = {
  clef: Clef;
  /** Left anchor of the glyph. */
  x: number;
  /** Screen y of the clef's reference staff line. */
  refY: number;
  staffSpacing?: number;
  className?: string;
};

/**
 * Draw a clef scaled so one staff space == staffSpacing.
 * Local coords: (0,0) at the reference line, y positive down.
 */
export function ClefGlyph({
  clef,
  x,
  refY,
  staffSpacing = STAFF_SPACING,
  className = "clef-glyph",
}: ClefGlyphProps) {
  const s = staffSpacing;
  return (
    <g className={className} transform={`translate(${x}, ${refY}) scale(${s})`} data-clef={clef}>
      {clef === "treble" ? <TreblePath /> : null}
      {clef === "bass" ? <BassPath /> : null}
      {clef === "alto" || clef === "tenor" ? <CClefPath /> : null}
    </g>
  );
}

/** G-clef: curl centered on the G line (y=0). */
function TreblePath() {
  return (
    <g className="clef-treble" fill="currentColor" stroke="none">
      <path d="M0.42,2.95 C0.42,3.28 0.16,3.48 -0.12,3.48 C-0.42,3.48 -0.62,3.22 -0.62,2.95 C-0.62,2.68 -0.42,2.48 -0.12,2.48 C0.05,2.48 0.2,2.55 0.3,2.68 L0.3,-1.65 C0.3,-2.55 -0.15,-3.2 -0.85,-3.55 C-1.2,-3.72 -1.35,-4.02 -1.22,-4.28 C-1.08,-4.55 -0.7,-4.62 -0.32,-4.42 C0.42,-4.02 0.95,-3.2 0.95,-2.28 L0.95,2.05 C1.28,1.82 1.52,1.4 1.52,0.92 C1.52,0.05 0.82,-0.55 0.02,-0.55 C-0.88,-0.55 -1.58,0.2 -1.58,1.12 C-1.58,1.95 -0.95,2.58 -0.12,2.82 C0.08,2.88 0.28,2.9 0.42,2.85 Z M0.3,0.42 C0.55,0.55 0.78,0.78 0.78,1.12 C0.78,1.52 0.45,1.82 0.05,1.82 C-0.4,1.82 -0.7,1.45 -0.7,1.05 C-0.7,0.68 -0.42,0.42 -0.05,0.42 C0.08,0.42 0.2,0.42 0.3,0.42 Z" />
    </g>
  );
}

/** F-clef: bulb on the F line (y=0) with two dots to the right. */
function BassPath() {
  return (
    <g className="clef-bass" fill="currentColor" stroke="none">
      <path d="M-1.05,-0.15 C-1.05,-0.95 -0.35,-1.55 0.45,-1.55 C1.15,-1.55 1.65,-1.05 1.65,-0.25 C1.65,0.85 0.55,1.55 -0.35,1.85 L-0.35,1.15 C0.25,0.95 0.85,0.55 0.85,-0.15 C0.85,-0.55 0.55,-0.85 0.15,-0.85 C-0.25,-0.85 -0.45,-0.55 -0.45,-0.15 C-0.45,0.25 -0.15,0.45 0.25,0.55 L0.25,1.25 C-0.55,1.05 -1.05,0.45 -1.05,-0.15 Z" />
      <circle cx="2.05" cy="-0.4" r="0.2" />
      <circle cx="2.05" cy="0.4" r="0.2" />
    </g>
  );
}

/** C-clef (alto/tenor): brace center on the C line (y=0). */
function CClefPath() {
  return (
    <g className="clef-c" fill="currentColor" stroke="none">
      <rect x="-0.55" y="-1.7" width="0.38" height="3.4" rx="0.06" />
      <path d="M-0.12,-1.7 C0.85,-1.7 1.55,-1.15 1.55,-0.5 C1.55,-0.08 1.2,0.18 0.65,0.28 L-0.12,0.28 L-0.12,-0.28 C0.42,-0.28 0.82,-0.5 0.82,-0.85 C0.82,-1.28 0.4,-1.48 -0.12,-1.48 Z" />
      <path d="M-0.12,1.7 C0.85,1.7 1.55,1.15 1.55,0.5 C1.55,0.08 1.2,-0.18 0.65,-0.28 L-0.12,-0.28 L-0.12,0.28 C0.42,0.28 0.82,0.5 0.82,0.85 C0.82,1.28 0.4,1.48 -0.12,1.48 Z" />
    </g>
  );
}
