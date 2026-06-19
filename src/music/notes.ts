// Pitch-class arithmetic and key-aware note spelling.
//
// Internally every note is a pitch class 0..11 (C..B). The engine computes
// fingerings against a sharp-based chromatic scale (to match standard
// fretboard math) but *display* spelling is chosen from key context so that,
// e.g., a chord in Eb shows "Bb" rather than "A#".

export type PitchClass = number; // 0..11

export const CHROMATIC_SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const CHROMATIC_FLAT = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** Map any note spelling (C, C#, Db, ...) to its pitch class 0..11. */
export function pitchClassOf(note: string): PitchClass {
  const trimmed = note.trim();
  const letter = trimmed[0]?.toUpperCase();
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[letter];
  if (pc === undefined) {
    throw new Error(`Unrecognised note name: "${note}"`);
  }
  for (const accidental of trimmed.slice(1)) {
    if (accidental === '#' || accidental === '♯') pc += 1;
    else if (accidental === 'b' || accidental === '♭') pc -= 1;
  }
  return ((pc % 12) + 12) % 12;
}

/** The canonical sharp spelling for internal/engine use (matches legacy NOTES). */
export function sharpName(pc: PitchClass): string {
  return CHROMATIC_SHARP[((pc % 12) + 12) % 12];
}

export type Accidental = 'sharp' | 'flat';

// Number of sharps (+) or flats (-) for each major key, by tonic pitch class.
// Used to decide whether a key prefers sharp or flat spelling.
const MAJOR_KEY_ACCIDENTAL: Record<string, Accidental> = {
  C: 'sharp',
  G: 'sharp',
  D: 'sharp',
  A: 'sharp',
  E: 'sharp',
  B: 'sharp',
  'F#': 'sharp',
  'C#': 'sharp',
  F: 'flat',
  Bb: 'flat',
  Eb: 'flat',
  Ab: 'flat',
  Db: 'flat',
  Gb: 'flat',
  Cb: 'flat',
};

export interface KeyContext {
  /** Tonic note name as written, e.g. "Eb", "F#", "C". */
  tonic: string;
  mode: 'major' | 'minor';
}

/** Parse a key label like "Eb", "C minor", "G minor", "F#" into a KeyContext. */
export function parseKey(label: string | undefined | null): KeyContext | null {
  if (!label) return null;
  const match = label.trim().match(/^([A-Ga-g][#b♯♭]?)\s*(minor|min|m|major|maj)?$/i);
  if (!match) return null;
  const tonic = match[1][0].toUpperCase() + match[1].slice(1).replace('♯', '#').replace('♭', 'b');
  const modeRaw = (match[2] ?? '').toLowerCase();
  const mode: 'major' | 'minor' = modeRaw.startsWith('m') && !modeRaw.startsWith('maj') ? 'minor' : 'major';
  return { tonic, mode };
}

/** Decide whether a key prefers sharps or flats. Minor keys use their relative major. */
export function accidentalForKey(key: KeyContext | null): Accidental {
  if (!key) return 'sharp';
  let majorTonic = key.tonic;
  if (key.mode === 'minor') {
    // Relative major is a minor third (3 semitones) above the minor tonic.
    majorTonic = sharpName((pitchClassOf(key.tonic) + 3) % 12);
    // Re-resolve common relative majors to their conventional flat spelling.
    const relativeMap: Record<string, string> = {
      'D#': 'Eb',
      'G#': 'Ab',
      'A#': 'Bb',
      'C#': 'Db',
    };
    majorTonic = relativeMap[majorTonic] ?? majorTonic;
  }
  return MAJOR_KEY_ACCIDENTAL[majorTonic] ?? 'sharp';
}

/** Spell a pitch class using the given accidental preference. */
export function spellNote(pc: PitchClass, accidental: Accidental = 'sharp'): string {
  const idx = ((pc % 12) + 12) % 12;
  return accidental === 'flat' ? CHROMATIC_FLAT[idx] : CHROMATIC_SHARP[idx];
}

/** Spell a pitch class for a given key context. */
export function spellNoteInKey(pc: PitchClass, key: KeyContext | null): string {
  return spellNote(pc, accidentalForKey(key));
}

/** Minimal circular semitone distance between two pitch classes (0..6). */
export function pitchClassDistance(a: PitchClass, b: PitchClass): number {
  const diff = (((a - b) % 12) + 12) % 12;
  return Math.min(diff, 12 - diff);
}

/** Enharmonic display groupings used by note pickers. */
export const ENHARMONIC_CHOICES: { pc: PitchClass; display: string; spellings: string[] }[] = [
  { pc: 0, display: 'C', spellings: ['C'] },
  { pc: 1, display: 'C♯ / D♭', spellings: ['C#', 'Db'] },
  { pc: 2, display: 'D', spellings: ['D'] },
  { pc: 3, display: 'D♯ / E♭', spellings: ['D#', 'Eb'] },
  { pc: 4, display: 'E', spellings: ['E'] },
  { pc: 5, display: 'F', spellings: ['F'] },
  { pc: 6, display: 'F♯ / G♭', spellings: ['F#', 'Gb'] },
  { pc: 7, display: 'G', spellings: ['G'] },
  { pc: 8, display: 'G♯ / A♭', spellings: ['G#', 'Ab'] },
  { pc: 9, display: 'A', spellings: ['A'] },
  { pc: 10, display: 'A♯ / B♭', spellings: ['A#', 'Bb'] },
  { pc: 11, display: 'B', spellings: ['B'] },
];
