/** Discrete staff positions: middle line = 10. Window size from ledger line count. No SVG. */

export const MIDDLE_LINE = 10;

/** Five staff lines, bottom to top. */
export const STAFF_LINES = [6, 8, 10, 12, 14] as const;

export const DEFAULT_LEDGER_LINES = 3;
export const MIN_LEDGER_LINES = 0;
export const MAX_LEDGER_LINES = 4;

const STAFF_BOTTOM = STAFF_LINES[0];
const STAFF_TOP = STAFF_LINES[STAFF_LINES.length - 1];

/** Clamp ledger-line count to the supported 0..4 range. */
export function clampLedgerLines(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_LEDGER_LINES;
  }
  return Math.min(MAX_LEDGER_LINES, Math.max(MIN_LEDGER_LINES, Math.round(n)));
}

/** Lowest playable position for N ledger lines above and below the staff. */
export function minPosition(ledgerLines: number = DEFAULT_LEDGER_LINES): number {
  return STAFF_BOTTOM - 2 * clampLedgerLines(ledgerLines);
}

/** Highest playable position for N ledger lines above and below the staff. */
export function maxPosition(ledgerLines: number = DEFAULT_LEDGER_LINES): number {
  return STAFF_TOP + 2 * clampLedgerLines(ledgerLines);
}

/** Default window (N=3): positions 0-20 inclusive. */
export const MIN_POSITION = minPosition(DEFAULT_LEDGER_LINES);
export const MAX_POSITION = maxPosition(DEFAULT_LEDGER_LINES);

/** Ledger line positions for N (below ascending, then above ascending). */
export function ledgerLinePositions(ledgerLines: number = DEFAULT_LEDGER_LINES): number[] {
  const n = clampLedgerLines(ledgerLines);
  const below: number[] = [];
  const above: number[] = [];
  for (let i = n; i >= 1; i--) {
    below.push(STAFF_BOTTOM - 2 * i);
  }
  for (let i = 1; i <= n; i++) {
    above.push(STAFF_TOP + 2 * i);
  }
  return [...below, ...above];
}

/** Ledger line positions in the default window (three below, three above). */
export const LEDGER_LINE_POSITIONS = ledgerLinePositions(DEFAULT_LEDGER_LINES);

export function isInStaffWindow(
  position: number,
  ledgerLines: number = DEFAULT_LEDGER_LINES,
): boolean {
  const lo = minPosition(ledgerLines);
  const hi = maxPosition(ledgerLines);
  return Number.isInteger(position) && position >= lo && position <= hi;
}

export function isStaffLine(position: number): boolean {
  return (STAFF_LINES as readonly number[]).includes(position);
}

/**
 * Ledger line positions required to notate a note at `position`.
 * Empty when the note sits on or between the five staff lines.
 * Only lines within the configured N are returned.
 */
export function ledgerLinesFor(
  position: number,
  ledgerLines: number = DEFAULT_LEDGER_LINES,
): number[] {
  const n = clampLedgerLines(ledgerLines);
  if (position < STAFF_BOTTOM) {
    const below: number[] = [];
    for (let i = n; i >= 1; i--) {
      below.push(STAFF_BOTTOM - 2 * i);
    }
    return below.filter((line) => position <= line);
  }
  if (position > STAFF_TOP) {
    const above: number[] = [];
    for (let i = 1; i <= n; i++) {
      above.push(STAFF_TOP + 2 * i);
    }
    return above.filter((line) => position >= line);
  }
  return [];
}

export function needsLedger(position: number, ledgerLines: number = DEFAULT_LEDGER_LINES): boolean {
  return ledgerLinesFor(position, ledgerLines).length > 0;
}
