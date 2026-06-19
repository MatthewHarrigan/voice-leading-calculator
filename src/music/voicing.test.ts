import { describe, expect, it } from 'vitest';
import {
  createDrop2Voicing,
  fretSpan,
  generateChordVoicing,
  hasFlatNineAvoidInterval,
  shouldUseVoicing,
  topNoteOf,
} from './voicing';

describe('createDrop2Voicing', () => {
  it('drops the second-from-top note to the bottom (root inversion)', () => {
    // close C E G B -> drop G -> G C E B
    expect(createDrop2Voicing(['C', 'E', 'G', 'B'], 0)).toEqual(['G', 'C', 'E', 'B']);
  });

  it('rotates for inversions before dropping', () => {
    // 1st inversion close E G B C -> drop B -> B E G C
    expect(createDrop2Voicing(['C', 'E', 'G', 'B'], 1)).toEqual(['B', 'E', 'G', 'C']);
    // 2nd inversion close G B C E -> drop C -> C G B E
    expect(createDrop2Voicing(['C', 'E', 'G', 'B'], 2)).toEqual(['C', 'G', 'B', 'E']);
  });
});

describe('generateChordVoicing', () => {
  it('produces a playable Cmaj7 root voicing with B on top', () => {
    const voicing = generateChordVoicing('C', 'maj7', 0, 'middle');
    expect(voicing).not.toBeNull();
    expect(voicing!.voicing).toEqual(['G', 'C', 'E', 'B']);
    expect(topNoteOf(voicing!)).toBe('B');
    expect(fretSpan(voicing!)).toBeLessThanOrEqual(4);
  });

  it('keeps the display root spelling in the symbol', () => {
    const voicing = generateChordVoicing('Eb', 'maj7', 0, 'middle');
    expect(voicing!.symbol).toBe('Ebmaj7');
    expect(voicing!.root).toBe('D#'); // engine-internal sharp
  });

  it('voices on the upper string set too', () => {
    const voicing = generateChordVoicing('C', 'min7', 0, 'upper');
    expect(voicing).not.toBeNull();
    expect(voicing!.stringSet).toBe('upper');
  });
});

describe('hasFlatNineAvoidInterval', () => {
  it('flags the 1st-inversion Cmaj7 (B against C) but not the root inversion', () => {
    const root = generateChordVoicing('C', 'maj7', 0, 'middle')!;
    const first = generateChordVoicing('C', 'maj7', 1, 'middle')!;
    expect(hasFlatNineAvoidInterval(root)).toBe(false);
    expect(hasFlatNineAvoidInterval(first)).toBe(true);
  });
});

describe('shouldUseVoicing', () => {
  it('respects the avoid-b9 toggle', () => {
    const first = generateChordVoicing('C', 'maj7', 1, 'middle')!;
    expect(shouldUseVoicing(first, 'middle', 'maj7', true)).toBe(false);
    expect(shouldUseVoicing(first, 'middle', 'maj7', false)).toBe(true);
  });

  it('allows the dominant 7b9 exception even when avoiding b9', () => {
    const voicing = generateChordVoicing('G', 'dom7b9', 0, 'middle');
    if (voicing && hasFlatNineAvoidInterval(voicing)) {
      expect(shouldUseVoicing(voicing, 'middle', 'dom7b9', true)).toBe(true);
    }
  });
});
