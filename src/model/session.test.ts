import { describe, expect, it } from "vitest";
import type { DrillNote, Rng } from "./generate";
import { SEQUENCE_LENGTH } from "./generate";
import {
  type DrillSettings,
  type Session,
  type TransportDraft,
  createSession,
  generate,
  isGenerateDirty,
  pause,
  play,
  remapNotesToClef,
  setBpm,
  setRevealEnabled,
  setRevealN,
  setShowAnswers,
  stop,
  tick,
  visibilityFor,
} from "./session";

/** Deterministic mulberry32 in [0, 1). */
function seededRng(seed: number): Rng {
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

function note(position: number, clef: DrillNote["clef"]): DrillNote {
  return { position, clef };
}

/** Session with crafted notes for visibility/transport tests (bypass generate). */
function sessionWithNotes(
  notes: DrillNote[],
  overrides: {
    settings?: Partial<DrillSettings>;
    playhead?: number;
    playing?: boolean;
    beatPhase?: number;
    lastTickMs?: number;
  } = {},
): Session {
  const base = createSession(overrides.settings);
  return {
    ...base,
    playhead: overrides.playhead ?? base.playhead,
    playing: overrides.playing ?? base.playing,
    beatPhase: overrides.beatPhase ?? base.beatPhase,
    lastTickMs: overrides.lastTickMs ?? base.lastTickMs,
    notes,
  };
}

const transport = (partial: Partial<TransportDraft> = {}): TransportDraft => ({
  bpm: 80,
  showAnswers: false,
  ...partial,
});

describe("createSession", () => {
  it("defaults to treble-only, mix off, difficulty 3, bpm 80, revealN 1, reveal off, no answers", () => {
    const s = createSession();
    expect(s.settings.clefs).toEqual(["treble"]);
    expect(s.settings.mixClefs).toBe(false);
    expect(s.settings.difficulty).toBe(3);
    expect(s.settings.bpm).toBe(80);
    expect(s.settings.revealEnabled).toBe(false);
    expect(s.settings.revealN).toBe(1);
    expect(s.settings.showAnswers).toBe(false);
    expect(s.playhead).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.notes).toEqual([]);
  });
});

describe("generate", () => {
  it("replaces notes and resets playhead", () => {
    let s = createSession();
    s = {
      ...s,
      playhead: 40,
      playing: true,
      beatPhase: 0.5,
      notes: [note(10, "treble")],
    };
    s = generate(s, seededRng(1));
    expect(s.notes).toHaveLength(SEQUENCE_LENGTH);
    expect(s.playhead).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.beatPhase).toBe(0);
  });
});

describe("play / tick BPM advance", () => {
  it("advances playhead by floor(elapsed beats) at bpm (1 note per beat)", () => {
    let s = sessionWithNotes(Array.from({ length: 16 }, (_, i) => note(10 + (i % 3), "treble")));
    // bpm 60 => 1000ms per beat
    s = play(s, transport({ bpm: 60 }), 0);
    expect(s.playing).toBe(true);
    expect(s.playhead).toBe(0);

    s = tick(s, 1000);
    expect(s.playhead).toBe(1);
    expect(s.playing).toBe(true);

    s = tick(s, 3500);
    expect(s.playhead).toBe(3);
  });

  it("play applies bpm/showAnswers without regenerating notes or changing reveal", () => {
    const notes = [note(8, "treble"), note(9, "treble"), note(10, "bass")];
    let s = sessionWithNotes(notes, {
      settings: {
        bpm: 80,
        revealEnabled: false,
        revealN: 0,
        showAnswers: false,
        difficulty: 3,
        clefs: ["treble", "bass"],
      },
    });
    s = play(s, transport({ bpm: 120, showAnswers: true }), 100);
    expect(s.notes).toEqual(notes);
    expect(s.settings.bpm).toBe(120);
    expect(s.settings.showAnswers).toBe(true);
    expect(s.settings.revealN).toBe(0);
    expect(s.settings.revealEnabled).toBe(false);
    expect(s.settings.difficulty).toBe(3);
    expect(s.settings.clefs).toEqual(["treble", "bass"]);
    expect(s.playing).toBe(true);
    expect(s.lastTickMs).toBe(100);
  });
});

describe("setBpm live apply", () => {
  it("updates bpm immediately while playing without changing notes or playhead", () => {
    const notes = [note(8, "treble"), note(9, "treble")];
    let s = sessionWithNotes(notes, {
      playhead: 1,
      playing: true,
      beatPhase: 0.25,
      lastTickMs: 500,
      settings: { bpm: 60 },
    });
    s = setBpm(s, 120);
    expect(s.settings.bpm).toBe(120);
    expect(s.notes).toEqual(notes);
    expect(s.playhead).toBe(1);
    expect(s.playing).toBe(true);
    expect(s.beatPhase).toBe(0.25);
    expect(s.lastTickMs).toBe(500);

    // New tempo: 500ms at 120bpm = 1 beat from lastTick
    s = tick(s, 1000);
    expect(s.playhead).toBe(2);
  });

  it("returns same session when bpm unchanged after clamp", () => {
    const s = sessionWithNotes([note(10, "treble")], { settings: { bpm: 80 } });
    expect(setBpm(s, 80)).toBe(s);
  });
});

describe("setShowAnswers", () => {
  it("toggles showAnswers live without changing notes or transport", () => {
    const notes = [note(8, "treble"), note(9, "treble")];
    let s = sessionWithNotes(notes, {
      playhead: 1,
      playing: true,
      beatPhase: 0.25,
      lastTickMs: 500,
      settings: { showAnswers: false, bpm: 90 },
    });
    s = setShowAnswers(s, true);
    expect(s.settings.showAnswers).toBe(true);
    expect(s.settings.bpm).toBe(90);
    expect(s.notes).toEqual(notes);
    expect(s.playhead).toBe(1);
    expect(s.playing).toBe(true);
    expect(s.beatPhase).toBe(0.25);
    expect(s.lastTickMs).toBe(500);
    expect(visibilityFor(s, 0).labelVisible).toBe(true);
    expect(visibilityFor(s, 1).labelVisible).toBe(false);

    s = setShowAnswers(s, false);
    expect(s.settings.showAnswers).toBe(false);
    expect(visibilityFor(s, 0).labelVisible).toBe(false);
  });

  it("returns same session when value unchanged", () => {
    const s = sessionWithNotes([note(10, "treble")], { settings: { showAnswers: true } });
    expect(setShowAnswers(s, true)).toBe(s);
  });
});

describe("setRevealEnabled / setRevealN live apply", () => {
  it("updates reveal settings immediately while playing without changing notes or playhead", () => {
    const notes = [note(8, "treble"), note(9, "treble"), note(10, "treble"), note(11, "treble")];
    let s = sessionWithNotes(notes, {
      playhead: 1,
      playing: true,
      beatPhase: 0.25,
      lastTickMs: 500,
      settings: { revealEnabled: false, revealN: 0 },
    });
    expect(visibilityFor(s, 3).noteVisible).toBe(true);

    s = setRevealEnabled(s, true);
    expect(s.settings.revealEnabled).toBe(true);
    expect(s.notes).toEqual(notes);
    expect(s.playhead).toBe(1);
    expect(s.playing).toBe(true);
    expect(visibilityFor(s, 1).noteVisible).toBe(true);
    expect(visibilityFor(s, 2).noteVisible).toBe(false);

    s = setRevealN(s, 1);
    expect(s.settings.revealN).toBe(1);
    expect(visibilityFor(s, 2).noteVisible).toBe(true);
    expect(visibilityFor(s, 3).noteVisible).toBe(false);
  });

  it("returns same session when reveal values unchanged after clamp", () => {
    const s = sessionWithNotes([note(10, "treble")], {
      settings: { revealEnabled: true, revealN: 2 },
    });
    expect(setRevealEnabled(s, true)).toBe(s);
    expect(setRevealN(s, 2)).toBe(s);
  });
});

describe("remapNotesToClef", () => {
  it("remaps every note clef; positions unchanged; settings.clefs becomes single", () => {
    const notes = [note(8, "treble"), note(12, "bass"), note(10, "alto")];
    let s = sessionWithNotes(notes, {
      settings: { clefs: ["treble", "bass", "alto"], mixClefs: true },
    });
    s = remapNotesToClef(s, "tenor");
    expect(s.notes.map((n) => n.position)).toEqual([8, 12, 10]);
    expect(s.notes.every((n) => n.clef === "tenor")).toBe(true);
    expect(s.settings.clefs).toEqual(["tenor"]);
    expect(s.settings.mixClefs).toBe(false);
  });

  it("returns same session when already single-clef matched", () => {
    const notes = [note(8, "bass"), note(9, "bass")];
    const s = sessionWithNotes(notes, { settings: { clefs: ["bass"], mixClefs: false } });
    expect(remapNotesToClef(s, "bass")).toBe(s);
  });
});

describe("isGenerateDirty", () => {
  it("is dirty when mix clef set differs without Generate; bpm/showAnswers/reveal ignored", () => {
    const notes = [note(10, "treble"), note(11, "bass")];
    const s = sessionWithNotes(notes, {
      settings: {
        clefs: ["treble", "bass"],
        mixClefs: true,
        difficulty: 3,
        revealEnabled: true,
        revealN: 1,
        bpm: 80,
        showAnswers: false,
      },
    });
    const draftSameGen: DrillSettings = {
      ...s.settings,
      bpm: 140,
      showAnswers: true,
      revealEnabled: false,
      revealN: 4,
    };
    expect(isGenerateDirty(s, draftSameGen)).toBe(false);

    const draftClefs: DrillSettings = {
      ...s.settings,
      clefs: ["treble", "alto"],
    };
    expect(isGenerateDirty(s, draftClefs)).toBe(true);
    // Sequence clefs stay as generated until Generate (caller responsibility).
    expect(s.notes.map((n) => n.clef)).toEqual(["treble", "bass"]);
  });

  it("is dirty for difficulty draft changes; reveal draft is not dirty", () => {
    const s = sessionWithNotes([note(10, "treble")], {
      settings: { difficulty: 3, revealEnabled: false, revealN: 1 },
    });
    expect(isGenerateDirty(s, { ...s.settings, difficulty: 5 })).toBe(true);
    expect(isGenerateDirty(s, { ...s.settings, revealEnabled: true })).toBe(false);
    expect(isGenerateDirty(s, { ...s.settings, revealN: 4 })).toBe(false);
  });
});

describe("pause freezes phase", () => {
  it("pause freezes fractional beat; resume continues from same phase", () => {
    let s = sessionWithNotes(Array.from({ length: 16 }, () => note(10, "treble")));
    // bpm 60 => 1000ms/beat
    s = play(s, transport({ bpm: 60 }), 0);
    // 500ms => 0.5 beat, playhead still 0
    s = tick(s, 500);
    expect(s.playhead).toBe(0);
    expect(s.beatPhase).toBeCloseTo(0.5, 5);

    s = pause(s, 500);
    expect(s.playing).toBe(false);
    expect(s.playhead).toBe(0);
    expect(s.beatPhase).toBeCloseTo(0.5, 5);

    // Time passes while paused; tick is no-op
    s = tick(s, 5000);
    expect(s.playhead).toBe(0);
    expect(s.beatPhase).toBeCloseTo(0.5, 5);

    // Resume: another 500ms completes 1 beat
    s = play(s, transport({ bpm: 60 }), 10_000);
    s = tick(s, 10_500);
    expect(s.playhead).toBe(1);
    expect(s.beatPhase).toBeCloseTo(0, 5);
  });
});

describe("reveal N and clef co-reveal", () => {
  const runNotes: DrillNote[] = [
    note(10, "treble"),
    note(11, "treble"),
    note(12, "treble"),
    note(13, "treble"),
    note(14, "treble"),
    note(8, "bass"),
    note(9, "bass"),
    note(10, "bass"),
  ];

  function clefOnsetIndex(notes: readonly DrillNote[], index: number): number {
    let i = index;
    while (i > 0 && notes[i].clef === notes[i - 1].clef) {
      i -= 1;
    }
    return i;
  }

  it("revealN shows notes through playhead + revealN; hide beyond", () => {
    const s = sessionWithNotes(runNotes, {
      playhead: 2,
      settings: { revealEnabled: true, revealN: 1 },
    });
    expect(visibilityFor(s, 0).noteVisible).toBe(true);
    expect(visibilityFor(s, 3).noteVisible).toBe(true); // 2+1
    expect(visibilityFor(s, 4).noteVisible).toBe(false);
    expect(visibilityFor(s, 5).noteVisible).toBe(false);
  });

  it("when reveal off, all notes visible", () => {
    const s = sessionWithNotes(runNotes, {
      playhead: 0,
      settings: { revealEnabled: false, revealN: 0 },
    });
    for (let i = 0; i < runNotes.length; i++) {
      expect(visibilityFor(s, i).noteVisible).toBe(true);
    }
  });

  it("PREFIX window: onset clef visible when its note is in the visible prefix", () => {
    // Playhead mid bass run; treble onset at 0, bass onset at 5
    const s = sessionWithNotes(runNotes, {
      playhead: 6,
      settings: { revealEnabled: true, revealN: 0, showAnswers: false },
    });
    expect(visibilityFor(s, 6).noteVisible).toBe(true);
    expect(visibilityFor(s, 5).noteVisible).toBe(true);
    expect(visibilityFor(s, 5).clefVisible).toBe(true);
    expect(visibilityFor(s, 6).clefVisible).toBe(false);
    expect(visibilityFor(s, 0).clefVisible).toBe(true);
    expect(visibilityFor(s, 7).noteVisible).toBe(false);
  });

  it("invariant: if due note visible then onset noteVisible and clefVisible", () => {
    const playheads = [0, 2, 4, 5, 6, 7];
    for (const playhead of playheads) {
      const s = sessionWithNotes(runNotes, {
        playhead,
        settings: { revealEnabled: true, revealN: 1 },
      });
      if (playhead < 0 || playhead >= runNotes.length) {
        continue;
      }
      if (!visibilityFor(s, playhead).noteVisible) {
        continue;
      }
      const onset = clefOnsetIndex(runNotes, playhead);
      expect(visibilityFor(s, onset).noteVisible).toBe(true);
      expect(visibilityFor(s, onset).clefVisible).toBe(true);
    }
  });

  it("showAnswers labels strictly behind playhead, not current or reveal-ahead", () => {
    const s = sessionWithNotes(runNotes, {
      playhead: 2,
      settings: { revealEnabled: true, revealN: 1, showAnswers: true },
    });
    expect(visibilityFor(s, 0).labelVisible).toBe(true);
    expect(visibilityFor(s, 1).labelVisible).toBe(true);
    expect(visibilityFor(s, 2).labelVisible).toBe(false);
    expect(visibilityFor(s, 3).noteVisible).toBe(true);
    expect(visibilityFor(s, 3).labelVisible).toBe(false);
    expect(visibilityFor(s, 4).labelVisible).toBe(false);
  });

  it("focusPeek labels only the playhead index when noteVisible", () => {
    const s = sessionWithNotes(runNotes, {
      playhead: 2,
      settings: { revealEnabled: true, revealN: 1, showAnswers: false },
    });
    expect(visibilityFor(s, 2, { focusPeek: true }).labelVisible).toBe(true);
    expect(visibilityFor(s, 0, { focusPeek: true }).labelVisible).toBe(false);
    expect(visibilityFor(s, 3, { focusPeek: true }).labelVisible).toBe(false);
    expect(visibilityFor(s, 2, { focusPeek: false }).labelVisible).toBe(false);
  });

  it("focusPeek can label current while showAnswers leaves current unlabeled", () => {
    const s = sessionWithNotes(runNotes, {
      playhead: 2,
      settings: { revealEnabled: true, revealN: 1, showAnswers: true },
    });
    expect(visibilityFor(s, 2).labelVisible).toBe(false);
    expect(visibilityFor(s, 2, { focusPeek: true }).labelVisible).toBe(true);
  });
});

describe("end stops", () => {
  it("tick past last note sets playing false and playhead = SEQUENCE_LENGTH", () => {
    const notes = Array.from({ length: SEQUENCE_LENGTH }, (_, i) =>
      note(10 + (i % 2 === 0 ? 0 : 1), "treble"),
    );
    let s = sessionWithNotes(notes, { playhead: SEQUENCE_LENGTH - 2 });
    s = play(s, transport({ bpm: 60 }), 0);
    // 3 beats from index 254 -> would reach 257, clamp to done
    s = tick(s, 3000);
    expect(s.playing).toBe(false);
    expect(s.playhead).toBe(SEQUENCE_LENGTH);
  });

  it("stop resets playhead without clearing notes", () => {
    const notes = [note(10, "treble"), note(11, "treble")];
    let s = sessionWithNotes(notes, { playhead: 1, playing: true, beatPhase: 0.3 });
    s = stop(s);
    expect(s.playhead).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.beatPhase).toBe(0);
    expect(s.notes).toEqual(notes);
  });
});
