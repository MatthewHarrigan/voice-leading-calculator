// The iReal Pro chord-chart model.
//
// This is a faithful, measure-based projection of an iReal Pro song: a flat list
// of measures, each carrying its chords plus the structural notation iReal Pro
// supports (barlines, rehearsal marks, endings, repeats, time-signature changes,
// coda/segno/fermata, staff text). It is the source of truth for the Sequence
// Builder and round-trips to and from `irealb://` URLs.

import type { ChordTypeId } from '../chords';

/** Opening barline of a measure. */
export type BarlineOpen = 'single' | 'double' | 'repeat';
/** Closing barline of a measure. */
export type BarlineClose = 'single' | 'double' | 'repeat' | 'final';

export interface IRealChordRef {
  /** Display root as written, e.g. "Bb", "F#". */
  root: string;
  /** Raw iReal quality string, e.g. "-7", "^7", "7b9" (empty = major triad). */
  quality: string;
  /** Mapped four-part catalogue type, or null when not representable. */
  chordType: ChordTypeId | null;
  /** Optional slash bass note, e.g. "E" in "C/E". */
  bass?: string;
}

export interface IRealChord extends IRealChordRef {
  id: string;
  /** Optional alternate chord shown smaller above the main chord. */
  alternate?: IRealChordRef | null;
  /** Duration in beats within the measure. */
  beats: number;
  /** No-chord (N.C.). */
  noChord?: boolean;
  /** Display-only small rendering (iReal `s`). */
  small?: boolean;
  /** Pretty display symbol, e.g. "Cmaj7", "G7♭9", "Eø7". */
  symbol: string;
  /** App extension: a target note to place on top of the voicing (lead line). */
  targetTopNote?: string;
  /** App extension: a locked inversion (0–3) for this chord. */
  preferredInversion?: number;
}

export interface IRealMeasure {
  id: string;
  chords: IRealChord[];
  /** Time signature in force at this measure (set when it changes; bar 1 always set). */
  timeSig?: [number, number];
  open?: BarlineOpen;
  close?: BarlineClose;
  /** Rehearsal/section label: A, B, C, D, V (verse), i (intro). */
  section?: string;
  /** Ending bracket number (1, 2, 3…); 0 marks an un-numbered bracket. */
  ending?: number;
  /** One-bar (`x`) or two-bar (`r`) measure repeat. */
  barRepeat?: 1 | 2;
  coda?: boolean;
  segno?: boolean;
  fermata?: boolean;
  /** Free staff text annotation. */
  staffText?: string;
  /** Recognised navigation directive (D.C. al Coda, D.S. al Fine, Fine, …). */
  directive?: string;
}

export interface IRealChart {
  title: string;
  composer?: string;
  style?: string;
  /** Key as written, e.g. "C", "G-", "Eb". */
  key?: string;
  /** Tempo in BPM (0/undefined = unset). */
  tempo?: number;
  /** Whole-form repeat count from the song footer. */
  repeats?: number;
  /** Initial time signature (also stored on measure 1). */
  timeSignature: [number, number];
  measures: IRealMeasure[];
}

export interface IRealPlaylist {
  name?: string;
  songs: IRealChart[];
}
