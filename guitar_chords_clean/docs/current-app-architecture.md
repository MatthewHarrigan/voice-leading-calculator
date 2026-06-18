# Current App Architecture

This document describes the current app so future UI planning can be grounded in what already works, what is fragile, and what should be preserved in a React rewrite.

## Purpose

The app is a drop-2 guitar voicing workbench for Willmott-style harmony study. It currently combines several related tools:

- A static chord-library browser.
- Dynamic ii-V-I progression generation.
- A Chapter 1 assignment generator.
- A lead-sheet style sequence builder.
- Voice-leading optimization across a chord sequence.
- A top-note/lead-note voicing workflow.
- A melody-based chord finder.

The strongest direction is the sequence builder: editable charts plus generated/optimized playable voicings.

## Runtime Shape

The app is a static browser app.

- `index.html` contains the UI markup, CSS, and most app logic.
- `chord_generator_browser.js` is the browser chord engine.
- `presets/song-presets.js` contains built-in chart presets.
- `chords/*.svg` contains pre-generated static chord diagrams for the All Chords page.
- `chords/chord-manifest.json` contains metadata for static chord voicings, including b9 avoid information.
- `scripts/chord-generator.js` is the build-time version of the chord generator.
- `tests/smoke.spec.js` is the Playwright regression suite.

There is no framework, build step for the app shell, or runtime server beyond static file serving.

## Main Screens

### All Chords

The All Chords page is mostly static HTML that points at pre-generated SVG files in `chords/`.

Responsibilities:

- Browse the core 15 four-part chord types.
- Switch between middle and upper string sets by rewriting SVG paths.
- Highlight b9 avoid voicings when the global avoid-b9 option is enabled.
- Open the modal voicing inspector for static SVG diagrams.
- Show the small Fourths section for common fourth voicings.

The b9 highlighting depends on both `chord-manifest.json` and a static fallback filename set so the highlights are present on initial load.

### Major/Minor ii-V-I

These pages are generated dynamically in the browser. They use the chord generator to search inversion combinations and rank them by voice-leading distance.

Responsibilities:

- Generate candidate ii-V-I patterns.
- Respect the current string set.
- Respect the avoid-b9 setting, except for the dominant b9 exception.
- Open generated diagrams in the modal inspector.

### Chapter 1

The Chapter 1 page dynamically generates the assignment drills.

Current drills:

- Approach 1: all 15 types as D root inversion, C 1st inversion, Bb 2nd inversion, G 3rd inversion.
- Approach 2: all four inversions for each chord type in F.
- Approach 3: symmetrical C, A, Gb, Eb pattern for each chord type.

This page deliberately includes b9 avoid voicings because the assignment asks for them.

### Build Sequence

The sequence builder is the current center of gravity.

Responsibilities:

- Load built-in and saved song presets.
- Represent charts as bars, beats, chord events, duration, and optional lead-note targets.
- Add, update, remove, reorder, and drag chords.
- Preserve current chart in localStorage.
- Auto-optimize once a sequence has enough information.
- Allow a single chord to be optimized so the user can inspect one voicing with a lead note.
- Show available and avoided voicings for the selected chord.

The visible sequence is rendered as four bars per row. Chords are placed by beat and duration. When events collide in a bar, display lanes keep them visible instead of stacking.

### Melody Builder

The melody builder predates the newer lead-note workflow and overlaps with it conceptually.

Responsibilities:

- Find a chord inversion where the selected melody note appears on the B string.
- Try related chord-family substitutions if the exact chord does not contain the melody note.
- Build a separate melody sequence.

This screen is useful, but parts of it should probably merge with the sequence builder's top-note workflow later.

## Chord Engine

`chord_generator_browser.js` provides the core voicing operations:

- `CHORD_INTERVALS`: chord-type to interval definitions.
- `getChordNotes(root, chordType)`: pitch-class chord tones.
- `createDrop2Voicing(notes, inversion)`: close-position inversion followed by drop-2 transformation.
- `findDrop2Fingering(voicing, root, startFret, maxSpan, stringSet)`: finds a playable fingering on middle or upper strings.
- `hasFlatNineAvoidInterval(chordData, stringSet)`: detects b9/minor-second avoid intervals by pitch, not just adjacent string names.
- `create6StringChordSVG(...)`: generates inline SVG chord diagrams.
- `generateChordForStringSet(...)`: convenience wrapper for one chord, inversion, and string set.

The generator uses chromatic note names internally. Display spelling is handled mostly in `index.html`.

## Data Models

### Song Preset Model

Built-in presets use this shape:

```js
{
  id: 'all-the-things-study',
  title: 'All The Things Study',
  key: 'Ab',
  timeSignature: [4, 4],
  sections: [
    {
      id: 'a1',
      name: 'A1',
      bars: [
        {
          id: 'a1b1',
          beats: 4,
          chords: [
            { beat: 1, duration: 4, root: 'F', chordType: 'min7', targetTopNote: 'Ab' }
          ]
        }
      ]
    }
  ]
}
```

This is the best candidate for the future app's canonical chart model.

### Runtime Sequence Model

The current sequence builder adapts songs into a flat `chordSequence` array. A sequence chord includes:

- `id`
- `root`
- `displayRoot`
- `chordType`
- `symbol`
- `barIndex`
- `beat`
- `durationBeats`
- `duration`
- `stringSet`
- optional `targetTopNote`
- optional `preferredInversion`

This flat model makes optimization easier but makes chart editing harder because section/bar identity must be reconstructed.

### Persisted State

The app uses localStorage:

- `voiceLeadingAppState`: active section, string set, sort mode, avoid-b9 setting.
- `voiceLeadingCurrentSong`: current editable chart.
- `songPresets`: user-saved charts.

Recent fixes made startup load the chord generator before restoring the saved chart so the sequence builder cannot silently hold old chord data while rendering as blank.

## Voice-Leading Flow

The optimizer works over `chordSequence`.

For each chord:

1. Generate the requested or candidate inversion.
2. Reject unusable fingerings.
3. Reject b9 avoid intervals when the filter is enabled, except for allowed dominant b9 cases.
4. Score candidates by fret movement from the previous chord.
5. Add a penalty when a target top note is missed.
6. Keep the lowest-scoring path.

For a single chord, optimization now behaves as voicing selection: it chooses a usable inversion, preferring the target top note when supplied.

## Current UI Strengths

- The chord SVGs are visually clean and musically useful.
- The string-set toggle is a simple and effective global control.
- The modal inspector is valuable because it exposes the actual voicing, top voice, fret span, and avoid status.
- Presets make the app testable and turn abstract voicing theory into playable examples.
- Lead-note targets in optimized diagrams are useful and should remain.
- Chapter 1 generation proves that book assignments can become interactive study pages.

## Current UI Problems

- `index.html` is doing too much: markup, styling, model conversion, persistence, generation, optimization, and UI events.
- There are multiple overlapping concepts of """sequence""": song presets, flat chord sequence, optimized sequence, melody sequence.
- State is mutated globally, so render timing bugs are easy to create.
- The sequence builder is too visually dense and has too many controls competing for attention.
- Beat placement is functional but not yet a proper chart editor.
- The optimized sequence and editable sequence are separate displays, which can make the workflow feel indirect.
- The modal, chord inspector, voicing analysis panel, and melody builder duplicate parts of the same concept.
- Some features are still tied to the middle-string B-string assumption, while newer code supports upper strings too.

## React Rewrite Requirements

A new UI should preserve the working music logic but separate concerns.

Suggested modules:

- `songModel`: canonical chart, bars, beats, chord events, validation.
- `voicingEngine`: chord generation, b9 detection, inversion search.
- `voiceLeading`: sequence optimization and top-note scoring.
- `presetStore`: built-in presets, saved presets, import/export.
- `storage`: localStorage keys and migration.
- `components/ChordDiagram`: SVG rendering.
- `components/ChartGrid`: editable bars/beats.
- `components/VoicingInspector`: selected chord analysis.
- `components/OptimizerPanel`: optimized voicing choices.
- `components/AssignmentPage`: generated book exercises.

State should have one canonical source:

- Current chart.
- Selected chord event.
- Current string set.
- Avoid-b9 setting.
- Optimizer settings.
- Derived optimized voicings.

Derived data should be recomputed from state instead of stored independently where possible.

## Suggested Migration Strategy

Do not rewrite everything at once.

1. Extract pure music/model code from `index.html`.
2. Add tests around the extracted code.
3. Create a React/Vite app shell beside the current app.
4. Port the sequence builder first using the same preset JSON model.
5. Port chord diagrams using the existing SVG generator.
6. Port All Chords and Chapter 1 as generated data-driven pages.
7. Keep the old static app available until the React builder can cover the current tests.

## Open Product Questions

- Should the optimized voicing replace the editable chart display, or remain a separate result?
- Should every chord event hold a locked inversion after optimization, or should optimization remain temporary?
- Should the melody builder become a mode inside the sequence builder?
- Should chart editing use slash notation, explicit beat lanes, or both?
- Should b9 avoid status be a global rule, per-chart rule, or per-exercise override?
- How much of Willmott's terminology should be exposed directly versus hidden behind cleaner labels?
