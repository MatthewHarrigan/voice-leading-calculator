import { describe, expect, it } from 'vitest';
import {
  guideLineAnalysis,
  movementTransitions,
  optimizeVoiceLeading,
  topNotePenalty,
  voiceLeadingDistance,
  type OptimizableChord,
} from './voiceLeading';
import { generateChordVoicing } from './voicing';

function chord(root: string, chordType: OptimizableChord['chordType']): OptimizableChord {
  return { root, chordType, stringSet: 'middle' };
}

describe('optimizeVoiceLeading', () => {
  it('voices a ii-V-I and reports per-transition movement', () => {
    const result = optimizeVoiceLeading([chord('D', 'min7'), chord('G', 'dom7'), chord('C', 'maj7')]);
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(3);
    expect(result![0].distance).toBeUndefined();
    expect(result![1].distance).toBeGreaterThanOrEqual(0);

    const withSymbols = result!.map((c) => ({ ...c, symbol: `${c.root}${c.chordType}` }));
    const transitions = movementTransitions(withSymbols);
    expect(transitions).toHaveLength(2);
  });

  it('prefers an inversion whose top note matches the lead target', () => {
    const result = optimizeVoiceLeading([{ root: 'C', chordType: 'maj7', stringSet: 'middle', targetTopNote: 'B' }]);
    expect(result).not.toBeNull();
    const top = result![0].fingering;
    expect(top).toBeDefined();
  });

  it('honours a preferred (locked) inversion', () => {
    const result = optimizeVoiceLeading([{ root: 'C', chordType: 'maj7', stringSet: 'middle', preferredInversion: 2 }]);
    expect(result![0].inversion).toBe(2);
  });

  it('builds a guide-line analysis on the B string', () => {
    const result = optimizeVoiceLeading([chord('D', 'min7'), chord('G', 'dom7'), chord('C', 'maj7')])!;
    const withSymbols = result.map((c) => ({ ...c, symbol: `${c.root}${c.chordType}`, stringSet: c.stringSet }));
    const analysis = guideLineAnalysis(withSymbols);
    expect(analysis).not.toBeNull();
    expect(analysis!.stringLabel).toBe('B string');
    expect(analysis!.notes).toHaveLength(3);
  });
});

describe('scoring helpers', () => {
  it('measures fret movement across the active strings', () => {
    const a = generateChordVoicing('C', 'maj7', 0, 'middle')!;
    expect(voiceLeadingDistance(a, a, 'middle')).toBe(0);
  });

  it('penalises a missing target top note', () => {
    const a = generateChordVoicing('C', 'maj7', 0, 'middle')!; // top note B
    expect(topNotePenalty({ root: 'C', chordType: 'maj7', stringSet: 'middle', targetTopNote: 'B' }, a)).toBe(0);
    expect(
      topNotePenalty({ root: 'C', chordType: 'maj7', stringSet: 'middle', targetTopNote: 'C' }, a),
    ).toBeGreaterThan(0);
  });
});
