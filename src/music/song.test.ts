import { describe, expect, it } from 'vitest';
import { SONG_PRESETS } from '@/data/presets';
import { assignDisplayLanes, flattenSong, sequenceBarCount, validateSong } from './song';

function preset(id: string) {
  const song = SONG_PRESETS.find((p) => p.id === id);
  if (!song) throw new Error(`missing preset ${id}`);
  return song;
}

describe('flattenSong', () => {
  it('flattens All The Things Study to 32 chord events across 32 bars', () => {
    const seq = flattenSong(preset('all-the-things-study'), 'middle');
    expect(seq).toHaveLength(32);
    expect(sequenceBarCount(seq)).toBe(32);
  });

  it('flattens Blues for Alice with beat-aware placement (20 events)', () => {
    const seq = flattenSong(preset('blues-for-alice'), 'middle');
    expect(seq).toHaveLength(20);
    const barTwo = seq.filter((c) => c.barIndex === 1);
    expect(barTwo).toHaveLength(2);
    expect(barTwo.map((c) => c.beat)).toEqual([1, 3]);
  });

  it('carries lead-note targets through (Days-Style = 49 events)', () => {
    const seq = flattenSong(preset('days-style-lead-note-study'), 'middle');
    expect(seq).toHaveLength(49);
    expect(seq.filter((c) => c.targetTopNote).length).toBe(49);
  });

  it('preserves flat root spelling in the symbol', () => {
    const seq = flattenSong(preset('all-the-things-study'), 'middle');
    expect(seq[0].symbol).toBe('Fm7');
    expect(seq.find((c) => c.displayRoot === 'Ab')!.symbol).toContain('Ab');
  });
});

describe('assignDisplayLanes', () => {
  it('keeps non-overlapping chords on a single lane', () => {
    const seq = flattenSong(preset('blues-for-alice'), 'middle');
    const barTwo = seq.filter((c) => c.barIndex === 1);
    const lanes = assignDisplayLanes(barTwo);
    expect(lanes.every((l) => l.lane === 1)).toBe(true);
    expect(lanes[0].laneCount).toBe(1);
  });
});

describe('validateSong', () => {
  it('reports no errors for any built-in preset', () => {
    for (const song of SONG_PRESETS) {
      const issues = validateSong(song);
      expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    }
  });
});
