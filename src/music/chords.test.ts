import { describe, expect, it } from 'vitest';
import {
  CHORD_TYPE_IDS,
  CORE_CHORD_TYPE_IDS,
  chordSymbol,
  chordToneName,
  chordTonePitchClasses,
  getChordType,
} from './chords';
import { pitchClassOf } from './notes';

describe('chord catalogue', () => {
  it('defines 24 types with exactly four voiced intervals each', () => {
    expect(CHORD_TYPE_IDS).toHaveLength(24);
    for (const id of CHORD_TYPE_IDS) {
      expect(getChordType(id).intervals).toHaveLength(4);
    }
  });

  it('marks exactly 15 core types', () => {
    expect(CORE_CHORD_TYPE_IDS).toHaveLength(15);
    expect(CHORD_TYPE_IDS.filter((id) => getChordType(id).core)).toHaveLength(15);
  });

  it('computes chord tones for a Cmaj7', () => {
    // 1 3 5 7 -> C E G B
    expect(chordTonePitchClasses('C', 'maj7')).toEqual([0, 4, 7, 11]);
  });

  it('drops the root for ninth chords (9 substitutes root)', () => {
    // maj9 voices 3 5 7 9 -> E G B D for Cmaj9
    expect(chordTonePitchClasses('C', 'maj9')).toEqual([4, 7, 11, 2]);
  });

  it('names chord tones relative to the root', () => {
    const root = pitchClassOf('C');
    expect(chordToneName(pitchClassOf('C'), root)).toBe('R');
    expect(chordToneName(pitchClassOf('E'), root)).toBe('3');
    expect(chordToneName(pitchClassOf('Bb'), root)).toBe('♭7');
    expect(chordToneName(pitchClassOf('Gb'), root)).toBe('♭5');
  });

  it('builds display symbols', () => {
    expect(chordSymbol('C', 'maj7')).toBe('Cmaj7');
    expect(chordSymbol('G', 'dom7b9')).toBe('G7♭9');
    expect(chordSymbol('Eb', 'min7')).toBe('Ebm7');
  });
});
