import { describe, expect, it } from 'vitest';
import { generateProgressions } from './progressions';

describe('generateProgressions', () => {
  it('returns four ranked major ii-V-I patterns of three chords each', () => {
    const patterns = generateProgressions('major', 'middle');
    expect(patterns).toHaveLength(4);
    for (const pattern of patterns) {
      expect(pattern.chords).toHaveLength(3);
      expect(pattern.chords.map((c) => c.type)).toEqual(['min7', 'dom7', 'maj7']);
    }
  });

  it('ranks by ascending total voice-leading distance', () => {
    const patterns = generateProgressions('major', 'middle');
    const distances = patterns.map((p) => p.totalDistance);
    expect([...distances]).toEqual([...distances].sort((a, b) => a - b));
  });

  it('generates minor ii-V-i patterns', () => {
    const patterns = generateProgressions('minor', 'upper');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].chords.map((c) => c.type)).toEqual(['min7b5', 'dom7', 'min7']);
  });

  it('freeStringSet anchors the ii on the home set and never ranks worse', () => {
    const fixed = generateProgressions('major', 'middle');
    const free = generateProgressions('major', 'middle', { freeStringSet: true });
    expect(free.length).toBeGreaterThan(0);
    for (const pattern of free) {
      expect(pattern.chords[0].stringSet).toBe('middle');
      for (const chord of pattern.chords) {
        expect(chord.voicing.stringSet).toBe(chord.stringSet);
      }
    }
    // the free search space is a superset of the fixed one, so its best can't rank worse
    expect(free[0].totalDistance).toBeLessThanOrEqual(fixed[0].totalDistance);
  });
});
