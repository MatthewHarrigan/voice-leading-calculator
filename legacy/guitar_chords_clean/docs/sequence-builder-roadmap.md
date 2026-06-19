# Sequence Builder Roadmap

## Direction

The sequence builder should become the main app surface. The chord library remains useful as a voicing reference, but editable charts, presets, and optimized voicing choices should be built around a proper lead-sheet data model.

## Current Foundation

The app now has a browser-native song preset format in `presets/song-presets.js`.

The model is intentionally close to JSON:

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
            { beat: 1, duration: 4, root: 'F', chordType: 'min7' }
          ]
        }
      ]
    }
  ]
}
```

`index.html` adapts that richer model into the current flat `chordSequence` array so the existing optimizer keeps working.

## Format Strategy

- Native project format: JSON song model above.
- Lightweight import/export candidate: ChordPro-style chord charts.
- Serious interchange candidate: MusicXML harmony/chord-symbol export.

Do not make MusicXML the internal model. It is too verbose for editing state, but it is a good export/import boundary later.

## Next Implementation Slices

1. Split sequence code out of `index.html`.
   - `src/songModel.js`
   - `src/presetStore.js`
   - `src/sequenceAdapter.js`
   - `src/voiceLeading.js`

2. Improve chart editing.
   - Preserve section and bar identity after edits.
   - Add bar-level insert/delete.
   - Add explicit beat slots inside bars.
   - Keep drag/drop, but drag chord events between bars/beats.

3. Improve state management.
   - Persist active view, string set, sort mode, and current chart.
   - Add undo/redo before deeper editing.
   - Move persisted state behind a small storage API.

4. Migrate UI to React.
   - Use Vite, React, and TypeScript.
   - Keep the song model independent from React.
   - Use a small store such as Zustand for chart, selection, and optimizer settings.

5. Expand preset testing.
   - Validate every preset has legal roots and supported chord types.
   - Run optimization over every preset.
   - Add screenshot checks for dense charts.

## UX Notes

- The optimized result should update automatically once editing is stable.
- Users should be able to lock a voicing so optimization works around fixed choices.
- Long charts need section labels and less intrusive per-chord delete controls.
- Slash notation may be useful for compact charts, but beat-level chord placement should come first.
