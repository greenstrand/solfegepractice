/** Draft settings + session transport; owns rAF tick loop. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clef } from "../model/clefSolfegeMap";
import { mathRng } from "../model/rng";
import {
  DEFAULT_SETTINGS,
  type DrillSettings,
  type Session,
  setBpm as applyBpm,
  setMixClefs as applyMixClefs,
  setRevealEnabled as applyRevealEnabled,
  setRevealN as applyRevealN,
  setShowAnswers as applyShowAnswers,
  toggleClef as applyToggleClef,
  clampBpm,
  clampDifficulty,
  clampRevealN,
  createSession,
  generate,
  isGenerateDirty,
  pause,
  play,
  stop,
  tick,
  visibilityFor,
} from "../model/session";
import { clampLedgerLines } from "../model/staffWindow";

export type DrillController = {
  draft: DrillSettings;
  session: Session;
  setFocusPeek: (on: boolean) => void;
  /** True when draft gen settings differ from applied session (needs Generate). */
  generateDirty: boolean;
  setBpm: (bpm: number) => void;
  setDifficulty: (difficulty: number) => void;
  setLedgerLines: (n: number) => void;
  setRevealEnabled: (enabled: boolean) => void;
  setRevealN: (n: number) => void;
  setShowAnswers: (show: boolean) => void;
  setMixClefs: (mix: boolean) => void;
  toggleClef: (clef: Clef) => void;
  onGenerate: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  visibilityFor: (index: number) => ReturnType<typeof visibilityFor>;
};

export function useDrillController(): DrillController {
  const [draft, setDraft] = useState<DrillSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session>(() => createSession(DEFAULT_SETTINGS));
  const [focusPeek, setFocusPeek] = useState(false);
  const didMountGenerate = useRef(false);

  const onGenerate = useCallback(() => {
    setSession((prev) => {
      const withDraft: Session = {
        ...prev,
        settings: { ...draft },
      };
      return generate(withDraft, mathRng());
    });
  }, [draft]);

  // Generate once on mount so the score is not empty.
  useEffect(() => {
    if (didMountGenerate.current) {
      return;
    }
    didMountGenerate.current = true;
    setSession((prev) => generate({ ...prev, settings: { ...DEFAULT_SETTINGS } }, mathRng()));
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
          showAnswers: draft.showAnswers,
        },
        nowMs,
      ),
    );
  }, [draft.bpm, draft.showAnswers]);

  const onPause = useCallback(() => {
    const nowMs = performance.now();
    setSession((prev) => pause(prev, nowMs));
  }, []);

  const onStop = useCallback(() => {
    setSession((prev) => stop(prev));
  }, []);

  const setBpm = useCallback((bpm: number) => {
    const next = clampBpm(bpm);
    setDraft((d) => ({ ...d, bpm: next }));
    setSession((prev) => applyBpm(prev, next));
  }, []);

  const setDifficulty = useCallback((difficulty: number) => {
    setDraft((d) => ({ ...d, difficulty: clampDifficulty(difficulty) }));
  }, []);

  const setLedgerLines = useCallback((n: number) => {
    setDraft((d) => ({ ...d, ledgerLines: clampLedgerLines(n) }));
  }, []);

  const setRevealEnabled = useCallback((enabled: boolean) => {
    setDraft((d) => ({ ...d, revealEnabled: enabled }));
    setSession((prev) => applyRevealEnabled(prev, enabled));
  }, []);

  const setRevealN = useCallback((n: number) => {
    const next = clampRevealN(n);
    setDraft((d) => ({ ...d, revealN: next }));
    setSession((prev) => applyRevealN(prev, next));
  }, []);

  const setShowAnswers = useCallback((show: boolean) => {
    setDraft((d) => ({ ...d, showAnswers: show }));
    setSession((prev) => applyShowAnswers(prev, show));
  }, []);

  const setMixClefs = useCallback((mix: boolean) => {
    setSession((prev) => {
      const next = applyMixClefs(prev, mix, mathRng());
      setDraft((d) => ({
        ...d,
        clefs: next.settings.clefs,
        mixClefs: next.settings.mixClefs,
      }));
      return next;
    });
  }, []);

  const toggleClef = useCallback((clef: Clef) => {
    setSession((prev) => {
      const next = applyToggleClef(prev, clef, mathRng());
      setDraft((d) => ({
        ...d,
        clefs: next.settings.clefs,
        mixClefs: next.settings.mixClefs,
      }));
      return next;
    });
  }, []);

  const generateDirty = useMemo(() => isGenerateDirty(session, draft), [session, draft]);

  const visibilityForNote = useCallback(
    (index: number) => visibilityFor(session, index, { focusPeek }),
    [session, focusPeek],
  );

  return {
    draft,
    session,
    setFocusPeek,
    generateDirty,
    setBpm,
    setDifficulty,
    setLedgerLines,
    setRevealEnabled,
    setRevealN,
    setShowAnswers,
    setMixClefs,
    toggleClef,
    onGenerate,
    onPlay,
    onPause,
    onStop,
    visibilityFor: visibilityForNote,
  };
}
