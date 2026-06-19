import { describe, expect, it } from 'vitest';
import { arrangementSpanBeats, beatPosition } from './timing';

describe('beatPosition', () => {
  it('maps bar/beat to an absolute 0-based beat', () => {
    expect(beatPosition(0, 1)).toBe(0);
    expect(beatPosition(0, 3)).toBe(2);
    expect(beatPosition(1, 1)).toBe(4);
    expect(beatPosition(2, 3)).toBe(10);
  });
});

describe('arrangementSpanBeats', () => {
  it('is 0 for an empty arrangement', () => {
    expect(arrangementSpanBeats([])).toBe(0);
  });

  it('spans to the end of the last-ending event', () => {
    // bar0: beat1 dur2 + beat3 dur2; bar1: beat1 dur4
    const events = [
      { startBeat: 0, durationBeats: 2 },
      { startBeat: 2, durationBeats: 2 },
      { startBeat: 4, durationBeats: 4 },
    ];
    expect(arrangementSpanBeats(events)).toBe(8); // last chord ends at beat 8
  });

  it('counts a final-beat chord (no off-by-one drop)', () => {
    expect(arrangementSpanBeats([{ startBeat: 0, durationBeats: 4 }])).toBe(4);
  });

  it('treats a zero/short duration as at least one beat', () => {
    expect(arrangementSpanBeats([{ startBeat: 3, durationBeats: 0 }])).toBe(4);
  });
});
