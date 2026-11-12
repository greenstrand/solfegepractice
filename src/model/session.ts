/** Session transport and progressive-reveal visibility. Pure reducers; no DOM/rAF. */

import type { Clef } from "./clefSolfegeMap";
import { type DrillNote, type Rng, SEQUENCE_LENGTH, generateDrill } from "./generate";
import { DEFAULT_LEDGER_LINES, clampLedgerLines } from "./staffWindow";

export type DrillSettings = {
  clefs: Clef[];
  /** When false, clef UI is single-select. */
  mixClefs: boolean;
  difficulty: number;
  /** Max ledger lines above and below the staff (same count each side). */
  ledgerLines: number;
  bpm: number;
  revealN: number;
  showAnswers: boolean;
  revealEnabled: boolean;
};

/** Transport fields applied on Play without regenerating notes. */
export type TransportDraft = {
  bpm: number;
  showAnswers: boolean;
};

/**
 * Playhead is 0..255 while notes are in progress.
 * On advancing past the last note, playing becomes false and playhead = SEQUENCE_LENGTH (256).
 */
export type Session = {
  settings: DrillSettings;
  notes: DrillNote[];
  playhead: number;
  playing: boolean;
  /** Fractional beat progress in [0, 1), frozen while paused. */
  beatPhase: number;
  lastTickMs: number;
};

export type NoteVisibility = {
  noteVisible: boolean;
  clefVisible: boolean;
  labelVisible: boolean;
};

export type VisibilityOpts = {
  /** Hold-F focus peek: label the playhead index when its note is visible. */
  focusPeek?: boolean;
};

export const DEFAULT_SETTINGS: DrillSettings = {
  clefs: ["treble"],
  mixClefs: false,
  difficulty: 3,
  ledgerLines: DEFAULT_LEDGER_LINES,
  bpm: 60,
  revealN: 1,
  showAnswers: false,
  revealEnabled: false,
};

/** Shared reveal window max (URL bitpack uses 8 bits). */
export const MAX_REVEAL_N = 255;

export function clampRevealN(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.revealN;
  }
  return Math.min(MAX_REVEAL_N, Math.max(0, Math.round(n)));
}

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) {
    return DEFAULT_SETTINGS.bpm;
  }
  return Math.min(240, Math.max(20, Math.round(bpm)));
}

export function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) {
    return DEFAULT_SETTINGS.difficulty;
  }
  return Math.min(10, Math.max(1, Math.round(d)));
}

export function createSession(overrides?: Partial<DrillSettings>): Session {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    notes: [],
    playhead: 0,
    playing: false,
    beatPhase: 0,
    lastTickMs: 0,
  };
}

/** Replace notes via generateDrill; reset playhead and transport phase. */
export function generate(session: Session, rng: Rng): Session {
  const ledgerLines = clampLedgerLines(session.settings.ledgerLines);
  const notes = generateDrill(
    {
      clefs: session.settings.clefs,
      difficulty: session.settings.difficulty,
      ledgerLines,
    },
    rng,
  );
  return {
    ...session,
    settings: { ...session.settings, ledgerLines },
    notes,
    playhead: 0,
    playing: false,
    beatPhase: 0,
    lastTickMs: 0,
  };
}

/**
 * Apply live transport fields from draft without regenerating notes; start playing.
 * Resumes from frozen beatPhase; sets lastTickMs to nowMs.
 * Full DrillSettings (clefs, reveal, difficulty, ledgers, etc.) apply via URL / generate.
 */
export function play(session: Session, draft: TransportDraft, nowMs: number): Session {
  return {
    ...session,
    settings: {
      ...session.settings,
      bpm: clampBpm(draft.bpm),
      showAnswers: draft.showAnswers,
    },
    playing: true,
    lastTickMs: nowMs,
  };
}

/** Patch bpm on the live session immediately (including mid-Play). */
export function setBpm(session: Session, bpm: number): Session {
  const next = clampBpm(bpm);
  if (session.settings.bpm === next) {
    return session;
  }
  return {
    ...session,
    settings: { ...session.settings, bpm: next },
  };
}

/** Absorb elapsed time into playhead/phase, then freeze (playing false). */
export function pause(session: Session, nowMs: number): Session {
  if (!session.playing) {
    return session;
  }
  const advanced = advanceByTime(session, nowMs);
  return { ...advanced, playing: false };
}

/** Reset playhead and phase; stop playing. Notes unchanged. */
export function stop(session: Session): Session {
  return {
    ...session,
    playhead: 0,
    playing: false,
    beatPhase: 0,
    lastTickMs: 0,
  };
}

/**
 * Advance playhead by floor(elapsed beats) at bpm (1 note per beat).
 * Pause freezes phase via pause(); while playing, phase carries fractional remainder.
 */
export function tick(session: Session, nowMs: number): Session {
  if (!session.playing) {
    return session;
  }
  return advanceByTime(session, nowMs);
}

function advanceByTime(session: Session, nowMs: number): Session {
  if (session.playhead >= SEQUENCE_LENGTH) {
    return { ...session, playing: false, beatPhase: 0, lastTickMs: nowMs };
  }

  const bpm = session.settings.bpm;
  if (bpm <= 0) {
    return { ...session, lastTickMs: nowMs };
  }

  const msPerBeat = 60_000 / bpm;
  const elapsedMs = Math.max(0, nowMs - session.lastTickMs);
  const totalBeats = session.beatPhase + elapsedMs / msPerBeat;
  const advance = Math.floor(totalBeats);
  const newPhase = totalBeats - advance;
  const newPlayhead = session.playhead + advance;

  if (newPlayhead >= SEQUENCE_LENGTH) {
    return {
      ...session,
      playhead: SEQUENCE_LENGTH,
      playing: false,
      beatPhase: 0,
      lastTickMs: nowMs,
    };
  }

  return {
    ...session,
    playhead: newPlayhead,
    beatPhase: newPhase,
    lastTickMs: nowMs,
  };
}

/**
 * Visibility for note at index.
 * If !revealEnabled, all notes are visible.
 * If revealEnabled, PREFIX window: notes visible for 0 <= index <= playhead + revealN
 * (revealN clamped to >= 0).
 * clefVisible when noteVisible and index is a clef-run onset (index === 0 or clef change).
 * labelVisible for showAnswers only when noteVisible and index < playhead
 * (strictly behind; not the current note); focusPeek labels the playhead index when noteVisible.
 */
export function visibilityFor(
  session: Session,
  index: number,
  opts?: VisibilityOpts,
): NoteVisibility {
  const { notes, settings, playhead } = session;
  if (index < 0 || index >= notes.length) {
    return { noteVisible: false, clefVisible: false, labelVisible: false };
  }

  const revealN = clampRevealN(settings.revealN);
  const noteVisible = !settings.revealEnabled || index <= playhead + revealN;

  const isOnset = index === 0 || notes[index].clef !== notes[index - 1].clef;
  const clefVisible = noteVisible && isOnset;
  const focusPeekHere = opts?.focusPeek === true && index === playhead;
  const answerHere = settings.showAnswers && index < playhead;
  const labelVisible = (answerHere || focusPeekHere) && noteVisible;

  return { noteVisible, clefVisible, labelVisible };
}
