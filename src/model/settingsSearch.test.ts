import { describe, expect, it } from "vitest";
import type { DrillSettings } from "./session";
import { DEFAULT_SETTINGS, MAX_REVEAL_N, clampRevealN } from "./session";
import { isBpmOnlySearchChange, parseSearch, sequenceKey, serializeSearch } from "./settingsSearch";

/** Non-default arrange values used across codec tests. */
const SAMPLE: DrillSettings = {
  clefs: ["bass", "alto"],
  mixClefs: true,
  difficulty: 7,
  ledgerLines: 1,
  bpm: 96,
  revealN: 4,
  showAnswers: true,
  revealEnabled: true,
};

describe("clampRevealN", () => {
  it("caps at MAX_REVEAL_N", () => {
    expect(MAX_REVEAL_N).toBe(255);
    expect(clampRevealN(400)).toBe(255);
    expect(clampRevealN(-3)).toBe(0);
  });
});

describe("serializeSearch / parseSearch", () => {
  it("round-trips non-default settings", () => {
    const search = serializeSearch(SAMPLE);
    expect(search.startsWith("?")).toBe(true);
    const { settings, loadError } = parseSearch(search);
    expect(loadError).toBe(false);
    expect(settings).toEqual(SAMPLE);
  });

  it("serializes full defaults to bare empty string", () => {
    expect(serializeSearch(DEFAULT_SETTINGS)).toBe("");
    expect(
      serializeSearch({ ...DEFAULT_SETTINGS, clefs: ["treble", "bass"], mixClefs: false }),
    ).toBe("");
  });

  it("marks loadError and uses defaults for garbage or unknown-version s", () => {
    const garbage = parseSearch("?s=!!!&bpm=96");
    expect(garbage.loadError).toBe(true);
    expect(garbage.settings.bpm).toBe(96);
    expect(garbage.settings.clefs).toEqual(["treble"]);
    expect(garbage.settings.mixClefs).toBe(false);
    expect(garbage.settings.difficulty).toBe(DEFAULT_SETTINGS.difficulty);

    // version nibble 2, otherwise zeroed payload -> invalid
    const unknownVer = parseSearch("?s=IAAAAA");
    expect(unknownVer.loadError).toBe(true);
    expect(unknownVer.settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(unknownVer.settings.revealEnabled).toBe(false);
  });

  it("parses bpm missing, invalid, and valid independently of s", () => {
    expect(parseSearch("").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(parseSearch("?bpm=nope").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(parseSearch("?bpm=").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);

    const onlyBpm = parseSearch("?bpm=120");
    expect(onlyBpm.loadError).toBe(false);
    expect(onlyBpm.settings.bpm).toBe(120);
    expect(onlyBpm.settings.difficulty).toBe(DEFAULT_SETTINGS.difficulty);

    const withS = parseSearch(`${serializeSearch(SAMPLE)}`);
    expect(withS.settings.bpm).toBe(96);
  });

  it("normalizes empty clef mask to treble", () => {
    // version=1, mix=1, clefs=0, difficulty=3, ledger=3, reveal off, show off, revealN=1
    // bytes 0x18 0x1b 0x00 0x40 -> GBsAQA
    const { settings, loadError } = parseSearch("?s=GBsAQA");
    expect(loadError).toBe(false);
    expect(settings.clefs).toEqual(["treble"]);
    expect(settings.mixClefs).toBe(true);
  });

  it("when mixClefs is false, keeps only the first selected clef in CLEFS order", () => {
    const search = serializeSearch({
      ...SAMPLE,
      clefs: ["tenor", "bass"],
      mixClefs: false,
    });
    const { settings } = parseSearch(search);
    expect(settings.mixClefs).toBe(false);
    expect(settings.clefs).toEqual(["bass"]);
  });

  it("ignores unknown query keys", () => {
    const base = serializeSearch(SAMPLE);
    const withExtra = `${base}&seed=abc&foo=1`;
    const { settings, loadError } = parseSearch(withExtra);
    expect(loadError).toBe(false);
    expect(settings).toEqual(SAMPLE);
  });

  it("canonicalize is idempotent", () => {
    const once = serializeSearch(SAMPLE);
    const twice = serializeSearch(parseSearch(once).settings);
    expect(twice).toBe(once);

    const noisy = parseSearch("?bpm=60&seed=x");
    expect(serializeSearch(noisy.settings)).toBe("");

    const clamped = parseSearch("?bpm=300");
    expect(clamped.settings.bpm).toBe(240);
    expect(serializeSearch(clamped.settings)).toBe("?bpm=240");
  });
});

describe("sequenceKey / isBpmOnlySearchChange", () => {
  it("keeps sequenceKey stable across bpm-only changes", () => {
    const a = sequenceKey(SAMPLE);
    const b = sequenceKey({ ...SAMPLE, bpm: 40 });
    const c = sequenceKey({ ...SAMPLE, bpm: DEFAULT_SETTINGS.bpm });
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toBe(sequenceKey(parseSearch(serializeSearch(SAMPLE)).settings));
  });

  it("changes sequenceKey when packed settings change", () => {
    expect(sequenceKey({ ...SAMPLE, difficulty: 3 })).not.toBe(sequenceKey(SAMPLE));
    expect(sequenceKey({ ...SAMPLE, showAnswers: false })).not.toBe(sequenceKey(SAMPLE));
  });

  it("detects bpm-only vs packed s changes against prev search", () => {
    const prev = serializeSearch(SAMPLE);
    expect(isBpmOnlySearchChange(prev, { ...SAMPLE, bpm: 140 })).toBe(true);
    expect(isBpmOnlySearchChange(prev, { ...SAMPLE, bpm: SAMPLE.bpm })).toBe(false);
    expect(isBpmOnlySearchChange(prev, { ...SAMPLE, difficulty: 2 })).toBe(false);
    expect(isBpmOnlySearchChange(prev, { ...SAMPLE, difficulty: 2, bpm: 140 })).toBe(false);
    expect(isBpmOnlySearchChange("?bpm=96", { ...DEFAULT_SETTINGS, bpm: 120 })).toBe(true);
  });
});
