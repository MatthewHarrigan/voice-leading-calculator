// Voice-leading optimisation across a chord sequence, plus guide-line analysis.

import type { ChordTypeId } from './chords';
import { pitchClassDistance, pitchClassOf } from './notes';
import {
  activeStrings,
  frettedMidi,
  guideStringLabel,
  noteAtFret,
  type StringSet,
  topString,
} from './tuning';
import {
  generateChordVoicing,
  shouldUseVoicing,
  topNoteOf,
  type ChordVoicing,
  type Fingering,
  type Inversion,
} from './voicing';

/** Minimal description of a chord the optimiser can voice. */
export interface OptimizableChord {
  root: string;
  chordType: ChordTypeId;
  stringSet: StringSet;
  targetTopNote?: string | null;
  preferredInversion?: number | null;
}

export type OptimizedChord<T> = T & {
  inversion: Inversion;
  fingering: ChordVoicing;
  voicing: string[];
  /** Fret-distance moved from the previous chord (undefined for the first). */
  distance?: number;
};

export interface OptimizeOptions {
  startingInversion?: number;
  avoidB9?: boolean;
}

/** Sum of absolute fret movement across the active strings between two fingerings. */
export function voiceLeadingDistance(
  a: Fingering,
  b: Fingering,
  stringSet: StringSet = 'middle',
): number {
  let total = 0;
  for (const string of activeStrings(stringSet)) {
    const fret1 = a.frets[string] ?? 0;
    const fret2 = b.frets[string] ?? 0;
    total += Math.abs(fret2 - fret1);
  }
  return total;
}

/** Penalty (in distance units) for missing a chord's target top note. */
export function topNotePenalty(chord: OptimizableChord, fingering: Fingering): number {
  if (!chord.targetTopNote) return 0;
  const actual = topNoteOf(fingering, chord.stringSet);
  if (!actual) return 30;
  return pitchClassDistance(pitchClassOf(chord.targetTopNote), pitchClassOf(actual)) * 8;
}

interface InversionCandidate {
  inversion: Inversion;
  fingering: ChordVoicing;
  voicing: string[];
}

function usableInversion(
  chord: OptimizableChord,
  inversion: Inversion,
  avoidB9: boolean,
): InversionCandidate | null {
  const voicing = generateChordVoicing(chord.root, chord.chordType, inversion, chord.stringSet);
  if (!voicing || !shouldUseVoicing(voicing, chord.stringSet, chord.chordType, avoidB9)) {
    return null;
  }
  return { inversion, fingering: voicing, voicing: voicing.voicing };
}

const ALL_INVERSIONS: Inversion[] = [0, 1, 2, 3];

/**
 * Choose voicings that minimise total fret movement (plus a top-note penalty)
 * across the sequence. Returns null if any chord has no usable voicing.
 */
export function optimizeVoiceLeading<T extends OptimizableChord>(
  sequence: T[],
  options: OptimizeOptions = {},
): OptimizedChord<T>[] | null {
  if (sequence.length === 0) return null;
  const avoidB9 = options.avoidB9 ?? true;
  const startingInversion = (options.startingInversion ?? 0) as Inversion;
  const optimized: OptimizedChord<T>[] = [];

  // --- First chord ---
  const first = sequence[0];
  const firstPref = Number.isInteger(first.preferredInversion)
    ? (first.preferredInversion as Inversion)
    : startingInversion;
  let bestFirst = usableInversion(first, firstPref, avoidB9);

  if (first.targetTopNote && !Number.isInteger(first.preferredInversion)) {
    let bestScore = Infinity;
    for (const inv of ALL_INVERSIONS) {
      const candidate = usableInversion(first, inv, avoidB9);
      if (candidate) {
        const startingBias = inv === startingInversion ? 0 : 1;
        const score = topNotePenalty(first, candidate.fingering) + startingBias;
        if (score < bestScore) {
          bestScore = score;
          bestFirst = candidate;
        }
      }
    }
  } else if (!bestFirst && !Number.isInteger(first.preferredInversion)) {
    for (const inv of ALL_INVERSIONS) {
      bestFirst = usableInversion(first, inv, avoidB9);
      if (bestFirst) break;
    }
  }

  if (!bestFirst) return null;
  optimized.push({
    ...first,
    inversion: bestFirst.inversion,
    fingering: bestFirst.fingering,
    voicing: bestFirst.voicing,
  });

  // --- Subsequent chords ---
  for (let i = 1; i < sequence.length; i++) {
    const current = sequence[i];
    const previous = optimized[i - 1];

    const candidateInversions: Inversion[] = Number.isInteger(current.preferredInversion)
      ? [current.preferredInversion as Inversion]
      : ALL_INVERSIONS;

    let best: InversionCandidate | null = null;
    let bestScore = Infinity;
    let bestDistance: number | undefined;

    for (const inv of candidateInversions) {
      const candidate = usableInversion(current, inv, avoidB9);
      if (!candidate) continue;
      const distance = voiceLeadingDistance(previous.fingering, candidate.fingering, current.stringSet);
      const score = distance + topNotePenalty(current, candidate.fingering);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
        bestDistance = distance;
      }
    }

    if (!best) return null;
    optimized.push({
      ...current,
      inversion: best.inversion,
      fingering: best.fingering,
      voicing: best.voicing,
      distance: bestDistance,
    });
  }

  return optimized;
}

// ---------- Guide-line / movement analysis ----------

export interface TopVoiceInfo {
  symbol: string;
  note: string;
  fret: number;
  pitch: number;
  stringLabel: string;
}

export function topVoiceInfo(chord: {
  symbol: string;
  fingering: Fingering;
  stringSet: StringSet;
}): TopVoiceInfo | null {
  const set = chord.stringSet;
  const ts = topString(set);
  const fret = chord.fingering.frets[ts];
  if (fret === null || fret === undefined) return null;
  return {
    symbol: chord.symbol,
    note: noteAtFret(ts, fret),
    fret,
    pitch: frettedMidi(ts, fret),
    stringLabel: guideStringLabel(set),
  };
}

export function guideLineMotion(prev: TopVoiceInfo | null, current: TopVoiceInfo | null): string {
  if (!prev || !current) return 'start';
  const delta = current.pitch - prev.pitch;
  const abs = Math.abs(delta);
  if (abs === 0) return 'common tone';
  const direction = delta > 0 ? 'up' : 'down';
  if (abs <= 2) return `step ${direction}`;
  return `leap ${direction} ${abs}`;
}

export interface GuideLineNote {
  note: string;
  fret: number;
  symbol: string;
  motion: string;
}

export interface GuideLineAnalysis {
  stringLabel: string;
  notes: GuideLineNote[];
  commonOrStepCount: number;
  totalMoves: number;
}

export function guideLineAnalysis<T>(
  optimized: (OptimizedChord<T> & { symbol: string; stringSet: StringSet })[],
): GuideLineAnalysis | null {
  const topVoices = optimized.map((chord) =>
    topVoiceInfo({ symbol: chord.symbol, fingering: chord.fingering, stringSet: chord.stringSet }),
  );
  const visible = topVoices.filter((v): v is TopVoiceInfo => Boolean(v));
  if (visible.length === 0) return null;

  const notes: GuideLineNote[] = [];
  const motions: string[] = [];
  topVoices.forEach((voice, index) => {
    if (!voice) return;
    const motion = guideLineMotion(topVoices[index - 1] ?? null, voice);
    notes.push({ note: voice.note, fret: voice.fret, symbol: voice.symbol, motion });
    if (index > 0) motions.push(motion);
  });

  const commonOrStepCount = motions.filter(
    (m) => m === 'common tone' || m.startsWith('step'),
  ).length;

  return {
    stringLabel: visible[0].stringLabel,
    notes,
    commonOrStepCount,
    totalMoves: Math.max(1, motions.length),
  };
}

export interface MovementTransition {
  from: string;
  to: string;
  distance: number;
}

/** Per-transition fret movement, e.g. { from: "Dm7", to: "G7", distance: 3 }. */
export function movementTransitions<T>(
  optimized: (OptimizedChord<T> & { symbol: string })[],
): MovementTransition[] {
  const transitions: MovementTransition[] = [];
  optimized.forEach((chord, index) => {
    if (index > 0 && chord.distance !== undefined) {
      transitions.push({
        from: optimized[index - 1].symbol,
        to: chord.symbol,
        distance: chord.distance,
      });
    }
  });
  return transitions;
}
