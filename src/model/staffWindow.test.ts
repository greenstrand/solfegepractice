import { describe, expect, it } from "vitest";
import {
  LEDGER_LINE_POSITIONS,
  MAX_POSITION,
  MIDDLE_LINE,
  MIN_POSITION,
  STAFF_LINES,
  isInStaffWindow,
  isStaffLine,
  ledgerLinesFor,
  needsLedger,
} from "./staffWindow";

describe("StaffWindow", () => {
  it("uses positions 0-20 inclusive with middle line 10", () => {
    expect(MIN_POSITION).toBe(0);
    expect(MAX_POSITION).toBe(20);
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

  it("ledger need helpers smoke", () => {
    expect([...LEDGER_LINE_POSITIONS]).toEqual([0, 2, 4, 16, 18, 20]);

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
});
