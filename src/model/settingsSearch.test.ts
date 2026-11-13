import { describe, expect, it } from "vitest";
import type { DrillSettings } from "./session";
import { DEFAULT_SETTINGS, MAX_REVEAL_N, clampRevealN } from "./session";
import {
  generationKey,
  isNonGenerationSearchChange,
  parseSearch,
  serializeSearch,
} from "./settingsSearch";

/** Fixture: non-default gen + view + bpm + seed for codec round-trips. */
const SAMPLE: DrillSettings = {
  clefs: ["bass", "alto"],
  mixClefs: true,
  difficulty: 7,
  ledgerLines: 1,
  bpm: 96,
  revealN: 4,
  showAnswers: true,
  revealEnabled: true,
  seed: 42,
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
    expect(search).toContain("seed=42");
    const { settings, loadError, needsSeed } = parseSearch(search);
    expect(loadError).toBe(false);
    expect(needsSeed).toBe(false);
    expect(settings).toEqual(SAMPLE);
  });

  it("serializes defaults with seed only", () => {
    expect(serializeSearch(DEFAULT_SETTINGS)).toBe("?seed=0");
    expect(
      serializeSearch({ ...DEFAULT_SETTINGS, clefs: ["treble", "bass"], mixClefs: false }),
    ).toBe("?seed=0");
  });

  it("always emits seed and canonicalizes leading zeros", () => {
    const withZeros = parseSearch("?seed=00042");
    expect(withZeros.needsSeed).toBe(false);
    expect(withZeros.loadError).toBe(false);
    expect(withZeros.settings.seed).toBe(42);
    expect(serializeSearch(withZeros.settings)).toBe("?seed=42");
  });

  it("marks loadError and uses defaults for garbage or unknown-version s", () => {
    const garbage = parseSearch("?s=!!!&bpm=96&seed=7");
    expect(garbage.loadError).toBe(true);
    expect(garbage.needsSeed).toBe(false);
    expect(garbage.settings.bpm).toBe(96);
    expect(garbage.settings.seed).toBe(7);
    expect(garbage.settings.clefs).toEqual(["treble"]);
    expect(garbage.settings.mixClefs).toBe(false);
    expect(garbage.settings.difficulty).toBe(DEFAULT_SETTINGS.difficulty);

    // version nibble 2, otherwise zeroed payload -> invalid
    const unknownVer = parseSearch("?s=IAAAAA&seed=1");
    expect(unknownVer.loadError).toBe(true);
    expect(unknownVer.settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(unknownVer.settings.revealEnabled).toBe(false);
  });

  it("parses bpm missing, invalid, and valid independently of s", () => {
    expect(parseSearch("?seed=0").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(parseSearch("?bpm=nope&seed=0").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);
    expect(parseSearch("?bpm=&seed=0").settings.bpm).toBe(DEFAULT_SETTINGS.bpm);

    const onlyBpm = parseSearch("?bpm=120&seed=0");
    expect(onlyBpm.loadError).toBe(false);
    expect(onlyBpm.needsSeed).toBe(false);
    expect(onlyBpm.settings.bpm).toBe(120);
    expect(onlyBpm.settings.difficulty).toBe(DEFAULT_SETTINGS.difficulty);

    const withS = parseSearch(`${serializeSearch(SAMPLE)}`);
    expect(withS.settings.bpm).toBe(96);
  });

  it("missing seed needsSeed without loadError; invalid seed needs both", () => {
    const missing = parseSearch("");
    expect(missing.needsSeed).toBe(true);
    expect(missing.loadError).toBe(false);
    expect(missing.settings.seed).toBe(DEFAULT_SETTINGS.seed);

    const invalid = parseSearch("?seed=abc&bpm=96");
    expect(invalid.needsSeed).toBe(true);
    expect(invalid.loadError).toBe(true);
    expect(invalid.settings.bpm).toBe(96);
    expect(invalid.settings.seed).toBe(DEFAULT_SETTINGS.seed);

    const sampleSearch = serializeSearch(SAMPLE);
    const badSeedKeepsS = parseSearch(sampleSearch.replace("seed=42", "seed="));
    expect(badSeedKeepsS.needsSeed).toBe(true);
    expect(badSeedKeepsS.loadError).toBe(true);
    expect(badSeedKeepsS.settings.bpm).toBe(96);
    expect(badSeedKeepsS.settings.difficulty).toBe(SAMPLE.difficulty);
    expect(badSeedKeepsS.settings.clefs).toEqual(SAMPLE.clefs);
  });

  it("normalizes empty clef mask to treble", () => {
    // version=1, mix=1, clefs=0, difficulty=3, ledger=3, reveal off, show off, revealN=1
    // bytes 0x18 0x1b 0x00 0x40 -> GBsAQA
    const { settings, loadError } = parseSearch("?s=GBsAQA&seed=0");
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
    const withExtra = `${base}&foo=1`;
    const { settings, loadError, needsSeed } = parseSearch(withExtra);
    expect(loadError).toBe(false);
    expect(needsSeed).toBe(false);
    expect(settings).toEqual(SAMPLE);
  });

  it("canonicalize is idempotent", () => {
    const once = serializeSearch(SAMPLE);
    const twice = serializeSearch(parseSearch(once).settings);
    expect(twice).toBe(once);

    const noisy = parseSearch("?bpm=60&foo=x");
    expect(noisy.needsSeed).toBe(true);
    expect(serializeSearch(noisy.settings)).toBe("?seed=0");

    const clamped = parseSearch("?bpm=300&seed=0");
    expect(clamped.settings.bpm).toBe(240);
    expect(serializeSearch(clamped.settings)).toBe("?bpm=240&seed=0");
  });
});

describe("generationKey / isNonGenerationSearchChange", () => {
  it("keeps generationKey stable across bpm and view-pref-only changes; includes seed", () => {
    const a = generationKey(SAMPLE);
    expect(a).toContain(":42");
    expect(generationKey({ ...SAMPLE, bpm: 40 })).toBe(a);
    expect(generationKey({ ...SAMPLE, bpm: DEFAULT_SETTINGS.bpm })).toBe(a);
    expect(generationKey({ ...SAMPLE, revealEnabled: false })).toBe(a);
    expect(generationKey({ ...SAMPLE, showAnswers: false })).toBe(a);
    expect(generationKey({ ...SAMPLE, revealN: 9 })).toBe(a);
    expect(generationKey({ ...SAMPLE, seed: 99 })).not.toBe(a);
    expect(a).toBe(generationKey(parseSearch(serializeSearch(SAMPLE)).settings));
  });

  it("changes generationKey when generation params change", () => {
    expect(generationKey({ ...SAMPLE, difficulty: 3 })).not.toBe(generationKey(SAMPLE));
    expect(generationKey({ ...SAMPLE, clefs: ["treble"] })).not.toBe(generationKey(SAMPLE));
    expect(generationKey({ ...SAMPLE, ledgerLines: 4 })).not.toBe(generationKey(SAMPLE));
    expect(generationKey({ ...SAMPLE, mixClefs: false, clefs: ["bass"] })).not.toBe(
      generationKey(SAMPLE),
    );
  });

  it("detects non-generation (bpm/view) vs generation changes against prev search", () => {
    const prev = serializeSearch(SAMPLE);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, bpm: 140 })).toBe(true);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, showAnswers: false })).toBe(true);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, revealEnabled: false })).toBe(true);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, revealN: 9 })).toBe(true);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, bpm: 140, showAnswers: false })).toBe(
      true,
    );
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, bpm: SAMPLE.bpm })).toBe(false);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, difficulty: 2 })).toBe(false);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, difficulty: 2, bpm: 140 })).toBe(false);
    expect(isNonGenerationSearchChange(prev, { ...SAMPLE, seed: 99 })).toBe(false);
    expect(isNonGenerationSearchChange("?bpm=96&seed=0", { ...DEFAULT_SETTINGS, bpm: 120 })).toBe(
      true,
    );
  });

  it("round-trips still include view bits in s", () => {
    const withView = serializeSearch(SAMPLE);
    expect(withView).toContain("s=");
    const parsed = parseSearch(withView).settings;
    expect(parsed.revealEnabled).toBe(true);
    expect(parsed.showAnswers).toBe(true);
    expect(parsed.revealN).toBe(4);

    const viewOff = serializeSearch({
      ...SAMPLE,
      revealEnabled: false,
      showAnswers: false,
      revealN: 1,
    });
    expect(viewOff).not.toBe(withView);
    expect(generationKey(SAMPLE)).toBe(
      generationKey({
        ...SAMPLE,
        revealEnabled: false,
        showAnswers: false,
        revealN: 1,
      }),
    );
  });
});
