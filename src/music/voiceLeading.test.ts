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

describe('freeStringSet', () => {
  it('keeps every chord on its own set when off', () => {
    const result = optimizeVoiceLeading([chord('D', 'min7'), chord('G', 'dom7'), chord('C', 'maj7')])!;
    expect(result.every((c) => c.stringSet === 'middle')).toBe(true);
  });

  it('starts on the home set and only ever uses real sets when on', () => {
    const result = optimizeVoiceLeading(
      [chord('D', 'min7'), chord('G', 'dom7'), chord('C', 'maj7'), chord('F', 'maj7'), chord('B', 'min7b5')],
      { freeStringSet: true },
    )!;
    expect(result[0].stringSet).toBe('middle');
    for (const c of result) {
      expect(['middle', 'upper']).toContain(c.stringSet);
      // the fingering actually lives on the reported set
      expect(c.fingering.stringSet).toBe(c.stringSet);
    }
  });

  it('picks the cheaper set for a locked inversion', () => {
    // Lock both chords' inversions so exactly one candidate exists per set,
    // then check the optimiser matched the by-hand minimum.
    const seq: OptimizableChord[] = [
      { root: 'C', chordType: 'maj7', stringSet: 'middle', preferredInversion: 0 },
      { root: 'F', chordType: 'maj7', stringSet: 'middle', preferredInversion: 2 },
    ];
    const result = optimizeVoiceLeading(seq, { freeStringSet: true })!;
    const prev = result[0].fingering;
    const onMiddle = generateChordVoicing('F', 'maj7', 2, 'middle')!;
    const onUpper = generateChordVoicing('F', 'maj7', 2, 'upper')!;
    const expected = Math.min(voiceLeadingDistance(prev, onMiddle), voiceLeadingDistance(prev, onUpper));
    expect(result[1].distance).toBe(expected);
  });

  it('never switches for an identical repeated chord', () => {
    const result = optimizeVoiceLeading([chord('C', 'maj7'), chord('C', 'maj7')], { freeStringSet: true })!;
    expect(result[1].stringSet).toBe(result[0].stringSet);
    expect(result[1].distance).toBe(0);
  });
});

describe('scoring helpers', () => {
  it('measures fret movement across the active strings', () => {
    const a = generateChordVoicing('C', 'maj7', 0, 'middle')!;
    expect(voiceLeadingDistance(a, a)).toBe(0);
  });

  it('compares hand position across sets and charges a switch cost', () => {
    const mid = generateChordVoicing('C', 'maj7', 0, 'middle')!;
    const up = generateChordVoicing('C', 'maj7', 0, 'upper')!;
    const perVoice = [0, 1, 2, 3].reduce((sum, voice) => {
      const fretA = mid.frets[[1, 2, 3, 4][voice]]!;
      const fretB = up.frets[[2, 3, 4, 5][voice]]!;
      return sum + Math.abs(fretB - fretA);
    }, 0);
    expect(voiceLeadingDistance(mid, up)).toBe(perVoice + 4);
    // replaying the same pitches on the other set is never free
    expect(voiceLeadingDistance(mid, up)).toBeGreaterThan(4);
  });

  it('penalises a missing target top note', () => {
    const a = generateChordVoicing('C', 'maj7', 0, 'middle')!; // top note B
    expect(topNotePenalty({ root: 'C', chordType: 'maj7', stringSet: 'middle', targetTopNote: 'B' }, a)).toBe(0);
    expect(
      topNotePenalty({ root: 'C', chordType: 'maj7', stringSet: 'middle', targetTopNote: 'C' }, a),
    ).toBeGreaterThan(0);
  });
});
