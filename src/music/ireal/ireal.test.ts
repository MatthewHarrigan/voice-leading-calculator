import { describe, expect, test } from 'vitest';
import { unscramble, scramble } from './unscramble';
import { mapQuality } from './chordParser';
import { CHORD_TYPES, type ChordTypeId } from '../chords';
import { chartChordSymbol } from '../chart';
import { isNavigationDirective, parseIRealSong, parseIRealURL, tokenizeMeasures } from './parse';
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

  test('W does not corrupt the cell positions of later bars', () => {
    const m = tokenizeMeasures('C7,   |W/G,   |D7,   |', [4, 4]);
    expect(m.map((x) => x.cell)).toEqual([0, 4, 8]);
    expect(m[1].chords[0].symbol).toContain('/G');
  });

  test('an orphaned W (no prior chord) is skipped without corrupting the grid', () => {
    expect(tokenizeMeasures('W/G|', [4, 4])).toHaveLength(0);
    const m = tokenizeMeasures('W/GC7,   |D7,   |', [4, 4]);
    // The orphaned W consumes nothing; C7 still starts the first bar at cell 0.
    expect(m[0].cell).toBe(0);
    expect(m[0].chords[0].symbol).toBe('C7');
    expect(m[1].cell).toBe(4);
  });

  test('chord beats reconcile to the bar meter (3 even chords in 4/4 → sum 4)', () => {
    const m = tokenizeMeasures('C7,W,W|', [4, 4]);
    const beats = m[0].chords.map((c) => c.beats);
    expect(beats.reduce((a, b) => a + b, 0)).toBe(4);
    expect(beats[beats.length - 1]).toBe(2);
  });

  test('small (s/l) chord size is parsed per chord', () => {
    const m = tokenizeMeasures('sC7,B7|lD7|', [4, 4]);
    expect(m[0].chords.map((c) => !!c.small)).toEqual([true, true]);
    expect(m[1].chords.map((c) => !!c.small)).toEqual([false]);
  });

  test('parses an alternate chord in parentheses', () => {
    const m = tokenizeMeasures('F-6(F#o7)|', [4, 4]);
    expect(m[0].chords[0].symbol).toBe('Fm6');
    expect(m[0].chords[0].alternate).not.toBeNull();
    expect(m[0].chords[0].alternate?.root).toBe('F#');
    expect(m[0].chords[0].alternate?.chordType).toBe('dim7');
  });
});

describe('staff text, spacers, directives', () => {
  test('captures Y vertical spacers without consuming horizontal cells', () => {
    const m = tokenizeMeasures('YYC7,   |', [4, 4]);
    expect(m[0].spacer).toBe(2);
    expect(m[0].cell).toBe(0);
    expect(buildMusicTokens({ title: 't', timeSignature: [4, 4], measures: m })).toContain('YY');
  });

  test('captures the staff-text vertical offset (above vs below)', () => {
    expect(tokenizeMeasures('<*72Solo>C7,   |', [4, 4])[0].staffTextAbove).toBe(true);
    expect(tokenizeMeasures('<*00Solo>C7,   |', [4, 4])[0].staffTextAbove).toBeUndefined();
    expect(tokenizeMeasures('<*72Solo>C7,   |', [4, 4])[0].staffText).toBe('Solo');
  });

  test('recognises navigation directives', () => {
    expect(isNavigationDirective('D.C. al Coda')).toBe(true);
    expect(isNavigationDirective('D.S. al Fine')).toBe(true);
    expect(isNavigationDirective('Fine')).toBe(true);
    expect(isNavigationDirective('To Coda')).toBe(true);
    expect(isNavigationDirective('Play softly')).toBe(false);
  });
});

describe('playlists', () => {
  test('parses a multi-song playlist with a trailing name', () => {
    const url =
      'irealbook://Tune One=Me=Medium Swing=C=n={C^7 |G7 }===Tune Two=You=Bossa Nova=F=n={F^7 |C7 }===My Set';
    const pl = parseIRealURL(url);
    expect(pl.name).toBe('My Set');
    expect(pl.songs.map((s) => s.title)).toEqual(['Tune One', 'Tune Two']);
    expect(pl.songs[1].key).toBe('F');
  });
});

// Every quality the iReal Pro editor can emit (canonical protocol list + the
// vocabulary observed across all 6 default playlists: Jazz 1460, Brazilian 220,
// Latin 50, Blues 50, Pop 400, Country 50).
const FULL_VOCABULARY = [
  '^', '-', '7', '^7', '-7', '7sus', 'h7', 'o7', '^9', '^13', '6', '69', '6/9', '^7#11', '^9#11',
  '^7#5', '-6', '-69', '-6/9', '-^7', '-^9', '-9', '-11', '-7b5', 'h9', '-b6', '-#5', '9', '7b9',
  '7#9', '7#11', '7b5', '7#5', '9#11', '9b5', '9#5', '7b13', '7#9#5', '7#9b5', '7#9#11', '7b9#11',
  '7b9b5', '7b9#5', '7b9#9', '7b9b13', '7alt', 'alt', '13', '13#11', '13b9', '13#9', '7b9sus',
  '7susadd3', '7add3sus', '9sus', '13sus', '7b13sus', '11', 'add9', '2', '5', '+', 'o', 'h', 'sus',
  'min13', 'min^11', 'min^13', 'maj13#11', 'maj7b5', 'maj7#9', 'min7b6', 'min9b6', 'maj(add4)',
  'min(add4)', '7(add13)', '+7', 'aug', 'o^7', '-add9',
];

describe('chord vocabulary coverage', () => {
  test('every iReal quality maps to a playable four-part type with a symbol', () => {
    for (const q of FULL_VOCABULARY) {
      const type = mapQuality(q);
      expect(CHORD_TYPES[type], `quality "${q}" -> "${type}" must be a real chord type`).toBeTruthy();
      const symbol = chartChordSymbol({ root: 'C', quality: q, chordType: type });
      expect(symbol.startsWith('C'), `quality "${q}" symbol "${symbol}"`).toBe(true);
      expect(symbol.length).toBeGreaterThan(1);
    }
  });

  test('maps each family (and #11 / ♭13 / altered) to the right four-part shell', () => {
    const cases: Record<string, ChordTypeId> = {
      // major
      '^7': 'maj7', '^9': 'maj9', '^13': 'maj9', '6': 'maj6', '69': 'maj69', '6/9': 'maj69',
      '^7#11': 'maj7b5', '^9#11': 'maj7b5', 'maj13#11': 'maj7b5', 'maj7b5': 'maj7b5', '^7#5': 'maj7s5',
      'add9': 'maj9',
      // dominant — incl. #11 (→ ♭5 shell) and ♭13 (→ ♯5 shell)
      '7': 'dom7', '9': 'dom9', '13': 'dom9', '7sus': 'dom7sus4', '9sus': 'dom7sus4', '13sus': 'dom7sus4',
      '7b9': 'dom7b9', '7#9': 'dom7s9', '7b5': 'dom7b5', '7#5': 'dom7s5', '7#11': 'dom7b5',
      '9#11': 'dom7b5', '13#11': 'dom7b5', '7b13': 'dom7s5', '+7': 'dom7s5', '7alt': 'dom7b9',
      alt: 'dom7b9', '13b9': 'dom7b9', '13#9': 'dom7s9',
      // minor — incl. ♭6 family (→ ♯5 shell, not m6)
      '-': 'min7', '-7': 'min7', '-6': 'min6', '-69': 'min69', '-9': 'min9', '-11': 'min9',
      '-^7': 'minmaj7', '-^9': 'minmaj7', min13: 'min9', 'min^11': 'minmaj7', '-7b5': 'min7b5',
      '-#5': 'min7s5', '-b6': 'min7s5', min7b6: 'min7s5', min9b6: 'min7s5', '-add9': 'min9',
      // half-diminished, diminished, augmented
      h7: 'min7b5', h9: 'min7b59', h: 'min7b5', o7: 'dim7', o: 'dim7', 'o^7': 'dimmaj7',
      '+': 'maj7s5', aug: 'maj7s5',
    };
    for (const [q, expected] of Object.entries(cases)) {
      expect(mapQuality(q), `quality "${q}"`).toBe(expected);
    }
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
      chords: m.chords.map((c) => ({
        root: c.root,
        quality: c.quality,
        bass: c.bass,
        chordType: c.chordType,
        noChord: c.noChord,
        small: !!c.small,
      })),
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
