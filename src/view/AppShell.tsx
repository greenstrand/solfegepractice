/** Fixed Dojo chrome: header, controls, score. */

import { useEffect } from "react";
import type { DrillController } from "../controller/useDrillController";
import { ControlsView } from "./ControlsView";
import { ScoreView } from "./ScoreView";

export type AppShellProps = {
  drill: DrillController;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

export function AppShell({ drill }: AppShellProps) {
  const { draft, session, onPlay, onPause } = drill;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (session.playing) {
        onPause();
      } else {
        onPlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session.playing, onPlay, onPause]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="brand">Fixed Dojo</h1>
        <p className="subtitle">Staff positions, fixed do, no escape hatch.</p>
      </header>

      <ControlsView
        draft={draft}
        playing={session.playing}
        progressLabel={drill.progressLabel}
        onGenerate={() => drill.onGenerate()}
        onPlay={drill.onPlay}
        onPause={drill.onPause}
        onStop={drill.onStop}
        setBpm={drill.setBpm}
        setDifficulty={drill.setDifficulty}
        setRevealEnabled={drill.setRevealEnabled}
        setRevealN={drill.setRevealN}
        setShowAnswers={drill.setShowAnswers}
        toggleClef={drill.toggleClef}
      />

      <section className="score-panel" aria-label="Practice score">
        <ScoreView
          notes={session.notes}
          playhead={session.playhead}
          visibilityFor={drill.visibilityForIndex}
        />
      </section>
    </div>
  );
}
