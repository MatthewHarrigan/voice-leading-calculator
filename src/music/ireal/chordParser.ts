// Parse a single iReal Pro chord token into our model and map its quality onto
// the four-part drop-2 catalogue.
//
// iReal Pro's chord vocabulary is richer than our 23 voiced types, so the
// mapping is a best-effort reduction to the nearest playable four-part voicing
// (e.g. C13 → dominant 9, C^7#11 → major 7♭5). The original quality text is kept
// for display so the chart still reads exactly as written.

import type { ChordTypeId } from '../chords';
import { pitchClassOf } from '../notes';
import type { IRealChordRef } from './types';

// 1 root, 2 quality, 3 inline *comment*, 4 /bass, 5 (alternate)
const CHORD_RE = /^([A-G][b#]?)((?:sus|alt|add|[+\-^o\dh#b])*)(\*.*?\*)?(\/[A-G][#b]?)?(\((.*?)\))?/;

/** Map an iReal quality string to the nearest four-part catalogue type. */
export function mapQuality(quality: string): ChordTypeId {
  const q = quality.trim();

  // Diminished (o / dim), distinguishing the diminished-major 7.
  if (/^(o|dim)/.test(q)) {
    return /(\^|maj|△|M7)/.test(q) ? 'dimmaj7' : 'dim7';
  }
  // Half-diminished (h / ø).
  if (/[hø]/.test(q)) {
    return q.includes('9') ? 'min7b59' : 'min7b5';
  }
  // Minor family: leading '-' or 'm'/'min' (but not 'maj').
  if (/^-/.test(q) || /^m(in)?(?!a)/.test(q)) {
    const body = q.replace(/^(-|min|m)/, '');
    if (/(\^|maj|△)/.test(body) || body.includes('#7')) return 'minmaj7';
    if (body.includes('b5')) {
      if (body.includes('9')) return 'min7b59';
      if (body.includes('b9')) return 'min7b5b9';
      return 'min7b5';
    }
    if (body.includes('#5') || body.includes('+')) return 'min7s5';
    if (body.includes('6')) return body.includes('9') ? 'min69' : 'min6';
    if (/(9|11|13)/.test(body)) return 'min9';
    return 'min7';
  }
  // Major (explicit ^ / maj / △).
  if (/(\^|maj|△)/.test(q)) {
    if (q.includes('#5') || q.includes('+')) return 'maj7s5';
    if (q.includes('b5') || q.includes('#11')) return 'maj7b5';
    if (/(9|13)/.test(q)) return 'maj9';
    if (q.includes('6')) return q.includes('9') ? 'maj69' : 'maj6';
    return 'maj7';
  }
  // Sixth chords written without a quality marker.
  if (/^6/.test(q)) {
    return q.includes('9') ? 'maj69' : 'maj6';
  }
  // Augmented triad (no seventh).
  if (q === '+' || q === 'aug') return 'maj7s5';
  // Dominant / extensions / sus / altered.
  if (/(7|9|11|13|sus|alt|\+)/.test(q)) {
    if (q.includes('sus')) return 'dom7sus4';
    if (q.includes('alt') || q.includes('b9')) return 'dom7b9';
    if (q.includes('#9')) return 'dom7s9';
    if (q.includes('b5') || q.includes('#11')) return 'dom7b5';
    if (q.includes('#5') || q.includes('+')) return 'dom7s5';
    if (/(9|11|13)/.test(q)) return 'dom9';
    return 'dom7';
  }
  if (q.includes('add9')) return 'maj9';
  // Bare triad and anything unrecognised: a plain major.
  return 'maj7';
}

function prettyRoot(note: string): string {
  return note.replace(/b/g, '♭').replace(/#/g, '♯');
}

/** Turn a raw iReal quality into a nicely-typeset suffix. */
export function prettyQuality(quality: string): string {
  return quality
    .replace(/\^/g, 'maj')
    .replace(/-/g, 'm')
    .replace(/h/g, 'ø')
    .replace(/o/g, '°')
    .replace(/b/g, '♭')
    .replace(/#/g, '♯')
    .replace(/△/g, 'maj');
}

/** Display symbol for a parsed chord, e.g. "Cmaj7", "G7♭9", "F♯ø7", "C/E". */
export function prettyChordSymbol(ref: IRealChordRef): string {
  const base = prettyRoot(ref.root) + prettyQuality(ref.quality);
  return ref.bass ? `${base}/${prettyRoot(ref.bass)}` : base;
}

function isValidRoot(note: string): boolean {
  try {
    pitchClassOf(note);
    return true;
  } catch {
    return false;
  }
}

export interface ParsedChordToken {
  ref: IRealChordRef;
  alternate: IRealChordRef | null;
  /** Number of characters consumed from the input. */
  length: number;
}

function toRef(root: string, quality: string, bass?: string): IRealChordRef {
  return {
    root,
    quality,
    chordType: mapQuality(quality),
    ...(bass ? { bass } : {}),
  };
}

/**
 * Try to parse a chord at the start of `token`. Returns null if it does not
 * begin with a recognisable chord (so the caller can fall through to other
 * token kinds).
 */
export function parseChordToken(token: string): ParsedChordToken | null {
  const m = CHORD_RE.exec(token);
  if (!m || !m[1] || !isValidRoot(m[1])) return null;
  const root = m[1];
  const quality = m[2] ?? '';
  const overRaw = m[4]; // like "/E"
  const bass = overRaw ? overRaw.slice(1) : undefined;

  let alternate: IRealChordRef | null = null;
  const altRaw = m[6]; // inside the parentheses
  if (altRaw) {
    const inner = parseChordToken(altRaw);
    if (inner) alternate = inner.ref;
  }

  return {
    ref: toRef(root, quality, bass),
    alternate,
    length: m[0].length,
  };
}
