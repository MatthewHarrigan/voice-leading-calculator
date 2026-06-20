import { describe, expect, test } from 'vitest';
import { parseIRealIndex, parseIRealSong, parseIRealSongChunk, parseIRealURL } from './parse';
import { VECTOR_920_SPECIAL } from './fixtures';

const symbols = (chart: { measures: { chords: { symbol: string }[] }[] }) =>
  chart.measures.map((m) => m.chords.map((c) => c.symbol).join(' '));

// Two-song plaintext playlist (matches the e2e PLAYLIST fixture shape).
const PLAYLIST =
  'irealbook://Tune One=Me=Medium Swing=C=n={C^7 |G7 |C^7 |G7 }===Tune Two=You=Bossa Nova=F=n={F^7 |C7 |F^7 |C7 }===My Set';

describe('parseIRealIndex', () => {
  test('extracts title/composer/name without decoding the music', () => {
    const index = parseIRealIndex(PLAYLIST);
    expect(index.scheme).toBe('irealbook');
    expect(index.name).toBe('My Set');
    expect(index.songs).toHaveLength(2);
    expect(index.songs[0]).toMatchObject({ title: 'Tune One', composer: 'Me' });
    expect(index.songs[1]).toMatchObject({ title: 'Tune Two', composer: 'You' });
  });

  test('normalises "X, The" titles and "Last First" composers', () => {
    const idx = parseIRealIndex('irealbook://Man I Love, The=Gershwin George=Medium Swing=C=n={C^7 }');
    expect(idx.songs[0]).toMatchObject({ title: 'The Man I Love', composer: 'George Gershwin' });
  });

  test('indexes an obfuscated single song (no playlist name)', () => {
    const idx = parseIRealIndex(VECTOR_920_SPECIAL);
    expect(idx.scheme).toBe('irealb');
    expect(idx.name).toBeUndefined();
    expect(idx.songs).toHaveLength(1);
    expect(idx.songs[0]).toMatchObject({ title: '9.20 Special', composer: 'Earl Warren' });
  });

  test('drops empty and malformed (<5 field) chunks', () => {
    const idx = parseIRealIndex('irealbook://Good=Me=Swing=C=n={C^7 }===bad===  ===My Set');
    expect(idx.name).toBe('My Set');
    expect(idx.songs).toHaveLength(1);
    expect(idx.songs[0].title).toBe('Good');
  });

  test('throws on input that is not an iReal Pro link', () => {
    expect(() => parseIRealIndex('not a link')).toThrow();
  });
});

describe('parseIRealSongChunk', () => {
  test('a chunk parses identically to the same song via parseIRealURL', () => {
    const index = parseIRealIndex(PLAYLIST);
    for (const entry of index.songs) {
      const fromChunk = parseIRealSongChunk(index.scheme, entry.chunk)!;
      const single = parseIRealURL(`irealbook://${entry.chunk}`).songs[0];
      expect(symbols(fromChunk)).toEqual(symbols(single));
      expect(fromChunk.title).toBe(single.title);
      expect(fromChunk.key).toBe(single.key);
    }
  });

  test('reproduces the obfuscated 9.20 Special chunk', () => {
    const idx = parseIRealIndex(VECTOR_920_SPECIAL);
    const fromChunk = parseIRealSongChunk(idx.scheme, idx.songs[0].chunk)!;
    expect(symbols(fromChunk)).toEqual(symbols(parseIRealSong(VECTOR_920_SPECIAL)!));
  });
});

describe('parseIRealURL regression (now built on the index)', () => {
  test('still returns every song of a multi-song playlist', () => {
    const playlist = parseIRealURL(PLAYLIST);
    expect(playlist.name).toBe('My Set');
    expect(playlist.songs.map((s) => s.title)).toEqual(['Tune One', 'Tune Two']);
  });

  test('still throws when there are no parseable songs', () => {
    expect(() => parseIRealURL('irealbook://bad===worse')).toThrow(/No songs/);
  });
});
