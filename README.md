# Drop 2 Voicing Workbench

A modern, interactive guitar-harmony workbench for **drop 2 voicings** and **voice-leading**,
in the spirit of Bret Willmott's harmony method. Browse every four-part chord type and inversion,
generate the smoothest ii-V-I voice leading, work through a progressive set of harmony studies, and
build lead-sheet charts that the app voices and optimises for you — all rendered as clean,
playable fretboard diagrams.

**Live app:** https://matthewharrigan.github.io/voice-leading-calculator/

> This is a ground-up React + TypeScript rewrite of the original static HTML app. The original
> lives in [`legacy/`](./legacy) for reference.

## Features

- **Chord Library** — all 24 four-part chord types, every inversion, on the middle (A-D-G-B) or
  upper (D-G-B-E) string set. Voicings with a minor-9th (b9) "avoid" clash are flagged.
- **Voice-Leading Progressions** — the four smoothest drop 2 ii-V-I patterns, ranked by total
  fret movement across all inversion combinations.
- **Harmony Studies (6 chapters)** — a progressive curriculum from raw inversions through ninths,
  altered dominants, voice-led ii-V-Is, substitutions/diminished symmetry, and reharmonized
  standards. Chapter 1 reproduces the original 180-card inversion assignment exactly.
- **Sequence Builder** — a lead-sheet chart editor with beat-level placement, built-in and saved
  presets, automatic voice-leading optimisation, lead-note targets, lockable inversions, and a
  guide-line analysis on the top string.
- **Melody Finder** — find a drop 2 inversion (or same-family substitution) that places a chosen
  melody note on top.
- **Audio** — every diagram is clickable and plays a synthesised plucked-guitar chord (Web Audio,
  no samples or network needed).
- **Polish** — light/dark themes, responsive layout, keyboard-accessible diagrams, and persistent
  settings/charts via `localStorage`.

## Tech stack

- **Vite** + **React 18** + **TypeScript** (strict)
- **Zustand** for state, persisted to `localStorage`
- **React Router** for navigation
- **Web Audio API** (Karplus-Strong synthesis) for chord playback — zero external assets
- **Vitest** for the music-engine unit tests, **Playwright** for end-to-end tests
- **GitHub Actions** for CI and GitHub Pages deployment

## Getting started

```bash
npm install
npm run dev          # start the dev server (http://localhost:5173)
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the Vitest unit suite |
| `npm run test:e2e` | Run the Playwright e2e suite (builds + serves automatically) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project check |

First-time e2e run: `npm run install:browsers` to fetch Chromium.

## Architecture

The music logic is **framework-independent and unit-tested**, with React only at the edges.

```
src/
├── music/            # pure engine (no React)
│   ├── notes.ts          # pitch classes, key-aware spelling
│   ├── chords.ts         # 24 chord types, intervals, chord-tone naming
│   ├── tuning.ts         # tuning, string sets, fret↔pitch
│   ├── voicing.ts        # drop-2 construction, fingering search, b9 detection
│   ├── voiceLeading.ts   # sequence optimiser + guide-line analysis
│   ├── progressions.ts   # ranked ii-V-I generation
│   └── song.ts           # lead-sheet model, flatten, validation
├── audio/            # Web Audio plucked-string player + React hook
├── state/            # Zustand store (settings + editable chart, persisted)
├── data/             # song presets + chapter curriculum (data-driven)
├── components/       # ChordDiagram (SVG), inspector modal, pickers, controls
└── pages/            # Library, Progressions, Chapters, Sequence Builder, Melody
```

### The drop 2 engine

A drop 2 voicing is built by taking a close-position four-note chord, rotating it to the desired
inversion, and dropping the second-from-top voice an octave to the bottom. The engine searches
frets 3–12 for the first playable fingering within a four-fret span on the chosen string set.
The "avoid b9" rule flags any pair of voices a minor-9th apart (with the dominant 7♭9 exception).
All of this is covered by the Vitest suite in `src/music/*.test.ts`.

## Harmony studies

The chapter curriculum follows the section order of Bret Willmott's *Complete Book of Harmony,
Theory & Voicing* (Mel Bay 95112); the per-chapter drills are an engine-buildable adaptation:

1. **Drop 2 Inversions** — all types, all inversions (the original 180-card assignment)
2. **Voice-Leading the Inversions** — the top-voice ladder and a two-string-set b9 check
3. **Tensions on Top** — 9ths and altered 9ths
4. **Voice-Leading Chord Scales** — ii-V-I with a fixed lead line
5. **Subs, Diminished Tension & Symmetry** — tritone subs, dim7 symmetry, m7♭5 = m6
6. **Song Examples & Reharmonization** — full standards loaded into the Sequence Builder

## Deployment

`.github/workflows/ci.yml` runs type-check, lint, unit, and e2e tests on every push and pull
request. `.github/workflows/deploy.yml` builds the app with the `/voice-leading-calculator/` base
path and publishes `dist/` to GitHub Pages (with a `404.html` fallback for client-side routing).

The deploy workflow is **manual** (`workflow_dispatch`) for now: GitHub Pages isn't available on
this repo's current plan/visibility, and auto-running it on every push only produced failed runs
and notification emails. To deploy: make the repo **public** (or use a plan that allows Pages on
private repos), set **Settings → Pages → Source: GitHub Actions**, then run the deploy from the
**Actions** tab (or re-add the `push` trigger). It uses `enablement: true`, so it will create the
Pages site automatically once the repo qualifies.

## License

MIT
