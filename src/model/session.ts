/** Session transport and progressive-reveal visibility. Pure reducers; no DOM/rAF. */

import type { Clef } from "./clefSolfegeMap";
import { type DrillNote, type Rng, SEQUENCE_LENGTH, generateDrill } from "./generate";

export type DrillSettings = {
  clefs: Clef[];
  difficulty: number;
  bpm: number;
  revealN: number;
  showAnswers: boolean;
  revealEnabled: boolean;
};

/** Transport fields applied on Play without regenerating notes. */
export type TransportDraft = {
  bpm: number;
  revealN: number;
  revealEnabled: boolean;
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
  difficulty: 3,
  bpm: 80,
  revealN: 1,
  showAnswers: false,
  revealEnabled: false,
};

function clampRevealN(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.round(n));
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
  const notes = generateDrill(
    { clefs: session.settings.clefs, difficulty: session.settings.difficulty },
    rng,
  );
  return {
    ...session,
    notes,
    playhead: 0,
    playing: false,
    beatPhase: 0,
    lastTickMs: 0,
  };
}

/**
 * Apply transport fields from draft without regenerating notes; start playing.
 * Resumes from frozen beatPhase; sets lastTickMs to nowMs.
 */
export function play(session: Session, draft: TransportDraft, nowMs: number): Session {
  return {
    ...session,
    settings: {
      ...session.settings,
      bpm: draft.bpm,
      revealN: clampRevealN(draft.revealN),
      revealEnabled: draft.revealEnabled,
      showAnswers: draft.showAnswers,
    },
    playing: true,
    lastTickMs: nowMs,
  };
}

/** Patch showAnswers on the live session without regenerating or touching transport. */
export function setShowAnswers(session: Session, showAnswers: boolean): Session {
  if (session.settings.showAnswers === showAnswers) {
    return session;
  }
  return {
    ...session,
    settings: { ...session.settings, showAnswers },
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
 * labelVisible when noteVisible and (showAnswers or focusPeek on this playhead index).
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
  const labelVisible = (settings.showAnswers || focusPeekHere) && noteVisible;

  return { noteVisible, clefVisible, labelVisible };
}
