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

export const DEFAULT_SETTINGS: DrillSettings = {
  clefs: ["treble"],
  difficulty: 3,
  bpm: 80,
  revealN: 0,
  showAnswers: false,
  revealEnabled: false,
};

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
      revealN: draft.revealN,
      revealEnabled: draft.revealEnabled,
      showAnswers: draft.showAnswers,
    },
    playing: true,
    lastTickMs: nowMs,
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

function clefOnsetIndex(notes: readonly DrillNote[], index: number): number {
  let i = index;
  while (i > 0 && notes[i].clef === notes[i - 1].clef) {
    i -= 1;
  }
  return i;
}

/**
 * Visibility for note at index.
 * If !revealEnabled, all notes visible.
 * If revealEnabled, note visible when 0 <= index <= playhead + revealN.
 * Clef glyph at i when note i is visible and i is a clef-run onset (i===0 or clef
 * change). When the playhead (due) note is visible, expand the window left to
 * include its clef-run start so the defining clef stays shown.
 */
export function visibilityFor(session: Session, index: number): NoteVisibility {
  const { notes, settings, playhead } = session;
  if (index < 0 || index >= notes.length) {
    return { noteVisible: false, clefVisible: false, labelVisible: false };
  }

  let noteVisible: boolean;
  if (!settings.revealEnabled) {
    noteVisible = true;
  } else {
    let lo = 0;
    const hi = playhead + settings.revealN;
    const due =
      playhead >= 0 && playhead < notes.length
        ? playhead
        : playhead >= SEQUENCE_LENGTH && notes.length > 0
          ? notes.length - 1
          : -1;
    if (due >= 0 && due <= hi) {
      const onset = clefOnsetIndex(notes, due);
      if (onset < lo) {
        lo = onset;
      }
    }
    noteVisible = index >= lo && index <= hi;
  }

  const isOnset = index === 0 || notes[index].clef !== notes[index - 1].clef;
  const clefVisible = noteVisible && isOnset;
  const labelVisible = settings.showAnswers && noteVisible;

  return { noteVisible, clefVisible, labelVisible };
}
