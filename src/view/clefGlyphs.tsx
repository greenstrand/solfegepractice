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

/** G-clef: curl and inner spiral sit on the G line (y=0). */
function TreblePath() {
  return (
    <g className="clef-treble" fill="currentColor" stroke="none">
      <path d="M 0.55 2.85 C 0.55 3.15 0.32 3.35 0.05 3.35 C -0.28 3.35 -0.52 3.08 -0.52 2.78 C -0.52 2.48 -0.28 2.25 0.05 2.25 C 0.22 2.25 0.38 2.32 0.48 2.45 L 0.48 -1.55 C 0.48 -2.35 0.05 -2.95 -0.55 -3.25 C -0.95 -3.45 -1.15 -3.75 -1.05 -4.05 C -0.95 -4.35 -0.55 -4.45 -0.15 -4.25 C 0.55 -3.9 1.05 -3.15 1.05 -2.25 L 1.05 2.15 C 1.35 1.95 1.55 1.55 1.55 1.1 C 1.55 0.25 0.85 -0.35 0.05 -0.35 C -0.85 -0.35 -1.55 0.35 -1.55 1.25 C -1.55 2.05 -0.95 2.65 -0.15 2.85 C 0.05 2.9 0.25 2.9 0.45 2.85 C 0.48 2.85 0.52 2.85 0.55 2.85 Z M 0.48 0.55 C 0.72 0.7 0.9 0.9 0.9 1.2 C 0.9 1.55 0.6 1.85 0.2 1.85 C -0.25 1.85 -0.55 1.5 -0.55 1.1 C -0.55 0.75 -0.3 0.5 0.05 0.5 C 0.2 0.5 0.35 0.52 0.48 0.55 Z" />
    </g>
  );
}

/** F-clef: two arcs + dots straddling the F line (y=0). */
function BassPath() {
  return (
    <g className="clef-bass" fill="currentColor" stroke="none">
      <path d="M -0.85 -0.95 C -0.15 -1.45 0.55 -1.15 0.85 -0.55 C 1.15 0.1 0.95 0.85 0.35 1.25 C -0.25 1.65 -1.05 1.45 -1.35 0.85 C -1.55 0.5 -1.45 0.15 -1.15 0.0 C -0.85 -0.15 -0.55 0.05 -0.45 0.35 C -0.25 0.85 0.15 1.05 0.55 0.75 C 0.85 0.55 0.95 0.15 0.75 -0.15 C 0.55 -0.5 0.15 -0.7 -0.25 -0.55 C -0.55 -0.45 -0.85 -0.55 -0.95 -0.75 C -1.05 -0.9 -0.95 -0.95 -0.85 -0.95 Z" />
      <circle cx="1.45" cy="-0.35" r="0.18" />
      <circle cx="1.45" cy="0.35" r="0.18" />
    </g>
  );
}

/** C-clef (alto/tenor): center of the brace sits on the C line (y=0). */
function CClefPath() {
  return (
    <g className="clef-c" fill="currentColor" stroke="none">
      <rect x="-0.45" y="-1.6" width="0.32" height="3.2" rx="0.05" />
      {/* Upper lobe */}
      <path d="M -0.1 -1.6 C 0.7 -1.6 1.35 -1.15 1.35 -0.55 C 1.35 -0.15 1.05 0.1 0.55 0.2 L -0.1 0.2 L -0.1 -0.25 C 0.35 -0.25 0.7 -0.45 0.7 -0.75 C 0.7 -1.15 0.35 -1.35 -0.1 -1.35 Z" />
      {/* Lower lobe */}
      <path d="M -0.1 1.6 C 0.7 1.6 1.35 1.15 1.35 0.55 C 1.35 0.15 1.05 -0.1 0.55 -0.2 L -0.1 -0.2 L -0.1 0.25 C 0.35 0.25 0.7 0.45 0.7 0.75 C 0.7 1.15 0.35 1.35 -0.1 1.35 Z" />
    </g>
  );
}
