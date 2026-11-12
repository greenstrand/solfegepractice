/** Settings + transport controls. Props-driven; no session math. */

import { useEffect, useState } from "react";
import generateIcon from "../assets/icons/generate.svg";
import pauseIcon from "../assets/icons/pause.svg";
import playIcon from "../assets/icons/play.svg";
import stopIcon from "../assets/icons/stop.svg";
import type { Clef } from "../model/clefSolfegeMap";
import { CLEFS } from "../model/clefSolfegeMap";
import type { DrillSettings } from "../model/session";
import { MAX_LEDGER_LINES, MIN_LEDGER_LINES } from "../model/staffWindow";

export type ControlsViewProps = {
  settings: DrillSettings;
  playing: boolean;
  onGenerate: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  commit: (settings: DrillSettings) => void;
  setBpm: (bpm: number) => void;
  setDifficulty: (difficulty: number) => void;
  setLedgerLines: (n: number) => void;
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
  settings,
  playing,
  onGenerate,
  onPlay,
  onPause,
  onStop,
  commit,
  setBpm,
  setDifficulty,
  setLedgerLines,
  setRevealEnabled,
  setRevealN,
  setShowAnswers,
  setMixClefs,
  toggleClef,
  className = "controls-view",
}: ControlsViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [bpmDrag, setBpmDrag] = useState<number | null>(null);
  const [difficultyDrag, setDifficultyDrag] = useState<number | null>(null);
  const [ledgerDrag, setLedgerDrag] = useState<number | null>(null);

  useEffect(() => {
    if (playing) setSettingsOpen(false);
  }, [playing]);

  /** Difficulty / ledger lines / mix locked while playing. */
  const genLocked = playing;
  /** Single-clef (Mix off) remaps via commit - stay enabled mid-run. */
  const clefPickLocked = playing && settings.mixClefs;
  const clefInputType = settings.mixClefs ? "checkbox" : "radio";

  const displayBpm = bpmDrag ?? settings.bpm;
  const displayDifficulty = difficultyDrag ?? settings.difficulty;
  const displayLedger = ledgerDrag ?? settings.ledgerLines;

  const releaseBpm = () => {
    if (bpmDrag === null) {
      return;
    }
    if (bpmDrag !== settings.bpm) {
      commit({ ...settings, bpm: bpmDrag });
    }
    setBpmDrag(null);
  };

  const releaseDifficulty = () => {
    if (difficultyDrag === null) {
      return;
    }
    if (difficultyDrag !== settings.difficulty) {
      setDifficulty(difficultyDrag);
    }
    setDifficultyDrag(null);
  };

  const releaseLedger = () => {
    if (ledgerDrag === null) {
      return;
    }
    if (ledgerDrag !== settings.ledgerLines) {
      setLedgerLines(ledgerDrag);
    }
    setLedgerDrag(null);
  };

  return (
    <section className={className} aria-label="Drill controls">
      <div className="controls-pinned">
        <div className="controls-transport">
          <button
            type="button"
            className="btn btn-primary"
            aria-label="Generate"
            onClick={onGenerate}
          >
            <img className="btn-icon" src={generateIcon} alt="" aria-hidden="true" />
            <span className="btn-label">Generate</span>
          </button>
          {playing ? (
            <button type="button" className="btn" aria-label="Pause" onClick={onPause}>
              <img className="btn-icon" src={pauseIcon} alt="" aria-hidden="true" />
              <span className="btn-label">Pause</span>
            </button>
          ) : (
            <button type="button" className="btn" aria-label="Play" onClick={onPlay}>
              <img className="btn-icon" src={playIcon} alt="" aria-hidden="true" />
              <span className="btn-label">Play</span>
            </button>
          )}
          <button type="button" className="btn" aria-label="Stop" onClick={onStop}>
            <img className="btn-icon" src={stopIcon} alt="" aria-hidden="true" />
            <span className="btn-label">Stop</span>
          </button>
        </div>

        <label className="control-field">
          <span className="control-label">BPM</span>
          <div className="control-slider-row">
            <input
              type="range"
              min={40}
              max={160}
              step={1}
              value={displayBpm}
              onChange={(e) => {
                const next = Number(e.target.value);
                setBpmDrag(next);
                setBpm(next);
              }}
              onPointerUp={releaseBpm}
              onMouseUp={releaseBpm}
              onTouchEnd={releaseBpm}
              aria-label="BPM slider"
            />
            <input
              type="number"
              min={20}
              max={240}
              value={displayBpm}
              onChange={(e) => {
                const next = Number(e.target.value);
                setBpmDrag(null);
                commit({ ...settings, bpm: next });
              }}
              aria-label="BPM"
            />
          </div>
        </label>
      </div>

      <div id="controls-settings-panel" className="controls-settings-body" hidden={!settingsOpen}>
        <div className="controls-grid">
          <label className="control-field">
            <span className="control-label">Difficulty</span>
            <div className="control-slider-row">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={displayDifficulty}
                disabled={genLocked}
                onChange={(e) => setDifficultyDrag(Number(e.target.value))}
                onPointerUp={releaseDifficulty}
                onMouseUp={releaseDifficulty}
                onTouchEnd={releaseDifficulty}
                aria-label="Difficulty slider"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={displayDifficulty}
                disabled={genLocked}
                onChange={(e) => {
                  setDifficultyDrag(null);
                  setDifficulty(Number(e.target.value));
                }}
                aria-label="Difficulty"
              />
            </div>
          </label>

          <fieldset className="control-field control-clefs">
            <legend className="control-label">Clefs</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.mixClefs}
                disabled={genLocked}
                onChange={(e) => setMixClefs(e.target.checked)}
              />
              Mix clefs
            </label>
            <div className="clef-checks" role={settings.mixClefs ? undefined : "radiogroup"}>
              {CLEFS.map((clef) => (
                <label key={clef} className="check-label">
                  <input
                    type={clefInputType}
                    name={settings.mixClefs ? undefined : "clef-pick"}
                    checked={settings.clefs.includes(clef)}
                    disabled={clefPickLocked}
                    onChange={() => toggleClef(clef)}
                  />
                  {CLEF_LABELS[clef]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="control-field control-toggles">
            <div className="control-reveal-stack">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.revealEnabled}
                  onChange={(e) => setRevealEnabled(e.target.checked)}
                />
                Progressive reveal
              </label>
              <label className="control-inline control-notes-ahead">
                <span className="control-label">Notes ahead</span>
                <input
                  type="number"
                  min={0}
                  value={settings.revealN}
                  disabled={!settings.revealEnabled}
                  onChange={(e) => setRevealN(Number(e.target.value))}
                  aria-label="Notes ahead"
                />
              </label>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
              />
              Show answers
            </label>
            <label className="control-field control-ledger">
              <span className="control-label">Ledger lines</span>
              <div className="control-slider-row">
                <input
                  type="range"
                  min={MIN_LEDGER_LINES}
                  max={MAX_LEDGER_LINES}
                  step={1}
                  value={displayLedger}
                  disabled={genLocked}
                  onChange={(e) => setLedgerDrag(Number(e.target.value))}
                  onPointerUp={releaseLedger}
                  onMouseUp={releaseLedger}
                  onTouchEnd={releaseLedger}
                  aria-label="Ledger lines slider"
                />
                <input
                  type="number"
                  min={MIN_LEDGER_LINES}
                  max={MAX_LEDGER_LINES}
                  value={displayLedger}
                  disabled={genLocked}
                  onChange={(e) => {
                    setLedgerDrag(null);
                    setLedgerLines(Number(e.target.value));
                  }}
                  aria-label="Ledger lines"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="controls-settings-toggle"
        aria-expanded={settingsOpen}
        aria-controls="controls-settings-panel"
        aria-label={settingsOpen ? "Collapse settings" : "Expand settings"}
        onClick={() => setSettingsOpen((open) => !open)}
      >
        <span
          className={
            settingsOpen
              ? "controls-settings-caret points-up"
              : "controls-settings-caret points-down"
          }
          aria-hidden="true"
        />
      </button>
    </section>
  );
}
