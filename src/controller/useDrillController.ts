/** Draft settings + session transport; owns rAF tick loop. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clef } from "../model/clefSolfegeMap";
import { CLEFS } from "../model/clefSolfegeMap";
import type { Rng } from "../model/generate";
import { SEQUENCE_LENGTH } from "../model/generate";
import {
  DEFAULT_SETTINGS,
  type DrillSettings,
  type Session,
  setShowAnswers as applyShowAnswers,
  createSession,
  generate,
  pause,
  play,
  stop,
  tick,
  visibilityFor,
} from "../model/session";

export type DrillController = {
  draft: DrillSettings;
  session: Session;
  /** Hold-F focus peek: show only the playhead note's solfege. */
  focusPeek: boolean;
  setFocusPeek: (on: boolean) => void;
  setBpm: (bpm: number) => void;
  setDifficulty: (difficulty: number) => void;
  setRevealEnabled: (enabled: boolean) => void;
  setRevealN: (n: number) => void;
  setShowAnswers: (show: boolean) => void;
  toggleClef: (clef: Clef) => void;
  onGenerate: (seed?: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  visibilityForIndex: (index: number) => ReturnType<typeof visibilityFor>;
  progressLabel: string;
};

const INITIAL_DRAFT: DrillSettings = { ...DEFAULT_SETTINGS };

function mathRng(): Rng {
  return { next: () => Math.random() };
}

/** Deterministic mulberry32 in [0, 1). */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) {
    return 80;
  }
  return Math.min(240, Math.max(20, Math.round(bpm)));
}

function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) {
    return 3;
  }
  return Math.min(10, Math.max(1, Math.round(d)));
}

function clampRevealN(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.revealN;
  }
  return Math.max(0, Math.round(n));
}

export function useDrillController(): DrillController {
  const [draft, setDraft] = useState<DrillSettings>(INITIAL_DRAFT);
  const [session, setSession] = useState<Session>(() => createSession(INITIAL_DRAFT));
  const [focusPeek, setFocusPeek] = useState(false);
  const didMountGenerate = useRef(false);

  const onGenerate = useCallback(
    (seed?: number) => {
      const rng = seed === undefined ? mathRng() : mulberry32(seed);
      setSession((prev) => {
        const withDraft: Session = {
          ...prev,
          settings: { ...draft },
        };
        return generate(withDraft, rng);
      });
    },
    [draft],
  );

  // Generate once on mount so the score is not empty.
  useEffect(() => {
    if (didMountGenerate.current) {
      return;
    }
    didMountGenerate.current = true;
    setSession((prev) => generate({ ...prev, settings: { ...INITIAL_DRAFT } }, mathRng()));
  }, []);

  // rAF loop while playing.
  useEffect(() => {
    if (!session.playing) {
      return;
    }
    let frame = 0;
    const loop = (nowMs: number) => {
      setSession((prev) => tick(prev, nowMs));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [session.playing]);

  const onPlay = useCallback(() => {
    const nowMs = performance.now();
    setSession((prev) =>
      play(
        prev,
        {
          bpm: draft.bpm,
          revealN: draft.revealN,
          revealEnabled: draft.revealEnabled,
          showAnswers: draft.showAnswers,
        },
        nowMs,
      ),
    );
  }, [draft.bpm, draft.revealEnabled, draft.revealN, draft.showAnswers]);

  const onPause = useCallback(() => {
    const nowMs = performance.now();
    setSession((prev) => pause(prev, nowMs));
  }, []);

  const onStop = useCallback(() => {
    setSession((prev) => stop(prev));
  }, []);

  const setBpm = useCallback((bpm: number) => {
    setDraft((d) => ({ ...d, bpm: clampBpm(bpm) }));
  }, []);

  const setDifficulty = useCallback((difficulty: number) => {
    setDraft((d) => ({ ...d, difficulty: clampDifficulty(difficulty) }));
  }, []);

  const setRevealEnabled = useCallback((enabled: boolean) => {
    setDraft((d) => ({ ...d, revealEnabled: enabled }));
  }, []);

  const setRevealN = useCallback((n: number) => {
    setDraft((d) => ({ ...d, revealN: clampRevealN(n) }));
  }, []);

  const setShowAnswers = useCallback((show: boolean) => {
    setDraft((d) => ({ ...d, showAnswers: show }));
    setSession((prev) => applyShowAnswers(prev, show));
  }, []);

  const toggleClef = useCallback((clef: Clef) => {
    setDraft((d) => {
      const has = d.clefs.includes(clef);
      if (has) {
        if (d.clefs.length <= 1) {
          return d;
        }
        return { ...d, clefs: d.clefs.filter((c) => c !== clef) };
      }
      const next = CLEFS.filter((c) => d.clefs.includes(c) || c === clef);
      return { ...d, clefs: next };
    });
  }, []);

  const visibilityForIndex = useCallback(
    (index: number) => visibilityFor(session, index, { focusPeek }),
    [session, focusPeek],
  );

  const playheadDisplay = Math.min(session.playhead, SEQUENCE_LENGTH);
  const progressLabel = `${playheadDisplay} / ${SEQUENCE_LENGTH}`;

  return {
    draft,
    session,
    focusPeek,
    setFocusPeek,
    setBpm,
    setDifficulty,
    setRevealEnabled,
    setRevealN,
    setShowAnswers,
    toggleClef,
    onGenerate,
    onPlay,
    onPause,
    onStop,
    visibilityForIndex,
    progressLabel,
  };
}
