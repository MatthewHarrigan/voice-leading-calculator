// Drop-2 voicing construction and playable-fingering search.

import type { ChordTypeId } from './chords';
import { chordSymbol, chordToneName, chordToneNames } from './chords';
import { pitchClassOf, sharpName, type PitchClass } from './notes';
import {
  activeStrings,
  frettedMidi,
  noteAtFret,
  type StringSet,
  topString,
} from './tuning';

export type Inversion = 0 | 1 | 2 | 3;

/** A concrete fingering: frets per 6 strings (null = unplayed). */
export interface Fingering {
  frets: (number | null)[];
  rootString: number;
  /** Voiced note names (sharp spelling), low to high across the active strings. */
  voicing: string[];
  stringSet: StringSet;
}

/** A fully-described chord voicing for rendering and analysis. */
export interface ChordVoicing extends Fingering {
  /** Engine-internal root (sharp spelling). */
  root: string;
  /** Root as the caller spelled it (may be a flat). */
  displayRoot: string;
  chordType: ChordTypeId;
  inversion: Inversion;
  /** Display symbol using the display root, e.g. "Ebmaj7". */
  symbol: string;
}

/**
 * Build a drop-2 voicing from close-position chord tones.
 * Rotate the close voicing `inversion` times, then drop the second-from-top
 * note an octave to the bottom.
 */
export function createDrop2Voicing(notes: string[], inversion: Inversion): string[] {
  const close = [...notes];
  for (let i = 0; i < inversion; i++) {
    const bottom = close.shift();
    if (bottom !== undefined) close.push(bottom);
  }
  if (close.length >= 2) {
    const dropped = close.splice(close.length - 2, 1)[0];
    close.unshift(dropped);
  }
  return close;
}

/**
 * Search frets 3..12 for a playable fingering of the given drop-2 voicing on the
 * chosen string set, within `maxSpan` frets. Returns null if none is found.
 */
export function findDrop2Fingering(
  voicing: string[],
  root: string,
  startFret = 3,
  maxSpan = 4,
  stringSet: StringSet = 'middle',
): Fingering | null {
  const strings = activeStrings(stringSet);

  for (let baseFret = startFret; baseFret <= 12; baseFret++) {
    const frets: (number | null)[] = [null, null, null, null, null, null];
    let rootString: number | null = null;
    let success = true;

    for (let i = 0; i < voicing.length; i++) {
      const note = voicing[i];
      const stringIdx = strings[i];
      let foundFret: number | null = null;

      for (let fret = Math.max(0, baseFret - 2); fret <= baseFret + maxSpan; fret++) {
        if (noteAtFret(stringIdx, fret) === note) {
          foundFret = fret;
          break;
        }
      }

      if (foundFret === null) {
        success = false;
        break;
      }

      frets[stringIdx] = foundFret;
      if (note === root && rootString === null) {
        rootString = stringIdx;
      }
    }

    if (success) {
      const usedFrets = frets.filter((f): f is number => f !== null && f > 0);
      if (usedFrets.length > 0 && Math.max(...usedFrets) - Math.min(...usedFrets) <= maxSpan) {
        return { frets, rootString: rootString ?? 0, voicing, stringSet };
      }
    }
  }

  return null;
}

/**
 * Detect a minor-9th ("b9") interval between any two voices — the classic
 * "avoid" interval. True if any ordered pair of active-string pitches is a
 * positive interval that is one semitone above an octave multiple.
 */
export function hasFlatNineAvoidInterval(fingering: Fingering, stringSet?: StringSet): boolean {
  const set = stringSet ?? fingering.stringSet;
  const pitches = activeStrings(set)
    .map((stringIndex) => {
      const fret = fingering.frets[stringIndex];
      return fret === null || fret === undefined ? null : frettedMidi(stringIndex, fret);
    })
    .filter((p): p is number => p !== null);

  for (let lower = 0; lower < pitches.length; lower++) {
    for (let upper = 0; upper < pitches.length; upper++) {
      if (lower === upper) continue;
      const interval = pitches[upper] - pitches[lower];
      if (interval > 0 && interval % 12 === 1) return true;
    }
  }
  return false;
}

/** Dominant 7♭9 is allowed to keep its b9 interval as a colour tone. */
export function allowsDominantFlatNine(typeId: ChordTypeId): boolean {
  return typeId === 'dom7b9';
}

/** Whether a voicing should be used given the global avoid-b9 setting. */
export function shouldUseVoicing(
  fingering: Fingering,
  stringSet: StringSet,
  typeId: ChordTypeId,
  avoidB9: boolean,
): boolean {
  if (!avoidB9) return true;
  if (allowsDominantFlatNine(typeId)) return true;
  return !hasFlatNineAvoidInterval(fingering, stringSet);
}

/** Generate a full chord voicing, or null when no playable fingering exists. */
export function generateChordVoicing(
  rootDisplay: string,
  typeId: ChordTypeId,
  inversion: Inversion,
  stringSet: StringSet,
): ChordVoicing | null {
  const internalRoot = sharpName(pitchClassOf(rootDisplay));
  const toneNames = chordToneNames(rootDisplay, typeId);
  const voicing = createDrop2Voicing(toneNames, inversion);
  const fingering = findDrop2Fingering(voicing, internalRoot, 3, 4, stringSet);
  if (!fingering) return null;

  return {
    ...fingering,
    root: internalRoot,
    displayRoot: rootDisplay,
    chordType: typeId,
    inversion,
    symbol: chordSymbol(rootDisplay, typeId),
  };
}

export const INVERSION_NAMES = ['Root Inversion', '1st Inversion', '2nd Inversion', '3rd Inversion'];

export function inversionName(inversion: number): string {
  return INVERSION_NAMES[inversion] ?? 'Root Inversion';
}

/** Note name on the top (melody) string of a fingering, or null. */
export function topNoteOf(fingering: Fingering, stringSet?: StringSet): string | null {
  const set = stringSet ?? fingering.stringSet;
  const fret = fingering.frets[topString(set)];
  if (fret === null || fret === undefined) return null;
  return noteAtFret(topString(set), fret);
}

/** Fret span across the played (non-open) notes. */
export function fretSpan(fingering: Fingering, stringSet?: StringSet): number {
  const set = stringSet ?? fingering.stringSet;
  const used = activeStrings(set)
    .map((s) => fingering.frets[s])
    .filter((f): f is number => f !== null && f !== undefined && f > 0);
  if (used.length === 0) return 0;
  return Math.max(...used) - Math.min(...used);
}

export interface VoiceRow {
  stringIndex: number;
  stringLabel: string;
  fret: number | null;
  note: string | null;
  interval: string | null;
}

/** Per-voice breakdown (string, fret, note, chord-tone) for an inspector view. */
export function voiceRows(fingering: Fingering, rootDisplay: string, stringSet?: StringSet): VoiceRow[] {
  const set = stringSet ?? fingering.stringSet;
  const rootPc: PitchClass = pitchClassOf(rootDisplay);
  const labels = ['A', 'D', 'G', 'B', 'E'];
  return activeStrings(set).map((stringIndex, voiceIndex) => {
    const fret = fingering.frets[stringIndex];
    const note = fret === null || fret === undefined ? null : noteAtFret(stringIndex, fret);
    return {
      stringIndex,
      stringLabel: set === 'upper' ? ['D', 'G', 'B', 'E'][voiceIndex] : labels[voiceIndex],
      fret: fret ?? null,
      note,
      interval: note ? chordToneName(pitchClassOf(note), rootPc) : null,
    };
  });
}
