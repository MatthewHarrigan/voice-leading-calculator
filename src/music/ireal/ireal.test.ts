import { describe, expect, test } from 'vitest';
import { unscramble, scramble } from './unscramble';
import { mapQuality } from './chordParser';
import { parseIRealSong, tokenizeMeasures } from './parse';
import { toIRealURL, buildMusicTokens } from './serialize';
import { flattenChart } from './flatten';
import { VECTOR_920_SPECIAL, STANDARD_FIXTURES } from './fixtures';
import type { IRealChart } from './types';

const measureSymbols = (chart: { measures: { chords: { symbol: string }[] }[] }) =>
  chart.measures.map((m) => m.chords.map((c) => c.symbol).join(' '));

describe('unscramble', () => {
  test('decodes the verified 9.20 Special music string', () => {
    const decoded = decodeURIComponent(VECTOR_920_SPECIAL.replace(/^irealb:\/\//, ''));
    const music = decoded.split('=').find((f) => f.includes('1r34LbKcu7'))!;
    const out = unscramble(music.slice(music.indexOf('1r34LbKcu7')));
    expect(out).toBe(
      '{*AT44D9,   |F-6,   |D9,   |F-6   |C,   |sC7,B7,Bb7,A7|N1lD9,   |G7, sAb7,G7}        |N2lD9,   |G7, C6 ][*BC7,   | x  |F6,   | x  |D7,   | x  |G7,   | x  ][*AD9,   |F-6,   |D9,   |F-6,   |C,   |sC7,B7,Bb7,A7|lD9,   |G7, C6 Z ',
    );
  });

  test('scramble is the inverse of the block unscramble', () => {
    const tokens = '{*AT44D9|F-6|C7,B7,Bb7,A7|N1G7}N2C6 Z ';
    expect(unscramble(scramble(tokens))).toBe(tokens);
  });
});

describe('chord quality mapping', () => {
  const cases: [string, string][] = [
    ['^7', 'maj7'],
    ['', 'maj7'],
    ['6', 'maj6'],
    ['69', 'maj69'],
    ['^9', 'maj9'],
    ['^7#11', 'maj7b5'],
    ['^7#5', 'maj7s5'],
    ['-7', 'min7'],
    ['-6', 'min6'],
    ['-9', 'min9'],
    ['-^7', 'minmaj7'],
    ['-7b5', 'min7b5'],
    ['h7', 'min7b5'],
    ['h9', 'min7b59'],
    ['7', 'dom7'],
    ['9', 'dom9'],
    ['13', 'dom9'],
    ['7sus', 'dom7sus4'],
    ['7b9', 'dom7b9'],
    ['7#9', 'dom7s9'],
    ['7b5', 'dom7b5'],
    ['7#5', 'dom7s5'],
    ['7alt', 'dom7b9'],
    ['o7', 'dim7'],
    ['o^7', 'dimmaj7'],
  ];
  test.each(cases)('quality "%s" → %s', (quality, expected) => {
    expect(mapQuality(quality)).toBe(expected);
  });
});

describe('cell-grid edge tokens', () => {
  test('p (slash) holds the previous chord across the bar', () => {
    const m = tokenizeMeasures('C7,p,p,p|', [4, 4]);
    expect(m[0].cells).toBe(4);
    expect(m[0].chords).toHaveLength(1);
    expect(m[0].chords[0].beats).toBe(4);
  });

  test('W inherits the previous root as a slash bass and occupies a cell', () => {
    const m = tokenizeMeasures('C7|W/G|', [4, 4]);
    expect(m[1].chords).toHaveLength(1);
    expect(m[1].chords[0].root).toBe('C');
    expect(m[1].chords[0].bass).toBe('G');
    expect(m[1].chords[0].symbol).toContain('/G');
  });
});

describe('parse 9.20 Special', () => {
  const song = parseIRealSong(VECTOR_920_SPECIAL)!;

  test('header fields', () => {
    expect(song.title).toBe('9.20 Special');
    expect(song.composer).toBe('Earl Warren');
    expect(song.style).toBe('Medium Swing');
    expect(song.key).toBe('C');
    expect(song.timeSignature).toEqual([4, 4]);
  });

  test('authored measures: 26 with the repeat/ending/section structure', () => {
    expect(song.measures.length).toBe(26);
    expect(song.measures[0].open).toBe('repeat');
    expect(song.measures[0].section).toBe('A');
    expect(song.measures[0].timeSig).toEqual([4, 4]);
    expect(song.measures[6].ending).toBe(1);
    expect(song.measures[7].close).toBe('repeat');
    expect(song.measures[8].ending).toBe(2);
    expect(song.measures[10].section).toBe('B');
    // The B section is written as chord + one-bar repeat pairs.
    expect(song.measures[11].barRepeat).toBe(1);
    expect(song.measures[25].close).toBe('final');
  });

  test('preserves the 16-cell layout grid (4 bars/row, 2nd ending under 1st)', () => {
    // Every bar is 4 cells wide; rows are 16 cells = 4 bars per line.
    expect(song.measures.every((m) => m.cells === 4)).toBe(true);
    expect(song.measures[0].cell).toBe(0);
    expect(song.measures[4].cell).toBe(16); // row 2 starts at bar 5
    expect(song.measures[6].cell).toBe(24); // 1st ending bar
    // The 2nd-ending bar is pushed by padding cells to the same column as the 1st.
    expect(song.measures[8].cell).toBe(40);
    expect(song.measures[6].cell! % 16).toBe(song.measures[8].cell! % 16);
  });

  test('chord beats sum within a 4/4 bar', () => {
    const packed = song.measures[5]; // C7 B7 Bb7 A7
    expect(packed.chords.map((c) => c.beats)).toEqual([1, 1, 1, 1]);
    const two = song.measures[9]; // G7 C6
    expect(two.chords.map((c) => c.beats)).toEqual([2, 2]);
    const one = song.measures[0]; // D9
    expect(one.chords.map((c) => c.beats)).toEqual([4]);
  });
});

describe('flatten 9.20 Special', () => {
  const song = parseIRealSong(VECTOR_920_SPECIAL)!;
  const flat = flattenChart(song);

  test('expands repeats, 1st/2nd endings and one-bar repeats to 32 bars', () => {
    expect(flat.length).toBe(32);
    expect(measureSymbols({ measures: flat })).toEqual([
      'D9', 'Fm6', 'D9', 'Fm6', 'C', 'C7 B7 B♭7 A7', 'D9', 'G7 A♭7 G7', // A, 1st ending
      'D9', 'Fm6', 'D9', 'Fm6', 'C', 'C7 B7 B♭7 A7', 'D9', 'G7 C6', // A repeat → 2nd ending
      'C7', 'C7', 'F6', 'F6', 'D7', 'D7', 'G7', 'G7', // B, each bar doubled
      'D9', 'Fm6', 'D9', 'Fm6', 'C', 'C7 B7 B♭7 A7', 'D9', 'G7 C6', // A reprise
    ]);
  });

  test('whole-form repeat multiplies the expansion', () => {
    expect(flattenChart(song, { wholeRepeats: 2 }).length).toBe(64);
  });
});

describe('flatten — synthetic navigation cases', () => {
  test('plain repeat plays twice', () => {
    const chart: IRealChart = {
      title: 't',
      timeSignature: [4, 4],
      measures: [
        { id: 'a', open: 'repeat', chords: [{ id: '1', root: 'C', quality: '', chordType: 'maj7', beats: 4, symbol: 'C' }] },
        { id: 'b', close: 'repeat', chords: [{ id: '2', root: 'G', quality: '7', chordType: 'dom7', beats: 4, symbol: 'G7' }] },
      ],
    };
    expect(measureSymbols({ measures: flattenChart(chart) })).toEqual(['C', 'G7', 'C', 'G7']);
  });

  test('D.S. al Coda jumps to the segno then out to the coda', () => {
    const mk = (id: string, sym: string, extra: Partial<IRealChart['measures'][number]> = {}) => ({
      id,
      chords: [{ id: `${id}c`, root: sym[0], quality: '', chordType: 'maj7' as const, beats: 4, symbol: sym }],
      ...extra,
    });
    const chart: IRealChart = {
      title: 't',
      timeSignature: [4, 4],
      measures: [
        mk('m1', 'C'),
        mk('m2', 'D', { segno: true }), // segno
        mk('m3', 'E', { coda: true }), // to-coda mark
        mk('m4', 'F', { directive: 'D.S. al Coda' }),
        mk('m5', 'G', { coda: true }), // coda target
        mk('m6', 'A', { close: 'final' }),
      ],
    };
    // C D E F → D.S. → D E (to coda) → jump → G A
    expect(measureSymbols({ measures: flattenChart(chart) })).toEqual(['C', 'D', 'E', 'F', 'D', 'E', 'G', 'A']);
  });
});

describe('round-trip serialize → parse', () => {
  const project = (chart: IRealChart) =>
    chart.measures.map((m) => ({
      open: m.open,
      close: m.close,
      section: m.section,
      ending: m.ending,
      barRepeat: m.barRepeat,
      chords: m.chords.map((c) => ({ root: c.root, quality: c.quality, bass: c.bass, chordType: c.chordType, noChord: c.noChord })),
    }));

  test('9.20 Special survives a round-trip (chords + structure)', () => {
    const song = parseIRealSong(VECTOR_920_SPECIAL)!;
    const round = parseIRealSong(toIRealURL(song))!;
    expect(project(round)).toEqual(project(song));
    expect(round.title).toBe(song.title);
    expect(round.key).toBe(song.key);
  });

  test('buildMusicTokens emits the section/barline tokens', () => {
    const song = parseIRealSong(VECTOR_920_SPECIAL)!;
    const tokens = buildMusicTokens(song);
    expect(tokens).toContain('{*AT44');
    expect(tokens).toContain('N1');
    expect(tokens).toContain('N2');
    expect(tokens.endsWith('Z')).toBe(true);
  });
});

describe('standard fixtures parse cleanly', () => {
  test.each(STANDARD_FIXTURES.map((f) => [f.name, f.url] as const))('%s', (_name, url) => {
    const song = parseIRealSong(url)!;
    expect(song).not.toBeNull();
    expect(song.measures.length).toBeGreaterThan(8);
    // Every non-no-chord chord maps to a playable type and a non-empty symbol.
    for (const m of song.measures) {
      for (const c of m.chords) {
        expect(c.symbol.length).toBeGreaterThan(0);
        if (!c.noChord) expect(c.chordType).not.toBeNull();
      }
    }
    // Each fixture survives a structural round-trip.
    const round = parseIRealSong(toIRealURL(song))!;
    expect(round.measures.length).toBe(song.measures.length);
  });
});
