# Fixed Dojo - product description

Fixed Dojo is a browser practice tool for **fixed-do solfege** reading on a musical staff.

## Background

**Solfege** names the seven pitch classes with syllables: do, re, mi, fa, sol, la, si.

In **fixed do**, those syllables always map to the same pitch letters: do = C, re = D, mi = E, fa = F, sol = G, la = A, si = B.

Sight-singing and ear-training programs (including approaches associated with Juilliard and other conservatories) often train reading by naming notes with fixed-do syllables while looking at staff notation in several **clefs** (treble, bass, alto, tenor), including notes on **ledger lines** (short lines above or below the five-line staff).

Fixed Dojo drills that skill: a paced sequence of noteheads appears on the staff; you say (or think) the fixed-do syllable for each one in time.

## What the app does

You generate a long random sequence of notes, then play it back at a chosen tempo. The staff advances a playhead note by note. Optional helpers can hide upcoming notes or show syllable answers under the notes.

## Features

- **Generate** - mints a new numerical `seed` into the URL (push history) and builds a new 256-note practice sequence from the current sequence settings.
- **Play / Pause / Stop** - paced playback; Space toggles play/pause when you are not typing in a field. These controls do not change the URL.
- **BPM** - tempo control (about 20-240). Dragging updates tempo live during playback; releasing the slider (or editing the number) updates the URL in place without regenerating the sequence or stopping playback.
- **Sequence settings** - difficulty, clefs, and ledger lines shape which notes are generated. Changing any of them keeps the current `seed`, updates the URL, stops playback, and re-derives the sequence.
  - **Difficulty (1-10)** - how melodic vs. jumpy the sequence is (step motion vs. larger leaps, range, and related patterns).
  - **Clefs** - treble, bass, alto, and tenor. With **Mix clefs** off, pick one clef. With **Mix clefs** on, select several; the sequence can change clef mid-run.
  - **Ledger lines (0-4)** - how far above and below the staff notes may appear.
- **View settings** - settings that change how the sequence is displayed. Changing them updates the URL in place without regenerating the sequence or stopping playback.
  - **Progressive reveal** - when on, only notes from the start through the playhead, plus a chosen number of **notes ahead**, are shown; the rest stay hidden.
  - **Show answers** - labels each visible note with its fixed-do syllable (do-si).
- **Hold F** - while held, shows only the current playhead note's syllable (a quick check without leaving answers on for the whole run). Does not change the URL.
- **Shareable URL** - panel settings live in the query string: numerical `seed`, `bpm`, and a packed `s` for sequence and view settings. Same `seed` with the same sequence settings yields the same drill for this app version. Bookmark, share, Back, and Forward restore those settings; opening a link (or stepping history) with new sequence settings or a new `seed` stops playback, resets, and generates a matching sequence. A missing or invalid `seed` is replaced into the URL; an invalid `seed` or unreadable `s` shows a brief could-not-load status (unreadable `s` falls back to defaults).
