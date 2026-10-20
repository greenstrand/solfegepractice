# Fixed Dojo

Fixed-do clef solfege drill: paced staff practice with React and SVG notation.

## Usage

1. `npm install` then `npm run dev` and open the local URL.
2. Pick clefs, difficulty (1-10), and BPM; hit **Generate** for a 256-note sequence.
3. **Play** / **Pause** / **Stop** (or Space when focus is not in an input). Progressive reveal shows notes from the start through the playhead plus N notes ahead; show-answers and Hold-F peek live under the transport.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Play / pause (ignored while typing in an input) |
| F | Hold to focus-peek: show only the current playhead note's solfege |

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Check

Format, lint, typecheck, and tests:

```bash
npm run check
```

Other scripts:

- `npm run build` - production build
- `npm test` - Vitest once
