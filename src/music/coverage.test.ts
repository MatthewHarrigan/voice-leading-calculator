import { describe, expect, it } from 'vitest';
import { CHORD_TYPE_IDS } from './chords';
import { generateChordVoicing, type Inversion } from './voicing';
import type { StringSet } from './tuning';

describe('voicing coverage', () => {
  const sets: StringSet[] = ['middle', 'upper'];
  const roots = ['C', 'F', 'Bb', 'A', 'Eb', 'G'];

  it('every chord type voices in at least one inversion on each string set', () => {
    for (const set of sets) {
      for (const type of CHORD_TYPE_IDS) {
        const any = ([0, 1, 2, 3] as Inversion[]).some((inv) =>
          generateChordVoicing('C', type, inv, set),
        );
        expect(any, `${type} on ${set}`).toBe(true);
      }
    }
  });

  it('produces playable voicings within a four-fret span across many roots', () => {
    for (const root of roots) {
      for (const type of CHORD_TYPE_IDS) {
        for (const inv of [0, 1, 2, 3] as Inversion[]) {
          const voicing = generateChordVoicing(root, type, inv, 'middle');
          if (!voicing) continue;
          const used = voicing.frets.filter((f): f is number => f !== null && f > 0);
          if (used.length > 0) {
            expect(Math.max(...used) - Math.min(...used)).toBeLessThanOrEqual(4);
          }
          // Exactly four active strings carry a note.
          const active = voicing.stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4];
          const played = active.filter((s) => voicing.frets[s] !== null && voicing.frets[s] !== undefined);
          expect(played).toHaveLength(4);
        }
      }
    }
  });
});
