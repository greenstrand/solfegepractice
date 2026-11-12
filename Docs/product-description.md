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

- **Generate** - builds a new 256-note practice sequence from the current settings (as reflected in the URL).
- **Play / Pause / Stop** - paced playback; Space toggles play/pause when you are not typing in a field. These controls do not change the URL.
- **BPM** - tempo control (about 20-240). Dragging updates tempo live during playback; releasing the slider (or editing the number) updates the URL in place without regenerating the sequence or stopping playback.
- **Difficulty (1-10)** - how melodic vs. jumpy the sequence is (step motion vs. larger leaps, range, and related patterns).
- **Clefs** - treble, bass, alto, and tenor. With **Mix clefs** off, pick one clef. With **Mix clefs** on, select several; the sequence can change clef mid-run.
- **Ledger lines (0-4)** - how far above and below the staff notes may appear.
- **Progressive reveal** - when on, only notes from the start through the playhead, plus a chosen number of **notes ahead**, are shown; the rest stay hidden. Toggling it or changing notes-ahead updates the URL in place without regenerating the sequence or stopping playback.
- **Show answers** - labels each visible note with its fixed-do syllable (do-si). Toggling it updates the URL in place without regenerating the sequence or stopping playback.
- **Hold F** - while held, shows only the current playhead note's syllable (a quick check without leaving answers on for the whole run). Does not change the URL.
- **Shareable URL** - panel settings live in the query string (`bpm` plus a packed `s` for generation fields and view prefs). Defaults use a bare URL. Changing generation fields inside `s` (clefs, mix, difficulty, ledger lines; sliders on release) updates the address bar, stops playback, and regenerates a matching sequence. BPM and view-pref URL updates (progressive reveal, notes ahead, show answers) replace the current history entry and leave the sequence and playhead alone. Bookmark, share, Back, and Forward restore those settings; applying a landing or history URL with new generation fields stops playback, resets, and generates a matching sequence. An unreadable `s` shows a brief could-not-load status and falls back to defaults.
