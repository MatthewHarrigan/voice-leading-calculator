import { describe, expect, it } from 'vitest';
import { pitchClassOf } from './notes';
import {
  bassChordTones,
  bassScale,
  embellishBassLine,
  generateWalkingBass,
  type BassInputChord,
  type BassNote,
  type BassStyle,
} from './walkingBass';

/** Build a flat performance sequence from [root, type, beats] tuples. */
function seq(...spec: [string, BassInputChord['chordType'], number][]): BassInputChord[] {
  let beat = 0;
  return spec.map(([root, chordType, durationBeats]) => {
    const chord = { rootPc: pitchClassOf(root), chordType, startBeat: beat, durationBeats };
    beat += durationBeats;
    return chord;
  });
}

const inRegister = (midi: number) => midi >= 28 && midi <= 52;

describe('bassChordTones', () => {
  it('reads chord tones from the catalogue formula', () => {
    expect(bassChordTones('maj7')).toEqual({ third: 4, fifth: 7, seventh: 11 });
    expect(bassChordTones('dom7')).toEqual({ third: 4, fifth: 7, seventh: 10 });
    expect(bassChordTones('min7')).toEqual({ third: 3, fifth: 7, seventh: 10 });
  });

  it('handles altered fifths, the diminished ♭♭7 and 6th chords', () => {
    expect(bassChordTones('min7b5').fifth).toBe(6);
    expect(bassChordTones('dom7s5').fifth).toBe(8);
    expect(bassChordTones('dim7')).toEqual({ third: 3, fifth: 6, seventh: 9 });
    expect(bassChordTones('maj6').seventh).toBe(9); // the 6 fills the 7th slot
    expect(bassChordTones('dom7sus4').third).toBe(5); // sus → the 4th
  });
});

describe('bassScale', () => {
  it('picks the conventional scale per chord quality', () => {
    expect(bassScale('dom7')).toEqual([0, 2, 4, 5, 7, 9, 10]); // mixolydian
    expect(bassScale('min7')).toEqual([0, 2, 3, 5, 7, 9, 10]); // dorian
    expect(bassScale('maj7')).toEqual([0, 2, 4, 5, 7, 9, 11]); // ionian
  });

  it('reflects an altered fifth in the scale', () => {
    expect(bassScale('min7b5')).toContain(6);
    expect(bassScale('min7b5')).not.toContain(7);
  });
});

describe('generateWalkingBass', () => {
  it('returns nothing for an empty form', () => {
    expect(generateWalkingBass([], { style: 'walking', feel: 'four' })).toEqual([]);
  });

  it('anchors the root on every chord downbeat and stays in the bass register', () => {
    const chords = seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]);
    const styles: BassStyle[] = ['roots', 'roots-fifths', 'chromatic', 'dominant', 'scale', 'walking'];
    for (const style of styles) {
      const line = generateWalkingBass(chords, { style, feel: 'four' });
      expect(line).toHaveLength(8); // one note per beat
      expect(line.every((n) => inRegister(n.midi))).toBe(true);
      const downbeats = line.filter((n) => n.beat % 4 === 0);
      expect(downbeats.every((n) => n.label === 'R')).toBe(true);
      expect(downbeats.map((n) => n.midi % 12)).toEqual([pitchClassOf('F'), pitchClassOf('Bb')]);
    }
  });

  it('roots + fifths walks R 5 8 5', () => {
    const line = generateWalkingBass(seq(['C', 'maj7', 4]), { style: 'roots-fifths', feel: 'four' });
    expect(line.map((n) => n.label)).toEqual(['R', '5', '8', '5']);
    expect(line[1].midi % 12).toBe(pitchClassOf('G')); // the fifth of C
  });

  it('chromatic style approaches the next root by a half step on the last beat', () => {
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'chromatic',
      feel: 'four',
    });
    const approach = line[3]; // beat 4 of the F7 bar
    expect(['U/chr', 'L/chr']).toContain(approach.label);
    const dist = (((approach.midi % 12) - pitchClassOf('Bb')) % 12 + 12) % 12;
    expect([1, 11]).toContain(dist); // a half step from the Bb target
  });

  it('dominant style approaches the next root from its fifth', () => {
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'dominant',
      feel: 'four',
    });
    const approach = line[3];
    expect(['U/dom', 'L/dom']).toContain(approach.label);
    expect(approach.midi % 12).toBe((pitchClassOf('Bb') + 7) % 12); // F, the fifth of Bb
  });

  it('scale style labels its approach sc', () => {
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'scale',
      feel: 'four',
    });
    expect(line[3].label).toBe('sc');
  });

  it('full walking puts an approach on the beat before each change', () => {
    const line = generateWalkingBass(seq(['D', 'min7', 4], ['G', 'dom7', 4]), {
      style: 'walking',
      feel: 'four',
    });
    expect(line).toHaveLength(8);
    expect(line[0].label).toBe('R'); // downbeat root
    expect(['U/chr', 'L/chr', 'U/dom', 'L/dom', 'sc']).toContain(line[3].label);
  });

  it('never repeats the previous note on an approach beat', () => {
    // F7 walked R 3 5 … lands on C (the 5th); a naive upper-scale approach to
    // Bb would also be C — the picker must dodge that repeat.
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'walking',
      feel: 'four',
    });
    for (let i = 1; i < line.length; i++) {
      expect(line[i].midi).not.toBe(line[i - 1].midi);
    }
  });

  it('advanced style encloses each target with a two-note indirect resolution', () => {
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'advanced',
      feel: 'four',
    });
    expect(line).toHaveLength(8);
    expect(line[0].label).toBe('R');
    // Beats 3 and 4 are the enclosure (two of the four neighbour types)…
    const encl = [line[2].label, line[3].label];
    const neighbourTypes = ['U/chr', 'L/chr', 'U/sc', 'L/sc'];
    expect(encl.every((l) => neighbourTypes.includes(l))).toBe(true);
    // …both within a step of the Bb target, and not a repeat of each other.
    for (const n of [line[2], line[3]]) {
      const d = (((n.midi % 12) - pitchClassOf('Bb')) % 12 + 12) % 12;
      expect([1, 2, 10, 11]).toContain(d);
    }
    expect(line[2].midi).not.toBe(line[3].midi);
  });

  it('advanced style falls back to a single approach when a bar is too short to enclose', () => {
    // Two-beat chords (a ii–V) leave only one beat before each change.
    const line = generateWalkingBass(seq(['D', 'min7', 2], ['G', 'dom7', 2]), {
      style: 'advanced',
      feel: 'four',
    });
    expect(line.map((n) => n.label)[0]).toBe('R');
    expect(['U/chr', 'L/chr', 'sc', 'U/dom', 'L/dom']).toContain(line[1].label);
  });

  it('two feel halves the line into half notes', () => {
    const line = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'roots-fifths',
      feel: 'two',
    });
    expect(line).toHaveLength(4);
    expect(line.every((n) => n.durationBeats === 2)).toBe(true);
    expect(line.map((n) => n.beat)).toEqual([0, 2, 4, 6]);
  });
});

describe('embellishBassLine', () => {
  const line = (): BassNote[] =>
    generateWalkingBass(
      seq(['F', 'dom7', 4], ['Bb', 'dom7', 4], ['F', 'dom7', 4], ['C', 'dom7', 4]),
      { style: 'walking', feel: 'four' },
    );

  const all = (over: Partial<Parameters<typeof embellishBassLine>[1]> = {}) => ({
    ghosts: false,
    anticipate: false,
    triplets: false,
    amount: 1,
    ...over,
  });

  it('is a no-op when nothing is enabled or amount is zero', () => {
    const src = line();
    expect(embellishBassLine(src, all())).toEqual(src);
    expect(embellishBassLine(src, all({ ghosts: true, amount: 0 }))).toEqual(src);
  });

  it('ghost skips are quiet off-beat eighths that keep the core notes', () => {
    const src = line();
    const out = embellishBassLine(src, all({ ghosts: true }));
    const ghosts = out.filter((n) => n.label === 'g');
    expect(ghosts.length).toBeGreaterThan(0);
    expect(ghosts.every((g) => g.velocity !== undefined && g.velocity < 1)).toBe(true);
    expect(ghosts.every((g) => g.beat % 1 === 0.5)).toBe(true); // land on the "and"
    for (const n of src) {
      expect(out.some((o) => o.midi === n.midi && o.beat === n.beat)).toBe(true);
    }
    expect(out.length).toBeGreaterThan(src.length);
  });

  it('anticipations push some roots an eighth early without adding notes', () => {
    const src = line();
    const out = embellishBassLine(src, all({ anticipate: true }));
    expect(out.length).toBe(src.length); // moved, not added
    const pushed = out.filter((n) => n.beat % 1 === 0.5);
    expect(pushed.length).toBeGreaterThan(0);
    expect(pushed.every((n) => n.label === 'R')).toBe(true); // only chord roots
    expect(out.every((n) => n.beat >= 0)).toBe(true); // never before the form
  });

  it('triplet drops add two off-beat fills per chosen target', () => {
    const out = embellishBassLine(line(), all({ triplets: true }));
    const t = out.filter((n) => n.label === 't');
    expect(t.length).toBeGreaterThan(0);
    expect(t.length % 2).toBe(0); // they come in pairs
    const offsets = [...new Set(t.map((n) => Number((n.beat % 1).toFixed(3))))];
    expect(offsets.sort()).toEqual([0.333, 0.667]); // the triplet subdivisions
  });

  it('triplets land on the next note even across a half-note (two-feel) gap', () => {
    const twoFeel = generateWalkingBass(seq(['F', 'dom7', 4], ['Bb', 'dom7', 4]), {
      style: 'walking',
      feel: 'two',
    });
    const out = embellishBassLine(twoFeel, all({ triplets: true }));
    // For every triplet fill, a real note must follow exactly 1/3 beat later
    // (the landing), so there is never a gap after the triplet "drops".
    const beats = out.map((n) => n.beat);
    for (const t of out.filter((n) => n.label === 't')) {
      const hasFollow = beats.some((b) => Math.abs(b - (t.beat + 1 / 3)) < 1e-6);
      expect(hasFollow).toBe(true);
    }
  });

  it('the amount slider scales how many embellishments fire', () => {
    const src = line();
    const few = embellishBassLine(src, all({ ghosts: true, amount: 0.2 })).filter((n) => n.label === 'g');
    const many = embellishBassLine(src, all({ ghosts: true, amount: 1 })).filter((n) => n.label === 'g');
    expect(many.length).toBeGreaterThan(few.length);
  });

  it('keeps notes sorted by beat when combining everything', () => {
    const out = embellishBassLine(line(), all({ ghosts: true, anticipate: true, triplets: true }));
    for (let i = 1; i < out.length; i++) expect(out[i].beat).toBeGreaterThanOrEqual(out[i - 1].beat);
  });
});
