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

/** G-clef: spiral through the G line (y=0) with a clear bottom loop. */
function TreblePath() {
  return (
    <g className="clef-treble" fill="currentColor" stroke="none">
      <path d="M0.35,3.05 C0.35,3.42 0.05,3.65 -0.28,3.65 C-0.62,3.65 -0.88,3.38 -0.88,3.05 C-0.88,2.72 -0.62,2.48 -0.28,2.48 C-0.08,2.48 0.1,2.58 0.2,2.75 L0.2,-1.55 C0.2,-2.55 -0.35,-3.25 -1.05,-3.55 C-1.35,-3.68 -1.48,-3.95 -1.35,-4.2 C-1.2,-4.48 -0.82,-4.55 -0.45,-4.35 C0.35,-3.92 0.95,-3.05 0.95,-2.05 L0.95,1.95 C1.35,1.68 1.62,1.2 1.62,0.65 C1.62,-0.35 0.85,-1.05 -0.15,-1.05 C-1.2,-1.05 -1.95,-0.2 -1.95,0.9 C-1.95,1.9 -1.15,2.65 -0.15,2.9 C0.08,2.95 0.22,2.98 0.35,2.95 Z M0.2,0.15 C0.55,0.32 0.85,0.62 0.85,1.05 C0.85,1.55 0.45,1.92 -0.05,1.92 C-0.55,1.92 -0.92,1.5 -0.92,1.0 C-0.92,0.55 -0.55,0.22 -0.08,0.22 C0.02,0.22 0.12,0.18 0.2,0.15 Z" />
    </g>
  );
}

/** F-clef: bold bulb on the F line (y=0) with two dots to the right. */
function BassPath() {
  return (
    <g className="clef-bass" fill="currentColor" stroke="none">
      <path d="M-1.15,0.05 C-1.15,-1.0 -0.25,-1.7 0.7,-1.7 C1.55,-1.7 2.15,-1.1 2.15,-0.15 C2.15,1.15 0.85,1.95 -0.35,2.25 L-0.35,1.4 C0.45,1.15 1.25,0.65 1.25,-0.1 C1.25,-0.55 0.9,-0.9 0.4,-0.9 C-0.1,-0.9 -0.4,-0.55 -0.4,-0.05 C-0.4,0.4 0.0,0.65 0.45,0.75 L0.45,1.55 C-0.5,1.35 -1.15,0.7 -1.15,0.05 Z" />
      <circle cx="2.55" cy="-0.55" r="0.28" />
      <circle cx="2.55" cy="0.55" r="0.28" />
    </g>
  );
}

/** C-clef (alto/tenor): thick spine with mirrored C bowls centered on y=0. */
function CClefPath() {
  return (
    <g className="clef-c" fill="currentColor" stroke="none">
      <rect x="-0.7" y="-1.85" width="0.48" height="3.7" rx="0.08" />
      <path d="M-0.15,-1.85 C1.05,-1.85 1.85,-1.15 1.85,-0.4 C1.85,0.05 1.45,0.35 0.75,0.42 L-0.15,0.42 L-0.15,-0.35 C0.55,-0.35 1.05,-0.55 1.05,-0.95 C1.05,-1.4 0.5,-1.6 -0.15,-1.6 Z" />
      <path d="M-0.15,1.85 C1.05,1.85 1.85,1.15 1.85,0.4 C1.85,-0.05 1.45,-0.35 0.75,-0.42 L-0.15,-0.42 L-0.15,0.35 C0.55,0.35 1.05,0.55 1.05,0.95 C1.05,1.4 0.5,1.6 -0.15,1.6 Z" />
    </g>
  );
}
