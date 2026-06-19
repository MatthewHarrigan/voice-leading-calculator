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
});
