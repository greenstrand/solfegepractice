/** One staff row: lines, ledgers, clefs, noteheads, playhead, solfege labels. */

import { solfegeFor } from "../model/clefSolfegeMap";
import type { DrillNote } from "../model/generate";
import type { NoteVisibility } from "../model/session";
import { DEFAULT_LEDGER_LINES, STAFF_LINES, ledgerLinesFor } from "../model/staffWindow";
import { CLEF_REF_POSITION, ClefGlyph } from "./clefGlyphs";
import {
  LEDGER_HALF_WIDTH,
  MID_CLEF_EXTRA,
  NOTEHEAD_RADIUS,
  NOTE_SLOT_WIDTH,
  STAFF_PAD_BOTTOM,
  STAFF_PAD_TOP,
  equalizeRowToWidth,
  midClefChangeCount,
  midClefExtraBeforeSlot,
  middleLineYFromTop,
  noteCenterX,
  positionToY,
  staffRowHeight,
} from "./staffLayout";

export type StaffViewProps = {
  /** Notes for this row only. */
  notes: DrillNote[];
  /** Absolute index of notes[0] in the full sequence. */
  startIndex: number;
  /** Absolute playhead index; highlight when it falls in this row. */
  playhead?: number;
  visibilityFor: (absoluteIndex: number) => NoteVisibility;
  /**
   * When true and the first note is visible, draw its clef even if the clef
   * run began on a previous row.
   */
  showRowStartClef?: boolean;
  showCursor?: boolean;
  /**
   * Horizontal slot capacity for this row (notes-per-row). Staff line span uses
   * max(notes.length, slotCount) so short final rows keep the same 1:1 scale.
   */
  slotCount?: number;
  /**
   * Shared SVG width for all rows in a score (max base width). Shorter rows
   * absorb leftover into mid-clef pads or trailing end pad.
   */
  targetWidth?: number;
  /** Max ledger lines above/below; drives reserved SVG height and ledger draw. */
  ledgerLines?: number;
  className?: string;
};

export function StaffView({
  notes,
  startIndex,
  playhead,
  visibilityFor,
  showRowStartClef = false,
  showCursor = true,
  slotCount,
  targetWidth,
  ledgerLines = DEFAULT_LEDGER_LINES,
  className = "staff-view",
}: StaffViewProps) {
  const midClefs = midClefChangeCount(notes);
  const slots = Math.max(notes.length, slotCount ?? notes.length);
  // Width/height are CSS pixels: viewBox user units map 1:1 so STAFF_SPACING
  // and clef fontSize never depend on note count or mid-clef density.
  const { midClefGap, width } = equalizeRowToWidth(midClefs, targetWidth ?? 0, slots);
  const height = staffRowHeight(undefined, undefined, ledgerLines);
  const midY = middleLineYFromTop(undefined, ledgerLines);
  const labelY = height - STAFF_PAD_BOTTOM / 2;
  const slotHalf = NOTE_SLOT_WIDTH / 2;

  const playheadLocal =
    playhead !== undefined && playhead >= startIndex && playhead < startIndex + notes.length
      ? playhead - startIndex
      : -1;
  const playheadCx =
    playheadLocal >= 0
      ? noteCenterX(
          playheadLocal,
          undefined,
          midClefExtraBeforeSlot(notes, playheadLocal, midClefGap),
        )
      : 0;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-label="Staff row"
    >
      <g className="staff-lines" stroke="currentColor" strokeWidth={1.25} fill="none">
        {STAFF_LINES.map((linePos) => {
          const y = positionToY(linePos, midY);
          return <line key={linePos} className="staff-line" x1={0} x2={width} y1={y} y2={y} />;
        })}
      </g>

      {showCursor && playheadLocal >= 0 ? (
        <rect
          className="playhead"
          x={playheadCx - slotHalf - 2}
          y={STAFF_PAD_TOP - 4}
          width={NOTE_SLOT_WIDTH + 4}
          height={height - STAFF_PAD_TOP - STAFF_PAD_BOTTOM + 8}
          rx={3}
        />
      ) : null}

      {notes.map((note, localIndex) => {
        const absoluteIndex = startIndex + localIndex;
        const vis = visibilityFor(absoluteIndex);
        const midExtra = midClefExtraBeforeSlot(notes, localIndex, midClefGap);
        const cx = noteCenterX(localIndex, undefined, midExtra);
        const cy = positionToY(note.position, midY);
        const showClef =
          vis.noteVisible && (vis.clefVisible || (localIndex === 0 && showRowStartClef));
        // Row-start uses left inset; mid-row clef sits MID_CLEF_EXTRA before the
        // note slot so leftover equalization pads before the glyph, not after.
        const clefX = localIndex === 0 ? 6 : cx - slotHalf - MID_CLEF_EXTRA + 4;

        return (
          <g key={absoluteIndex} className="staff-note" data-index={absoluteIndex}>
            {showClef ? (
              <ClefGlyph
                clef={note.clef}
                x={clefX}
                refY={positionToY(CLEF_REF_POSITION[note.clef], midY)}
              />
            ) : null}

            {vis.noteVisible
              ? ledgerLinesFor(note.position, ledgerLines).map((ledgerPos) => {
                  const ly = positionToY(ledgerPos, midY);
                  return (
                    <line
                      key={`ledger-${absoluteIndex}-${ledgerPos}`}
                      className="ledger-line"
                      x1={cx - LEDGER_HALF_WIDTH}
                      x2={cx + LEDGER_HALF_WIDTH}
                      y1={ly}
                      y2={ly}
                      stroke="currentColor"
                      strokeWidth={1.25}
                    />
                  );
                })
              : null}

            {vis.noteVisible ? (
              <ellipse
                className="notehead"
                cx={cx}
                cy={cy}
                rx={NOTEHEAD_RADIUS * 1.15}
                ry={NOTEHEAD_RADIUS}
                fill="currentColor"
                transform={`rotate(-20 ${cx} ${cy})`}
              />
            ) : null}

            {vis.labelVisible ? (
              <text
                className="solfege-label"
                x={cx}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {solfegeFor(note.position, note.clef)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
