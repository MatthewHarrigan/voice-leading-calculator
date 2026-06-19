# Codex Context File — Drop 2 Voicing Workbench

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
src/music/      notes, chords, tuning, voicing, voiceLeading, progressions, song  (no React)
src/audio/      Web Audio chord player + hook
src/state/      Zustand store (settings + editable chart)
src/data/       song presets + chapter curriculum
src/components/ ChordDiagram, inspector modal, pickers, global controls
src/pages/      Library, Progressions, Chapters, Sequence Builder, Melody
e2e/            Playwright specs
legacy/         the original static app (reference only)
```

## Key Domain Facts
- 24 four-part chord types; 15 of them are the "core" set used by the Chapter 1 assignment.
- Ninth/extension chords drop the root (the extension substitutes for it).
- Drop 2 = close voicing → rotate to inversion → drop the 2nd-from-top voice an octave.
- String sets: middle = A-D-G-B (string indices 1-4), upper = D-G-B-E (indices 2-5).
- "Avoid b9": any two voices a minor-9th apart, except dominant 7♭9.
- Voice-leading optimiser: greedy minimisation of fret movement + a missed-lead-note penalty;
  guide line is tracked on the top string (B for middle, high-E for upper).

## Testing
- Unit: `src/music/*.test.ts` (36 tests) cover spelling, the chord catalogue, drop-2 voicing,
  the b9 rule, the optimiser, progressions, and the song model.
- E2E: `e2e/app.spec.ts` exercises every page in a real browser.
- Always keep `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run typecheck` green.

## Deployment
GitHub Actions builds and deploys to GitHub Pages on push to `main`
(`.github/workflows/deploy.yml`); CI runs on every push/PR (`.github/workflows/ci.yml`).
The production base path is `/voice-leading-calculator/`; e2e/CI build with `VITE_BASE=/`.

## Notes for Codex
- **Commit messages must NOT include Codex credit or co-author lines.**
- Keep music logic in `src/music/` pure and tested; do not pull React into it.
- Only commit/push to the user's GitHub remote (`origin`,
  github.com/MatthewHarrigan/voice-leading-calculator).
- A possible future enhancement: a full diatonic note speller (unique letter per chord tone);
  the current speller chooses sharps/flats per key, which improves on the legacy app.
