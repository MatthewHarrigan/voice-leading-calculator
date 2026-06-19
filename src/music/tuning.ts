// Guitar tuning, string sets, and fret <-> pitch helpers.
//
// String indices run 0..5 from the low E to the high E:
//   0 = low E (E2), 1 = A (A2), 2 = D (D3), 3 = G (G3), 4 = B (B3), 5 = high E (E4)
// Drop-2 voicings use four adjacent strings:
//   middle set = A D G B  -> string indices [1, 2, 3, 4]
//   upper set  = D G B E  -> string indices [2, 3, 4, 5]

import type { PitchClass } from './notes';
import { sharpName } from './notes';

export type StringSet = 'middle' | 'upper';

/** MIDI pitch of each open string: E2 A2 D3 G3 B3 E4. */
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const;

/** Pitch class of each open string. */
export const OPEN_STRING_PC: PitchClass[] = OPEN_STRING_MIDI.map((m) => m % 12);

/** Human labels for each string, low to high. */
export const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'] as const;

export const STRING_SET_INDICES: Record<StringSet, [number, number, number, number]> = {
  middle: [1, 2, 3, 4],
  upper: [2, 3, 4, 5],
};

export function activeStrings(stringSet: StringSet): [number, number, number, number] {
  return STRING_SET_INDICES[stringSet];
}

/** The string index carrying the top (melody) voice for a string set. */
export function topString(stringSet: StringSet): number {
  return stringSet === 'upper' ? 5 : 4;
}

export function stringSetLabel(stringSet: StringSet): string {
  return stringSet === 'upper' ? 'D-G-B-E' : 'A-D-G-B';
}

/** Label for the string carrying the guide line / top voice. */
export function guideStringLabel(stringSet: StringSet): string {
  return stringSet === 'upper' ? 'E string' : 'B string';
}

/** Pitch class sounding at a given string + fret. */
export function pitchClassAtFret(stringIndex: number, fret: number): PitchClass {
  return (OPEN_STRING_PC[stringIndex] + fret) % 12;
}

/** Sharp-spelled note name sounding at a given string + fret. */
export function noteAtFret(stringIndex: number, fret: number): string {
  return sharpName(pitchClassAtFret(stringIndex, fret));
}

/** Absolute MIDI pitch sounding at a given string + fret. */
export function frettedMidi(stringIndex: number, fret: number): number {
  return OPEN_STRING_MIDI[stringIndex] + fret;
}
