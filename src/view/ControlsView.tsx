/** Draft settings + transport controls. Props-driven; no session math. */

import type { DraftSettings } from "../controller/useDrillController";
import type { Clef } from "../model/clefSolfegeMap";
import { CLEFS } from "../model/clefSolfegeMap";

export type ControlsViewProps = {
  draft: DraftSettings;
  playing: boolean;
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
  toggleClef,
  className = "controls-view",
}: ControlsViewProps) {
  return (
    <section className={className} aria-label="Drill controls">
      <div className="controls-transport">
        <button type="button" className="btn btn-primary" onClick={onGenerate}>
          Generate
        </button>
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
              onChange={(e) => setDifficulty(Number(e.target.value))}
              aria-label="Difficulty slider"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={draft.difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              aria-label="Difficulty"
            />
          </div>
        </label>

        <fieldset className="control-field control-clefs">
          <legend className="control-label">Clefs</legend>
          <div className="clef-checks">
            {CLEFS.map((clef) => (
              <label key={clef} className="check-label">
                <input
                  type="checkbox"
                  checked={draft.clefs.includes(clef)}
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
            <span className="control-label">N</span>
            <input
              type="number"
              min={1}
              value={draft.revealN}
              disabled={!draft.revealEnabled}
              onChange={(e) => setRevealN(Number(e.target.value))}
              aria-label="Reveal ahead count"
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
