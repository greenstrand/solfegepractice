/** Draft settings + transport controls. Props-driven; no session math. */

import type { Clef } from "../model/clefSolfegeMap";
import { CLEFS } from "../model/clefSolfegeMap";
import type { DrillSettings } from "../model/session";

export type ControlsViewProps = {
  draft: DrillSettings;
  playing: boolean;
  generateDirty: boolean;
  progressLabel: string;
  onGenerate: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  setBpm: (bpm: number) => void;
  setDifficulty: (difficulty: number) => void;
  setRevealEnabled: (enabled: boolean) => void;
  setRevealN: (n: number) => void;
  setShowAnswers: (show: boolean) => void;
  setMixClefs: (mix: boolean) => void;
  toggleClef: (clef: Clef) => void;
  className?: string;
};

const CLEF_LABELS: Record<Clef, string> = {
  treble: "Treble",
  bass: "Bass",
  alto: "Alto",
  tenor: "Tenor",
};

export function ControlsView({
  draft,
  playing,
  generateDirty,
  progressLabel,
  onGenerate,
  onPlay,
  onPause,
  onStop,
  setBpm,
  setDifficulty,
  setRevealEnabled,
  setRevealN,
  setShowAnswers,
  setMixClefs,
  toggleClef,
  className = "controls-view",
}: ControlsViewProps) {
  /** Difficulty / Mix / mix-clef set need Generate; locked while playing. */
  const genLocked = playing;
  /** Single-clef (Mix off) remaps live — stay enabled mid-run. */
  const clefPickLocked = playing && draft.mixClefs;
  const clefInputType = draft.mixClefs ? "checkbox" : "radio";

  return (
    <section className={className} aria-label="Drill controls">
      <div className="controls-transport">
        <button type="button" className="btn btn-primary" onClick={onGenerate}>
          Generate
        </button>
        {generateDirty && !playing ? (
          <span className="controls-generate-hint" aria-live="polite">
            Generate to apply
          </span>
        ) : null}
        <button type="button" className="btn" onClick={onPlay} disabled={playing}>
          Play
        </button>
        <button type="button" className="btn" onClick={onPause} disabled={!playing}>
          Pause
        </button>
        <button type="button" className="btn" onClick={onStop}>
          Stop
        </button>
        <span className="controls-progress" aria-live="polite">
          {progressLabel}
        </span>
      </div>

      <div className="controls-grid">
        <label className="control-field">
          <span className="control-label">BPM</span>
          <div className="control-bpm-row">
            <input
              type="range"
              min={40}
              max={160}
              step={1}
              value={draft.bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              aria-label="BPM slider"
            />
            <input
              type="number"
              min={20}
              max={240}
              value={draft.bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              aria-label="BPM"
            />
          </div>
        </label>

        <label className="control-field">
          <span className="control-label">Difficulty</span>
          <div className="control-bpm-row">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={draft.difficulty}
              disabled={genLocked}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              aria-label="Difficulty slider"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={draft.difficulty}
              disabled={genLocked}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              aria-label="Difficulty"
            />
          </div>
        </label>

        <fieldset className="control-field control-clefs">
          <legend className="control-label">Clefs</legend>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.mixClefs}
              disabled={genLocked}
              onChange={(e) => setMixClefs(e.target.checked)}
            />
            Mix clefs
          </label>
          <div className="clef-checks" role={draft.mixClefs ? undefined : "radiogroup"}>
            {CLEFS.map((clef) => (
              <label key={clef} className="check-label">
                <input
                  type={clefInputType}
                  name={draft.mixClefs ? undefined : "clef-pick"}
                  checked={draft.clefs.includes(clef)}
                  disabled={clefPickLocked}
                  onChange={() => toggleClef(clef)}
                />
                {CLEF_LABELS[clef]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="control-field control-toggles">
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.revealEnabled}
              onChange={(e) => setRevealEnabled(e.target.checked)}
            />
            Progressive reveal
          </label>
          <label className="control-inline">
            <span className="control-label">Notes ahead</span>
            <input
              type="number"
              min={0}
              value={draft.revealN}
              disabled={!draft.revealEnabled}
              onChange={(e) => setRevealN(Number(e.target.value))}
              aria-label="Notes ahead"
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
            />
            Show answers
          </label>
        </div>
      </div>
    </section>
  );
}
