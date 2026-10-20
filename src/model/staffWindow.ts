/** Discrete staff positions: 0-20 inclusive, middle line = 10. No SVG / pixel geometry. */

export const MIN_POSITION = 0;
export const MAX_POSITION = 20;
export const MIDDLE_LINE = 10;

/** Five staff lines, bottom to top. */
export const STAFF_LINES = [6, 8, 10, 12, 14] as const;

/** Ledger line positions in the window (three below, three above). */
export const LEDGER_LINE_POSITIONS = [0, 2, 4, 16, 18, 20] as const;

const STAFF_BOTTOM = STAFF_LINES[0];
const STAFF_TOP = STAFF_LINES[STAFF_LINES.length - 1];

const LEDGER_BELOW = [0, 2, 4] as const;
const LEDGER_ABOVE = [16, 18, 20] as const;

export function isInStaffWindow(position: number): boolean {
  return Number.isInteger(position) && position >= MIN_POSITION && position <= MAX_POSITION;
}

export function isStaffLine(position: number): boolean {
  return (STAFF_LINES as readonly number[]).includes(position);
}

/**
 * Ledger line positions required to notate a note at `position`.
 * Empty when the note sits on or between the five staff lines.
 */
export function ledgerLinesFor(position: number): number[] {
  if (position < STAFF_BOTTOM) {
    return LEDGER_BELOW.filter((line) => position <= line);
  }
  if (position > STAFF_TOP) {
    return LEDGER_ABOVE.filter((line) => position >= line);
  }
  return [];
}

export function needsLedger(position: number): boolean {
  return ledgerLinesFor(position).length > 0;
}
