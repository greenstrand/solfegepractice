import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEDGER_LINES,
  LEDGER_LINE_POSITIONS,
  MAX_POSITION,
  MIDDLE_LINE,
  MIN_POSITION,
  STAFF_LINES,
  isInStaffWindow,
  isStaffLine,
  ledgerLinePositions,
  ledgerLinesFor,
  maxPosition,
  minPosition,
  needsLedger,
} from "./staffWindow";

describe("StaffWindow", () => {
  it("uses positions 0-20 inclusive with middle line 10 at default N=3", () => {
    expect(DEFAULT_LEDGER_LINES).toBe(3);
    expect(MIN_POSITION).toBe(0);
    expect(MAX_POSITION).toBe(20);
    expect(minPosition()).toBe(0);
    expect(maxPosition()).toBe(20);
    expect(MIDDLE_LINE).toBe(10);
    expect(isInStaffWindow(0)).toBe(true);
    expect(isInStaffWindow(20)).toBe(true);
    expect(isInStaffWindow(10)).toBe(true);
    expect(isInStaffWindow(-1)).toBe(false);
    expect(isInStaffWindow(21)).toBe(false);
  });

  it("places staff lines at 6,8,10,12,14", () => {
    expect([...STAFF_LINES]).toEqual([6, 8, 10, 12, 14]);
    for (const line of STAFF_LINES) {
      expect(isStaffLine(line)).toBe(true);
      expect(needsLedger(line)).toBe(false);
      expect(ledgerLinesFor(line)).toEqual([]);
    }
  });

  it("ledger need helpers smoke at default N=3", () => {
    expect([...LEDGER_LINE_POSITIONS]).toEqual([0, 2, 4, 16, 18, 20]);
    expect(ledgerLinePositions(3)).toEqual([0, 2, 4, 16, 18, 20]);

    expect(ledgerLinesFor(5)).toEqual([]);
    expect(needsLedger(5)).toBe(false);
    expect(ledgerLinesFor(4)).toEqual([4]);
    expect(ledgerLinesFor(3)).toEqual([4]);
    expect(ledgerLinesFor(2)).toEqual([2, 4]);
    expect(ledgerLinesFor(0)).toEqual([0, 2, 4]);

    expect(ledgerLinesFor(15)).toEqual([]);
    expect(needsLedger(15)).toBe(false);
    expect(ledgerLinesFor(16)).toEqual([16]);
    expect(ledgerLinesFor(17)).toEqual([16]);
    expect(ledgerLinesFor(18)).toEqual([16, 18]);
    expect(ledgerLinesFor(20)).toEqual([16, 18, 20]);

    expect(needsLedger(4)).toBe(true);
    expect(needsLedger(16)).toBe(true);
  });

  it("N=0 window is staff lines only (6..14) with no ledger positions", () => {
    expect(minPosition(0)).toBe(6);
    expect(maxPosition(0)).toBe(14);
    expect(ledgerLinePositions(0)).toEqual([]);
    expect(isInStaffWindow(5, 0)).toBe(false);
    expect(isInStaffWindow(6, 0)).toBe(true);
    expect(isInStaffWindow(14, 0)).toBe(true);
    expect(isInStaffWindow(15, 0)).toBe(false);
    expect(ledgerLinesFor(4, 0)).toEqual([]);
    expect(ledgerLinesFor(16, 0)).toEqual([]);
  });

  it("N=4 window bounds are -2..22 with four ledgers each side", () => {
    expect(minPosition(4)).toBe(-2);
    expect(maxPosition(4)).toBe(22);
    expect(ledgerLinePositions(4)).toEqual([-2, 0, 2, 4, 16, 18, 20, 22]);
    expect(isInStaffWindow(-2, 4)).toBe(true);
    expect(isInStaffWindow(-3, 4)).toBe(false);
    expect(isInStaffWindow(22, 4)).toBe(true);
    expect(isInStaffWindow(23, 4)).toBe(false);
    expect(ledgerLinesFor(-2, 4)).toEqual([-2, 0, 2, 4]);
    expect(ledgerLinesFor(22, 4)).toEqual([16, 18, 20, 22]);
  });
});
