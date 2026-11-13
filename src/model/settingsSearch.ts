/** Pure DrillSettings <-> location.search codec (bitpacked s + bpm + seed). No History/DOM. */

import { CLEFS, type Clef } from "./clefSolfegeMap";
import {
  DEFAULT_SETTINGS,
  type DrillSettings,
  clampBpm,
  clampDifficulty,
  clampRevealN,
} from "./session";
import { clampLedgerLines } from "./staffWindow";

const PACK_VERSION = 1;
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SEED_MAX = 0xffffffff;

export type ParseSearchResult = {
  settings: DrillSettings;
  loadError: boolean;
  needsSeed: boolean;
};

/** Parse location.search (with or without leading ?). */
export function parseSearch(search: string): ParseSearchResult {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const bpm = parseBpmParam(params.get("bpm"));
  const seedParsed = parseSeedParam(params.get("seed"));
  const sRaw = params.get("s");

  if (sRaw === null || sRaw === "") {
    return {
      settings: normalizeSettings({ ...DEFAULT_SETTINGS, bpm, seed: seedParsed.seed }),
      loadError: seedParsed.seedError,
      needsSeed: seedParsed.needsSeed,
    };
  }

  const packed = unpackSettingsBits(sRaw);
  if (packed === null) {
    return {
      settings: normalizeSettings({ ...DEFAULT_SETTINGS, bpm, seed: seedParsed.seed }),
      loadError: true,
      needsSeed: seedParsed.needsSeed,
    };
  }

  return {
    settings: normalizeSettings({ ...packed, bpm, seed: seedParsed.seed }),
    loadError: seedParsed.seedError,
    needsSeed: seedParsed.needsSeed,
  };
}

/**
 * Serialize settings to a search string matching location.search shape.
 * Always emits seed; omits s/bpm when they match defaults.
 */
export function serializeSearch(settings: DrillSettings): string {
  const normalized = normalizeSettings(settings);
  const params = new URLSearchParams();

  const s = packSettingsBits(normalized);
  const defaultS = packSettingsBits(DEFAULT_SETTINGS);
  if (s !== defaultS) {
    params.set("s", s);
  }
  if (normalized.bpm !== DEFAULT_SETTINGS.bpm) {
    params.set("bpm", String(normalized.bpm));
  }
  params.set("seed", String(normalized.seed));

  return `?${params.toString()}`;
}

/**
 * GenerationParams identity only; stable across bpm and view-pref changes.
 * Not the on-wire `s` value (that still packs view bits via packSettingsBits).
 */
export function generationKey(settings: DrillSettings): string {
  return `${packGenerationBits(settings)}:${String(settings.seed)}`;
}

/**
 * True when next settings keep the same generationKey as prevSearch but differ in
 * serializeSearch (bpm-only, view-only, or both).
 */
export function isNonGenerationSearchChange(
  prevSearch: string,
  nextSettings: DrillSettings,
): boolean {
  const prevSettings = parseSearch(prevSearch).settings;
  if (generationKey(prevSettings) !== generationKey(nextSettings)) {
    return false;
  }
  return serializeSearch(prevSettings) !== serializeSearch(nextSettings);
}

function normalizeSettings(settings: DrillSettings): DrillSettings {
  const mixClefs = settings.mixClefs === true;
  const selected = CLEFS.filter((c) => settings.clefs.includes(c));
  let clefs: Clef[];
  if (selected.length === 0) {
    clefs = ["treble"];
  } else if (!mixClefs) {
    clefs = [selected[0] as Clef];
  } else {
    clefs = [...selected];
  }

  return {
    clefs,
    mixClefs,
    difficulty: clampDifficulty(settings.difficulty),
    ledgerLines: clampLedgerLines(settings.ledgerLines),
    bpm: clampBpm(settings.bpm),
    revealN: clampRevealN(settings.revealN),
    showAnswers: settings.showAnswers === true,
    revealEnabled: settings.revealEnabled === true,
    highlightDo: settings.highlightDo === true,
    highlightSol: settings.highlightSol === true,
    seed: settings.seed,
  };
}

function parseBpmParam(raw: string | null): number {
  if (raw === null || raw === "") {
    return DEFAULT_SETTINGS.bpm;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.bpm;
  }
  return clampBpm(n);
}

/**
 * Seed grammar: absent -> needsSeed; present must match /^\d+$/ and lie in
 * [0, 0xffffffff]. Never parseInt/>>>0-coerce garbage into a valid seed.
 */
function parseSeedParam(raw: string | null): {
  seed: number;
  needsSeed: boolean;
  seedError: boolean;
} {
  if (raw === null) {
    return { seed: DEFAULT_SETTINGS.seed, needsSeed: true, seedError: false };
  }
  if (!/^\d+$/.test(raw)) {
    return { seed: DEFAULT_SETTINGS.seed, needsSeed: true, seedError: true };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > SEED_MAX) {
    return { seed: DEFAULT_SETTINGS.seed, needsSeed: true, seedError: true };
  }
  return { seed: n, needsSeed: false, seedError: false };
}

/** Pack GenerationParams into the high bit fields of the 32-bit layout. */
function generationBits(settings: DrillSettings): number {
  const normalized = normalizeSettings(settings);
  let clefsMask = 0;
  for (let i = 0; i < CLEFS.length; i++) {
    const clef = CLEFS[i];
    if (clef !== undefined && normalized.clefs.includes(clef)) {
      clefsMask |= 1 << i;
    }
  }

  let bits = 0;
  bits |= (PACK_VERSION & 0xf) << 28;
  bits |= (normalized.mixClefs ? 1 : 0) << 27;
  bits |= (clefsMask & 0xf) << 23;
  bits |= (normalized.difficulty & 0xf) << 19;
  bits |= (normalized.ledgerLines & 0x7) << 16;
  return bits;
}

function bitsToBase64Url(bits: number): string {
  const bytes = new Uint8Array([
    (bits >>> 24) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 8) & 0xff,
    bits & 0xff,
  ]);
  return encodeBase64Url(bytes);
}

/** Stable GenerationParams key without seed (seed appended in generationKey). */
function packGenerationBits(settings: DrillSettings): string {
  return bitsToBase64Url(generationBits(settings));
}

/** Pack non-bpm fields (gen + view) to base64url (no padding). On-wire `s` layout. */
function packSettingsBits(settings: DrillSettings): string {
  const normalized = normalizeSettings(settings);
  let bits = generationBits(normalized);
  bits |= (normalized.revealEnabled ? 1 : 0) << 15;
  bits |= (normalized.showAnswers ? 1 : 0) << 14;
  bits |= (normalized.revealN & 0xff) << 6;
  bits |= (normalized.highlightDo ? 1 : 0) << 5;
  bits |= (normalized.highlightSol ? 1 : 0) << 4;
  // reserved bits 0-3 stay 0
  return bitsToBase64Url(bits);
}

/** Unpack s; null if corrupt or unknown version. Reserved bits ignored on read. */
function unpackSettingsBits(s: string): Omit<DrillSettings, "bpm" | "seed"> | null {
  const bytes = decodeBase64Url(s);
  if (bytes === null || bytes.length !== 4) {
    return null;
  }

  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;
  const b2 = bytes[2] ?? 0;
  const b3 = bytes[3] ?? 0;
  const bits = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;

  const version = (bits >>> 28) & 0xf;
  if (version !== PACK_VERSION) {
    return null;
  }

  const mixClefs = ((bits >>> 27) & 0x1) === 1;
  const clefsMask = (bits >>> 23) & 0xf;
  const difficultyRaw = (bits >>> 19) & 0xf;
  const ledgerRaw = (bits >>> 16) & 0x7;
  const revealEnabled = ((bits >>> 15) & 0x1) === 1;
  const showAnswers = ((bits >>> 14) & 0x1) === 1;
  const revealN = (bits >>> 6) & 0xff;
  const highlightDo = ((bits >>> 5) & 0x1) === 1;
  const highlightSol = ((bits >>> 4) & 0x1) === 1;
  // reserved bits 0-3 ignored on read

  const clefs: Clef[] = [];
  for (let i = 0; i < CLEFS.length; i++) {
    const clef = CLEFS[i];
    if (clef !== undefined && (clefsMask & (1 << i)) !== 0) {
      clefs.push(clef);
    }
  }

  return {
    clefs,
    mixClefs,
    difficulty: clampDifficulty(difficultyRaw),
    ledgerLines: clampLedgerLines(ledgerRaw),
    revealEnabled,
    showAnswers,
    revealN: clampRevealN(revealN),
    highlightDo,
    highlightSol,
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let bitBuf = 0;
  let bitCount = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    bitBuf = (bitBuf << 8) | (bytes[i] ?? 0);
    bitCount += 8;
    while (bitCount >= 6) {
      bitCount -= 6;
      out += B64URL.charAt((bitBuf >> bitCount) & 63);
    }
  }
  if (bitCount > 0) {
    out += B64URL.charAt((bitBuf << (6 - bitCount)) & 63);
  }
  return out;
}

function decodeBase64Url(s: string): Uint8Array | null {
  if (s.length === 0 || !/^[A-Za-z0-9_-]+$/.test(s)) {
    return null;
  }
  let bitBuf = 0;
  let bitCount = 0;
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const idx = B64URL.indexOf(ch);
    if (idx < 0) {
      return null;
    }
    bitBuf = (bitBuf << 6) | idx;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      out.push((bitBuf >> bitCount) & 0xff);
    }
  }
  return new Uint8Array(out);
}
