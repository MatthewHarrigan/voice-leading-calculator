// ii-V-I progression generation, ranked by voice-leading efficiency.

import type { ChordTypeId } from './chords';
import { chordSymbol } from './chords';
import type { StringSet } from './tuning';
import {
  generateChordVoicing,
  inversionName,
  shouldUseVoicing,
  type ChordVoicing,
  type Fingering,
  type Inversion,
} from './voicing';

export type ProgressionType = 'major' | 'minor';

export interface ProgressionChord {
  root: string;
  type: ChordTypeId;
  inversion: Inversion;
  stringSet: StringSet;
  voicing: ChordVoicing;
  symbol: string;
  label: string;
}

export interface Progression {
  chords: ProgressionChord[];
  totalDistance: number;
  stringSetPattern: string;
}

const PROGRESSION_ROOTS = ['D', 'G', 'C'];

const PROGRESSION_TYPES: Record<ProgressionType, [ChordTypeId, ChordTypeId, ChordTypeId]> = {
  major: ['min7', 'dom7', 'maj7'],
  minor: ['min7b5', 'dom7', 'min7'],
};

interface ActiveNote {
  string: number;
  fret: number;
}

function activeNotes(fingering: Fingering): ActiveNote[] {
  const strings = fingering.stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4];
  const notes: ActiveNote[] = [];
  for (const stringIndex of strings) {
    const fret = fingering.frets[stringIndex];
    if (fret !== null && fret !== undefined) {
      notes.push({ string: stringIndex, fret });
    }
  }
  return notes;
}

/** Voice-leading distance allowing for string-set changes between two chords. */
function crossStringSetDistance(a: ProgressionChord, b: ProgressionChord): number {
  const notes1 = activeNotes(a.voicing);
  const notes2 = activeNotes(b.voicing);
  if (notes1.length !== 4 || notes2.length !== 4) return 1000;

  let total = 0;
  for (let i = 0; i < 4; i++) {
    let distance = Math.abs(notes2[i].fret - notes1[i].fret);
    if (notes1[i].string !== notes2[i].string) distance += 3;
    total += distance;
  }
  if (a.stringSet !== b.stringSet) total += 2;
  return total;
}

function evaluatePattern(
  roots: string[],
  types: [ChordTypeId, ChordTypeId, ChordTypeId],
  inversions: [Inversion, Inversion, Inversion],
  stringSets: [StringSet, StringSet, StringSet],
  avoidB9: boolean,
): Progression | null {
  const chords: ProgressionChord[] = [];
  for (let i = 0; i < 3; i++) {
    const voicing = generateChordVoicing(roots[i], types[i], inversions[i], stringSets[i]);
    if (!voicing || !shouldUseVoicing(voicing, stringSets[i], types[i], avoidB9)) {
      return null;
    }
    chords.push({
      root: roots[i],
      type: types[i],
      inversion: inversions[i],
      stringSet: stringSets[i],
      voicing,
      symbol: chordSymbol(roots[i], types[i]),
      label: `${chordSymbol(roots[i], types[i])} ${inversionName(inversions[i])}`,
    });
  }

  let totalDistance = 0;
  for (let i = 0; i < 2; i++) {
    totalDistance += crossStringSetDistance(chords[i], chords[i + 1]);
  }

  return { chords, totalDistance, stringSetPattern: stringSets.join('-') };
}

/**
 * Generate the top `limit` ii-V-I patterns for the given string set, ranked by
 * total voice-leading distance (lower is smoother). With `freeStringSet` the
 * first chord still starts on the given set, but the V and I may sit on either
 * set — the ranking then weighs set hops against slides up the neck.
 */
export function generateProgressions(
  type: ProgressionType,
  stringSet: StringSet,
  options: { avoidB9?: boolean; limit?: number; freeStringSet?: boolean } = {},
): Progression[] {
  const avoidB9 = options.avoidB9 ?? true;
  const limit = options.limit ?? 4;
  const types = PROGRESSION_TYPES[type];

  const setChoices: StringSet[] = options.freeStringSet ? ['middle', 'upper'] : [stringSet];
  const patterns: [StringSet, StringSet, StringSet][] = [];
  for (const s2 of setChoices) {
    for (const s3 of setChoices) {
      patterns.push([stringSet, s2, s3]);
    }
  }

  const all: Progression[] = [];
  for (const pattern of patterns) {
    for (let inv1 = 0; inv1 < 4; inv1++) {
      for (let inv2 = 0; inv2 < 4; inv2++) {
        for (let inv3 = 0; inv3 < 4; inv3++) {
          const progression = evaluatePattern(
            PROGRESSION_ROOTS,
            types,
            [inv1 as Inversion, inv2 as Inversion, inv3 as Inversion],
            pattern,
            avoidB9,
          );
          if (progression) all.push(progression);
        }
      }
    }
  }

  all.sort((a, b) => a.totalDistance - b.totalDistance);
  return all.slice(0, limit);
}
