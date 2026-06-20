// Bridges between the rich iReal-style chart model and the app's existing
// Song / SequenceChord models.
//
// The IRealChart is the Sequence Builder's source of truth; the optimiser and
// diagram renderer consume a flat SequenceChord[] derived from the chart's
// performance order (repeats/endings expanded). These converters keep music/
// pure (no React).

import { chordSymbol, type ChordTypeId } from './chords';
import { pitchClassOf, sharpName } from './notes';
import { flattenChart } from './ireal/flatten';
import type { IRealChart, IRealChord, IRealChordRef, IRealMeasure } from './ireal/types';
import { prettyChordSymbol } from './ireal/chordParser';
import { type SequenceChord, type Song, uid } from './song';
import type { StringSet } from './tuning';

/** iReal quality string for each catalogue type (chosen so it round-trips). */
export const IREAL_QUALITY_BY_TYPE: Record<ChordTypeId, string> = {
  maj7: '^7',
  maj6: '6',
  maj7s5: '^7#5',
  maj7b5: '^7b5',
  maj9: '^9',
  maj69: '6/9',
  dom7: '7',
  dom7sus4: '7sus',
  dom7s5: '7#5',
  dom7b5: '7b5',
  dom9: '9',
  dom7b9: '7b9',
  dom7s9: '7#9',
  min6: '-6',
  min7: '-7',
  min7b5: '-7b5',
  min7s5: '-7#5',
  minmaj7: '-^7',
  min9: '-9',
  min7b5b9: '-7b5b9',
  min7b59: 'h9',
  min69: '-69',
  dim7: 'o7',
  dimmaj7: 'o^7',
};

/** Build an iReal chord reference for a catalogue chord. */
export function refFromType(root: string, chordType: ChordTypeId, bass?: string): IRealChordRef {
  return { root, quality: IREAL_QUALITY_BY_TYPE[chordType], chordType, ...(bass ? { bass } : {}) };
}

/** Build a full IRealChord for a manually entered catalogue chord. */
export function chordFromType(
  root: string,
  chordType: ChordTypeId,
  beats: number,
  extras: { targetTopNote?: string; preferredInversion?: number } = {},
): IRealChord {
  return {
    id: uid('c'),
    ...refFromType(root, chordType),
    beats: Math.max(1, beats),
    symbol: chordSymbol(root, chordType),
    ...(extras.targetTopNote ? { targetTopNote: extras.targetTopNote } : {}),
    ...(Number.isInteger(extras.preferredInversion) ? { preferredInversion: extras.preferredInversion } : {}),
  };
}

export function createEmptyChart(title = 'Untitled Chart', key = 'C'): IRealChart {
  return {
    title,
    key,
    timeSignature: [4, 4],
    measures: [{ id: uid('m'), chords: [], timeSig: [4, 4], close: 'final' }],
  };
}

/** Convert a Song preset into an iReal-style chart. */
export function songToChart(song: Song): IRealChart {
  const measures: IRealMeasure[] = [];
  song.sections.forEach((section, si) => {
    section.bars.forEach((bar, bi) => {
      const sorted = [...bar.chords].sort((a, b) => (a.beat || 1) - (b.beat || 1));
      const chords: IRealChord[] = sorted.map((e) =>
        chordFromType(e.root, e.chordType, e.duration || bar.beats || 4, {
          targetTopNote: e.targetTopNote,
          preferredInversion: e.preferredInversion,
        }),
      );
      const measure: IRealMeasure = { id: uid('m'), chords };
      if (si === 0 && bi === 0) measure.timeSig = song.timeSignature;
      if (bi === 0 && section.name) measure.section = section.name;
      if (bi === 0 && si > 0) measure.open = 'double';
      measures.push(measure);
    });
  });
  if (measures.length === 0) measures.push({ id: uid('m'), chords: [], timeSig: song.timeSignature });
  measures[0].timeSig = measures[0].timeSig ?? song.timeSignature;
  measures[measures.length - 1].close = 'final';
  return {
    title: song.title,
    key: song.key,
    timeSignature: song.timeSignature,
    measures,
  };
}

/** Group a flat SequenceChord[] (by barIndex) back into chart measures. */
export function sequenceToChart(
  chart: SequenceChord[],
  title: string,
  key: string,
  timeSignature: [number, number] = [4, 4],
): IRealChart {
  const maxBar = chart.reduce((m, c) => Math.max(m, c.barIndex), -1);
  const measures: IRealMeasure[] = [];
  for (let b = 0; b <= maxBar; b++) {
    const inBar = chart
      .filter((c) => c.barIndex === b)
      .sort((a, b2) => a.beat - b2.beat);
    const chords: IRealChord[] = inBar.map((c) =>
      chordFromType(c.displayRoot, c.chordType, c.durationBeats, {
        targetTopNote: c.targetTopNote,
        preferredInversion: c.preferredInversion,
      }),
    );
    measures.push({ id: uid('m'), chords });
  }
  if (measures.length === 0) measures.push({ id: uid('m'), chords: [] });
  measures[0].timeSig = timeSignature;
  measures[measures.length - 1].close = 'final';
  return { title, key, timeSignature, measures };
}

export interface ChartToSequenceOptions {
  stringSet: StringSet;
  /** Repeat the whole expanded form this many times. */
  wholeRepeats?: number;
}

/**
 * Flatten a chart into the beat-positioned SequenceChord[] the optimiser and
 * diagram renderer consume. No-chord cells are skipped (they carry no voicing).
 */
export function chartToSequence(chart: IRealChart, options: ChartToSequenceOptions): SequenceChord[] {
  const flat = flattenChart(chart, { wholeRepeats: options.wholeRepeats });
  const out: SequenceChord[] = [];
  flat.forEach((measure, barIndex) => {
    let beat = 1;
    measure.chords.forEach((chord, ci) => {
      const span = Math.max(1, chord.beats || 1);
      if (chord.chordType && !chord.noChord) {
        out.push({
          id: `${measure.id}.${ci}`,
          root: sharpName(pitchClassOf(chord.root)),
          displayRoot: chord.root,
          chordType: chord.chordType,
          symbol: chord.symbol || chordSymbol(chord.root, chord.chordType),
          barIndex,
          beat,
          durationBeats: span,
          stringSet: options.stringSet,
          targetTopNote: chord.targetTopNote,
          preferredInversion: Number.isInteger(chord.preferredInversion) ? chord.preferredInversion : undefined,
        });
      }
      beat += span;
    });
  });
  return out;
}

/** Display string for a chord ref (used by chart UI). */
export function refSymbol(ref: IRealChordRef): string {
  return prettyChordSymbol(ref);
}
