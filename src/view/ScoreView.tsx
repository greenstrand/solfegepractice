/** Multi-row score grid. Props-driven; no session mutation. */

import type { DrillNote } from "../model/generate";
import type { NoteVisibility } from "../model/session";
import { StaffView } from "./StaffView";
import "../styles/score.css";

export type ScoreViewProps = {
  notes: DrillNote[];
  playhead: number;
  visibilityFor: (index: number) => NoteVisibility;
  notesPerRow?: number;
  showCursor?: boolean;
  className?: string;
};

const DEFAULT_NOTES_PER_ROW = 32;

export function ScoreView({
  notes,
  playhead,
  visibilityFor,
  notesPerRow = DEFAULT_NOTES_PER_ROW,
  showCursor = true,
  className = "score-view",
}: ScoreViewProps) {
  const perRow = Math.max(1, notesPerRow);
  const rows: { notes: DrillNote[]; startIndex: number }[] = [];

  for (let start = 0; start < notes.length; start += perRow) {
    rows.push({
      notes: notes.slice(start, start + perRow),
      startIndex: start,
    });
  }

  return (
    <div className={className} aria-label="Score">
      {rows.map((row) => (
        <div key={row.startIndex} className="score-row">
          <StaffView
            notes={row.notes}
            startIndex={row.startIndex}
            playhead={playhead}
            visibilityFor={visibilityFor}
            showRowStartClef
            showCursor={showCursor}
          />
        </div>
      ))}
    </div>
  );
}
