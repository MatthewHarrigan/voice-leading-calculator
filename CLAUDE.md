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
src/music/        notes, chords, tuning, voicing, voiceLeading, progressions, song, chart, walkingBass  (no React)
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
- Format coverage was audited against the canonical iReal Pro protocol and the
  community parsers. The full token vocabulary is handled: barlines/endings/
  sections, time-sig changes (incl. `T12`=12/8), `n` N.C., `W`/`W/bass` inherited
  root, `p` slashes, latching `s`/`l` chord size, alternate chords `(…)`, inline
  `*…*` comments, `Y` spacers, `<*nn>` staff-text vertical offset, `<Nx>` repeat-
  count overrides (feed `flatten`'s pass count), and the `U` end marker. Known
  deliberate simplifications: the header transpose field (idx 5) is ignored
  (concert-pitch tool), and only two codas are modelled.

### Lead-sheet rendering (iReal layout parity)
`ChartView` exposes a shared `ChartGrid` (`components/ChartView.tsx`) that draws
the structural chrome on iReal's 16-cell grid — open-staff vertical barlines (no
cell boxes), tall stacked time signatures, outlined section boxes, full-width
ending brackets, simile/repeat signs, repeat dots and staff text. The chord
score and the guitar-diagram sheet (`GuitarChartView.tsx`) both render through
`ChartGrid`, so the guitar view is laid out identically to the score. `chartChrome.tsx`
holds the shared marks/signs and the `ChordSymbol` jazz typesetter (big root,
raised quality, pretty accidentals) used by both. A persisted `chartViewMode`
(`chart`/`guitar`/`both`) toggles which sheets show; layout maths and the
`structuralClasses`/row-edge helpers live in the pure `chartLayout.ts`.
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
- Walking bass (`walkingBass.ts`, after Ed Friedland's *Building Walking Bass Lines*): a
  progressive style ladder — `roots` → `roots-fifths` → `chromatic` / `dominant` / `scale`
  approach → `walking` (full) → `advanced` (Part Two). Invariants: the root anchors every
  chord's downbeat; the last beat before a change is an approach note (chromatic U/chr·L/chr,
  dominant U/dom·L/dom = the target's fifth, or scale `sc`); inner beats arpeggiate chord
  tones. `advanced` replaces the single approach with a two-note **indirect resolution** — one
  of Friedland's five chromatic/scalar enclosures (U/sc·L/sc·U/chr·L/chr pairs) surrounding the
  next root over the bar's last two beats, falling back to a single approach when a quick
  (≤2-beat) change leaves no room.
- Rhythmic feel (`embellishBassLine` + the player) is an **extension beyond the book** — Friedland
  is a straight-quarter method (its "Top Priority" page is about time-keeping, not ornament).
  Three independent options layer real jazz-bass time onto the generated line, for *playback
  only* (the readout always shows the clean harmonic line): **swing** (player delays each
  offbeat "and" to a triplet feel), **ghost notes** (a quiet chromatic eighth raked into a
  target on the "and"), **anticipate** (a chord-change root pushed an eighth early) and
  **triplet drops** (an upper/lower-neighbour pair in the beat *before* a target, so the target
  is the triplet's third hit — it always lands immediately, even from a half-note two-feel gap). A **Variation** slider
  (`bassAmount`, 0–1) sets how often they fire; selection is deterministic and evenly spread
  via a golden-ratio low-discrepancy sequence (`spread()`), never RNG, so the line is stable
  across renders. The player's bass track takes fractional beats + a per-note `velocity`; bass
  notes fire anywhere in their beat window, not just on the integer beat. The picker never
  repeats the previous note, and the line is octave-placed nearest the previous note within
  the bass register (E1–E3). It harvests harmonic chord tones and the scale (Mixolydian/
  Dorian/Ionian/dim) from the chord catalogue, *not* the drop-2 voicing. Two-feel = half
  notes, four-feel = quarters. The Sequence Builder generates it over the flattened form and
  feeds the player a `bassNotes` track keyed by absolute beat (a live style change just swaps
  the array); `BassLineView` renders the line under the chart with its analysis labels.

## Testing
- Unit: `src/music/**/*.test.ts` + `src/components/chartLayout.test.ts` (144 tests) cover spelling,
  the chord catalogue, drop-2 voicing, the b9 rule, the optimiser, progressions, the song model, the
  Song/Chart converters, the lead-sheet layout grid, and the iReal Pro engine (verified against the
  "9.20 Special" spec vector — 26 authored bars expand to 32 — plus subtle-token coverage and 5 real
  standard fixtures with round-trips).
- E2E: `e2e/app.spec.ts` (25 tests) exercises every page in a real browser, including iReal import
  (paste + standards), structure rendering, measure editing, the chart/guitar/both view toggle, and
  that the guitar sheet mirrors the score's chrome.
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
