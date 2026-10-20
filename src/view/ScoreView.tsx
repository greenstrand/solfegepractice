/** Multi-row score grid. Props-driven; no session mutation. */

import { useEffect, useRef, useState } from "react";
import type { DrillNote } from "../model/generate";
import type { NoteVisibility } from "../model/session";
import { StaffView } from "./StaffView";
import { notesPerRowForWidth } from "./staffLayout";
import "../styles/score.css";

export type ScoreViewProps = {
  notes: DrillNote[];
  playhead: number;
  visibilityFor: (index: number) => NoteVisibility;
  /** Override measured notes-per-row (tests). */
  notesPerRow?: number;
  /** Peek label styling; label visibility comes from visibilityFor opts. */
  focusPeek?: boolean;
  showCursor?: boolean;
  className?: string;
};

const MIN_NOTES_PER_ROW = 8;
const MAX_NOTES_PER_ROW = 32;

/** Notes-per-row from container width at fixed 1:1 staff geometry. */
export function notesPerRowFromWidth(width: number): number {
  return notesPerRowForWidth(width, MIN_NOTES_PER_ROW, MAX_NOTES_PER_ROW);
}

export function ScoreView({
  notes,
  playhead,
  visibilityFor,
  notesPerRow: notesPerRowProp,
  focusPeek = false,
  showCursor = true,
  className = "score-view",
}: ScoreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredPerRow, setMeasuredPerRow] = useState(MAX_NOTES_PER_ROW);

  useEffect(() => {
    if (notesPerRowProp !== undefined) {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const apply = (width: number) => {
      setMeasuredPerRow(notesPerRowFromWidth(width));
    };
    apply(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        apply(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [notesPerRowProp]);

  const perRow = Math.max(1, notesPerRowProp ?? measuredPerRow);
  const rows: { notes: DrillNote[]; startIndex: number }[] = [];

  for (let start = 0; start < notes.length; start += perRow) {
    rows.push({
      notes: notes.slice(start, start + perRow),
      startIndex: start,
    });
  }

  return (
    <div ref={containerRef} className={className} aria-label="Score">
      {rows.map((row) => (
        <div key={row.startIndex} className="score-row">
          <StaffView
            notes={row.notes}
            startIndex={row.startIndex}
            playhead={playhead}
            visibilityFor={visibilityFor}
            focusPeek={focusPeek}
            showRowStartClef
            showCursor={showCursor}
            slotCount={perRow}
          />
        </div>
      ))}
    </div>
  );
}
