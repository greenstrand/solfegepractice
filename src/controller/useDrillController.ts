/** URL settings + session transport; owns rAF tick loop. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clef } from "../model/clefSolfegeMap";
import { CLEFS } from "../model/clefSolfegeMap";
import { mathRng } from "../model/rng";
import {
  type DrillSettings,
  type Session,
  setBpm as applyBpm,
  clampBpm,
  clampDifficulty,
  clampRevealN,
  createSession,
  generate,
  pause,
  play,
  stop,
  tick,
  visibilityFor,
} from "../model/session";
import { serializeSearch } from "../model/settingsSearch";
import { clampLedgerLines } from "../model/staffWindow";
import { useSettingsSearch } from "./useSettingsSearch";

export type DrillController = {
  settings: DrillSettings;
  loadError: boolean;
  session: Session;
  setFocusPeek: (on: boolean) => void;
  commit: (settings: DrillSettings) => void;
  /** Mid-drag live BPM patch; does not write the URL. Commit on release. */
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
  const { settings, loadError, commit } = useSettingsSearch();
  const [session, setSession] = useState<Session>(() => createSession(settings));
  const [focusPeek, setFocusPeek] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const settingsKey = serializeSearch(settings);

  // Sole session apply: URL settings identity change (includes first paint).
  // Key on settingsKey (serialized) to avoid object-identity churn; read settings via ref.
  useEffect(() => {
    void settingsKey;
    setSession((prev) =>
      generate({ ...stop(prev), settings: { ...settingsRef.current } }, mathRng()),
    );
  }, [settingsKey]);

  const onGenerate = useCallback(() => {
    setSession((prev) => generate({ ...prev, settings: { ...settingsRef.current } }, mathRng()));
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
    const s = settingsRef.current;
    setSession((prev) =>
      play(
        prev,
        {
          bpm: s.bpm,
          showAnswers: s.showAnswers,
        },
        nowMs,
      ),
    );
  }, []);

  const onPause = useCallback(() => {
    const nowMs = performance.now();
    setSession((prev) => pause(prev, nowMs));
  }, []);

  const onStop = useCallback(() => {
    setSession((prev) => stop(prev));
  }, []);

  const setBpm = useCallback((bpm: number) => {
    const next = clampBpm(bpm);
    setSession((prev) => applyBpm(prev, next));
  }, []);

  const setDifficulty = useCallback(
    (difficulty: number) => {
      commit({ ...settingsRef.current, difficulty: clampDifficulty(difficulty) });
    },
    [commit],
  );

  const setLedgerLines = useCallback(
    (n: number) => {
      commit({ ...settingsRef.current, ledgerLines: clampLedgerLines(n) });
    },
    [commit],
  );

  const setRevealEnabled = useCallback(
    (enabled: boolean) => {
      commit({ ...settingsRef.current, revealEnabled: enabled });
    },
    [commit],
  );

  const setRevealN = useCallback(
    (n: number) => {
      commit({ ...settingsRef.current, revealN: clampRevealN(n) });
    },
    [commit],
  );

  const setShowAnswers = useCallback(
    (show: boolean) => {
      commit({ ...settingsRef.current, showAnswers: show });
    },
    [commit],
  );

  const setMixClefs = useCallback(
    (mix: boolean) => {
      const current = settingsRef.current;
      if (mix) {
        commit({ ...current, mixClefs: true });
        return;
      }
      const sole = current.clefs[0] ?? "treble";
      commit({ ...current, mixClefs: false, clefs: [sole] });
    },
    [commit],
  );

  const toggleClef = useCallback(
    (clef: Clef) => {
      const current = settingsRef.current;
      if (!current.mixClefs) {
        commit({ ...current, clefs: [clef] });
        return;
      }
      const has = current.clefs.includes(clef);
      if (has) {
        if (current.clefs.length <= 1) {
          return;
        }
        commit({ ...current, clefs: current.clefs.filter((c) => c !== clef) });
        return;
      }
      commit({
        ...current,
        clefs: CLEFS.filter((c) => current.clefs.includes(c) || c === clef),
      });
    },
    [commit],
  );

  const visibilityForNote = useCallback(
    (index: number) => visibilityFor(session, index, { focusPeek }),
    [session, focusPeek],
  );

  return {
    settings,
    loadError,
    session,
    setFocusPeek,
    commit,
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
