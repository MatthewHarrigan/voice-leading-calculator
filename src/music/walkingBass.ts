// Walking bass-line generation, after Ed Friedland's *Building Walking Bass
// Lines*. Pure and framework-independent (unit-tested); no React, no audio.
//
// Friedland's method is a progressive ladder — each rung adds one device on top
// of the last. The `BassStyle` selector exposes that ladder directly:
//   roots          → the root on each chord (the bottom of every line)
//   roots-fifths   → roots, fifths and octaves (the "two/four" foundation)
//   chromatic      → + a half-step approach into each new chord (U/chr, L/chr)
//   dominant       → + a fifth-of-the-target approach (U/dom, L/dom)
//   scale          → + a scale-tone approach (sc)
//   walking        → the real thing: root on the downbeat, chord tones walked
//                    on the inner beats, and the *smoothest* of the three
//                    approaches on the beat before each chord change.
//   advanced       → Part Two: walking, but each chord change is set up by a
//                    two-note *indirect resolution* (an enclosure) — one of
//                    Friedland's five chromatic/scalar surrounding patterns.
//
// Two invariants carry through the whole book and the whole algorithm: the ROOT
// anchors beat 1 of every chord, and the LAST beat of a chord sets up the next
// root. Lines stay in a low register and move by small steps — "like going up
// and down a flight of stairs."

import { type ChordTypeId, getChordType } from './chords';
import type { PitchClass } from './notes';

export type BassStyle =
  | 'roots'
  | 'roots-fifths'
  | 'chromatic'
  | 'dominant'
  | 'scale'
  | 'walking'
  | 'advanced';
export type BassFeel = 'two' | 'four';

/** The style ladder, in book order, with UI labels and one-line descriptions. */
export const BASS_STYLES: { id: BassStyle; label: string; hint: string }[] = [
  { id: 'roots', label: 'Roots', hint: 'Root (and octave) on each chord' },
  { id: 'roots-fifths', label: 'Roots + 5ths', hint: 'Roots, fifths and octaves' },
  { id: 'chromatic', label: '+ Chromatic approach', hint: 'Half-step approach into each chord' },
  { id: 'dominant', label: '+ Dominant approach', hint: 'Approach a chord from its fifth' },
  { id: 'scale', label: '+ Scale approach', hint: 'Approach from the next scale tone' },
  { id: 'walking', label: 'Full walking', hint: 'Chord tones walked, smartest approach into each change' },
  { id: 'advanced', label: 'Advanced (enclosures)', hint: 'Two-note indirect resolutions around each target' },
];

/** Minimal chord description the generator needs (one per performance beat-group). */
export interface BassInputChord {
  rootPc: PitchClass;
  chordType: ChordTypeId;
  /** Absolute 0-based beat onset from the start of the form. */
  startBeat: number;
  /** How many beats this chord occupies. */
  durationBeats: number;
}

export interface BassNote {
  /** Bass-register MIDI pitch. */
  midi: number;
  /** Absolute beat onset (0-based; fractional once embellished). */
  beat: number;
  durationBeats: number;
  /** Friedland analysis label: R, 3, 5, 8, ♭7, U/chr, L/dom, sc … */
  label: string;
  /** Note loudness 0–1 (1 = normal; ghost/dead notes are quieter). Default 1. */
  velocity?: number;
}

export interface WalkingBassOptions {
  style: BassStyle;
  feel: BassFeel;
}

// Electric-bass register the line lives in: low E (E1) up to E3, two octaves.
const BASS_LOW = 28; // E1
const BASS_HIGH = 52; // E3
// Roots are anchored low so the line sits where a real bass sits.
const ANCHOR_LOW = 33; // A1

/** Place a pitch class in the octave nearest `ref`, clamped to the bass register. */
function octaveNearest(pc: PitchClass, ref: number): number {
  let m = pc + 12 * Math.round((ref - pc) / 12);
  while (m < BASS_LOW) m += 12;
  while (m > BASS_HIGH) m -= 12;
  return m;
}

/**
 * The harmonic chord tones a bass line walks (root, 3rd, 5th, 7th) as semitone
 * offsets from the root. Derived from the catalogue's chord-tone formula so
 * altered fifths (♭5/♯5), the diminished ♭♭7, and 6ths all fall out correctly —
 * note this is *not* the drop-2 voicing (which drops roots on ninth chords).
 */
export function bassChordTones(typeId: ChordTypeId): {
  third: number;
  fifth: number;
  seventh: number;
} {
  const tokens = getChordType(typeId).formula.split(/\s+/);
  const has = (t: string) => tokens.includes(t);
  const third = has('♭3') ? 3 : has('4') ? 5 : 4; // ♭3, or 4 for sus, else 3
  const fifth = has('♭5') ? 6 : has('♯5') ? 8 : 7;
  const seventh = has('♭♭7') ? 9 : has('♭7') ? 10 : has('7') ? 11 : has('6') ? 9 : 10;
  return { third, fifth, seventh };
}

/**
 * The scale used to fill between chord tones (scalewise motion / scale approach).
 * Major→Ionian, dominant→Mixolydian, minor→Dorian, diminished→whole-half — each
 * adjusted so its 5th matches the chord's actual (possibly altered) fifth.
 */
export function bassScale(typeId: ChordTypeId): number[] {
  const cat = getChordType(typeId).category;
  const { third, fifth, seventh } = bassChordTones(typeId);
  let base: number[];
  if (cat === 'major') base = [0, 2, 4, 5, 7, 9, 11];
  else if (cat === 'dominant') base = [0, 2, 4, 5, 7, 9, 10];
  else if (cat === 'diminished') base = [0, 2, 3, 5, 6, 8, 9, 11];
  else base = [0, 2, 3, 5, 7, 9, 10]; // minor → Dorian
  const set = new Set(base);
  if (fifth !== 7) {
    set.delete(7);
    set.add(fifth);
  }
  set.add(0);
  set.add(third);
  set.add(seventh);
  return [...set].sort((a, b) => a - b);
}

interface ToneSet {
  root: PitchClass;
  third: PitchClass;
  fifth: PitchClass;
  seventh: PitchClass;
  seventhLabel: string;
}

function toneSet(chord: BassInputChord): ToneSet {
  const t = bassChordTones(chord.chordType);
  return {
    root: chord.rootPc % 12,
    third: (chord.rootPc + t.third) % 12,
    fifth: (chord.rootPc + t.fifth) % 12,
    seventh: (chord.rootPc + t.seventh) % 12,
    seventhLabel: t.seventh === 9 ? '6' : t.seventh === 11 ? '7' : '♭7',
  };
}

interface Approach {
  pc: PitchClass;
  label: string;
}
interface PlacedNote {
  midi: number;
  label: string;
}

/**
 * Place the smoothest of several approach candidates: the smallest leap from the
 * previous note wins, but never repeat the previous note when another option
 * exists (a held note is a dead spot in a walking line). Candidate order breaks
 * ties, so callers list their preferred device first.
 */
function pickApproach(candidates: Approach[], prev: number): PlacedNote {
  let best: PlacedNote | null = null;
  let bestLeap = Infinity;
  let repeat: PlacedNote | null = null;
  let repeatLeap = Infinity;
  for (const c of candidates) {
    const midi = octaveNearest(c.pc, prev);
    const leap = Math.abs(midi - prev);
    if (midi === prev) {
      if (leap < repeatLeap) {
        repeatLeap = leap;
        repeat = { midi, label: c.label };
      }
      continue;
    }
    if (leap < bestLeap) {
      bestLeap = leap;
      best = { midi, label: c.label };
    }
  }
  return best ?? repeat ?? { midi: octaveNearest(candidates[0].pc, prev), label: candidates[0].label };
}

/** Half-step approach candidates: from below (L/chr) and above (U/chr). */
function chromaticCands(targetPc: PitchClass): Approach[] {
  return [
    { pc: (targetPc + 11) % 12, label: 'L/chr' }, // leading tone preferred on ties
    { pc: (targetPc + 1) % 12, label: 'U/chr' },
  ];
}

/** Dominant approach: the fifth of the target, labelled by which octave it lands in. */
function dominantApproach(targetPc: PitchClass, prev: number): PlacedNote {
  const dom = (targetPc + 7) % 12; // the dominant (fifth) of the target
  let midi = octaveNearest(dom, prev);
  if (midi === prev) midi = midi + 12 <= BASS_HIGH ? midi + 12 : midi - 12; // dodge a repeat
  const target = octaveNearest(targetPc, prev);
  return { midi, label: midi >= target ? 'U/dom' : 'L/dom' };
}

/** Scale-tone approach candidates: the 2nd above the target and the 7th below it. */
function scaleCands(next: BassInputChord): Approach[] {
  const scale = bassScale(next.chordType);
  return [
    { pc: (next.rootPc + scale[1]) % 12, label: 'sc' }, // 2nd degree (from above)
    { pc: (next.rootPc + scale[scale.length - 1]) % 12, label: 'sc' }, // 7th degree (from below)
  ];
}

/** The smoothest of all three approaches into the next root (the "combining" rung). */
function bestApproach(next: BassInputChord, prev: number): PlacedNote {
  const dom = dominantApproach(next.rootPc, prev);
  // Chromatic first (strongest pull), then scale, then the dominant as a fallback.
  return pickApproach(
    [
      ...chromaticCands(next.rootPc),
      ...scaleCands(next),
      { pc: (next.rootPc + 7) % 12, label: dom.label },
    ],
    prev,
  );
}

/**
 * An *indirect resolution* (Part Two): a two-note enclosure that surrounds the
 * next root before resolving to it on the downbeat. Friedland gives five
 * patterns, each a pair of chromatic/scalar neighbours in a fixed order. We
 * place the pair smoothest from the previous note and pick the pattern with the
 * least total motion — "very strong melodic motion … some interesting new note
 * choices."
 */
function indirectResolution(next: BassInputChord, prev: number): [PlacedNote, PlacedNote] {
  const t = next.rootPc;
  const scale = bassScale(next.chordType);
  const uchr: Approach = { pc: (t + 1) % 12, label: 'U/chr' };
  const lchr: Approach = { pc: (t + 11) % 12, label: 'L/chr' };
  const usc: Approach = { pc: (t + scale[1]) % 12, label: 'U/sc' };
  const lsc: Approach = { pc: (t + scale[scale.length - 1]) % 12, label: 'L/sc' };
  const patterns: [Approach, Approach][] = [
    [lchr, usc], // (1) lower chromatic / upper scalar
    [usc, lchr], // (2) upper scalar / lower chromatic
    [lsc, uchr], // (3) lower scalar / upper chromatic
    [lchr, uchr], // (4) lower chromatic / upper chromatic
    [uchr, lchr], // (5) upper chromatic / lower chromatic
  ];
  let best: [PlacedNote, PlacedNote] | null = null;
  let bestScore = Infinity;
  for (const [a, b] of patterns) {
    const m1 = octaveNearest(a.pc, prev);
    const m2 = octaveNearest(b.pc, m1);
    // Penalise a dead repeat at either step; otherwise reward the least motion.
    let score = Math.abs(m1 - prev) + Math.abs(m2 - m1);
    if (m1 === prev || m2 === m1) score += 24;
    if (score < bestScore) {
      bestScore = score;
      best = [
        { midi: m1, label: a.label },
        { midi: m2, label: b.label },
      ];
    }
  }
  return best!;
}

/** Walk to the nearest chord tone that isn't a repeat of the previous note. */
function walkChordTone(tones: ToneSet, prev: number): { midi: number; label: string } {
  const candidates = [
    { pc: tones.third, label: '3' },
    { pc: tones.fifth, label: '5' },
    { pc: tones.seventh, label: tones.seventhLabel },
    { pc: tones.root, label: '8' },
  ];
  let best: { midi: number; label: string } | null = null;
  let bestLeap = Infinity;
  for (const c of candidates) {
    const midi = octaveNearest(c.pc, prev);
    if (midi === prev) continue; // don't just repeat the note
    const leap = Math.abs(midi - prev);
    if (leap < bestLeap) {
      bestLeap = leap;
      best = { midi, label: c.label };
    }
  }
  return best ?? { midi: octaveNearest(tones.fifth, prev), label: '5' };
}

/**
 * Build a walking bass line for a form. `chords` is the flattened performance
 * order (one entry per chord, in beats); the line wraps the last chord's
 * approach back to the first root so a looped form joins seamlessly. Returns one
 * note per beat (four feel) or per two beats (two feel), each carrying its
 * Friedland analysis label.
 */
export function generateWalkingBass(
  chords: BassInputChord[],
  opts: WalkingBassOptions,
): BassNote[] {
  if (chords.length === 0) return [];
  const step = opts.feel === 'two' ? 2 : 1;
  const notes: BassNote[] = [];
  let prev = -1; // -1 → no previous note yet; anchor the first root low

  chords.forEach((chord, ci) => {
    const next = chords[(ci + 1) % chords.length];
    const changes = next.rootPc !== chord.rootPc || next.chordType !== chord.chordType;
    const tones = toneSet(chord);
    const slots = Math.max(1, Math.floor(chord.durationBeats / step));
    // The "advanced" enclosure spans two slots; the second is queued here.
    let pending: PlacedNote | null = null;

    for (let s = 0; s < slots; s++) {
      const isLast = s === slots - 1;
      let midi: number;
      let label: string;

      if (pending) {
        // Second half of an indirect resolution, computed on the previous beat.
        ({ midi, label } = pending);
        pending = null;
      } else if (s === 0) {
        // The root always anchors the chord's downbeat.
        midi = prev < 0 ? octaveNearest(tones.root, ANCHOR_LOW) : octaveNearest(tones.root, prev);
        label = 'R';
      } else if (opts.style === 'advanced' && changes && slots >= 3 && s === slots - 2) {
        // Start a two-note enclosure into the next root; queue its second note.
        const [first, second] = indirectResolution(next, prev);
        pending = second;
        midi = first.midi;
        label = first.label;
      } else if (isLast && changes && opts.style !== 'roots' && opts.style !== 'roots-fifths') {
        // The beat before a chord change sets up the next root with an approach.
        // (For "advanced" this is the fallback when the bar is too short to enclose.)
        const a =
          opts.style === 'chromatic'
            ? pickApproach(chromaticCands(next.rootPc), prev)
            : opts.style === 'dominant'
              ? dominantApproach(next.rootPc, prev)
              : opts.style === 'scale'
                ? pickApproach(scaleCands(next), prev)
                : bestApproach(next, prev);
        midi = a.midi;
        label = a.label;
      } else if (opts.style === 'roots') {
        // Bounce the root and its octave for motion (Friedland's "four" feel roots).
        const low = octaveNearest(tones.root, ANCHOR_LOW);
        if (s % 2 === 1) {
          midi = Math.min(low + 12, BASS_HIGH);
          label = '8';
        } else {
          midi = low;
          label = 'R';
        }
      } else if (opts.style === 'walking' || opts.style === 'advanced') {
        ({ midi, label } = walkChordTone(tones, prev));
      } else {
        // roots-fifths and the inner beats of the approach styles: R 5 8 5 …
        const pick = s % 2 === 1 ? { pc: tones.fifth, label: '5' } : { pc: tones.root, label: '8' };
        midi = octaveNearest(pick.pc, prev);
        label = pick.label;
      }

      notes.push({ midi, beat: chord.startBeat + s * step, durationBeats: step, label });
      prev = midi;
    }
  });

  return notes;
}

export interface EmbellishOptions {
  /** Drop a quiet eighth-note "skip" before selected targets. */
  ghosts: boolean;
  /** Push selected chord-change downbeats an eighth early (the "push"). */
  anticipate: boolean;
  /** Roll a triplet enclosure into selected targets (a "drop"). */
  triplets: boolean;
  /** How often to embellish, 0 (never) … 1 (every eligible spot). */
  amount: number;
}

/** Loudness of ghost/triplet fills relative to a normal note. */
const GHOST_VELOCITY = 0.4;
const TRIPLET_VELOCITY = 0.7;
const PHI = 0.61803398875;

/**
 * Deterministic, evenly-spread selection: returns true for about `amount` of the
 * items, scattered by a golden-ratio low-discrepancy sequence so they never
 * clump — and never use RNG (which would make the line unstable across renders).
 * Different `salt` values pick *different* spread-out subsets at the same density.
 */
function spread(i: number, amount: number, salt: number): boolean {
  if (amount <= 0) return false;
  if (amount >= 1) return true;
  const frac = ((((i + 1) * PHI + salt) % 1) + 1) % 1;
  return frac < amount;
}

/**
 * Apply rhythmic feel to a finished line. This goes beyond Friedland's
 * straight-quarter method: it adds staples of real jazz-bass time —
 * anticipations (a chord-change root pushed an eighth ahead of the beat),
 * ghost-note skips (a quiet chromatic eighth raked into a target) and triplet
 * "drops" (a quick triplet enclosure rolled into a target). `amount` controls
 * how often each fires; swing is left to the player (it re-times the offbeats
 * these create). Fully deterministic — embellishments are chosen by position.
 */
export function embellishBassLine(notes: BassNote[], opts: EmbellishOptions): BassNote[] {
  const enabled = opts.ghosts || opts.anticipate || opts.triplets;
  if (notes.length < 2 || !enabled || opts.amount <= 0) return notes;
  const core = notes.map((n) => ({ ...n, velocity: n.velocity ?? 1 }));
  const pushed = new Set<number>(); // indices an anticipation already moved early

  // 1) Anticipations — a real chord change (an 'R' whose pitch differs from the
  //    note before it) gets pushed half a beat early, stealing the time from the
  //    preceding note.
  if (opts.anticipate) {
    let eligible = 0;
    for (let i = 1; i < core.length; i++) {
      const n = core[i];
      const before = core[i - 1];
      if (n.label !== 'R' || n.midi === before.midi || n.beat - before.beat < 1) continue;
      if (!spread(eligible++, opts.amount, 0.12)) continue;
      before.durationBeats = Math.max(0.5, before.durationBeats - 0.5);
      n.beat -= 0.5;
      n.durationBeats += 0.5;
      pushed.add(i);
    }
  }

  // 2) Fills on the full-beat gaps an anticipation left alone — a triplet drop or
  //    a ghost skip (mutually exclusive per gap, each on its own spread subset).
  const out: BassNote[] = [];
  let gap = 0;
  for (let i = 0; i < core.length; i++) {
    const n = core[i];
    out.push(n);
    const next = core[i + 1];
    if (!next || next.beat - n.beat < 0.99 || pushed.has(i + 1)) continue;
    const g = gap++;
    if (opts.triplets && spread(g, opts.amount, 0.31)) {
      // A triplet that LANDS on the target: an upper- then lower-neighbour pair
      // in the beat right before `next`, so `next` is the triplet's third hit and
      // sounds immediately — even across a half-note (two-feel) gap, where the
      // held note rings first and the triplet rolls in at the end.
      n.durationBeats = Math.max(0.25, Math.min(n.durationBeats, next.beat - 2 / 3 - n.beat));
      const up = (((next.midi + 1) % 12) + 12) % 12;
      const down = (((next.midi - 1) % 12) + 12) % 12;
      out.push({ midi: octaveNearest(up, next.midi), beat: next.beat - 2 / 3, durationBeats: 1 / 3, label: 't', velocity: TRIPLET_VELOCITY });
      out.push({ midi: octaveNearest(down, next.midi), beat: next.beat - 1 / 3, durationBeats: 1 / 3, label: 't', velocity: TRIPLET_VELOCITY });
    } else if (opts.ghosts && spread(g, opts.amount, 0.61)) {
      const ghostPc = (((next.midi - 1) % 12) + 12) % 12;
      out.push({ midi: octaveNearest(ghostPc, next.midi), beat: next.beat - 0.5, durationBeats: 0.5, label: 'g', velocity: GHOST_VELOCITY });
    }
  }
  return out.sort((a, b) => a.beat - b.beat);
}
