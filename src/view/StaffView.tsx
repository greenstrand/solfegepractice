/** One staff row: lines, ledgers, clefs, noteheads, playhead, solfege labels. */

import { solfegeFor } from "../model/clefSolfegeMap";
import type { DrillNote } from "../model/generate";
import type { NoteVisibility } from "../model/session";
import { STAFF_LINES, ledgerLinesFor } from "../model/staffWindow";
import { CLEF_REF_POSITION, ClefGlyph } from "./clefGlyphs";
import {
  CLEF_INSET,
  LEDGER_HALF_WIDTH,
  NOTEHEAD_RADIUS,
  NOTE_SLOT_WIDTH,
  STAFF_PAD_BOTTOM,
  STAFF_PAD_TOP,
  middleLineYFromTop,
  noteCenterX,
  positionToY,
  staffRowHeight,
  staffRowWidth,
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
  /** Peek styling when Hold-F focus peek is active (labels come from visibilityFor). */
  focusPeek?: boolean;
  showCursor?: boolean;
  className?: string;
};

export function StaffView({
  notes,
  startIndex,
  playhead,
  visibilityFor,
  showRowStartClef = false,
  focusPeek = false,
  showCursor = true,
  className = "staff-view",
}: StaffViewProps) {
  const width = staffRowWidth(notes.length);
  const height = staffRowHeight();
  const midY = middleLineYFromTop();
  const labelY = height - STAFF_PAD_BOTTOM / 2;
  const slotHalf = NOTE_SLOT_WIDTH / 2;

  const playheadLocal =
    playhead !== undefined && playhead >= startIndex && playhead < startIndex + notes.length
      ? playhead - startIndex
      : -1;

  return (
    <svg
      className={className}
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
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
          x={noteCenterX(playheadLocal) - slotHalf - 2}
          y={STAFF_PAD_TOP - 4}
          width={NOTE_SLOT_WIDTH + 4}
          height={height - STAFF_PAD_TOP - STAFF_PAD_BOTTOM + 8}
          rx={3}
        />
      ) : null}

      {notes.map((note, localIndex) => {
        const absoluteIndex = startIndex + localIndex;
        const vis = visibilityFor(absoluteIndex);
        const cx = noteCenterX(localIndex);
        const cy = positionToY(note.position, midY);
        const showClef =
          vis.noteVisible && (vis.clefVisible || (localIndex === 0 && showRowStartClef));

        return (
          <g key={absoluteIndex} className="staff-note" data-index={absoluteIndex}>
            {showClef ? (
              <ClefGlyph
                clef={note.clef}
                x={localIndex === 0 ? 6 : cx - CLEF_INSET * 0.85}
                refY={positionToY(CLEF_REF_POSITION[note.clef], midY)}
              />
            ) : null}

            {vis.noteVisible
              ? ledgerLinesFor(note.position).map((ledgerPos) => {
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
                className={`solfege-label${focusPeek ? " solfege-label-peek" : ""}`}
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
