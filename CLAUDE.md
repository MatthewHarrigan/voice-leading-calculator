# Claude Context File — Drop 2 Voicing Workbench

## Project Overview
A modern React + TypeScript single-page app for studying drop 2 guitar voicings and voice
leading, in the spirit of Bret Willmott's harmony method. It is a ground-up rewrite of the
original static HTML app (now archived in `legacy/`).

## How to Run
```bash
npm install
npm run dev        # http://localhost:5173
```
Other scripts: `npm run build`, `npm run preview`, `npm test` (Vitest),
`npm run test:e2e` (Playwright — run `npm run install:browsers` once first),
`npm run lint`, `npm run typecheck`.

## Architecture
Pure, framework-independent music logic lives in `src/music/` and is unit-tested with Vitest.
React is only at the edges. State is a single Zustand store (`src/state/store.ts`) persisted to
`localStorage`. Diagrams are React SVG components; audio is a dependency-free Web Audio
plucked-string synth (`src/audio/`).

```
src/music/        notes, chords, tuning, voicing, voiceLeading, progressions, song, chart  (no React)
src/music/ireal/  iReal Pro format: unscramble, chordParser, parse, serialize, flatten, fixtures
src/audio/        Web Audio chord player + hook
src/state/        Zustand store (settings + editable IRealChart)
src/data/         song presets + chapter curriculum
src/components/   ChordDiagram, ChartView, MeasureEditor, ImportPanel, inspector, pickers, controls
src/pages/        Library, Progressions, Chapters, Sequence Builder, Melody
e2e/              Playwright specs
legacy/           the original static app (reference only)
```

### iReal Pro support
The Sequence Builder is built around `IRealChart` (a measure-based model in
`src/music/ireal/types.ts`) as the store's source of truth. It imports/exports
`irealb://` (and reads `irealbook://`) and renders an iReal-style lead sheet.
- `unscramble.ts` is the byte-exact deobfuscation (50-char block swaps, prefix
  `1r34LbKcu7`, `Kcl`/`LZ`/`XyQ` expansion); `scramble` reuses it for export.
- `parse.ts` tokenises the music string into measures (sections, barlines,
  endings, repeats, time sigs, coda/segno, staff text); `flatten.ts` expands
  repeats / 1st-2nd endings / one-bar repeats / D.C.–D.S. al Coda/Fine into the
  performance order that drives diagrams, the optimiser, and playback.
- `chordParser.ts` maps iReal qualities to the four-part catalogue (best-effort,
  e.g. C13→dom9, ♯11→♭5 shell, ♭13→♯5 shell); `src/music/chart.ts` bridges
  Song/SequenceChord ⇄ IRealChart (`songToChart`, `chartToSequence`,
  `transposeChart`). Coverage is verified against the full iReal quality
  vocabulary and all 6 default playlists (Jazz 1460, Brazilian 220, Latin 50,
  Blues 50, Pop 400, Country 50 — 88k chords): every chord maps to a playable
  voicing.
- Beat durations within a bar are inferred by even distribution (not iReal's
  exact cell counting) — a deliberate, documented approximation.
- Fixtures (`fixtures.ts`) are real forum charts of copyrighted tunes, used only
  to test the decoder; keep the set tiny and do not redistribute.

## Key Domain Facts
- 24 four-part chord types; 15 of them are the "core" set used by the Chapter 1 assignment.
- Ninth/extension chords drop the root (the extension substitutes for it).
- Drop 2 = close voicing → rotate to inversion → drop the 2nd-from-top voice an octave.
- String sets: middle = A-D-G-B (string indices 1-4), upper = D-G-B-E (indices 2-5).
- "Avoid b9": any two voices a minor-9th apart, except dominant 7♭9.
- Voice-leading optimiser: greedy minimisation of fret movement + a missed-lead-note penalty;
  guide line is tracked on the top string (B for middle, high-E for upper).

## Testing
- Unit: `src/music/**/*.test.ts` (117 tests) cover spelling, the chord catalogue, drop-2 voicing,
  the b9 rule, the optimiser, progressions, the song model, the Song/Chart converters, and the
  iReal Pro engine (verified against the "9.20 Special" spec vector — 26 authored bars expand to
  32 — and 5 real standard fixtures with round-trips).
- E2E: `e2e/app.spec.ts` (18 tests) exercises every page in a real browser, including iReal
  import (paste + standards), structure rendering, and measure editing.
- Always keep `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run typecheck` green.

## Deployment
GitHub Actions builds and deploys to GitHub Pages on push to `main`
(`.github/workflows/deploy.yml`); CI runs on every push/PR (`.github/workflows/ci.yml`).
The production base path is `/voice-leading-calculator/`; e2e/CI build with `VITE_BASE=/`.

## Notes for Claude
- **Commit messages must NOT include Claude credit or co-author lines.**
- Keep music logic in `src/music/` pure and tested; do not pull React into it.
- Only commit/push to the user's GitHub remote (`origin`,
  github.com/MatthewHarrigan/voice-leading-calculator).
- A possible future enhancement: a full diatonic note speller (unique letter per chord tone);
  the current speller chooses sharps/flats per key, which improves on the legacy app.
