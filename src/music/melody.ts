// Pure analysis of a melodic line: the motion between successive notes and a
// stepwise-vs-leap summary. Used by the Melody Finder's line panel.

export type MotionKind = 'common-tone' | 'step' | 'leap';

export interface MotionStep {
  /** Signed semitone change from the previous note. */
  semitones: number;
  direction: 'up' | 'down' | 'same';
  kind: MotionKind;
}

export interface MelodyAnalysis {
  steps: MotionStep[];
  stepwise: number;
  leaps: number;
  commonTones: number;
  /** Percentage of moves that are common tones or steps (smoothness). */
  smoothnessPct: number;
}

/** Analyse a melodic line given as absolute (e.g. MIDI) pitches. */
export function analyzeMelodicLine(pitches: number[]): MelodyAnalysis {
  const steps: MotionStep[] = [];
  for (let i = 1; i < pitches.length; i++) {
    const delta = pitches[i] - pitches[i - 1];
    const abs = Math.abs(delta);
    steps.push({
      semitones: delta,
      direction: abs === 0 ? 'same' : delta > 0 ? 'up' : 'down',
      kind: abs === 0 ? 'common-tone' : abs <= 2 ? 'step' : 'leap',
    });
  }
  const stepwise = steps.filter((s) => s.kind === 'step').length;
  const leaps = steps.filter((s) => s.kind === 'leap').length;
  const commonTones = steps.filter((s) => s.kind === 'common-tone').length;
  const total = Math.max(1, steps.length);
  return {
    steps,
    stepwise,
    leaps,
    commonTones,
    smoothnessPct: Math.round(((stepwise + commonTones) / total) * 100),
  };
}
