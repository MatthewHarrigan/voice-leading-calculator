// The drop-2 chord catalogue: 23 four-part chord types. Each "intervals" array
// lists the four voiced semitone offsets from the root. Note that ninth chords
// substitute the 9 for the root (root is dropped), which is why some arrays do
// not begin with 0.

import type { PitchClass } from './notes';
import { pitchClassOf, sharpName } from './notes';

export type ChordCategory = 'major' | 'dominant' | 'minor' | 'diminished';

export type ChordTypeId =
  | 'maj7'
  | 'maj6'
  | 'maj7s5'
  | 'maj7b5'
  | 'maj9'
  | 'maj69'
  | 'dom7'
  | 'dom7sus4'
  | 'dom7s5'
  | 'dom7b5'
  | 'dom9'
  | 'dom7b9'
  | 'dom7s9'
  | 'min6'
  | 'min7'
  | 'min7b5'
  | 'min7s5'
  | 'minmaj7'
  | 'min9'
  | 'min7b5b9'
  | 'min7b59'
  | 'min69'
  | 'dim7'
  | 'dimmaj7';

export interface ChordType {
  id: ChordTypeId;
  /** Full descriptive name, e.g. "Dominant 7♭9". */
  name: string;
  /** Symbol suffix appended to a root, e.g. "maj7", "7♭9", "°7". */
  symbol: string;
  category: ChordCategory;
  /** The four voiced semitone offsets from the root. */
  intervals: [number, number, number, number];
  /** Chord-tone formula text, e.g. "1 3 5 7". */
  formula: string;
  /** Whether this type is part of the 15 "core" types used in Chapter 1 drills. */
  core: boolean;
}

export const CHORD_TYPES: Record<ChordTypeId, ChordType> = {
  maj7: { id: 'maj7', name: 'Major 7', symbol: 'maj7', category: 'major', intervals: [0, 4, 7, 11], formula: '1 3 5 7', core: true },
  maj6: { id: 'maj6', name: 'Major 6', symbol: '6', category: 'major', intervals: [0, 4, 7, 9], formula: '1 3 5 6', core: true },
  maj7s5: { id: 'maj7s5', name: 'Major 7♯5', symbol: 'maj7♯5', category: 'major', intervals: [0, 4, 8, 11], formula: '1 3 ♯5 7', core: true },
  maj7b5: { id: 'maj7b5', name: 'Major 7♭5', symbol: 'maj7♭5', category: 'major', intervals: [0, 4, 6, 11], formula: '1 3 ♭5 7', core: true },
  maj9: { id: 'maj9', name: 'Major 9', symbol: 'maj9', category: 'major', intervals: [4, 7, 11, 14], formula: '3 5 7 9', core: false },
  maj69: { id: 'maj69', name: 'Major 6/9', symbol: '6/9', category: 'major', intervals: [4, 7, 9, 14], formula: '3 5 6 9', core: false },

  dom7: { id: 'dom7', name: 'Dominant 7', symbol: '7', category: 'dominant', intervals: [0, 4, 7, 10], formula: '1 3 5 ♭7', core: true },
  dom7sus4: { id: 'dom7sus4', name: 'Dominant 7sus4', symbol: '7sus4', category: 'dominant', intervals: [0, 5, 7, 10], formula: '1 4 5 ♭7', core: true },
  dom7s5: { id: 'dom7s5', name: 'Dominant 7♯5', symbol: '7♯5', category: 'dominant', intervals: [0, 4, 8, 10], formula: '1 3 ♯5 ♭7', core: true },
  dom7b5: { id: 'dom7b5', name: 'Dominant 7♭5', symbol: '7♭5', category: 'dominant', intervals: [0, 4, 6, 10], formula: '1 3 ♭5 ♭7', core: true },
  dom9: { id: 'dom9', name: 'Dominant 9', symbol: '9', category: 'dominant', intervals: [4, 7, 10, 14], formula: '3 5 ♭7 9', core: false },
  dom7b9: { id: 'dom7b9', name: 'Dominant 7♭9', symbol: '7♭9', category: 'dominant', intervals: [4, 7, 10, 13], formula: '3 5 ♭7 ♭9', core: false },
  dom7s9: { id: 'dom7s9', name: 'Dominant 7♯9', symbol: '7♯9', category: 'dominant', intervals: [4, 7, 10, 15], formula: '3 5 ♭7 ♯9', core: false },

  min6: { id: 'min6', name: 'Minor 6', symbol: 'm6', category: 'minor', intervals: [0, 3, 7, 9], formula: '1 ♭3 5 6', core: true },
  min7: { id: 'min7', name: 'Minor 7', symbol: 'm7', category: 'minor', intervals: [0, 3, 7, 10], formula: '1 ♭3 5 ♭7', core: true },
  min7b5: { id: 'min7b5', name: 'Minor 7♭5', symbol: 'm7♭5', category: 'minor', intervals: [0, 3, 6, 10], formula: '1 ♭3 ♭5 ♭7', core: true },
  min7s5: { id: 'min7s5', name: 'Minor 7♯5', symbol: 'm7♯5', category: 'minor', intervals: [0, 3, 8, 10], formula: '1 ♭3 ♯5 ♭7', core: true },
  minmaj7: { id: 'minmaj7', name: 'Minor Major 7', symbol: 'm(maj7)', category: 'minor', intervals: [0, 3, 7, 11], formula: '1 ♭3 5 7', core: true },
  min9: { id: 'min9', name: 'Minor 9', symbol: 'm9', category: 'minor', intervals: [3, 7, 10, 14], formula: '♭3 5 ♭7 9', core: false },
  min7b5b9: { id: 'min7b5b9', name: 'Minor 7♭5(♭9)', symbol: 'm7♭5(♭9)', category: 'minor', intervals: [3, 6, 10, 13], formula: '♭3 ♭5 ♭7 ♭9', core: false },
  min7b59: { id: 'min7b59', name: 'Minor 7♭5(9)', symbol: 'm7♭5(9)', category: 'minor', intervals: [3, 6, 10, 14], formula: '♭3 ♭5 ♭7 9', core: false },
  min69: { id: 'min69', name: 'Minor 6/9', symbol: 'm6/9', category: 'minor', intervals: [3, 7, 9, 14], formula: '♭3 5 6 9', core: false },

  dim7: { id: 'dim7', name: 'Diminished 7', symbol: '°7', category: 'diminished', intervals: [0, 3, 6, 9], formula: '1 ♭3 ♭5 ♭♭7', core: true },
  dimmaj7: { id: 'dimmaj7', name: 'Diminished Major 7', symbol: '°maj7', category: 'diminished', intervals: [0, 3, 6, 11], formula: '1 ♭3 ♭5 7', core: true },
};

export const CHORD_TYPE_IDS = Object.keys(CHORD_TYPES) as ChordTypeId[];

/** Ordered category groupings for chord-type pickers. */
export const CHORD_CATEGORIES: { category: ChordCategory; label: string; types: ChordTypeId[] }[] = [
  { category: 'major', label: 'Major Chords', types: ['maj7', 'maj6', 'maj7s5', 'maj7b5', 'maj9', 'maj69'] },
  { category: 'dominant', label: 'Dominant Chords', types: ['dom7', 'dom7sus4', 'dom7s5', 'dom7b5', 'dom9', 'dom7b9', 'dom7s9'] },
  { category: 'minor', label: 'Minor Chords', types: ['min6', 'min7', 'min7b5', 'min7s5', 'minmaj7', 'min9', 'min7b5b9', 'min7b59', 'min69'] },
  { category: 'diminished', label: 'Diminished Chords', types: ['dim7', 'dimmaj7'] },
];

/** The 15 core chord types, in the order used by the Chapter 1 assignment. */
export const CORE_CHORD_TYPE_IDS: ChordTypeId[] = [
  'maj7',
  'min6',
  'dom7sus4',
  'maj7b5',
  'maj7s5',
  'min7',
  'min7b5',
  'min7s5',
  'maj6',
  'dom7',
  'dom7s5',
  'dim7',
  'dimmaj7',
  'minmaj7',
  'dom7b5',
];

export function getChordType(id: ChordTypeId): ChordType {
  const type = CHORD_TYPES[id];
  if (!type) throw new Error(`Unknown chord type: ${id}`);
  return type;
}

/** Pitch classes of the four voiced tones for a chord, in voicing order. */
export function chordTonePitchClasses(rootName: string, typeId: ChordTypeId): PitchClass[] {
  const rootPc = pitchClassOf(rootName);
  return getChordType(typeId).intervals.map((interval) => (rootPc + interval) % 12);
}

/** Engine-internal (sharp) note names of the four voiced tones, in voicing order. */
export function chordToneNames(rootName: string, typeId: ChordTypeId): string[] {
  return chordTonePitchClasses(rootName, typeId).map(sharpName);
}

const INTERVAL_TONE_NAMES: Record<number, string> = {
  0: 'R',
  1: '♭9',
  2: '9',
  3: '♭3',
  4: '3',
  5: '4',
  6: '♭5',
  7: '5',
  8: '♯5',
  9: '6',
  10: '♭7',
  11: '7',
};

/** Name a single voiced note relative to the chord root (R, 3, ♭7, etc.). */
export function chordToneName(notePc: PitchClass, rootPc: PitchClass): string {
  const interval = ((notePc - rootPc) % 12 + 12) % 12;
  return INTERVAL_TONE_NAMES[interval] ?? String(interval);
}

/** Display symbol for a chord, e.g. "Cmaj7", "G7♭9". */
export function chordSymbol(rootDisplay: string, typeId: ChordTypeId): string {
  return `${rootDisplay}${getChordType(typeId).symbol}`;
}
