/** Pure staff geometry: position index <-> SVG y. No DOM. */

import { MAX_POSITION, MIDDLE_LINE, MIN_POSITION } from "../model/staffWindow";

/** Pixels between adjacent staff lines (two position steps). */
export const STAFF_SPACING = 10;

/** Pixels per discrete staff position. */
export const POSITION_STEP = STAFF_SPACING / 2;

/** Horizontal pitch of one note slot. */
export const NOTE_SLOT_WIDTH = 22;

/** Left inset before the first note (clef room). */
export const CLEF_INSET = 36;

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
export function noteCenterX(slotIndex: number, clefInset: number = CLEF_INSET): number {
  return clefInset + slotIndex * NOTE_SLOT_WIDTH + NOTE_SLOT_WIDTH / 2;
}

/** Total SVG width for a row of `noteCount` slots. */
export function staffRowWidth(noteCount: number, clefInset: number = CLEF_INSET): number {
  return clefInset + noteCount * NOTE_SLOT_WIDTH + 8;
}
