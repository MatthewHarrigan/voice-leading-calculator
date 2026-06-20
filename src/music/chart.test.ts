import { describe, expect, test } from 'vitest';
import { CHORD_TYPE_IDS } from './chords';
import { mapQuality } from './ireal/chordParser';
import {
  IREAL_QUALITY_BY_TYPE,
  chartToSequence,
  chordFromType,
  createEmptyChart,
  measureStartBeats,
  sequenceToChart,
  songToChart,
  transposeChart,
} from './chart';
import { SONG_PRESETS } from '../data/presets';

describe('quality ↔ type round-trip', () => {
  test.each(CHORD_TYPE_IDS)('every catalogue type has a round-tripping iReal quality (%s)', (type) => {
    const quality = IREAL_QUALITY_BY_TYPE[type];
    expect(quality).toBeTruthy();
    expect(mapQuality(quality)).toBe(type);
  });
});

describe('chordFromType', () => {
  test('builds the catalogue chord with symbol and beats', () => {
    const c = chordFromType('Bb', 'min7', 2);
    expect(c.chordType).toBe('min7');
    expect(c.symbol).toBe('Bbm7');
    expect(c.beats).toBe(2);
    expect(c.root).toBe('Bb');
  });
});

describe('songToChart', () => {
  const preset = SONG_PRESETS.find((p) => p.id === 'major-ii-v-i')!;
  const chart = songToChart(preset);

  test('one measure per bar with the right chords', () => {
    expect(chart.measures).toHaveLength(4);
    expect(chart.measures[0].chords[0].symbol).toBe('Dm7');
    expect(chart.measures[1].chords[0].symbol).toBe('G7');
    expect(chart.measures[2].chords[0].symbol).toBe('Cmaj7');
    expect(chart.measures[0].timeSig).toEqual([4, 4]);
    expect(chart.measures[3].close).toBe('final');
  });

  test('multi-section song marks section starts with a double barline', () => {
    const atttya = SONG_PRESETS.find((p) => p.id === 'all-the-things-study')!;
    const c = songToChart(atttya);
    // A1 (8) + A2 (8) + Bridge (8) + A3 (8) = 32 measures.
    expect(c.measures).toHaveLength(32);
    expect(c.measures[8].open).toBe('double'); // start of A2
    expect(c.measures[8].section).toBe('A2');
  });
});

describe('chartToSequence', () => {
  test('positions chords by beat within each measure', () => {
    const chart = createEmptyChart();
    chart.measures = [
      {
        id: 'm1',
        chords: [chordFromType('C', 'maj7', 2), chordFromType('A', 'min7', 2)],
        timeSig: [4, 4],
      },
      { id: 'm2', chords: [chordFromType('D', 'min7', 4)], close: 'final' },
    ];
    const seq = chartToSequence(chart, { stringSet: 'middle' });
    expect(seq).toHaveLength(3);
    expect(seq[0]).toMatchObject({ symbol: 'Cmaj7', barIndex: 0, beat: 1, durationBeats: 2 });
    expect(seq[1]).toMatchObject({ symbol: 'Am7', barIndex: 0, beat: 3, durationBeats: 2 });
    expect(seq[2]).toMatchObject({ symbol: 'Dm7', barIndex: 1, beat: 1, durationBeats: 4 });
  });

  test('expands repeats from the chart structure', () => {
    const chart = createEmptyChart();
    chart.measures = [
      { id: 'a', open: 'repeat', chords: [chordFromType('C', 'maj7', 4)] },
      { id: 'b', close: 'repeat', chords: [chordFromType('G', 'dom7', 4)] },
    ];
    const seq = chartToSequence(chart, { stringSet: 'middle' });
    expect(seq.map((c) => c.symbol)).toEqual(['Cmaj7', 'G7', 'Cmaj7', 'G7']);
  });
});

describe('transposeChart', () => {
  test('transposes to a flat target key and respells chords with flats', () => {
    const c = createEmptyChart('t', 'C');
    c.measures = [
      { id: 'm1', chords: [chordFromType('D', 'min7', 2), chordFromType('G', 'dom7', 2)], timeSig: [4, 4] },
      { id: 'm2', chords: [chordFromType('C', 'maj7', 4)], close: 'final' },
    ];
    const t = transposeChart(c, 3, 'Eb');
    expect(t.key).toBe('Eb');
    expect(t.measures.flatMap((m) => m.chords.map((ch) => ch.symbol))).toEqual(['Fm7', 'Bb7', 'Ebmaj7']);
  });

  test('derives the new key from the shift when no target key is given', () => {
    const c = createEmptyChart('t', 'C');
    c.measures = [{ id: 'm1', chords: [chordFromType('C', 'maj7', 4)], timeSig: [4, 4], close: 'final' }];
    expect(transposeChart(c, 2).key).toBe('D');
  });
});

describe('measureStartBeats', () => {
  test('accumulates by the default meter', () => {
    expect(measureStartBeats([{}, {}, {}, {}], [4, 4])).toEqual([0, 4, 8, 12]);
  });

  test('honours per-measure time-signature changes (mixed meter)', () => {
    const measures = [{ timeSig: [3, 4] as [number, number] }, {}, { timeSig: [3, 4] as [number, number] }];
    expect(measureStartBeats(measures, [4, 4])).toEqual([0, 3, 7]);
  });
});

describe('sequenceToChart round-trip', () => {
  test('grouping by bar then flattening preserves chords', () => {
    const preset = SONG_PRESETS.find((p) => p.id === 'jazz-blues-f')!;
    const seq1 = chartToSequence(songToChart(preset), { stringSet: 'middle' });
    const chart2 = sequenceToChart(seq1, preset.title, preset.key ?? 'C');
    const seq2 = chartToSequence(chart2, { stringSet: 'middle' });
    expect(seq2.map((c) => c.symbol)).toEqual(seq1.map((c) => c.symbol));
    expect(seq2.map((c) => `${c.barIndex}:${c.beat}:${c.durationBeats}`)).toEqual(
      seq1.map((c) => `${c.barIndex}:${c.beat}:${c.durationBeats}`),
    );
  });
});
