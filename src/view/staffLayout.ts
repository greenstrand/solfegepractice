/** Pure staff geometry: position index <-> SVG y. No DOM. */

import { MAX_POSITION, MIDDLE_LINE, MIN_POSITION } from "../model/staffWindow";

/** Pixels between adjacent staff lines (two position steps). */
export const STAFF_SPACING = 10;

/** Pixels per discrete staff position. */
export const POSITION_STEP = STAFF_SPACING / 2;

/** Horizontal pitch of one note slot. */
export const NOTE_SLOT_WIDTH = 22;

/** Left inset before the first note (Bravura clef advance ~2.7 staff spaces). */
export const CLEF_INSET = 44;

/** Extra horizontal gap before a mid-row clef change so the glyph clears the notehead. */
export const MID_CLEF_EXTRA = Math.round(CLEF_INSET * 0.85);

/** Trailing pad after the last note slot (right margin of a row). */
export const STAFF_ROW_END_PAD = 8;

/**
 * Mid-clef gaps reserved when choosing notes-per-row from container width so
 * dense clef-change rows rarely exceed the viewport at 1:1 user-unit scale.
 */
export const NOTES_PER_ROW_MID_CLEF_BUDGET = 2;

/** Vertical padding above position MAX and below MIN for labels/ledgers. */
export const STAFF_PAD_TOP = 8;
export const STAFF_PAD_BOTTOM = 22;

/** Notehead radius relative to a staff space. */
export const NOTEHEAD_RADIUS = STAFF_SPACING * 0.42;

/** Half-width of a ledger line around a notehead. */
export const LEDGER_HALF_WIDTH = NOTEHEAD_RADIUS + 4;

/**
 * Screen y for staff position `p`. Higher pitch (larger p) is higher on the
 * staff and therefore smaller y.
 */
export function positionToY(position: number, middleLineY: number): number {
  return middleLineY - (position - MIDDLE_LINE) * POSITION_STEP;
}

/** Y of the middle staff line given top padding for the full 0..20 window. */
export function middleLineYFromTop(padTop: number = STAFF_PAD_TOP): number {
  return padTop + (MAX_POSITION - MIDDLE_LINE) * POSITION_STEP;
}

/** Total SVG height for one staff row (notes + label band). */
export function staffRowHeight(
  padTop: number = STAFF_PAD_TOP,
  padBottom: number = STAFF_PAD_BOTTOM,
): number {
  return padTop + (MAX_POSITION - MIN_POSITION) * POSITION_STEP + padBottom;
}

/** X center of note at local slot index (0-based within the row). */
export function noteCenterX(
  slotIndex: number,
  clefInset: number = CLEF_INSET,
  midClefExtraBefore = 0,
): number {
  return clefInset + slotIndex * NOTE_SLOT_WIDTH + NOTE_SLOT_WIDTH / 2 + midClefExtraBefore;
}

/**
 * Cumulative mid-clef gap for clef changes at local indices 1..slotIndex (inclusive).
 * Slot 0 uses CLEF_INSET only (row-start clef).
 */
export function midClefExtraBeforeSlot(
  notes: readonly { clef: string }[],
  slotIndex: number,
  midClefGap: number = MID_CLEF_EXTRA,
): number {
  let extra = 0;
  const last = Math.min(slotIndex, notes.length - 1);
  for (let i = 1; i <= last; i++) {
    if (notes[i].clef !== notes[i - 1].clef) {
      extra += midClefGap;
    }
  }
  return extra;
}

/** Count of mid-row clef changes in a row (local index > 0). */
export function midClefChangeCount(notes: readonly { clef: string }[]): number {
  let count = 0;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].clef !== notes[i - 1].clef) {
      count += 1;
    }
  }
  return count;
}

/** Total SVG width for a row of slots, including mid-clef gaps. */
export function staffRowWidth(
  noteCount: number,
  clefInset: number = CLEF_INSET,
  midClefCount = 0,
  midClefGap: number = MID_CLEF_EXTRA,
  endPad: number = STAFF_ROW_END_PAD,
): number {
  return clefInset + noteCount * NOTE_SLOT_WIDTH + midClefCount * midClefGap + endPad;
}

/**
 * Stretch a row to `targetWidth` without changing note-to-note pitch:
 * leftover goes into mid-clef gaps (split evenly), or trailing pad when the
 * row has no mid-line clefs. Mid-clef gap never shrinks below MID_CLEF_EXTRA.
 */
export function equalizeRowToWidth(
  midClefCount: number,
  targetWidth: number,
  noteCount: number,
  clefInset: number = CLEF_INSET,
): { midClefGap: number; endPad: number; width: number } {
  const baseWidth = staffRowWidth(noteCount, clefInset, midClefCount);
  const width = Math.max(baseWidth, targetWidth);
  const leftover = width - baseWidth;
  if (midClefCount <= 0) {
    return {
      midClefGap: MID_CLEF_EXTRA,
      endPad: STAFF_ROW_END_PAD + leftover,
      width,
    };
  }
  const perClef = Math.floor(leftover / midClefCount);
  const rem = leftover - perClef * midClefCount;
  return {
    midClefGap: MID_CLEF_EXTRA + perClef,
    endPad: STAFF_ROW_END_PAD + rem,
    width,
  };
}

/** Max base staff-row width across rows that share the same slot capacity. */
export function maxStaffRowWidth(
  rows: readonly { notes: readonly { clef: string }[] }[],
  slotCount: number,
): number {
  let max = staffRowWidth(slotCount, undefined, 0);
  for (const row of rows) {
    const w = staffRowWidth(slotCount, undefined, midClefChangeCount(row.notes));
    if (w > max) {
      max = w;
    }
  }
  return max;
}

/**
 * Notes that fit in `widthPx` at 1:1 user-unit scale (1 unit = 1 CSS px).
 * Reserves {@link NOTES_PER_ROW_MID_CLEF_BUDGET} mid-clef gaps.
 */
export function notesPerRowForWidth(
  widthPx: number,
  minNotes: number,
  maxNotes: number,
  midClefBudget: number = NOTES_PER_ROW_MID_CLEF_BUDGET,
): number {
  if (!(widthPx > 0)) {
    return maxNotes;
  }
  const usable = widthPx - CLEF_INSET - STAFF_ROW_END_PAD - midClefBudget * MID_CLEF_EXTRA;
  const count = Math.floor(usable / NOTE_SLOT_WIDTH);
  return Math.min(maxNotes, Math.max(minNotes, count));
}
