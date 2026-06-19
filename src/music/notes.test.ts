import { describe, expect, it } from 'vitest';
import {
  accidentalForKey,
  parseKey,
  pitchClassDistance,
  pitchClassOf,
  spellNote,
  spellNoteInKey,
} from './notes';

describe('pitchClassOf', () => {
  it('parses naturals, sharps, and flats', () => {
    expect(pitchClassOf('C')).toBe(0);
    expect(pitchClassOf('C#')).toBe(1);
    expect(pitchClassOf('Db')).toBe(1);
    expect(pitchClassOf('B')).toBe(11);
    expect(pitchClassOf('Cb')).toBe(11);
    expect(pitchClassOf('E#')).toBe(5);
  });

  it('accepts unicode accidentals', () => {
    expect(pitchClassOf('B♭')).toBe(10);
    expect(pitchClassOf('F♯')).toBe(6);
  });

  it('throws on garbage', () => {
    expect(() => pitchClassOf('H')).toThrow();
  });
});

describe('key-aware spelling', () => {
  it('parses key labels', () => {
    expect(parseKey('Eb')).toEqual({ tonic: 'Eb', mode: 'major' });
    expect(parseKey('C minor')).toEqual({ tonic: 'C', mode: 'minor' });
    expect(parseKey('G minor')).toEqual({ tonic: 'G', mode: 'minor' });
    expect(parseKey('F#')).toEqual({ tonic: 'F#', mode: 'major' });
  });

  it('prefers flats in flat keys and sharps in sharp keys', () => {
    expect(accidentalForKey(parseKey('Eb'))).toBe('flat');
    expect(accidentalForKey(parseKey('Ab'))).toBe('flat');
    expect(accidentalForKey(parseKey('A'))).toBe('sharp');
    expect(accidentalForKey(parseKey('G minor'))).toBe('flat'); // relative Bb major
    expect(spellNoteInKey(10, parseKey('Eb'))).toBe('Bb');
    expect(spellNoteInKey(10, parseKey('A'))).toBe('A#');
  });

  it('spells with an explicit accidental preference', () => {
    expect(spellNote(1, 'sharp')).toBe('C#');
    expect(spellNote(1, 'flat')).toBe('Db');
  });
});

describe('pitchClassDistance', () => {
  it('is the minimal circular distance', () => {
    expect(pitchClassDistance(0, 0)).toBe(0);
    expect(pitchClassDistance(0, 1)).toBe(1);
    expect(pitchClassDistance(0, 11)).toBe(1);
    expect(pitchClassDistance(0, 6)).toBe(6);
  });
});
