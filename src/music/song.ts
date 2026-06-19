// The canonical lead-sheet song model and its flat runtime projection.

import { CHORD_TYPES, chordSymbol, type ChordTypeId } from './chords';
import { pitchClassOf, sharpName } from './notes';
import type { StringSet } from './tuning';

export interface ChordEvent {
  beat: number;
  duration: number; // in beats
  root: string;
  chordType: ChordTypeId;
  targetTopNote?: string;
  preferredInversion?: number;
}

export interface Bar {
  id: string;
  beats: number;
  chords: ChordEvent[];
}

export interface Section {
  id: string;
  name: string;
  bars: Bar[];
}

export interface Song {
  id: string;
  title: string;
  key?: string;
  timeSignature: [number, number];
  sections: Section[];
}

/** Flat runtime chord used by the chart renderer and the optimiser. */
export interface SequenceChord {
  id: string;
  /** Engine-internal root (sharp spelling). */
  root: string;
  /** Root as written in the chart (may be a flat). */
  displayRoot: string;
  chordType: ChordTypeId;
  symbol: string;
  barIndex: number;
  beat: number;
  durationBeats: number;
  stringSet: StringSet;
  targetTopNote?: string;
  preferredInversion?: number;
  sectionId?: string;
  barId?: string;
}

/**
 * Collision-free unique id for runtime chord events and saved charts.
 * Uses crypto.randomUUID where available so ids never clash with persisted
 * ids after a page reload (a counter would reset to 0 and reissue live ids).
 */
export function uid(prefix = 'chord'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

export function createEmptySong(): Song {
  return {
    id: uid('song'),
    title: 'Untitled Chart',
    key: 'C',
    timeSignature: [4, 4],
    sections: [{ id: 'main', name: 'Main', bars: [{ id: 'b1', beats: 4, chords: [] }] }],
  };
}

/** Flatten a song into a beat-ordered runtime sequence. */
export function flattenSong(song: Song, stringSet: StringSet): SequenceChord[] {
  const sequence: SequenceChord[] = [];
  let barIndex = 0;
  song.sections.forEach((section) => {
    section.bars.forEach((bar) => {
      const sorted = [...bar.chords].sort((a, b) => (a.beat || 1) - (b.beat || 1));
      sorted.forEach((event, chordIndex) => {
        const barBeats = bar.beats || 4;
        const durationBeats = Math.max(1, event.duration || barBeats);
        sequence.push({
          id: `${section.id}.${bar.id}.${chordIndex}`,
          root: sharpName(pitchClassOf(event.root)),
          displayRoot: event.root,
          chordType: event.chordType,
          symbol: chordSymbol(event.root, event.chordType),
          barIndex,
          beat: event.beat || 1,
          durationBeats,
          stringSet,
          targetTopNote: event.targetTopNote,
          preferredInversion: Number.isInteger(event.preferredInversion)
            ? event.preferredInversion
            : undefined,
          sectionId: section.id,
          barId: bar.id,
        });
      });
      barIndex += 1;
    });
  });
  return sequence;
}

export function sequenceBarCount(sequence: SequenceChord[]): number {
  return sequence.reduce((max, chord) => Math.max(max, chord.barIndex + 1), 0);
}

export function totalBars(song: Song): number {
  return song.sections.reduce((sum, section) => sum + section.bars.length, 0);
}

/** Beat-then-bar playback ordering. */
export function playbackOrder(sequence: SequenceChord[]): SequenceChord[] {
  return [...sequence].sort((a, b) => a.barIndex - b.barIndex || a.beat - b.beat);
}

export interface LaneAssignment {
  chord: SequenceChord;
  beat: number;
  span: number;
  lane: number;
  laneCount: number;
}

/**
 * Assign display lanes within a bar so overlapping chord events stay visible
 * instead of stacking on top of one another.
 */
export function assignDisplayLanes(barChords: SequenceChord[]): LaneAssignment[] {
  const sorted = [...barChords].sort((a, b) => a.beat - b.beat);
  const laneEnds: number[] = []; // last occupied beat (exclusive) per lane
  const placements = sorted.map((chord) => {
    const beat = Math.max(1, Math.min(4, Math.round(chord.beat)));
    const span = Math.max(1, Math.min(5 - beat, Math.round(chord.durationBeats)));
    let lane = laneEnds.findIndex((end) => end <= beat);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = beat + span;
    return { chord, beat, span, lane: lane + 1 };
  });
  const laneCount = Math.max(1, laneEnds.length);
  return placements.map((p) => ({ ...p, laneCount }));
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

/** Validate that a song uses legal roots and supported chord types. */
export function validateSong(song: Song): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  song.sections.forEach((section) => {
    section.bars.forEach((bar) => {
      bar.chords.forEach((event) => {
        if (!CHORD_TYPES[event.chordType]) {
          issues.push({
            level: 'error',
            message: `Unsupported chord type "${event.chordType}" in bar ${bar.id}`,
          });
        }
        try {
          pitchClassOf(event.root);
        } catch {
          issues.push({ level: 'error', message: `Invalid root "${event.root}" in bar ${bar.id}` });
        }
        if (event.targetTopNote) {
          try {
            pitchClassOf(event.targetTopNote);
          } catch {
            issues.push({
              level: 'warning',
              message: `Invalid target top note "${event.targetTopNote}" in bar ${bar.id}`,
            });
          }
        }
      });
    });
  });
  return issues;
}
