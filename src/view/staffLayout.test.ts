import { describe, expect, it } from "vitest";
import {
  CLEF_INSET,
  MID_CLEF_EXTRA,
  NOTE_SLOT_WIDTH,
  STAFF_ROW_END_PAD,
  equalizeRowToWidth,
  staffRowWidth,
} from "./staffLayout";

describe("equalizeRowToWidth", () => {
  it("sends leftover to endPad when there are no mid-clefs; width equals target", () => {
    const noteCount = 8;
    const baseWidth = staffRowWidth(noteCount, CLEF_INSET, 0);
    const target = baseWidth + 40;
    const result = equalizeRowToWidth(0, target, noteCount);
    expect(result.width).toBe(target);
    expect(result.midClefGap).toBe(MID_CLEF_EXTRA);
    expect(result.endPad).toBe(STAFF_ROW_END_PAD + 40);
  });

  it("grows midClefGap when mid-clefs exist; note slot pitch unchanged", () => {
    const noteCount = 8;
    const midClefs = 2;
    const baseWidth = staffRowWidth(noteCount, CLEF_INSET, midClefs);
    const leftover = 50;
    const target = baseWidth + leftover;
    const result = equalizeRowToWidth(midClefs, target, noteCount);
    const perClef = Math.floor(leftover / midClefs);
    const rem = leftover - perClef * midClefs;
    expect(result.width).toBe(target);
    expect(result.midClefGap).toBe(MID_CLEF_EXTRA + perClef);
    expect(result.endPad).toBe(STAFF_ROW_END_PAD + rem);
    expect(NOTE_SLOT_WIDTH).toBe(22);
    expect(
      CLEF_INSET + noteCount * NOTE_SLOT_WIDTH + midClefs * result.midClefGap + result.endPad,
    ).toBe(result.width);
  });

  it("keeps baseWidth when target is below base (no shrink)", () => {
    const noteCount = 8;
    const midClefs = 1;
    const baseWidth = staffRowWidth(noteCount, CLEF_INSET, midClefs);
    const result = equalizeRowToWidth(midClefs, baseWidth - 30, noteCount);
    expect(result.width).toBe(baseWidth);
    expect(result.midClefGap).toBe(MID_CLEF_EXTRA);
    expect(result.endPad).toBe(STAFF_ROW_END_PAD);
  });
});
